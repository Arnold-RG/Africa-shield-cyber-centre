#!/usr/bin/env python3
"""Refresh the public desk snapshot from named sources.

Writes africa-shield-centre/data/public-intel.json.
The snapshot keeps defensive catalog fields and country totals.
It does not store malware URLs, file hashes, or exploit instructions.
"""

from __future__ import annotations

import ipaddress
import json
import sys
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "africa-shield-centre" / "data" / "public-intel.json"

UA = "AfricaShieldDesk/1.0 (public snapshot; +https://github.com/Arnold-RG/Africa-shield-cyber-centre)"
TIMEOUT = 90

KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
FOX_URL = "https://threatfox.abuse.ch/export/json/recent/"
FEODO_URL = "https://feodotracker.abuse.ch/downloads/ipblocklist.json"
COUNTRIES_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"

RIR_URLS = [
    "https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-latest",
    "https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest",
    "https://ftp.apnic.net/stats/apnic/delegated-apnic-latest",
    "https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-latest",
    "https://ftp.afrinic.net/pub/stats/afrinic/delegated-afrinic-latest",
]

EAST_AFRICA = {
    "BI", "KM", "DJ", "ER", "ET", "KE", "MG", "MW", "MU",
    "RW", "SC", "SO", "SS", "SD", "TZ", "UG", "ZM", "ZW",
}

# Fallback centroids if the country file is missing a code we actually plot.
FALLBACK = {
    "US": (39.8, -98.5, "United States"),
    "CN": (35.9, 104.2, "China"),
    "RU": (61.5, 105.3, "Russia"),
    "DE": (51.2, 10.4, "Germany"),
    "NL": (52.1, 5.3, "Netherlands"),
    "GB": (54.0, -2.5, "United Kingdom"),
    "FR": (46.2, 2.2, "France"),
    "BR": (-14.2, -51.9, "Brazil"),
    "IN": (22.0, 79.0, "India"),
    "ZA": (-30.6, 22.9, "South Africa"),
    "KE": (0.2, 37.9, "Kenya"),
    "TZ": (-6.4, 34.9, "Tanzania"),
    "UG": (1.4, 32.3, "Uganda"),
    "RW": (-1.9, 29.9, "Rwanda"),
    "ET": (9.1, 40.5, "Ethiopia"),
    "NG": (9.1, 8.7, "Nigeria"),
    "EG": (26.8, 30.8, "Egypt"),
    "MA": (31.8, -7.1, "Morocco"),
    "GH": (7.9, -1.0, "Ghana"),
    "SN": (14.5, -14.5, "Senegal"),
    "TN": (33.9, 9.5, "Tunisia"),
    "BW": (-22.3, 24.7, "Botswana"),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
        return response.read()


def ip_to_int(value: str) -> int | None:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return None
    if ip.version != 4:
        return None
    return int(ip)


def load_ranges() -> list[tuple[int, int, str]]:
    ranges: list[tuple[int, int, str]] = []
    for url in RIR_URLS:
        print(f"rir {url}", flush=True)
        text = fetch(url).decode("utf-8", "replace")
        for line in text.splitlines():
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) < 7 or parts[2] != "ipv4":
                continue
            if parts[6] not in {"allocated", "assigned"}:
                continue
            cc = parts[1].upper()
            if len(cc) != 2 or cc in {"*", "ZZ"}:
                continue
            start = ip_to_int(parts[3])
            try:
                count = int(parts[4])
            except ValueError:
                continue
            if start is None or count <= 0:
                continue
            ranges.append((start, start + count - 1, cc))
    ranges.sort()
    print(f"ranges {len(ranges)}", flush=True)
    return ranges


def locate(ranges: list[tuple[int, int, str]], ip_int: int) -> str | None:
    lo, hi = 0, len(ranges)
    while lo < hi:
        mid = (lo + hi) // 2
        if ranges[mid][0] <= ip_int:
            lo = mid + 1
        else:
            hi = mid
    if lo == 0:
        return None
    start, end, cc = ranges[lo - 1]
    if start <= ip_int <= end:
        return cc
    return None


