"""Download public feeds and write public/data/snapshot.json.

No API keys. Domain names are not resolved. IP countries come from a feed
field or from DB-IP Country Lite.
"""

from __future__ import annotations

import gzip
import json
import sys
import traceback
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from aggregate import assign_source_countries, build_snapshot, validate
from geoip import GeoDB
from parsers import (
    parse_dshield_countries,
    parse_dshield_topips,
    parse_feodo,
    parse_kev,
    parse_spamhaus,
    parse_threatfox,
    parse_urlhaus,
)

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "public" / "data" / "snapshot.json"
PLACES = ROOT / "public" / "vendor" / "countries.json"
UA = "AfricaShieldSOC/1.0 (+https://github.com/Arnold-RG/Africa-shield-cyber-centre; rurangwaarnold32@gmail.com)"


def main() -> int:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    places = _places()
    runs = [
        _urlhaus(now),
        _threatfox(now),
        _feodo(now),
        _spamhaus(now),
        _dshield(now),
        _kev(now),
    ]
    events = [event for run in runs for event in run.get("events") or []]
    geo_meta = _apply_geo(events)
    assign_source_countries(events)
    snapshot = build_snapshot(now, runs, places, geo_meta)
    errors = validate(snapshot)
    if errors:
        print("snapshot failed validation:", file=sys.stderr)
        for error in errors:
            print(" -", error, file=sys.stderr)
        return 1
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {SNAPSHOT.relative_to(ROOT)}")
    for feed in snapshot["feeds"]:
        state = "ok" if feed["ok"] else "FAILED"
        print(f"  {feed['id']}: {state} parsed={feed['parsed_count']} listed={feed['listed_count']} updated={feed['last_updated']}")
        if feed["error"]:
            print(f"    {feed['error']}")
    print(
        "countries",
        snapshot["totals"]["countries"],
        "arcs",
        len(snapshot["arcs"]),
        "geoip",
        "ok" if geo_meta.get("ok") else geo_meta.get("error"),
    )
    return 0


def _urlhaus(now: datetime) -> dict:
    url = "https://urlhaus.abuse.ch/downloads/csv_recent/"
    run = _blank(
        "urlhaus",
        "abuse.ch URLhaus",
        "https://urlhaus.abuse.ch/",
        [url],
        "Free to use with attribution to abuse.ch. See the project terms.",
        "https://urlhaus.abuse.ch/api/",
        "Recent malware URLs. A mapped country is the DB-IP country of an IP literal in the URL, not a victim.",
        now,
    )
    try:
        body, _headers = _get(url)
        updated, events = parse_urlhaus(body.decode("utf-8", "replace"))
        run["last_updated"] = updated
        run["events"] = events
        run["parsed_count"] = len(events)
        run["ok"] = True
    except Exception as exc:  # noqa: BLE001 - one feed must not sink the cache
        run["error"] = _short_error(exc)
    return run


def _threatfox(now: datetime) -> dict:
    url = "https://threatfox.abuse.ch/export/json/recent/"
    run = _blank(
        "threatfox",
        "abuse.ch ThreatFox",
        "https://threatfox.abuse.ch/",
        [url],
        "Free to use with attribution to abuse.ch. See the project terms.",
        "https://threatfox.abuse.ch/api/",
        "Recent indicators. A mapped country is the DB-IP country of an IP literal in the indicator, not a victim.",
        now,
    )
    try:
        body, headers = _get(url)
        newest, events = parse_threatfox(body.decode("utf-8", "replace"))
        run["last_updated"] = newest or _header_time(headers)
        run["events"] = events
        run["parsed_count"] = len(events)
        run["ok"] = True
    except Exception as exc:  # noqa: BLE001
        run["error"] = _short_error(exc)
    return run


def _feodo(now: datetime) -> dict:
    url = "https://feodotracker.abuse.ch/downloads/ipblocklist.json"
    run = _blank(
        "feodo",
        "abuse.ch Feodo Tracker",
        "https://feodotracker.abuse.ch/",
        [url],
        "Free to use with attribution to abuse.ch. See the blocklist terms.",
        "https://feodotracker.abuse.ch/blocklist/",
        "Botnet C2 addresses. The country is the one Feodo publishes for that address, not a victim country.",
        now,
    )
    try:
        body, headers = _get(url)
        updated, events = parse_feodo(body.decode("utf-8", "replace"))
        run["last_updated"] = updated or _header_time(headers)
        run["events"] = events
        run["parsed_count"] = len(events)
        run["ok"] = True
    except Exception as exc:  # noqa: BLE001
        run["error"] = _short_error(exc)
    return run


def _spamhaus(now: datetime) -> dict:
    urls = [
        "https://www.spamhaus.org/drop/drop.txt",
        "https://www.spamhaus.org/drop/edrop.txt",
    ]
    run = _blank(
        "spamhaus",
        "Spamhaus DROP and EDROP",
        "https://www.spamhaus.org/drop/",
        urls,
        "Use only under the Spamhaus DROP terms. This cache attributes Spamhaus and does not resell the lists.",
        "https://www.spamhaus.org/drop/",
        "Listed networks. Country is the DB-IP country of the network address, not a victim country. The file has one last-modified time, not a timestamp per network, so these rows are left out of the 24 hour chart.",
        now,
    )
    events = []
    updated = []
    errors = []
    labels = ["DROP", "EDROP"]
    for url, label in zip(urls, labels):
        try:
            body, _headers = _get(url)
            stamp, rows = parse_spamhaus(body.decode("utf-8", "replace"), feed_label=label)
            events.extend(rows)
            if stamp:
                updated.append(stamp)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{label}: {_short_error(exc)}")
    run["events"] = events
    run["parsed_count"] = len(events)
    run["last_updated"] = max(updated) if updated else None
    run["ok"] = bool(events)
    run["error"] = "; ".join(errors) or None
    return run


