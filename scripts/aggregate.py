"""Build the dashboard snapshot from parsed public records."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

LABEL = "Live reported threat activity from public feeds"
CACHE_NOTE = "This is a cached report built by the fetch job. It is not a live attack stream."
TARGET_NOTE = (
    "No fetched feed publishes a target country. DShield's target field counts "
    "destination addresses worldwide for sources located in a country, so it is "
    "not ranked here as a target country."
)
ARCS_NOTE = (
    "No arcs are drawn. A feed would have to name a source country and a target "
    "country on the same report. These feeds do not."
)
TIMELINE_NOTE = (
    "Each bar counts timestamps carried by the feeds during that hour of this "
    "cache window. An empty bar means those feeds had no timestamp then, not that "
    "an attack did not happen."
)
LIST_LIMITS = {
    "urlhaus": 80,
    "threatfox": 80,
    "feodo": 20,
    "spamhaus": 40,
    "dshield": 30,
}


def assign_source_countries(events: list[dict]) -> None:
    """A DShield source IP's country is a source country. Nothing else is."""
    for event in events:
        if event.get("role") == "source" and event.get("country") and not event.get("source_country"):
            event["source_country"] = event["country"]


def build_arcs(events: list[dict]) -> list[dict]:
    arcs = []
    seen = set()
    for event in events:
        source = event.get("source_country")
        target = event.get("target_country")
        if not source or not target or source == target:
            continue
        key = (source, target, event.get("feed"))
        if key in seen:
            continue
        seen.add(key)
        arcs.append(
            {
                "source_country": source,
                "target_country": target,
                "feed": event.get("feed"),
                "reference": event.get("reference"),
                "simulated": bool(event.get("simulated")),
            }
        )
    return arcs


