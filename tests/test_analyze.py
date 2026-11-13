import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from analyze import build_report, maybe_llm_enrich  # noqa: E402
from aggregate import LABEL, build_snapshot, validate  # noqa: E402
from parsers import parse_feodo, parse_kev, parse_threatfox  # noqa: E402


FIXTURES = ROOT / "tests" / "fixtures"
PLACES = {
    "US": {"name": "United States of America", "lat": 39.5, "lon": -97.5},
    "DE": {"name": "Germany", "lat": 51.2, "lon": 10.4},
}


def _run(feed_id, events, **extra):
    row = {
        "id": feed_id,
        "name": feed_id,
        "homepage": "https://example.test/",
        "source_urls": ["https://example.test/feed"],
        "licence": "test fixture",
        "licence_url": "https://example.test/licence",
        "role_note": "test fixture",
        "last_updated": "2026-10-18T00:00:00Z",
        "fetched_at": "2026-10-18T01:00:00Z",
        "ok": True,
        "error": None,
        "parsed_count": len(events),
        "events": events,
        "country_stats": [],
        "asn_listings": [],
        "kev": [],
        "kev_count": 0,
    }
    row.update(extra)
    return row


def test_rule_based_report_uses_only_snapshot_facts(tmp_path, monkeypatch):
    _updated, feodo = parse_feodo((FIXTURES / "feodo.json").read_text(encoding="utf-8"))
    _updated, fox = parse_threatfox((FIXTURES / "threatfox.json").read_text(encoding="utf-8"))
    _updated, kev = parse_kev((FIXTURES / "kev.json").read_text(encoding="utf-8"))
    snapshot = build_snapshot(
        datetime(2026, 10, 18, 1, 0, tzinfo=timezone.utc),
        [
            _run("feodo", feodo),
            _run("threatfox", fox),
            _run("kev", [], kev=kev[:3], kev_count=len(kev), parsed_count=len(kev)),
        ],
        PLACES,
        {"name": "test", "ok": True},
    )
    assert validate(snapshot) == []
    report = build_report(snapshot)
    text = report["markdown"]
    assert "Executive summary" in text
    assert "Recommended actions" in text
    assert "Vidar" in text
    assert "Emotet" in text or "QakBot" in text
    assert "CVE-2026-102764" in text
    assert "not a live attack stream" in text.lower() or "not a live attack stream" in text
    assert "rule-based" in text
    assert "does not invent" in text.lower() or "does not invent" in "\n".join(report["sections"]["method"]).lower()
    # Must not claim target countries
    assert "top target country" not in text.lower()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    section, status = maybe_llm_enrich(snapshot, text)
    assert section is None
    assert status["used"] is False


def test_demo_report_is_flagged():
    demo = json.loads((ROOT / "public" / "data" / "demo.json").read_text(encoding="utf-8"))
    report = build_report(demo)
    assert "simulated" in report["title"].lower()
    joined = " ".join(report["sections"]["executive_summary"]).lower()
    assert "simulated" in joined
    assert report["analyst"] == "rule-based"


def test_llm_hook_skipped_without_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    section, status = maybe_llm_enrich({"totals": {}}, "# report")
    assert section is None
    assert status["used"] is False
    assert "OPENAI_API_KEY" in status["reason"]
