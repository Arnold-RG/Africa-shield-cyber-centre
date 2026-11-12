"""Runtime configuration; production/live fails closed without credentials."""
import os
from pathlib import Path

MODE = os.getenv("SOC_MODE", "demo").strip().lower()
if MODE not in {"demo", "live"}:
    raise RuntimeError("SOC_MODE must be 'demo' or 'live'")

API_KEY = os.getenv("SOC_API_KEY", "")
INGEST_KEY = os.getenv("SOC_INGEST_KEY", "")
AI_KEY = os.getenv("SOC_AI_KEY", "")
AI_MODEL = os.getenv("SOC_AI_MODEL", "gpt-5.5")
DB_PATH = Path(os.getenv("SOC_DB_PATH", "/data/soc.db"))
POLL_SECONDS = max(5, min(int(os.getenv("SOC_POLL_SECONDS", "15")), 300))
INTEL_SYNC_SECONDS = max(3600, int(os.getenv("SOC_INTEL_SYNC_SECONDS", "21600")))
KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

if MODE == "live":
    if len(API_KEY) < 32 or len(INGEST_KEY) < 32:
        raise RuntimeError("LIVE mode requires independent SOC_API_KEY and SOC_INGEST_KEY, each >=32 characters")
    if API_KEY == INGEST_KEY:
        raise RuntimeError("Admin and ingestion credentials must differ")
