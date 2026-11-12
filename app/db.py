"""SQLite persistence and deterministic SOC enrichment.

One connection per operation, WAL for concurrent UI/collector reads, bounded queries.
For multi-node production use PostgreSQL and a managed event bus.
"""
from __future__ import annotations

from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
import random
import sqlite3
from typing import Any

from . import config


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(moment: datetime | None = None) -> str:
    return (moment or utcnow()).isoformat(timespec="seconds").replace("+00:00", "Z")


@contextmanager
def connection():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(config.DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA busy_timeout=10000")
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def init() -> None:
    with connection() as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            source TEXT NOT NULL,
            severity TEXT NOT NULL,
            kind TEXT NOT NULL,
            src_ip TEXT NOT NULL,
            country TEXT NOT NULL,
            lat REAL,
            lon REAL,
            target TEXT NOT NULL,
            summary TEXT NOT NULL,
            confidence INTEGER NOT NULL,
            score INTEGER NOT NULL,
            fingerprint TEXT NOT NULL UNIQUE,
            data_origin TEXT NOT NULL CHECK (data_origin IN ('demo','sensor'))
        );
        CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL UNIQUE REFERENCES events(id),
            title TEXT NOT NULL,
            severity TEXT NOT NULL,
            score INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            analysis TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_incidents_updated ON incidents(updated_at DESC);
        CREATE TABLE IF NOT EXISTS intel (
            cve TEXT PRIMARY KEY, vendor TEXT NOT NULL, product TEXT NOT NULL,
            vulnerability TEXT NOT NULL, date_added TEXT NOT NULL, due_date TEXT,
            ransomware TEXT NOT NULL, source_url TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL,
            object_id TEXT NOT NULL, detail TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """)


def audit(actor: str, action: str, object_id: str, detail: str) -> None:
    with connection() as con:
        con.execute(
            "INSERT INTO audit(ts,actor,action,object_id,detail) VALUES(?,?,?,?,?)",
            (iso(), actor[:64], action[:64], object_id[:80], detail[:500]),
        )


def meta_get(key: str, default: str = "") -> str:
    with connection() as con:
        row = con.execute("SELECT value FROM metadata WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def meta_set(key: str, value: str) -> None:
    with connection() as con:
        con.execute("INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))


SEVERITY_SCORE = {"low": 24, "medium": 49, "high": 76, "critical": 94}


def ingest(events: list[dict[str, Any]], origin: str = "sensor") -> dict[str, int]:
    accepted = duplicate = created = 0
    now = iso()
    with connection() as con:
        for event in events:
            kind = event.get("type") or "Unclassified observation"
            severity = event["severity"]
            score = min(100, round(SEVERITY_SCORE[severity] * 0.8 + event.get("confidence", 70) * 0.2))
            # A collector-supplied id takes precedence for at-least-once delivery.
            # Otherwise, identical contents in the same UTC hour deduplicate.
            source_id = event.get("event_id")
            bucket = source_id or (now[:13] + json.dumps(
                [event["source"], severity, kind, event.get("src_ip", ""), event.get("target", ""), event.get("summary", "")],
                separators=(",", ":"), ensure_ascii=True
            ))
            fingerprint = hashlib.sha256(f"{origin}:{event['source']}:{bucket}".encode()).hexdigest()
            cursor = con.execute("""
                INSERT OR IGNORE INTO events
                (ts,source,severity,kind,src_ip,country,lat,lon,target,summary,confidence,score,fingerprint,data_origin)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                now, event["source"], severity, kind, event.get("src_ip") or "unattributed",
                (event.get("country") or "ZZ").upper(), event.get("lat"), event.get("lon"),
                event.get("target") or "unspecified", event.get("summary") or kind,
                event.get("confidence", 70), score, fingerprint, origin
            ))
            if not cursor.rowcount:
                duplicate += 1
                continue
            accepted += 1
            if severity in {"high", "critical"}:
                event_id = cursor.lastrowid
                con.execute("""
                    INSERT INTO incidents(event_id,title,severity,score,status,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?)
                """, (event_id, f"{kind} · {event.get('target') or 'Unspecified asset'}"[:160],
                      severity, score, "open", now, now))
                created += 1
        if accepted:
            con.execute(
                "INSERT INTO audit(ts,actor,action,object_id,detail) VALUES(?,?,?,?,?)",
                (now, "triage-engine", "events_ingested", origin, f"accepted={accepted}; duplicates={duplicate}; incidents={created}"),
            )
    return {"accepted": accepted, "duplicates": duplicate, "incidents_created": created}


