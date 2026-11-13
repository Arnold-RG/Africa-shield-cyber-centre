"""Turn public feed payloads into normalized records.

These parsers do not fetch anything and do not invent locations. A country is
set only when the feed itself publishes one. Source and target countries are
set only when that is what the field means. Severity is a local triage
heuristic, documented in assign_severity, not a vendor score.
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
SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}


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


def assign_severity(event: dict) -> str:
    """Local triage label derived only from published feed fields.

    This is not an official severity from the feed publisher. It exists so
    operators can sort the cached table. The rules are fixed and tested.
    """
    feed = event.get("feed") or ""
    threat = (event.get("threat_type") or "").lower()
    confidence = event.get("confidence")
    targets = event.get("target_address_count") or 0
    ransomware = str(event.get("ransomware") or "").lower()

    if feed == "kev" or ransomware in {"known", "yes"}:
        return "critical" if ransomware in {"known", "yes"} else "high"
    if feed in {"feodo", "sslbl", "spamhaus"}:
        return "high"
    if feed == "threatfox":
        if isinstance(confidence, int) and confidence >= 90:
            return "high"
        if threat in {"botnet_cc"} and (not isinstance(confidence, int) or confidence >= 50):
            return "high"
        if isinstance(confidence, int) and confidence >= 50:
            return "medium"
        return "medium"
    if feed in {"urlhaus", "openphish"}:
        return "medium"
    if feed == "dshield":
        if isinstance(targets, int) and targets >= 1000:
            return "medium"
        return "low"
    if feed == "asndrop":
        return "high"
    return "info"


def _clip(value, limit: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"none", "null", "nan", "-"}:
        return None
    return text[:limit]


def _asn(value) -> int | None:
    if value is None or value == "":
        return None
    text = str(value).strip().upper().removeprefix("AS")
    try:
        number = int(text)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _confidence(value) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if number < 0 or number > 100:
        return None
    return number


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
        "malware_family": _clip(fields.get("malware_family"), 80),
        "asn": _asn(fields.get("asn")),
        "asn_name": _clip(fields.get("asn_name"), 80),
        "confidence": _confidence(fields.get("confidence")),
        "ioc_type": _clip(fields.get("ioc_type"), 40),
        "tags": _clip(fields.get("tags"), 120),
        "severity": fields.get("severity"),
    }
    if not record["severity"]:
        record["severity"] = assign_severity(record)
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
        tags = row[6].strip() if len(row) > 6 else ""
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
                ioc_type="url",
                tags=tags,
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
            seen = to_utc(row.get("first_seen_utc") or row.get("last_seen_utc"))
            if seen and (newest is None or seen > newest):
                newest = seen
            value = str(row.get("ioc_value") or "")
            malware = row.get("malware_printable") or row.get("malware") or None
            reference = row.get("reference") if isinstance(row.get("reference"), str) else None
            if not reference or not reference.startswith("http"):
                reference = f"https://threatfox.abuse.ch/ioc/{ioc_id}/"
            family_label = malware or "unknown malware"
            events.append(
                _event(
                    feed="threatfox",
                    threat_type=str(row.get("threat_type") or "ioc"),
                    title=value,
                    observed_at=seen,
                    ip=literal_ipv4(value),
                    role="infrastructure",
                    reference=reference,
                    summary=f"ThreatFox indicator for {family_label}. Country is filled only when the indicator contains an IP literal.",
                    malware_family=malware if malware and str(malware).lower() != "unknown malware" else None,
                    asn=row.get("asn") or row.get("as_number") or row.get("asn_registry"),
                    asn_name=row.get("as_name") or row.get("asn_name"),
                    confidence=row.get("confidence_level"),
                    ioc_type=row.get("ioc_type"),
                    tags=row.get("tags"),
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
                malware_family=malware,
                asn=row.get("as_number") or row.get("asn"),
                asn_name=row.get("as_name") or row.get("asn_name"),
                ioc_type="ip",
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
                ioc_type="cidr",
                tags=feed_label,
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
                ioc_type="ip",
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
        ransomware = str(row.get("knownRansomwareCampaignUse") or "")
        records.append(
            {
                "cve": cve,
                "vendor": str(row.get("vendorProject") or ""),
                "product": str(row.get("product") or ""),
                "name": str(row.get("vulnerabilityName") or cve),
                "date_added": str(row.get("dateAdded") or ""),
                "ransomware": ransomware,
                "summary": description,
                "reference": f"https://nvd.nist.gov/vuln/detail/{cve}",
                "simulated": False,
                "severity": "critical" if ransomware.lower() in {"known", "yes"} else "high",
            }
        )
    records.sort(key=lambda item: item["date_added"], reverse=True)
    return updated, records


def parse_sslbl(payload: str | list | dict) -> tuple[str | None, list[dict]]:
    """abuse.ch SSLBL IP blacklist. Country is not published here."""
    updated = None
    if isinstance(payload, str) and payload.lstrip().startswith("#") and "DstIP" in payload:
        match = ABUSE_UPDATED.search(payload)
        if match:
            updated = to_utc(match.group(1))
        events = []
        newest = updated
        for row in csv.reader(line for line in payload.splitlines() if line and not line.startswith("#")):
            if len(row) < 2:
                continue
            seen = to_utc(row[0])
            ip = row[1].strip()
            if not valid_ipv4(ip):
                continue
            if seen and (newest is None or seen > newest):
                newest = seen
            port = row[2].strip() if len(row) > 2 else ""
            events.append(
                _event(
                    feed="sslbl",
                    threat_type="ssl-blacklist",
                    title=f"{ip}:{port}".rstrip(":") if port else ip,
                    observed_at=seen,
                    ip=ip,
                    role="infrastructure",
                    reference="https://sslbl.abuse.ch/blacklist/",
                    summary="SSLBL listed address. A country, when shown, is the DB-IP country of the address, not a victim.",
                    ioc_type="ip",
                )
            )
        return newest, events
    if isinstance(payload, str):
        match = ABUSE_UPDATED.search(payload)
        if match:
            updated = to_utc(match.group(1))
        start = payload.find("[")
        if start < 0:
            # sometimes a JSON object or line-oriented file
            try:
                rows = json.loads(payload)
            except json.JSONDecodeError as exc:
                raise ValueError("SSLBL payload had no JSON list") from exc
        else:
            rows = json.loads(payload[start:])
    else:
        rows = payload
    if isinstance(rows, dict):
        updated = updated or to_utc(rows.get("last_updated") or rows.get("updated"))
        rows = rows.get("data") or rows.get("ips") or rows.get("sslbl") or rows.get("list") or []
    if not isinstance(rows, list):
        raise ValueError("SSLBL payload was not a list")
    events = []
    newest = updated
    for row in rows:
        if not isinstance(row, dict):
            continue
        ip = row.get("ip_address") or row.get("ip") or row.get("dst_ip")
        if not valid_ipv4(str(ip or "")):
            continue
        seen = to_utc(row.get("first_seen") or row.get("first_seen_utc") or row.get("timestamp"))
        if seen and (newest is None or seen > newest):
            newest = seen
        port = row.get("port") or ""
        reason = row.get("reason") or row.get("listing_reason") or "malicious SSL certificate"
        events.append(
            _event(
                feed="sslbl",
                threat_type="ssl-blacklist",
                title=f"{ip}:{port}".rstrip(":") if port else str(ip),
                observed_at=seen,
                ip=str(ip),
                role="infrastructure",
                reference="https://sslbl.abuse.ch/blacklist/",
                summary=f"SSLBL listed address ({reason}). A country, when shown, is the DB-IP country of the address, not a victim.",
                asn=row.get("as_number") or row.get("asn"),
                asn_name=row.get("as_name") or row.get("asn_name"),
                ioc_type="ip",
            )
        )
    return newest, events


def parse_asndrop(payload: str | dict | list) -> tuple[str | None, list[dict]]:
    """Spamhaus ASN-DROP listings. These are autonomous systems, not attack paths."""
    if isinstance(payload, str):
        text = payload.strip()
        if text.startswith("{") or text.startswith("["):
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                rows = []
                for line in text.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
                data = rows
        else:
            return _parse_asndrop_text(text)
    else:
        data = payload
    updated = None
    rows: list = []
    if isinstance(data, dict):
        meta = data.get("metadata") or data.get("meta") or {}
        if isinstance(meta, dict):
            updated = to_utc(meta.get("last_updated") or meta.get("updated") or meta.get("Last-Modified"))
            if not updated and meta.get("lastmodified"):
                updated = http_time(str(meta.get("lastmodified")))
        for key in ("asndrop", "asn-drop", "asns", "data", "results"):
            if isinstance(data.get(key), list):
                rows = data[key]
                break
        if not rows and isinstance(data.get("asn"), (str, int)):
            rows = [data]
    elif isinstance(data, list):
        rows = data
    else:
        raise ValueError("ASN-DROP payload was not a JSON object or list")
    listings = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        asn = _asn(row.get("asn") or row.get("AS") or row.get("as_number"))
        if not asn:
            continue
        country = row.get("cc") or row.get("country") or row.get("countrycode")
        if not (isinstance(country, str) and len(country) == 2 and country.isalpha()):
            country = None
        else:
            country = country.upper()
        name = _clip(row.get("asname") or row.get("as_name") or row.get("name"), 80)
        listings.append(
            {
                "asn": asn,
                "asn_name": name,
                "country": country,
                "rir": _clip(row.get("rir"), 20),
                "reference": "https://www.spamhaus.org/drop/asndrop.json",
                "simulated": False,
                "severity": "high",
            }
        )
    return updated, listings


def _parse_asndrop_text(text: str) -> tuple[str | None, list[dict]]:
    updated = None
    match = SPAMHAUS_UPDATED.search(text)
    if match:
        updated = http_time(match.group(1).strip())
    listings = []
    for line in text.splitlines():
        raw = line.strip()
        if not raw or raw.startswith(";") or raw.startswith("#"):
            continue
        token = raw.split(";")[0].strip().upper().removeprefix("AS")
        asn = _asn(token)
        if not asn:
            continue
        listings.append(
            {
                "asn": asn,
                "asn_name": None,
                "country": None,
                "rir": None,
                "reference": "https://www.spamhaus.org/drop/asndrop.json",
                "simulated": False,
                "severity": "high",
            }
        )
    return updated, listings



def parse_openphish(text: str) -> tuple[str | None, list[dict]]:
    """OpenPhish community feed: one phishing URL per line. No per-row timestamp."""
    events = []
    for line in text.splitlines():
        url = line.strip()
        if not url or url.startswith("#") or url.startswith("!"):
            continue
        if not (url.startswith("http://") or url.startswith("https://") or url.startswith("ftp://")):
            continue
        events.append(
            _event(
                feed="openphish",
                threat_type="phishing",
                title=url[:180],
                observed_at=None,
                ip=literal_ipv4(url),
                role="infrastructure",
                reference="https://openphish.com/",
                summary="Phishing URL published by the OpenPhish community feed. A country, when shown, is the geolocation of an IP literal in the URL, not a victim. The feed has no per-row timestamp, so these rows are left out of the 24 hour chart.",
                ioc_type="url",
            )
        )
    return None, events


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
