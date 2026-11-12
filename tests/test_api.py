"""Smoke and defensive control tests: no network dependency."""
import os
os.environ.setdefault("SOC_MODE", "demo")
os.environ.setdefault("SOC_DB_PATH", "/tmp/aegis-soc-test.db")

from fastapi.testclient import TestClient
from app.main import app


def test_demo_dashboard_and_cases():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        status = client.get("/api/status").json()
        assert status["product"] == "AEGIS GLOBAL SOC"
        overview = client.get("/api/overview").json()
        assert "metrics" in overview
        assert len(overview["trend"]) == 24
        assert client.get("/").status_code == 200
        assert client.get("/api/incidents").status_code == 200


def test_ingest_deduplicates_and_triages():
    event = {
        "event_id": "test-run-dedupe-2026-11-12",
        "source": "test-sensor", "severity": "critical", "type": "Brute force",
        "country": "GB", "src_ip": "203.0.113.2", "target": "demo-vpn",
        "summary": "Repeated failed logins on a synthetic endpoint."
    }
    with TestClient(app) as client:
        a = client.post("/api/v1/ingest", json={"events": [event]})
        assert a.status_code == 200
        assert a.json()["accepted"] + a.json()["duplicates"] == 1
        b = client.post("/api/v1/ingest", json={"events": [event]})
        assert b.json()["duplicates"] == 1
        cases = client.get("/api/incidents").json()["items"]
        assert cases
        target = next((x for x in cases if x["title"] == "Brute force · demo-vpn"), None)
        if target:
            response = client.post(f"/api/incidents/{target['id']}/status", json={"status": "investigating"})
            assert response.status_code == 200
            assert response.json()["note"].startswith("Case status only")


def test_bad_input_and_ai_fail_closed():
    with TestClient(app) as client:
        bad = client.post("/api/v1/ingest", json={"events": [{"source": "x", "severity": "extreme", "type": "T"}]})
        assert bad.status_code == 422
        if not client.get("/api/status").json()["ai_enabled"]:
            assert client.post("/api/ai/brief").status_code == 503
