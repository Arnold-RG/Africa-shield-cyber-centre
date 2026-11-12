# AEGIS / GLOBAL SOC
### Worldwide security operations command center

AEGIS replaces the legacy Africa Shield website with a security-operations-only application. It provides worldwide telemetry visualization, incident case management, authenticated JSON event ingestion, verified CISA KEV intelligence, rule-based auto-triage, operator audit trails, and optional AI-generated investigation briefs.

**Truthful data modes**
- **DEMO (default):** clearly tagged synthetic events. No claim of actual global visibility.
- **LIVE:** events are real only to the extent that they are submitted by authorized SIEM, EDR, IDS, firewalls or cloud monitoring integrations. Worldwide coverage depends on your sensors and commercial intelligence licenses.
- **CISA KEV:** an official catalog of vulnerabilities exploited in the wild, updated periodically, **not** a real-time global attack stream.

## Quick start

1. Copy .env.example to .env.
2. To explore, leave SOC_MODE=demo. Run: docker compose up --build -d
3. Open http://localhost:8080. The backend serves the UI and JSON APIs.
4. For live mode, set SOC_MODE=live and use unique high-entropy SOC_API_KEY and SOC_INGEST_KEY values (at least 32 characters each), then restart. Paste the admin key in the dashboard Settings screen over HTTPS.
5. Optionally set SOC_AI_KEY and SOC_AI_MODEL to enable the model-backed assistant. Without a key, the interface clearly reports AI unavailable.

A reverse proxy with TLS is required for remote use. The sample Compose deployment binds to localhost intentionally.

## Authorized telemetry ingestion

POST /api/v1/ingest with header X-SOC-Ingest-Key: YOUR_INGEST_KEY and JSON:

{"events":[{"source":"suricata","severity":"high","type":"Brute force","src_ip":"203.0.113.8","country":"US","lat":38.9,"lon":-77.0,"target":"vpn-gateway","summary":"Repeated login failures","confidence":92}]}

Up to 100 events per call. Latitude/longitude and country are attribution hints supplied by your sensor, not proof of attacker origin. Ingesting a high/critical event creates an open incident automatically. Source fingerprints are de-duplicated for one hour to avoid repeated cases. Collector payloads should not contain credentials, full packet captures, or private personal data.

## API

- GET /health — process health
- GET /api/status — data mode, capabilities and freshness
- GET /api/overview?hours=24 — KPI, trend and mapped telemetry
- GET /api/events?limit=100 — observations
- GET /api/incidents?limit=100 — incident queue
- GET /api/intelligence?limit=30 — CISA KEV entries, with authoritative source links
- GET /api/automation — automation and audit summaries
- POST /api/incidents/{id}/status — set status to investigating, contained or resolved
- POST /api/incidents/{id}/analyze — model-backed assessment; requires SOC_AI_KEY
- POST /api/ai/brief — optional cross-incident shift briefing
- POST /api/v1/ingest — independent collector credential

Operator endpoints require X-SOC-API-Key in LIVE mode. All mutations emit audit records. Health and status are public but omit secrets.

## What is automated?

New events are validated, stored, de-duplicated, scored, and elevated to cases when they meet high/critical severity; CISA KEV synchronizes on a bounded interval. AI generates human-readable analyses on operator request, not autonomous infrastructure changes. The frontend refreshes on a configurable short interval, but network latency and upstream feed delays prevent zero-delay guarantees.

## Production work remaining

This is an operational **foundation**, not a finished enterprise SIEM/SOAR platform. Before public or high-scale deployment: PostgreSQL + migrations, queue/worker processing, OIDC/SAML SSO + granular RBAC, tenant isolation, immutable audit sink, event bus and WebSocket/SSE, retention and GDPR controls, integrations to actual sensors, detection-as-code, automated validation, observability, high availability, automated backups, threat-intel licensing, privacy review, rate limiting and load testing. Human approval must gate disruptive playbooks.

## Legacy source

The pre-rebuild site is preserved at the branch archive/pre-global-soc-rebuild-2026-11-12. The suggested GitHub repository name is aegis-global-soc. The app branding is updated; the repository slug must be changed under GitHub repository Settings > General > Repository name if no connected administrative rename action is available.
