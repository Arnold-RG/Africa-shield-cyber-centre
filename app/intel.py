"""CISA Known Exploited Vulnerabilities is an authoritative catalog, not an attack stream."""
from __future__ import annotations
import asyncio
import logging
import httpx

from . import config, db

log = logging.getLogger(__name__)


async def sync() -> bool:
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
            response = await client.get(config.KEV_URL, headers={"Accept": "application/json", "User-Agent": "AEGIS-Global-SOC/1.0"})
            response.raise_for_status()
            payload = response.json()
        vulnerabilities = payload.get("vulnerabilities", [])
        if not isinstance(vulnerabilities, list) or not vulnerabilities:
            raise ValueError("Empty or malformed CISA KEV catalog")
        items = []
        for item in vulnerabilities:
            cve = item.get("cveID", "")
            if not cve.startswith("CVE-") or len(cve) > 32:
                continue
            items.append({
                "cve": cve,
                "vendor": str(item.get("vendorProject", ""))[:120],
                "product": str(item.get("product", ""))[:120],
                "vulnerability": str(item.get("vulnerabilityName", ""))[:240],
                "date_added": str(item.get("dateAdded", ""))[:20],
                "due_date": str(item.get("dueDate", ""))[:20],
                "ransomware": str(item.get("knownRansomwareCampaignUse", "Unknown"))[:24],
            })
        if not items:
            raise ValueError("No valid CVEs returned")
        count = db.upsert_intel(items)
        db.meta_set("intel_last_success", db.iso())
        db.meta_set("intel_last_error", "")
        db.audit("intel-sync", "cisa_kev_refresh", "CISA", f"upserted={count}")
        return True
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        log.warning("CISA feed unavailable: %s", exc)
        db.meta_set("intel_last_error", type(exc).__name__)
        return False


async def worker() -> None:
    while True:
        await sync()
        await asyncio.sleep(config.INTEL_SYNC_SECONDS)