def _dshield(now: datetime) -> dict:
    country_url = "https://isc.sans.edu/api/country/all?json"
    top_url = "https://isc.sans.edu/api/topips/records/100?json"
    info_url = "https://isc.sans.edu/api/infocon?json"
    run = _blank(
        "dshield",
        "SANS ISC DShield",
        "https://isc.sans.edu/",
        [country_url, top_url, info_url],
        "CC BY-NC-SA 4.0. Attribute SANS Technology Institute, Internet Storm Center. Do not resell.",
        "https://isc.sans.edu/api/",
        "Source addresses reported to DShield sensors, grouped by the country of the source. The target number in the API is a destination-address count, not a target country. SANS describes the country table as about the last 30 days and does not stamp each row.",
        now,
    )
    errors = []
    try:
        body, _headers = _get(country_url)
        stats = parse_dshield_countries(body.decode("utf-8", "replace"))
        run["country_stats"] = stats
        run["parsed_count"] += len(stats)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"countries: {_short_error(exc)}")
    try:
        body, _headers = _get(top_url)
        rows = parse_dshield_topips(body.decode("utf-8", "replace"))
        run["events"] = rows
        run["parsed_count"] += len(rows)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"topips: {_short_error(exc)}")
    try:
        body, _headers = _get(info_url)
        payload = json.loads(body.decode("utf-8", "replace"))
        status = payload.get("status") if isinstance(payload, dict) else None
        if status:
            run["role_note"] += f" SANS ISC InfoCon at fetch time: {status}."
    except Exception as exc:  # noqa: BLE001
        errors.append(f"infocon: {_short_error(exc)}")
    run["ok"] = bool(run.get("country_stats") or run.get("events"))
    run["error"] = "; ".join(errors) or None
    run["last_updated"] = None
    return run


def _kev(now: datetime) -> dict:
    url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    run = _blank(
        "kev",
        "CISA Known Exploited Vulnerabilities",
        "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        [url],
        "US government catalog. Public domain. Not a geographic attack feed.",
        "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        "Vulnerabilities CISA lists as known to be exploited. They are not placed on the globe.",
        now,
    )
    try:
        body, _headers = _get(url)
        updated, records = parse_kev(body.decode("utf-8", "replace"))
        run["last_updated"] = updated
        run["kev"] = records[:25]
        run["kev_count"] = len(records)
        run["parsed_count"] = len(records)
        run["ok"] = True
    except Exception as exc:  # noqa: BLE001
        run["error"] = _short_error(exc)
    return run


def _apply_geo(events: list[dict]) -> dict:
    meta = {
        "name": "DB-IP Country Lite",
        "licence": "CC BY 4.0",
        "licence_url": "https://creativecommons.org/licenses/by/4.0/",
        "attribution": "IP geolocation by DB-IP (https://db-ip.com)",
        "source_url": None,
        "ok": False,
        "error": None,
        "matched": 0,
        "unmatched": 0,
    }
    pending = [event for event in events if event.get("ip") and not event.get("country")]
    if not pending:
        meta["ok"] = True
        meta["error"] = None
        return meta
    text = None
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month
    last_error = "DB-IP download failed"
    for _ in range(3):
        url = f"https://download.db-ip.com/free/dbip-country-lite-{year:04d}-{month:02d}.csv.gz"
        try:
            body, _headers = _get(url, timeout=120)
            text = gzip.decompress(body).decode("utf-8", "replace")
            meta["source_url"] = url
            break
        except Exception as exc:  # noqa: BLE001
            last_error = _short_error(exc)
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    if text is None:
        meta["error"] = last_error
        meta["unmatched"] = len(pending)
        return meta
    database = GeoDB()
    database.load_csv(text)
    matched = 0
    for event in pending:
        code = database.country(event.get("ip"))
        if code:
            event["country"] = code
            matched += 1
    meta["ok"] = True
    meta["matched"] = matched
    meta["unmatched"] = len(pending) - matched
    return meta


def _blank(feed_id, name, homepage, urls, licence, licence_url, role_note, now: datetime) -> dict:
    return {
        "id": feed_id,
        "name": name,
        "homepage": homepage,
        "source_urls": urls,
        "licence": licence,
        "licence_url": licence_url,
        "role_note": role_note,
        "last_updated": None,
        "fetched_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ok": False,
        "error": None,
        "parsed_count": 0,
        "events": [],
        "country_stats": [],
        "kev": [],
        "kev_count": 0,
    }


def _places() -> dict[str, dict]:
    payload = json.loads(PLACES.read_text(encoding="utf-8"))
    places = {}
    for feature in payload["features"]:
        props = feature["properties"]
        places[props["iso"]] = {"name": props["name"], "lat": props["lat"], "lon": props["lon"]}
    return places


def _get(url: str, timeout: int = 90) -> tuple[bytes, dict]:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read(), dict(response.headers.items())


def _header_time(headers: dict) -> str | None:
    from parsers import http_time

    for key, value in headers.items():
        if key.lower() == "last-modified":
            return http_time(value)
    return None


def _short_error(exc: BaseException) -> str:
    text = f"{type(exc).__name__}: {exc}"
    text = " ".join(text.split())
    return text[:240]


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