def timeline_index(when: datetime, end: datetime) -> int | None:
    delta = (end - when).total_seconds()
    if delta < 0 or delta >= 86400:
        return None
    hours_ago = int(delta // 3600)
    return 23 - hours_ago


def build_snapshot(generated_at: datetime, feed_runs: list[dict], places: dict[str, dict], geoip_meta: dict) -> dict:
    if generated_at.tzinfo is None:
        generated_at = generated_at.replace(tzinfo=timezone.utc)
    generated_at = generated_at.astimezone(timezone.utc).replace(microsecond=0)
    all_events: list[dict] = []
    countries: dict[str, dict] = {}
    type_counts: Counter[str] = Counter()
    buckets = [0] * 24
    by_feed_buckets: dict[str, list[int]] = defaultdict(lambda: [0] * 24)
    by_type_buckets: dict[str, list[int]] = defaultdict(lambda: [0] * 24)
    host_keys: set[tuple[str, str, str]] = set()

    def country_row(code: str) -> dict | None:
        place = places.get(code)
        if place is None:
            return None
        row = countries.get(code)
        if row is None:
            row = {
                "code": code,
                "name": place["name"],
                "lat": place["lat"],
                "lon": place["lon"],
                "source_addresses": 0,
                "source_reports": 0,
                "persistence_days": None,
                "host_observations": 0,
                "by_feed": {},
                "types": set(),
            }
            countries[code] = row
        return row

    for run in feed_runs:
        for stat in run.get("country_stats") or []:
            row = country_row(stat["code"])
            if row is None:
                continue
            row["source_addresses"] += stat.get("source_addresses") or 0
            row["source_reports"] += stat.get("source_reports") or 0
            if stat.get("persistence_days") is not None:
                row["persistence_days"] = stat["persistence_days"]
            slot = row["by_feed"].setdefault("dshield", {"source_addresses": 0, "source_reports": 0, "observations": 0})
            slot["source_addresses"] += stat.get("source_addresses") or 0
            slot["source_reports"] += stat.get("source_reports") or 0
            row["types"].add("sensor-source")

        for event in run.get("events") or []:
            all_events.append(event)
            threat_type = event.get("threat_type") or "unspecified"
            type_counts[threat_type] += 1
            observed = _parse_time(event.get("observed_at"))
            if observed is not None:
                index = timeline_index(observed, generated_at)
                if index is not None:
                    buckets[index] += 1
                    by_feed_buckets[event["feed"]][index] += 1
                    by_type_buckets[threat_type][index] += 1
            code = event.get("country")
            if event.get("role") == "infrastructure" and code and event.get("ip"):
                key = (event["feed"], code, event["ip"])
                if key not in host_keys:
                    host_keys.add(key)
                    row = country_row(code)
                    if row is not None:
                        row["host_observations"] += 1
                        slot = row["by_feed"].setdefault(event["feed"], {"observations": 0})
                        slot["observations"] = slot.get("observations", 0) + 1
                        row["types"].add(threat_type)
            elif event.get("role") == "source" and code:
                row = country_row(code)
                if row is not None:
                    row["types"].add(threat_type)

    listed = _select_events(all_events)
    arcs = build_arcs(all_events)
    country_list = []
    for row in countries.values():
        if row["source_addresses"] == 0 and row["host_observations"] == 0:
            continue
        country_list.append(
            {
                "code": row["code"],
                "name": row["name"],
                "lat": row["lat"],
                "lon": row["lon"],
                "source_addresses": row["source_addresses"],
                "source_reports": row["source_reports"],
                "persistence_days": row["persistence_days"],
                "host_observations": row["host_observations"],
                "by_feed": row["by_feed"],
                "types": sorted(row["types"]),
            }
        )
    country_list.sort(key=lambda item: (-item["source_addresses"], -item["host_observations"], item["code"]))

    top_sources = [
        {
            "code": item["code"],
            "name": item["name"],
            "value": item["source_addresses"],
            "metric": "DShield source addresses located in this country",
        }
        for item in country_list
        if item["source_addresses"] > 0
    ][:8]

    feeds_out = []
    for run in feed_runs:
        feeds_out.append(
            {
                "id": run["id"],
                "name": run["name"],
                "homepage": run["homepage"],
                "source_urls": list(run["source_urls"]),
                "licence": run["licence"],
                "licence_url": run["licence_url"],
                "role_note": run["role_note"],
                "last_updated": run.get("last_updated"),
                "fetched_at": run.get("fetched_at"),
                "ok": bool(run.get("ok")),
                "error": run.get("error"),
                "parsed_count": int(run.get("parsed_count") or 0),
                "listed_count": sum(1 for event in listed if event["feed"] == run["id"]),
            }
        )

    source_addresses = sum(item["source_addresses"] for item in country_list)
    source_reports = sum(item["source_reports"] for item in country_list)
    kev = []
    for run in feed_runs:
        kev.extend(run.get("kev") or [])
    kev = sorted(kev, key=lambda item: item.get("date_added") or "", reverse=True)[:25]

    return {
        "schema": 1,
        "generated_at": generated_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "label": LABEL,
        "cache_note": CACHE_NOTE,
        "simulated": False,
        "banner": None,
        "sample_note": "The report list keeps the newest rows from each feed, up to a cap. Country totals and the unfiltered 24 hour chart use the full parse.",
        "feeds": feeds_out,
        "geoip": geoip_meta,
        "totals": {
            "urlhaus": _parsed(feed_runs, "urlhaus"),
            "threatfox": _parsed(feed_runs, "threatfox"),
            "feodo": _parsed(feed_runs, "feodo"),
            "spamhaus": _parsed(feed_runs, "spamhaus"),
            "dshield_source_addresses": source_addresses,
            "dshield_source_reports": source_reports,
            "countries": len(country_list),
            "kev": next((int(run.get("kev_count") or 0) for run in feed_runs if run["id"] == "kev"), len(kev)),
            "listed_events": len(listed),
            "feeds_ok": sum(1 for run in feed_runs if run.get("ok")),
            "feeds_failed": sum(1 for run in feed_runs if not run.get("ok")),
        },
        "countries": country_list,
        "top_sources": top_sources,
        "top_targets": [],
        "top_targets_note": TARGET_NOTE,
        "types": [{"type": name, "count": count} for name, count in type_counts.most_common()],
        "timeline": {
            "end": generated_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "hours": 24,
            "buckets": buckets,
            "by_feed": {key: value for key, value in by_feed_buckets.items()},
            "by_type": {key: value for key, value in by_type_buckets.items()},
            "note": TIMELINE_NOTE,
        },
        "events": listed,
        "arcs": arcs,
        "arcs_note": ARCS_NOTE if not arcs else "Arcs connect a source country and a target country named on the same report.",
        "kev": kev,
    }


def validate(doc: dict) -> list[str]:
    errors = []
    if not isinstance(doc, dict):
        return ["snapshot is not an object"]
    simulated = doc.get("simulated")
    if not isinstance(simulated, bool):
        errors.append("simulated must be a boolean")
    if simulated:
        if doc.get("label") == LABEL:
            errors.append("simulated snapshot must not use the live label")
        if not doc.get("banner"):
            errors.append("simulated snapshot needs a banner")
    else:
        if doc.get("label") != LABEL:
            errors.append("live label mismatch")
        if not isinstance(doc.get("cache_note"), str) or "not a live attack stream" not in doc["cache_note"]:
            errors.append("cache note missing")
        if doc.get("banner"):
            errors.append("live snapshot should not carry a demo banner")
    if not isinstance(doc.get("generated_at"), str):
        errors.append("generated_at missing")
    feeds = doc.get("feeds")
    if not isinstance(feeds, list) or not feeds:
        errors.append("feeds missing")
    else:
        seen = set()
        for feed in feeds:
            if feed.get("id") in seen:
                errors.append("duplicate feed id")
            seen.add(feed.get("id"))
            urls = feed.get("source_urls")
            if not isinstance(urls, list) or not urls or not all(str(url).startswith("http") for url in urls):
                errors.append(f"bad source url for {feed.get('id')}")
            if not feed.get("licence") or not feed.get("licence_url"):
                errors.append(f"licence missing for {feed.get('id')}")
    timeline = doc.get("timeline") or {}
    buckets = timeline.get("buckets")
    if not isinstance(buckets, list) or len(buckets) != 24 or any((not isinstance(item, int) or item < 0) for item in buckets):
        errors.append("timeline must be 24 non-negative counts")
    for country in doc.get("countries") or []:
        if not _in_range(country.get("lat"), -90, 90) or not _in_range(country.get("lon"), -180, 180):
            errors.append(f"bad coordinates for {country.get('code')}")
        for key in ("source_addresses", "source_reports", "host_observations"):
            if not isinstance(country.get(key), int) or country[key] < 0:
                errors.append(f"bad {key} for {country.get('code')}")
    if not isinstance(doc.get("top_targets"), list):
        errors.append("top_targets missing")
    if not doc.get("top_targets") and not doc.get("top_targets_note"):
        errors.append("empty target list needs a note")
    for event in doc.get("events") or []:
        if bool(event.get("simulated")) != bool(simulated):
            errors.append("event simulated flag does not match the snapshot")
        if event.get("role") not in {"source", "infrastructure", "report"}:
            errors.append("bad event role")
        reference = event.get("reference")
        if reference is not None and not str(reference).startswith("http"):
            errors.append("bad event reference")
    for arc in doc.get("arcs") or []:
        if not arc.get("source_country") or not arc.get("target_country"):
            errors.append("arc missing an end")
        if bool(arc.get("simulated")) != bool(simulated):
            errors.append("arc simulated flag does not match the snapshot")
    for item in doc.get("kev") or []:
        if bool(item.get("simulated")) != bool(simulated):
            errors.append("kev simulated flag does not match the snapshot")
        if item.get("reference") and not str(item["reference"]).startswith("http"):
            errors.append("bad kev reference")
    return errors


def _select_events(events: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        grouped[event["feed"]].append(event)
    chosen = []
    for feed, rows in grouped.items():
        rows.sort(key=lambda item: item.get("observed_at") or "", reverse=True)
        chosen.extend(rows[: LIST_LIMITS.get(feed, 40)])
    chosen.sort(key=lambda item: item.get("observed_at") or "", reverse=True)
    public = []
    for event in chosen:
        public.append(
            {
                "feed": event["feed"],
                "threat_type": event["threat_type"],
                "title": event["title"],
                "observed_at": event.get("observed_at"),
                "ip": event.get("ip"),
                "country": event.get("country"),
                "source_country": event.get("source_country"),
                "target_country": event.get("target_country"),
                "role": event["role"],
                "reference": event.get("reference"),
                "summary": event["summary"],
                "simulated": False,
                "target_address_count": event.get("target_address_count"),
            }
        )
    return public


def _parsed(feed_runs: list[dict], feed_id: str) -> int:
    for run in feed_runs:
        if run["id"] == feed_id:
            return int(run.get("parsed_count") or 0)
    return 0


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _in_range(value, low: float, high: float) -> bool:
    return isinstance(value, (int, float)) and low <= float(value) <= high