def seed_demo() -> None:
    """Seed documentation-only IPs and synthetic geo points; never label as real attacks."""
    with connection() as con:
        row = con.execute("SELECT 1 FROM events LIMIT 1").fetchone()
        if row:
            return
    rng = random.Random(7062)
    locations = [
        ("US", 38.91, -77.03, "Washington"), ("GB", 51.5, -0.12, "London"),
        ("DE", 52.52, 13.4, "Berlin"), ("FR", 48.86, 2.35, "Paris"),
        ("BR", -23.55, -46.63, "São Paulo"), ("ZA", -26.2, 28.04, "Johannesburg"),
        ("NG", 6.52, 3.38, "Lagos"), ("IN", 19.08, 72.88, "Mumbai"),
        ("SG", 1.35, 103.82, "Singapore"), ("JP", 35.68, 139.76, "Tokyo"),
        ("AU", -33.87, 151.2, "Sydney"), ("CA", 43.65, -79.38, "Toronto"),
        ("PL", 50.06, 19.94, "Kraków"), ("AE", 25.2, 55.27, "Dubai"),
        ("MX", 19.43, -99.13, "Mexico City"), ("KR", 37.57, 126.98, "Seoul"),
    ]
    attack_types = [
        "Credential stuffing", "Suspicious authentication", "Port scan",
        "Malicious URL detection", "Exploit attempt", "DDoS anomaly",
        "Malware callback", "Privilege escalation", "Phishing indicator",
    ]
    assets = ["edge-gateway", "identity-provider", "cloud-workload", "vpn-cluster", "web-frontend", "mail-relay"]
    with connection() as con:
        for idx in range(96):
            country, lat, lon, city = locations[rng.randrange(len(locations))]
            kind = attack_types[rng.randrange(len(attack_types))]
            severity = rng.choices(["low", "medium", "high", "critical"], [20, 36, 32, 12])[0]
            target = assets[rng.randrange(len(assets))]
            ts = iso(utcnow() - timedelta(minutes=rng.randint(1, 1430)))
            confidence = rng.randint(51, 99)
            score = min(100, round(SEVERITY_SCORE[severity] * .8 + confidence * .2))
            ip = f"198.51.100.{1 + idx % 254}" if idx % 2 else f"203.0.113.{1 + idx % 254}"
            cursor = con.execute("""
                INSERT INTO events
                (ts,source,severity,kind,src_ip,country,lat,lon,target,summary,confidence,score,fingerprint,data_origin)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (ts, rng.choice(["Suricata / demo", "Zeek / demo", "CloudTrail / demo", "Wazuh / demo"]),
                  severity, kind, ip, country, lat + rng.uniform(-2, 2), lon + rng.uniform(-2, 2),
                  target, f"Simulated {kind.lower()} pattern associated with {city}. For demonstration only.",
                  confidence, score, f"demo-seed-{idx}", "demo"))
            if severity in {"high", "critical"}:
                status = rng.choices(["open", "investigating", "contained", "resolved"], [8, 3, 1, 2])[0]
                con.execute("""
                    INSERT INTO incidents(event_id,title,severity,score,status,created_at,updated_at)
                    VALUES(?,?,?,?,?,?,?)
                """, (cursor.lastrowid, f"{kind} · {target}", severity, score, status, ts, ts))
        con.execute(
            "INSERT INTO audit(ts,actor,action,object_id,detail) VALUES(?,?,?,?,?)",
            (iso(), "system", "demo_seeded", "demo", "96 synthetic observations using RFC 5737 documentation IPs"),
        )


def rows(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with connection() as con:
        return [dict(row) for row in con.execute(sql, params).fetchall()]


def get_events(limit: int = 100) -> list[dict[str, Any]]:
    return rows("SELECT id,ts,source,severity,kind,src_ip,country,lat,lon,target,summary,confidence,score,data_origin FROM events ORDER BY ts DESC,id DESC LIMIT ?", (limit,))


def get_incidents(limit: int = 100) -> list[dict[str, Any]]:
    return rows("""
        SELECT i.*, e.src_ip,e.country,e.source,e.kind,e.summary,e.data_origin
        FROM incidents i JOIN events e ON i.event_id=e.id
        ORDER BY CASE i.status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 ELSE 2 END,
                 i.score DESC,i.updated_at DESC LIMIT ?
    """, (limit,))


def get_incident(incident_id: int) -> dict[str, Any] | None:
    result = rows("""
        SELECT i.*,e.src_ip,e.country,e.target,e.source,e.summary,e.kind,e.confidence,e.data_origin
        FROM incidents i JOIN events e ON i.event_id=e.id WHERE i.id=?
    """, (incident_id,))
    return result[0] if result else None


def set_status(incident_id: int, status: str, actor: str = "soc-operator") -> dict | None:
    with connection() as con:
        cursor = con.execute("UPDATE incidents SET status=?,updated_at=? WHERE id=?", (status, iso(), incident_id))
        if not cursor.rowcount:
            return None
        con.execute("INSERT INTO audit(ts,actor,action,object_id,detail) VALUES(?,?,?,?,?)",
                    (iso(), actor, "incident_status", str(incident_id), status))
    return get_incident(incident_id)


def save_analysis(incident_id: int, analysis: str) -> None:
    with connection() as con:
        con.execute("UPDATE incidents SET analysis=?,updated_at=? WHERE id=?", (analysis[:8000], iso(), incident_id))
        con.execute("INSERT INTO audit(ts,actor,action,object_id,detail) VALUES(?,?,?,?,?)",
                    (iso(), "ai-assistant", "analysis_generated", str(incident_id), "Advisory report saved; no containment action executed"))


def upsert_intel(items: list[dict[str, str]]) -> int:
    now = iso()
    with connection() as con:
        for item in items:
            con.execute("""
                INSERT INTO intel (cve,vendor,product,vulnerability,date_added,due_date,ransomware,source_url,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?)
                ON CONFLICT(cve) DO UPDATE SET vendor=excluded.vendor,product=excluded.product,
                vulnerability=excluded.vulnerability,date_added=excluded.date_added,
                due_date=excluded.due_date,ransomware=excluded.ransomware,updated_at=excluded.updated_at
            """, (
                item["cve"], item["vendor"], item["product"], item["vulnerability"],
                item["date_added"], item["due_date"], item["ransomware"],
                "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", now
            ))
    return len(items)


def get_intel(limit: int = 30) -> list[dict[str, Any]]:
    return rows("SELECT cve,vendor,product,vulnerability,date_added,due_date,ransomware,source_url FROM intel ORDER BY date_added DESC,cve DESC LIMIT ?", (limit,))


def get_automation() -> dict[str, Any]:
    log = rows("SELECT ts,actor,action,object_id,detail FROM audit ORDER BY id DESC LIMIT 25")
    total = rows("SELECT COUNT(*) AS value FROM audit")[0]["value"]
    return {"policy": "Human approval required for disruptive actions", "automated_jobs": [
        {"name": "Event validation & deduplication", "state": "active", "type": "local"},
        {"name": "Severity-based incident creation", "state": "active", "type": "local"},
        {"name": "CISA KEV intelligence synchronization", "state": "scheduled", "type": "external"},
        {"name": "AI advisory incident reports", "state": "on-demand" if config.AI_KEY else "not configured", "type": "AI"}
    ], "audit_count": total, "audit": log}


def overview(hours: int = 24) -> dict[str, Any]:
    observations = rows("SELECT id,ts,source,severity,kind,country,lat,lon,target,score,data_origin FROM events WHERE ts>=? ORDER BY ts DESC LIMIT 6000",
                        (iso(utcnow() - timedelta(hours=hours)),))
    incidents = rows("SELECT severity,status FROM incidents")
    now = utcnow()
    buckets = [{"time": iso(now - timedelta(hours=h)).split("T")[1][:5], "count": 0} for h in reversed(range(hours))]
    # Bin by UTC hour, rather than by local time or browser time zone.
    start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=hours-1)
    for n, bucket in enumerate(buckets):
        bucket["time"] = (start + timedelta(hours=n)).strftime("%H:%M")
    for event in observations:
        try:
            delta = datetime.fromisoformat(event["ts"].replace("Z", "+00:00")) - start
            idx = int(delta.total_seconds() // 3600)
            if 0 <= idx < hours:
                buckets[idx]["count"] += 1
        except (ValueError, TypeError):
            continue
    countries = Counter(x["country"] for x in observations)
    severity = Counter(x["severity"] for x in observations)
    kinds = Counter(x["kind"] for x in observations)
    sources = Counter(x["source"] for x in observations)
    open_status = {"open", "investigating"}
    return {
        "timestamp": iso(), "hours": hours,
        "metrics": {
            "observations": len(observations),
            "critical": severity["critical"],
            "high": severity["high"],
            "open_incidents": sum(i["status"] in open_status for i in incidents),
            "sources": len(sources), "countries": len(countries),
        },
        "severity": [{"name": s, "count": severity[s]} for s in ("critical", "high", "medium", "low")],
        "trend": buckets,
        "top_countries": [{"name": k, "count": v} for k, v in countries.most_common(7)],
        "top_types": [{"name": k, "count": v} for k, v in kinds.most_common(6)],
        "sources": [{"name": k, "count": v} for k, v in sources.most_common(7)],
        "map_points": [dict(x) for x in observations if x["lat"] is not None and x["lon"] is not None][:125],
    }
