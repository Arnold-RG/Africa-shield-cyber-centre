"""Deterministic SOC analyst for a cached WorldShield snapshot.

By default this writes a rule-based report from the snapshot only. It does
not invent events, countries, or arcs. If OPENAI_API_KEY is set, an optional
LLM pass may add a clearly labeled enrichment section. The key is read from
the environment and is never written to disk.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "public" / "data" / "snapshot.json"
REPORT_DIR = ROOT / "public" / "data" / "reports"
LLM_URL = os.environ.get("WORLDSHIELD_LLM_URL", "https://api.openai.com/v1/chat/completions")
LLM_MODEL = os.environ.get("WORLDSHIELD_LLM_MODEL", "gpt-4o-mini")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a WorldShield SOC report from the cached snapshot.")
    parser.add_argument("--snapshot", type=Path, default=SNAPSHOT)
    parser.add_argument("--out-dir", type=Path, default=REPORT_DIR)
    parser.add_argument("--llm", action="store_true", help="Try the optional LLM hook if OPENAI_API_KEY is set.")
    parser.add_argument("--no-llm", action="store_true", help="Skip the LLM hook even if a key is present.")
    args = parser.parse_args(argv)

    if not args.snapshot.is_file():
        print(f"snapshot not found: {args.snapshot}", file=sys.stderr)
        return 1
    snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
    report = build_report(snapshot)

    want_llm = args.llm or (not args.no_llm and bool(os.environ.get("OPENAI_API_KEY")))
    if args.no_llm:
        want_llm = False
    if want_llm:
        enrichment, status = maybe_llm_enrich(snapshot, report["markdown"])
        report["llm"] = status
        if enrichment:
            report["markdown"] = report["markdown"] + "\n\n" + enrichment
            report["sections"]["llm"] = enrichment
    else:
        report["llm"] = {
            "used": False,
            "reason": "OPENAI_API_KEY not set" if not os.environ.get("OPENAI_API_KEY") else "LLM hook skipped",
        }

    report["html"] = render_html(report, snapshot)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "latest.md").write_text(report["markdown"] + "\n", encoding="utf-8")
    (args.out_dir / "latest.html").write_text(report["html"], encoding="utf-8")
    public = {
        "generated_at": report["generated_at"],
        "snapshot_generated_at": snapshot.get("generated_at"),
        "analyst": report["analyst"],
        "llm": report["llm"],
        "title": report["title"],
        "executive_summary": report["sections"]["executive_summary"],
        "trends": report["sections"]["trends"],
        "top_threats": report["sections"]["top_threats"],
        "recommended_actions": report["sections"]["recommended_actions"],
        "method": report["sections"]["method"],
        "markdown": report["markdown"],
        "simulated": bool(snapshot.get("simulated")),
    }
    (args.out_dir / "latest.json").write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    stamp = (snapshot.get("generated_at") or report["generated_at"] or "undated").replace(":", "").replace("-", "")
    (args.out_dir / f"report-{stamp}.md").write_text(report["markdown"] + "\n", encoding="utf-8")
    print(f"wrote {args.out_dir / 'latest.md'}")
    print(f"analyst={report['analyst']} llm_used={report['llm'].get('used')}")
    return 0


def build_report(snapshot: dict) -> dict:
    now = datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    totals = snapshot.get("totals") or {}
    feeds = snapshot.get("feeds") or []
    ok = [feed for feed in feeds if feed.get("ok")]
    failed = [feed for feed in feeds if not feed.get("ok")]
    sources = snapshot.get("top_sources") or []
    families = snapshot.get("malware_families") or []
    asns = snapshot.get("asns") or []
    types = snapshot.get("types") or []
    kev = snapshot.get("kev") or []
    severities = snapshot.get("severities") or []
    timeline = snapshot.get("timeline") or {}
    buckets = timeline.get("buckets") or []
    generated = snapshot.get("generated_at") or "unknown time"
    simulated = bool(snapshot.get("simulated"))
    analyst = "rule-based"

    exec_lines = _executive(snapshot, ok, failed, totals, sources, families, kev, simulated, generated)
    trend_lines = _trends(timeline, buckets, types, feeds)
    threat_lines = _top_threats(sources, families, asns, types, kev, severities, totals)
    action_lines = _actions(snapshot, failed, kev, families, asns, feeds, totals)
    method_lines = _method(snapshot)

    title = "WorldShield SOC report"
    if simulated:
        title += " (simulated demo data)"

    markdown_parts = [
        f"# {title}",
        "",
        f"- Report generated: {now} (rule-based analyst).",
        f"- Snapshot generated: {generated}.",
        f"- Label: {snapshot.get('label') or 'unlabeled'}.",
        f"- {snapshot.get('cache_note') or 'This is a cached snapshot. It is not a live attack stream.'}",
    ]
    if simulated:
        markdown_parts.append(f"- Banner: {snapshot.get('banner')}")
    markdown_parts.extend(["", "## Executive summary", ""])
    markdown_parts.extend(exec_lines)
    markdown_parts.extend(["", "## Trends", ""])
    markdown_parts.extend(trend_lines)
    markdown_parts.extend(["", "## Top threats", ""])
    markdown_parts.extend(threat_lines)
    markdown_parts.extend(["", "## Recommended actions", ""])
    markdown_parts.extend(action_lines)
    markdown_parts.extend(["", "## Method and caveats", ""])
    markdown_parts.extend(method_lines)

    return {
        "title": title,
        "generated_at": now,
        "analyst": analyst,
        "markdown": "\n".join(markdown_parts),
        "sections": {
            "executive_summary": exec_lines,
            "trends": trend_lines,
            "top_threats": threat_lines,
            "recommended_actions": action_lines,
            "method": method_lines,
        },
        "llm": {"used": False},
    }


def _executive(snapshot, ok, failed, totals, sources, families, kev, simulated, generated) -> list[str]:
    lines = []
    if simulated:
        lines.append(
            "This report is based on a **simulated demo** snapshot. It must not be treated as reported threat activity."
        )
    feeds_ok = totals.get("feeds_ok", len(ok))
    feeds_total = totals.get("feeds_total", feeds_ok + totals.get("feeds_failed", len(failed)))
    lines.append(
        f"WorldShield SOC refreshed its public-feed cache at {generated}. "
        f"{feeds_ok} of {feeds_total} feeds returned data. "
        "Figures below are counts from those cached parses, not a live detection stream."
    )
    parts = []
    if totals.get("urlhaus"):
        parts.append(f"{_num(totals['urlhaus'])} recent URLhaus malware URLs")
    if totals.get("threatfox"):
        parts.append(f"{_num(totals['threatfox'])} ThreatFox indicators")
    if totals.get("feodo"):
        parts.append(f"{_num(totals['feodo'])} Feodo Tracker C2 addresses")
    if totals.get("sslbl"):
        parts.append(f"{_num(totals['sslbl'])} SSLBL addresses")
    if totals.get("spamhaus"):
        parts.append(f"{_num(totals['spamhaus'])} Spamhaus DROP networks")
    if totals.get("asndrop"):
        parts.append(f"{_num(totals['asndrop'])} ASN-DROP listings")
    if totals.get("dshield_source_addresses"):
        parts.append(
            f"{_num(totals['dshield_source_addresses'])} DShield source addresses "
            f"({_num(totals.get('dshield_source_reports') or 0)} sensor reports, about the last 30 days)"
        )
    if totals.get("kev"):
        parts.append(f"{_num(totals['kev'])} CISA KEV catalog entries")
    if parts:
        lines.append("The parse includes " + "; ".join(parts) + ".")
    if sources:
        top = ", ".join(f"{row['name']} ({_num(row['value'])} source addresses)" for row in sources[:5])
        lines.append(
            f"The highest DShield source-address counts, by country of the source and not of a victim, are {top}."
        )
    if families:
        top_f = ", ".join(f"{row['family']} ({_num(row['count'])})" for row in families[:5])
        lines.append(f"The most frequently tagged malware families in this cache are {top_f}.")
    ransomware = [item for item in kev if str(item.get("ransomware") or "").lower() in {"known", "yes"}]
    if kev:
        newest = kev[0]
        extra = f" {len(ransomware)} of the listed recent entries are tagged for known ransomware use." if ransomware else ""
        lines.append(
            f"The newest CISA KEV entry in this cache is {newest.get('cve')} ({newest.get('name')}), "
            f"added {newest.get('date_added') or 'on an unstated date'}.{extra}"
        )
    if failed:
        names = ", ".join(feed["name"] for feed in failed)
        lines.append(f"Feeds that did not return usable data in this run: {names}. Treat those panels as stale.")
    lines.append(
        "No fetched feed publishes a victim or target country, so this report does not rank target countries or draw attack paths."
    )
    return lines


def _trends(timeline, buckets, types, feeds) -> list[str]:
    lines = []
    note = timeline.get("note")
    if note:
        lines.append(note)
    if buckets and any(buckets):
        total = sum(buckets)
        peak = max(buckets)
        peak_index = buckets.index(peak)
        end = timeline.get("end")
        peak_label = _hour_label(end, peak_index, timeline.get("hours") or 24)
        first = sum(buckets[:12])
        second = sum(buckets[12:])
        if first and second:
            if second > first:
                tilt = f"The second half of the window has more stamped indicators ({_num(second)} vs {_num(first)})."
            elif first > second:
                tilt = f"The first half of the window has more stamped indicators ({_num(first)} vs {_num(second)})."
            else:
                tilt = "The two halves of the window have the same stamped-indicator count."
        else:
            tilt = "One half of the window has no stamped indicators."
        lines.append(
            f"Across the 24-hour cache window there are {_num(total)} feed-stamped indicators. "
            f"The peak hour is {peak_label} with {_num(peak)} stamps. {tilt}"
        )
        by_feed = timeline.get("by_feed") or {}
        if by_feed:
            ranked = sorted(((sum(vals), name) for name, vals in by_feed.items()), reverse=True)
            bits = ", ".join(f"{name} {_num(total)}" for total, name in ranked[:5] if total)
            if bits:
                lines.append(f"Stamped volume by feed in this window: {bits}.")
    else:
        lines.append(
            "No feed timestamps fell inside this 24-hour cache window, so the timeline is empty. "
            "That is a property of the stamps, not evidence that nothing happened."
        )
    if types:
        top = ", ".join(f"{row['type']} ({_num(row['count'])})" for row in types[:6])
        lines.append(f"Threat-type counts over the full parse, not only the 24-hour window: {top}.")
    stale = []
    for feed in feeds:
        if not feed.get("ok"):
            continue
        updated = feed.get("last_updated")
        fetched = feed.get("fetched_at")
        if updated and fetched and updated < fetched:
            # just factual, not "stale" unless very old - mention the two times
            pass
    return lines


def _top_threats(sources, families, asns, types, kev, severities, totals) -> list[str]:
    lines = []
    if sources:
        lines.append("**Source countries (DShield source addresses, about 30 days of sensor reports):**")
        for row in sources[:8]:
            lines.append(f"- {row['name']} ({row['code']}): {_num(row['value'])} — {row.get('metric') or 'source addresses'}.")
    if families:
        lines.append("**Malware families (from tags the feeds themselves published):**")
        for row in families[:10]:
            lines.append(f"- {row['family']}: {_num(row['count'])} indicators in the full parse.")
    if asns:
        lines.append("**Autonomous systems (from feed-published ASN fields and Spamhaus ASN-DROP):**")
        for row in asns[:10]:
            name = row.get("name") or "name not published"
            country = f", country {row['country']}" if row.get("country") else ""
            lines.append(f"- AS{row['asn']} ({name}{country}): {_num(row['count'])} listings or indicators.")
    if severities:
        bits = ", ".join(f"{row['severity']} {_num(row['count'])}" for row in severities)
        lines.append(f"**Local triage severity on parsed events:** {bits}. See the method section for how these labels are assigned.")
    recent_kev = kev[:8]
    if recent_kev:
        lines.append("**Recent CISA Known Exploited Vulnerabilities (catalog dates, not exploit timestamps):**")
        for item in recent_kev:
            ransom = item.get("ransomware") or "Unknown"
            lines.append(
                f"- {item.get('cve')}: {item.get('name')} ({item.get('vendor')} {item.get('product')}), "
                f"added {item.get('date_added') or 'unstated'}, ransomware campaign use: {ransom}."
            )
    if not sources and not families and not asns and not kev:
        lines.append("The snapshot does not contain ranked threats to list.")
    return lines


def _actions(snapshot, failed, kev, families, asns, feeds, totals) -> list[str]:
    actions = []
    recent_kev = []
    ransomware = []
    for item in kev:
        if str(item.get("ransomware") or "").lower() in {"known", "yes"}:
            ransomware.append(item)
        recent_kev.append(item)
    if recent_kev:
        cves = ", ".join(item["cve"] for item in recent_kev[:6] if item.get("cve"))
        actions.append(
            f"Prioritize patching of the newest CISA KEV entries in this cache ({cves}). "
            "Confirm exposure against local inventory before treating a CVE as relevant."
        )
    if ransomware:
        cves = ", ".join(item["cve"] for item in ransomware[:6] if item.get("cve"))
        actions.append(
            f"Give earlier attention to KEV items with known ransomware campaign use: {cves}."
        )
    if totals.get("feodo"):
        actions.append(
            "Block Feodo Tracker C2 addresses at the perimeter and review outbound traffic to those hosts. "
            "The Feodo country field is the location of the C2 address, not a victim country."
        )
    if totals.get("sslbl"):
        actions.append(
            "Review TLS sessions involving SSLBL-listed addresses. Those listings follow malicious certificates, not a victim geography."
        )
    if totals.get("spamhaus") or totals.get("asndrop"):
        actions.append(
            "Apply Spamhaus DROP and ASN-DROP listings only under Spamhaus terms, and only as a network-control input. "
            "Do not republish the raw lists."
        )
    if families:
        names = ", ".join(row["family"] for row in families[:5])
        actions.append(
            f"Hunt in local telemetry for the malware families that appear most often in this cache: {names}. "
            "Family names are the ones the feeds published."
        )
    if totals.get("dshield_source_addresses"):
        actions.append(
            "Treat DShield country totals as sensor-reported source volume over about 30 days, not as a live attack count "
            "and not as attribution of a campaign to a government."
        )
    if failed:
        names = ", ".join(feed["id"] for feed in failed)
        actions.append(
            f"Investigate the failed feed fetch(es) ({names}) and do not make operational decisions from empty panels for those sources."
        )
    actions.append(
        "Correlate every indicator with local logs before blocking or escalating. "
        "This cache is a near-real-time public-feed snapshot, not a substitute for internal detection."
    )
    actions.append(
        "Do not draw source-to-target attack paths from this data: the fetched feeds do not name a target country."
    )
    return [f"{index}. {text}" for index, text in enumerate(actions, start=1)]


def _method(snapshot) -> list[str]:
    lines = [
        "This report was produced by a deterministic rule-based analyst that reads only the cached snapshot.",
        "It does not invent events, countries, malware families, ASNs, or source-to-target arcs.",
        snapshot.get("cache_note") or "The snapshot is a cache. It is not a live attack stream.",
        snapshot.get("top_targets_note") or "",
        snapshot.get("arcs_note") or "",
        snapshot.get("severity_note") or "",
        snapshot.get("sample_note") or "",
        "IP countries that a feed does not already publish come from DB-IP Country Lite (CC BY 4.0), which is a country locator, not a street address and not a victim.",
        "An optional LLM enrichment, when enabled, is appended in a separate section and must not override these facts.",
    ]
    return [line for line in lines if line]


def maybe_llm_enrich(snapshot: dict, markdown: str) -> tuple[str | None, dict]:
    """Optional hook. Returns (markdown section or None, status). Never logs the key."""
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None, {"used": False, "reason": "OPENAI_API_KEY not set"}
    facts = {
        "generated_at": snapshot.get("generated_at"),
        "label": snapshot.get("label"),
        "simulated": snapshot.get("simulated"),
        "totals": snapshot.get("totals"),
        "top_sources": snapshot.get("top_sources"),
        "malware_families": (snapshot.get("malware_families") or [])[:10],
        "asns": (snapshot.get("asns") or [])[:10],
        "types": (snapshot.get("types") or [])[:10],
        "severities": snapshot.get("severities"),
        "kev": [
            {k: item.get(k) for k in ("cve", "name", "vendor", "product", "date_added", "ransomware")}
            for item in (snapshot.get("kev") or [])[:8]
        ],
        "feeds": [
            {k: feed.get(k) for k in ("id", "name", "ok", "parsed_count", "error", "last_updated", "fetched_at")}
            for feed in (snapshot.get("feeds") or [])
        ],
        "timeline_buckets": (snapshot.get("timeline") or {}).get("buckets"),
        "cache_note": snapshot.get("cache_note"),
        "top_targets_note": snapshot.get("top_targets_note"),
    }
    body = {
        "model": LLM_MODEL,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a SOC analyst writing a short enrichment for a cached public-feed snapshot. "
                    "Use only the provided facts. Do not invent indicators, countries, victims, or attack paths. "
                    "If a fact is missing, say so. Write Markdown under the heading "
                    "'## LLM enrichment (optional, not authoritative)'. "
                    "Start with a sentence that this section is a model-generated commentary on the facts above "
                    "and that the rule-based report remains authoritative."
                ),
            },
            {
                "role": "user",
                "content": "Facts (JSON):\n" + json.dumps(facts, indent=2)[:20000],
            },
        ],
    }
    request = urllib.request.Request(
        LLM_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
            "User-Agent": "WorldShieldSOC/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as exc:
        return None, {"used": False, "reason": f"LLM HTTP {exc.code}"}
    except Exception as exc:  # noqa: BLE001
        return None, {"used": False, "reason": f"{type(exc).__name__}"}
    try:
        text = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None, {"used": False, "reason": "LLM response missing content"}
    if not isinstance(text, str) or not text.strip():
        return None, {"used": False, "reason": "LLM response empty"}
    cleaned = text.strip()
    if not cleaned.startswith("#"):
        cleaned = "## LLM enrichment (optional, not authoritative)\n\n" + cleaned
    return cleaned, {"used": True, "model": LLM_MODEL, "reason": "completed"}


def render_html(report: dict, snapshot: dict) -> str:
    title = html.escape(report["title"])
    generated = html.escape(str(report.get("generated_at") or ""))
    snap_time = html.escape(str(snapshot.get("generated_at") or ""))
    banner = ""
    if snapshot.get("simulated") and snapshot.get("banner"):
        banner = f'<p class="banner">{html.escape(str(snapshot["banner"]))}</p>'
    def section(heading: str, lines: list[str]) -> str:
        items = "".join(f"<p>{_mdline(line)}</p>" for line in lines)
        return f"<section><h2>{html.escape(heading)}</h2>{items}</section>"
    llm_note = report.get("llm") or {}
    llm_html = ""
    if llm_note.get("used") and report["sections"].get("llm"):
        llm_html = f"<section><pre class='md'>{html.escape(report['sections']['llm'])}</pre></section>"
    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="WorldShield SOC cached threat report. Not a live attack stream.">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{title}</title>
<style>
  :root {{ color-scheme: dark; font-family: "Segoe UI", ui-sans-serif, sans-serif; }}
  body {{ margin: 0 auto; max-width: 52rem; padding: 1.5rem; background: #070b10; color: #d7e4e0; line-height: 1.5; }}
  h1 {{ font-size: 1.6rem; }}
  h2 {{ color: #e0a45a; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.85rem; }}
  a {{ color: #7dcec4; }}
  .meta, .foot {{ color: #93aaa4; font-size: 0.9rem; }}
  .banner {{ background: #3a2412; color: #f3d7b0; padding: 0.8rem 1rem; border: 1px solid #e0a45a; }}
  .foot {{ margin-top: 2rem; border-top: 1px solid rgba(140,196,188,0.22); padding-top: 1rem; }}
  pre.md {{ white-space: pre-wrap; }}
</style>
</head>
<body>
<article>
<h1>{title}</h1>
<p class="meta">Report generated {generated}. Snapshot generated {snap_time}. Analyst: {html.escape(str(report.get('analyst') or 'rule-based'))}.</p>
{banner}
{section("Executive summary", report["sections"]["executive_summary"])}
{section("Trends", report["sections"]["trends"])}
{section("Top threats", report["sections"]["top_threats"])}
{section("Recommended actions", report["sections"]["recommended_actions"])}
{section("Method and caveats", report["sections"]["method"])}
{llm_html}
<p class="foot">WorldShield SOC, by Vira. This page is a cached analytical report, not a live attack stream.</p>
</article>
</body>
</html>
"""
    return body


def _mdline(line: str) -> str:
    text = html.escape(line)
    text = text.replace("**", "<strong>", 1)
    if "<strong>" in text and text.count("**") >= 1:
        text = text.replace("**", "</strong>", 1)
    return text


def _num(value) -> str:
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return "0"


def _hour_label(end: str | None, index: int, hours: int) -> str:
    if not end:
        return f"hour {index + 1} of the window"
    try:
        close = datetime.strptime(end, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return f"hour {index + 1} of the window"
    # bucket 23 is the last hour of the window (ending at `end`)
    from datetime import timedelta
    start = close - timedelta(hours=(hours - index))
    return start.strftime("%Y-%m-%d %H:%M UTC")


if __name__ == "__main__":
    raise SystemExit(main())