def load_places() -> dict[str, tuple[float, float, str]]:
    places = dict(FALLBACK)
    try:
        raw = json.loads(fetch(COUNTRIES_URL))
    except Exception as exc:  # noqa: BLE001
        print(f"country file skipped: {exc}", flush=True)
        return places
    for row in raw:
        code = (row.get("cca2") or "").upper()
        latlng = row.get("latlng") or []
        name = (row.get("name") or {}).get("common")
        if code and name and len(latlng) == 2:
            places[code] = (float(latlng[0]), float(latlng[1]), name)
    return places


def split_ip_port(value: str) -> tuple[str, int | None]:
    if value.count(":") == 1:
        host, _, port = value.partition(":")
        try:
            return host, int(port)
        except ValueError:
            return host, None
    return value, None


def main() -> int:
    fetched = datetime.now(timezone.utc).replace(microsecond=0)
    print("kev", flush=True)
    kev_raw = json.loads(fetch(KEV_URL))
    vulns = kev_raw.get("vulnerabilities") or []
    cutoff = (fetched - timedelta(days=30)).date()
    added_30 = 0
    ransomware = 0
    kev_out = []
    for item in vulns:
        added = item.get("dateAdded") or ""
        try:
            added_date = datetime.strptime(added, "%Y-%m-%d").date()
        except ValueError:
            added_date = None
        if added_date and added_date >= cutoff:
            added_30 += 1
        used = (item.get("knownRansomwareCampaignUse") or "").lower() == "known"
        if used:
            ransomware += 1
        name = " ".join((item.get("vulnerabilityName") or "").split())
        kev_out.append(
            {
                "cve": item.get("cveID") or "",
                "vendor": item.get("vendorProject") or "",
                "product": item.get("product") or "",
                "name": name[:140],
                "added": added,
                "due": item.get("dueDate") or "",
                "ransomware": used,
            }
        )
    kev_out.sort(key=lambda row: row["added"], reverse=True)
    # Full catalog stays searchable; descriptions are not required for the ledger.
    print(f"kev {len(kev_out)}", flush=True)

    print("threatfox", flush=True)
    fox = json.loads(fetch(FOX_URL))
    type_counts: Counter[str] = Counter()
    malware_counts: Counter[str] = Counter()
    threat_counts: Counter[str] = Counter()
    ip_rows = []
    for key, bucket in fox.items():
        items = bucket if isinstance(bucket, list) else [bucket]
        for item in items:
            if not isinstance(item, dict):
                continue
            ioc_type = item.get("ioc_type") or "other"
            type_counts[ioc_type] += 1
            malware = item.get("malware_printable") or "Unspecified"
            threat = (item.get("threat_type") or "other").replace("_", " ")
            malware_counts[malware] += 1
            threat_counts[threat] += 1
            if ioc_type != "ip:port":
                continue
            host, port = split_ip_port(item.get("ioc_value") or "")
            ip_int = ip_to_int(host)
            if ip_int is None:
                continue
            try:
                confidence = int(item.get("confidence_level") or 0)
            except (TypeError, ValueError):
                confidence = 0
            if confidence < 50:
                continue
            ip_rows.append(
                {
                    "id": str(key),
                    "ip": host,
                    "ip_int": ip_int,
                    "port": port,
                    "malware": malware,
                    "threat": threat,
                    "confidence": confidence,
                    "seen": item.get("first_seen_utc") or "",
                    "reporter": item.get("reporter") or "",
                }
            )
    print(f"ip indicators {len(ip_rows)}", flush=True)

    ranges = load_ranges()
    places = load_places()
    country_counts: Counter[str] = Counter()
    country_malware: dict[str, Counter[str]] = defaultdict(Counter)
    located = []
    unknown = 0
    for row in ip_rows:
        cc = locate(ranges, row["ip_int"])
        if not cc:
            unknown += 1
            continue
        country_counts[cc] += 1
        country_malware[cc][row["malware"]] += 1
        row["country"] = cc
        located.append(row)

    countries = []
    for code, count in country_counts.most_common():
        lat, lon, name = places.get(code, (None, None, code))
        if lat is None:
            continue
        ranked = country_malware[code].most_common(12)
        countries.append(
            {
                "code": code,
                "name": name,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "count": count,
                "malware": [{"name": name_, "count": n} for name_, n in ranked[:3]],
                "families": [name_ for name_, _ in ranked],
                "east_africa": code in EAST_AFRICA,
            }
        )

    located.sort(key=lambda row: row["seen"], reverse=True)
    recent = []
    for row in located[:80]:
        code = row["country"]
        _, _, name = places.get(code, (None, None, code))
        recent.append(
            {
                "id": row["id"],
                "ip": row["ip"],
                "port": row["port"],
                "malware": row["malware"],
                "threat": row["threat"],
                "country": code,
                "country_name": name,
                "confidence": row["confidence"],
                "seen": row["seen"],
                "reporter": row["reporter"],
                "record": f"https://threatfox.abuse.ch/ioc/{row['id']}/",
            }
        )

    print("feodo", flush=True)
    feodo = []
    try:
        for item in json.loads(fetch(FEODO_URL)):
            feodo.append(
                {
                    "ip": item.get("ip_address") or "",
                    "port": item.get("port"),
                    "status": item.get("status") or "",
                    "malware": item.get("malware") or "",
                    "country": item.get("country") or "",
                    "last_online": item.get("last_online") or "",
                    "as_name": item.get("as_name") or "",
                    "record": "https://feodotracker.abuse.ch/",
                }
            )
    except Exception as exc:  # noqa: BLE001
        print(f"feodo skipped: {exc}", flush=True)

    east_count = sum(row["count"] for row in countries if row["east_africa"])
    payload = {
        "fetched_at": fetched.isoformat().replace("+00:00", "Z"),
        "disclaimer": (
            "These figures are copied from public feeds. They are not incidents "
            "filed with Africa Shield, not victim locations, and not proof that "
            "a network in that country was attacked. An address is placed on the "
            "country that the regional internet registry records for the IP block."
        ),
        "sources": [
            {
                "name": "CISA Known Exploited Vulnerabilities Catalog",
                "url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
                "note": "US government catalog of vulnerabilities known to be exploited. Public domain.",
            },
            {
                "name": "abuse.ch ThreatFox recent export",
                "url": "https://threatfox.abuse.ch/export/",
                "note": "Community indicators. This desk keeps IP indicators and counts, and links back to ThreatFox for the record.",
            },
            {
                "name": "abuse.ch Feodo Tracker",
                "url": "https://feodotracker.abuse.ch/",
                "note": "Public botnet command-and-control blocklist, shown as published.",
            },
            {
                "name": "Regional Internet Registry delegation files",
                "url": "https://www.nro.net/about/rirs/statistics/",
                "note": "AFRINIC, APNIC, ARIN, LACNIC, and RIPE NCC allocation files, used only to name the country of an IP block.",
            },
        ],
        "summary": {
            "kev_count": len(kev_out),
            "kev_version": kev_raw.get("catalogVersion") or "",
            "kev_released": kev_raw.get("dateReleased") or "",
            "kev_added_30d": added_30,
            "kev_ransomware": ransomware,
            "fox_total": sum(type_counts.values()),
            "fox_ip": len(ip_rows),
            "fox_ip_located": len(located),
            "fox_ip_unlocated": unknown,
            "countries": len(countries),
            "east_africa_indicators": east_count,
        },
        "malware": [{"name": name, "count": count} for name, count in malware_counts.most_common(10)],
        "threats": [{"name": name, "count": count} for name, count in threat_counts.most_common(8)],
        "types": [{"name": name, "count": count} for name, count in type_counts.most_common()],
        "countries": countries,
        "recent_indicators": recent,
        "kev": kev_out,
        "feodo": feodo,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    tmp.replace(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"refresh failed: {exc}", file=sys.stderr)
        if OUT.exists():
            print("keeping the previous snapshot", file=sys.stderr)
            raise SystemExit(0)
        raise SystemExit(1)
