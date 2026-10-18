"""Turn public feed payloads into normalized records.

These parsers do not fetch anything and do not invent locations. A country is
set only when the feed itself publishes one. Source and target countries are
set only when that is what the field means.
"""

from __future__ import annotations

import csv
import io
import json
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

IPV4 = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")
ABUSE_UPDATED = re.compile(r"Last updated:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")
SPAMHAUS_UPDATED = re.compile(r"Last-Modified:\s*(.+)", re.IGNORECASE)
DROP_ROW = re.compile(r"^(\d{1,3}(?:\.\d{1,3}){3})/(\d{1,2})\s*;\s*(\S+)")


def valid_ipv4(value: str | None) -> bool:
    if not value or not IPV4.match(value):
        return False
    return all(part.isdigit() and 0 <= int(part) <= 255 for part in value.split("."))


def literal_ipv4(value: str | None) -> str | None:
    """Return an IPv4 literal written in the indicator. Do not resolve names."""
    if not value:
        return None
    text = value.strip()
    host = text
    if "://" in text:
        host = urlparse(text).hostname or ""
    else:
        if host.startswith("["):
            return None
        host = host.split("/")[0].split(":")[0]
    host = host.strip().rstrip(".")
    return host if valid_ipv4(host) else None


def to_utc(value: str | None) -> str | None:
    if not value or not str(value).strip():
        return None
    text = str(value).strip().replace("T", " ").replace("Z", "")
    if "." in text:
        text = text.split(".", 1)[0]
    for fmt, size in (("%Y-%m-%d %H:%M:%S", 19), ("%Y-%m-%d", 10)):
        try:
            parsed = datetime.strptime(text[:size], fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        return parsed.strftime("%Y-%m-%dT%H:%M:%SZ")
    return None


def http_time(value: str | None) -> str | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value.strip())
    except (TypeError, ValueError, IndexError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _event(**fields) -> dict:
    record = {
        "feed": fields["feed"],
        "threat_type": fields.get("threat_type") or "unspecified",
        "title": (fields.get("title") or "")[:180],
        "observed_at": fields.get("observed_at"),
        "ip": fields.get("ip"),
        "country": fields.get("country"),
        "source_country": fields.get("source_country"),
        "target_country": fields.get("target_country"),
        "role": fields.get("role") or "report",
        "reference": fields.get("reference"),
        "summary": (fields.get("summary") or "")[:400],
        "simulated": False,
        "target_address_count": fields.get("target_address_count"),
    }
    return record


def parse_urlhaus(text: str) -> tuple[str | None, list[dict]]:
    updated = None
    match = ABUSE_UPDATED.search(text)
    if match:
        updated = to_utc(match.group(1))
    lines = [line for line in text.splitlines() if line and not line.startswith("#")]
    events = []
    for row in csv.reader(lines):
        if len(row) < 8:
            continue
        url = row[2].strip()
        events.append(
            _event(
                feed="urlhaus",
                threat_type=row[5].strip() or "malware_download",
                title=url,
                observed_at=to_utc(row[1]),
                ip=literal_ipv4(url),
                role="infrastructure",
                reference=row[7].strip() or None,
                summary="Malware URL published by URLhaus. A country, when shown, is the geolocation of an IP literal in the URL, not a victim.",
            )
        )
    return updated, events


def parse_threatfox(payload: str | dict) -> tuple[str | None, list[dict]]:
    data = json.loads(payload) if isinstance(payload, str) else payload
    if isinstance(data, dict) and "query_status" in data and not any(str(key).isdigit() for key in data):
        raise ValueError("ThreatFox returned no IOC map")
    if not isinstance(data, dict):
        raise ValueError("ThreatFox export was not a JSON object")
    newest = None
    events = []
    for ioc_id, rows in data.items():
        if not isinstance(rows, list):
            rows = [rows]
        for row in rows:
            if not isinstance(row, dict):
                continue
            seen = to_utc(row.get("first_seen_utc"))
            if seen and (newest is None or seen > newest):
                newest = seen
            value = str(row.get("ioc_value") or "")
            malware = row.get("malware_printable") or row.get("malware") or "unknown malware"
            reference = row.get("reference") if isinstance(row.get("reference"), str) else None
            if not reference or not reference.startswith("http"):
                reference = f"https://threatfox.abuse.ch/ioc/{ioc_id}/"
            events.append(
                _event(
                    feed="threatfox",
                    threat_type=str(row.get("threat_type") or "ioc"),
                    title=value,
                    observed_at=seen,
                    ip=literal_ipv4(value),
                    role="infrastructure",
                    reference=reference,
                    summary=f"ThreatFox indicator for {malware}. Country is filled only when the indicator contains an IP literal.",
                )
            )
    return newest, events


def parse_feodo(payload: str | dict) -> tuple[str | None, list[dict]]:
    if isinstance(payload, str):
        updated = None
        match = ABUSE_UPDATED.search(payload)
        if match:
            updated = to_utc(match.group(1))
        start = payload.find("[")
        if start < 0:
            raise ValueError("Feodo payload had no JSON list")
        rows = json.loads(payload[start:])
    else:
        updated = None
        rows = payload
    if isinstance(rows, dict):
        rows = rows.get("data") or rows.get("ips") or []
    if not isinstance(rows, list):
        raise ValueError("Feodo payload was not a list")
    events = []
    newest = updated
    for row in rows:
        if not isinstance(row, dict):
            continue
        ip = row.get("ip_address") or row.get("dst_ip")
        if not valid_ipv4(str(ip or "")):
            continue
        seen = to_utc(row.get("first_seen") or row.get("first_seen_utc"))
        if seen and (newest is None or seen > newest):
            newest = seen
        country = row.get("country")
        if not (isinstance(country, str) and len(country) == 2 and country.isalpha()):
            country = None
        else:
            country = country.upper()
        malware = str(row.get("malware") or "botnet")
        port = row.get("port") or row.get("dst_port") or ""
        events.append(
            _event(
                feed="feodo",
                threat_type=malware,
                title=f"{ip}:{port} {malware}".strip(),
                observed_at=seen,
                ip=str(ip),
                country=country,
                role="infrastructure",
                reference="https://feodotracker.abuse.ch/blocklist/",
                summary="Botnet C2 address published by Feodo Tracker. The country is the one Feodo publishes for that address, not a victim country.",
            )
        )
    return newest, events


def parse_spamhaus(text: str, *, feed_label: str) -> tuple[str | None, list[dict]]:
    updated = None
    match = SPAMHAUS_UPDATED.search(text)
    if match:
        updated = http_time(match.group(1).strip())
    events = []
    for line in text.splitlines():
        found = DROP_ROW.match(line.strip())
        if not found:
            continue
        network, prefix, token = found.groups()
        if not valid_ipv4(network):
            continue
        events.append(
            _event(
                feed="spamhaus",
                threat_type="drop-listing",
                title=f"{network}/{prefix} {token}",
                observed_at=None,
                ip=network,
                role="infrastructure",
                reference="https://www.spamhaus.org/drop/drop.txt" if feed_label == "DROP" else "https://www.spamhaus.org/drop/edrop.txt",
                summary=f"Spamhaus {feed_label} network {token}. Country is the DB-IP country of the network address, not a victim country.",
            )
        )
    return updated, events


def parse_dshield_countries(payload: str | list) -> list[dict]:
    rows = json.loads(payload) if isinstance(payload, str) else payload
    if not isinstance(rows, list):
        raise ValueError("DShield country feed was not a list")
    stats = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        code = str(row.get("country") or "").strip().upper()
        if not (len(code) == 2 and code.isalpha()):
            continue
        stats.append(
            {
                "code": code,
                "source_addresses": _count(row.get("sources")),
                "source_reports": _count(row.get("reports")),
                "persistence_days": _optional_number(row.get("persistance")),
            }
        )
    return stats


def parse_dshield_topips(payload: str | list) -> list[dict]:
    rows = json.loads(payload) if isinstance(payload, str) else payload
    if not isinstance(rows, list):
        raise ValueError("DShield top IP feed was not a list")
    events = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        ip = str(row.get("source") or "").strip()
        if not valid_ipv4(ip):
            continue
        reports = _count(row.get("reports"))
        targets = _count(row.get("targets"))
        events.append(
            _event(
                feed="dshield",
                threat_type="sensor-source",
                title=ip,
                ip=ip,
                role="source",
                reference=f"https://isc.sans.edu/ipinfo.html?ip={ip}",
                summary=(
                    f"DShield source address with {reports} reports and {targets} destination addresses. "
                    "The destination count is not a country."
                ),
                target_address_count=targets,
            )
        )
    return events


def parse_kev(payload: str | dict) -> tuple[str | None, list[dict]]:
    data = json.loads(payload) if isinstance(payload, str) else payload
    if not isinstance(data, dict):
        raise ValueError("CISA KEV feed was not an object")
    updated = to_utc(data.get("dateReleased"))
    vulns = data.get("vulnerabilities") or []
    if not isinstance(vulns, list):
        raise ValueError("CISA KEV vulnerabilities was not a list")
    records = []
    for row in vulns:
        if not isinstance(row, dict) or not row.get("cveID"):
            continue
        cve = str(row["cveID"])
        description = str(row.get("shortDescription") or "")
        if len(description) > 360:
            description = description[:357].rstrip() + "..."
        records.append(
            {
                "cve": cve,
                "vendor": str(row.get("vendorProject") or ""),
                "product": str(row.get("product") or ""),
                "name": str(row.get("vulnerabilityName") or cve),
                "date_added": str(row.get("dateAdded") or ""),
                "ransomware": str(row.get("knownRansomwareCampaignUse") or ""),
                "summary": description,
                "reference": f"https://nvd.nist.gov/vuln/detail/{cve}",
                "simulated": False,
            }
        )
    records.sort(key=lambda item: item["date_added"], reverse=True)
    return updated, records


def _count(value) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number if number > 0 else 0


def _optional_number(value):
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return None
