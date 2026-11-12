#!/usr/bin/env python3
"""Forward Suricata EVE alert JSON lines to AEGIS using a dedicated collector key.

Example (Linux): tail -F /var/log/suricata/eve.json | \
  SOC_URL=https://your-soc.example SOC_INGEST_KEY=... python integrations/suricata_forwarder.py

Run near a trusted Suricata sensor. This reference adapter sends one alert at a
time; production should use a durable queue, replay protection and TLS mTLS.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
import logging
import os
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("aegis.suricata")
BASE_URL = os.environ.get("SOC_URL", "http://127.0.0.1:8080").rstrip("/")
INGEST_KEY = os.environ.get("SOC_INGEST_KEY", "")


def transform(raw: dict) -> dict | None:
    if raw.get("event_type") != "alert" or not isinstance(raw.get("alert"), dict):
        return None
    alert = raw["alert"]
    severity_map = {1: "critical", 2: "high", 3: "medium", 4: "low"}
    severity = severity_map.get(int(alert.get("severity", 3)), "low")
    source_id = ":".join(str(raw.get(k, "")) for k in ("timestamp", "flow_id"))
    source_id += ":" + str(alert.get("signature_id", ""))
    return {
        "event_id": source_id[:128],
        "source": "Suricata",
        "severity": severity,
        "type": str(alert.get("signature", "IDS alert"))[:90],
        "src_ip": str(raw.get("src_ip", ""))[:80],
        "target": str(raw.get("dest_ip", ""))[:100],
        "country": "ZZ",  # No claim of geography without licensed, verified geo-IP enrichment.
        "summary": ("IDS classification: " + str(alert.get("category", "Unclassified")))[:500],
        "confidence": 80,
    }


def deliver(event: dict) -> None:
    data = json.dumps({"events": [event]}).encode("utf-8")
    request = Request(
        BASE_URL + "/api/v1/ingest",
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-SOC-Ingest-Key": INGEST_KEY,
            "User-Agent": "AEGIS-Suricata-Forwarder/1.0"
        },
    )
    for attempt in range(4):
        try:
            with urlopen(request, timeout=8) as response:
                result = json.load(response)
            if not result.get("ok"):
                raise RuntimeError("Ingest service did not acknowledge event")
            return
        except (HTTPError, URLError, TimeoutError, RuntimeError) as error:
            log.error("Delivery failed, attempt %d/4: %s", attempt + 1, type(error).__name__)
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def main() -> None:
    if not INGEST_KEY:
        log.error("Set SOC_INGEST_KEY before running the forwarder")
        raise SystemExit(2)
    if not BASE_URL.startswith(("https://", "http://127.0.0.1:", "http://localhost:")):
        log.error("Remote SOC_URL must use HTTPS")
        raise SystemExit(2)
    for line in sys.stdin:
        try:
            raw = json.loads(line)
            event = transform(raw)
            if event:
                deliver(event)
        except (ValueError, TypeError, RuntimeError, HTTPError, URLError, TimeoutError) as error:
            log.warning("Skipped or undeliverable event: %s", type(error).__name__)


if __name__ == "__main__":
    main()
