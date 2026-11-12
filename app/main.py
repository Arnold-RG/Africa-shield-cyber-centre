"""AEGIS Global SOC: defensive telemetry and operations dashboard."""
from __future__ import annotations

from contextlib import asynccontextmanager
import asyncio
import logging
from pathlib import Path
import secrets

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Path as PathParam, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from . import ai, config, db, intel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("aegis.soc")
WEB_DIR = Path(__file__).resolve().parent.parent / "web"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    if config.MODE == "demo":
        db.seed_demo()
    task = asyncio.create_task(intel.worker(), name="cisa-kev-sync")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="AEGIS Global SOC",
    description="Global security observability, incident triage and advisory analysis",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


class Observation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str | None = Field(None, max_length=128)
    source: str = Field(min_length=2, max_length=80)
    severity: str = Field(pattern="^(low|medium|high|critical)$")
    type: str = Field(min_length=2, max_length=90)
    src_ip: str = Field(default="", max_length=80)
    country: str = Field(default="ZZ", pattern="^[a-zA-Z]{2}$")
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)
    target: str = Field(default="", max_length=100)
    summary: str = Field(default="", max_length=500)
    confidence: int = Field(default=70, ge=0, le=100)


class Batch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    events: list[Observation] = Field(min_length=1, max_length=100)


class StatusChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str = Field(pattern="^(open|investigating|contained|resolved)$")


def operator(x_soc_api_key: str | None = Header(None)) -> str:
    if config.MODE == "live" and not (
        x_soc_api_key and secrets.compare_digest(x_soc_api_key, config.API_KEY)
    ):
        raise HTTPException(401, detail="Operator API key required")
    return "soc-operator"


def collector(x_soc_ingest_key: str | None = Header(None)) -> None:
    if config.MODE == "live" and not (
        x_soc_ingest_key and secrets.compare_digest(x_soc_ingest_key, config.INGEST_KEY)
    ):
        raise HTTPException(401, detail="Collector API key required")
    if config.MODE == "demo" and config.INGEST_KEY and not (
        x_soc_ingest_key and secrets.compare_digest(x_soc_ingest_key, config.INGEST_KEY)
    ):
        raise HTTPException(401, detail="Collector API key required")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/status")
def api_status():
    return {
        "product": "AEGIS GLOBAL SOC",
        "mode": config.MODE,
        "is_demo": config.MODE == "demo",
        "ai_enabled": bool(config.AI_KEY),
        "poll_seconds": config.POLL_SECONDS,
        "last_intelligence_sync": db.meta_get("intel_last_success") if config.DB_PATH.exists() else "",
        "intelligence_error": db.meta_get("intel_last_error") if config.DB_PATH.exists() else "",
        "cisa_source": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        "timestamp": db.iso(),
    }


@app.get("/api/overview", dependencies=[Depends(operator)])
def overview(hours: int = Query(24, ge=1, le=72)):
    return db.overview(hours)


@app.get("/api/events", dependencies=[Depends(operator)])
def events(limit: int = Query(50, ge=1, le=200)):
    return {"items": db.get_events(limit)}


@app.get("/api/incidents", dependencies=[Depends(operator)])
def incidents(limit: int = Query(100, ge=1, le=200)):
    return {"items": db.get_incidents(limit)}


@app.get("/api/intelligence", dependencies=[Depends(operator)])
def intelligence(limit: int = Query(25, ge=1, le=100)):
    return {"items": db.get_intel(limit), "source": "CISA KEV", "last_updated": db.meta_get("intel_last_success"),
            "note": "Vulnerabilities known to be exploited; not geolocated attack telemetry"}


@app.get("/api/automation", dependencies=[Depends(operator)])
def automation():
    return db.get_automation()


@app.post("/api/v1/ingest", dependencies=[Depends(collector)])
def ingest(payload: Batch):
    outcome = db.ingest([item.model_dump() for item in payload.events], origin="sensor")
    return {"ok": True, **outcome}


@app.post("/api/incidents/{incident_id}/status", dependencies=[Depends(operator)])
def change_status(payload: StatusChange, incident_id: int = PathParam(ge=1)):
    result = db.set_status(incident_id, payload.status)
    if result is None:
        raise HTTPException(404, detail="Incident not found")
    return {"incident": result, "note": "Case status only; no infrastructure containment was performed"}


@app.post("/api/incidents/{incident_id}/analyze", dependencies=[Depends(operator)])
async def analyze(incident_id: int = PathParam(ge=1)):
    incident = db.get_incident(incident_id)
    if incident is None:
        raise HTTPException(404, detail="Incident not found")
    if not config.AI_KEY:
        raise HTTPException(503, detail="Configure SOC_AI_KEY to enable model-backed analysis")
    fields = {k: incident.get(k) for k in ("id","title","severity","score","status","created_at",
                                              "source","src_ip","country","target","summary","confidence","data_origin")}
    try:
        report = await ai.generate(fields, "investigation")
    except (httpx.HTTPError, RuntimeError) as exc:
        log.warning("AI assessment failed: %s", type(exc).__name__)
        raise HTTPException(502, detail="AI analysis unavailable; retry later") from exc
    db.save_analysis(incident_id, report)
    return {"report": report, "incident_id": incident_id, "actioned": False, "advisory_only": True}


@app.post("/api/ai/brief", dependencies=[Depends(operator)])
async def ai_brief():
    if not config.AI_KEY:
        raise HTTPException(503, detail="Configure SOC_AI_KEY to enable model-backed analysis")
    data = {"overview": db.overview(24)["metrics"], "incidents": db.get_incidents(12)}
    try:
        report = await ai.generate(data, "shift briefing")
    except (httpx.HTTPError, RuntimeError) as exc:
        log.warning("AI shift briefing failed: %s", type(exc).__name__)
        raise HTTPException(502, detail="AI briefing unavailable; retry later") from exc
    db.audit("ai-assistant", "shift_brief_generated", "summary", "Advisory-only")
    return {"report": report, "actioned": False, "advisory_only": True}


app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(WEB_DIR / "index.html")
