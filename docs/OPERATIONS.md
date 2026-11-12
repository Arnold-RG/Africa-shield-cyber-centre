# SOC deployment & operational runbook

## First deployment

1. Ensure Docker and Docker Compose v2 are installed.
2. Copy .env.example to .env; keep .env out of Git.
3. Demo: set SOC_MODE=demo and run docker compose up --build -d; open http://127.0.0.1:8080.
4. Live: set SOC_MODE=live; generate two unrelated 32+ character random secrets with a password manager, store SOC_API_KEY and SOC_INGEST_KEY securely, set file access permissions; docker compose up -d --build.
5. Keep port bound to loopback as configured; terminate TLS at a locked-down reverse proxy with SSO/MFA before external operator access.
6. In dashboard Settings, paste the operator API key; sessionStorage clears when the browser tab/session ends.
7. Test an authorized collector with a documentation-range test event before turning on actual sensors. Do not ingest personally identifiable logs without policy approval.

## Environment

- SOC_MODE — demo or live, defaults to demo.
- SOC_API_KEY — operator access key (required in live).
- SOC_INGEST_KEY — distinct collector key (required in live).
- SOC_DB_PATH — persistent SQLite file path.
- SOC_POLL_SECONDS — UI poll cadence, bounded to 5–300 seconds.
- SOC_INTEL_SYNC_SECONDS — CISA KEV refresh interval, minimum one hour.
- SOC_AI_KEY — optional model provider key.
- SOC_AI_MODEL — optional model identifier; verify availability and API access in your environment.

## Sensor example: Suricata

Your Suricata deployment must be authorized to inspect its traffic. Enable EVE JSON alert events, then forward selected, approved logs:

\`\`\`bash
export SOC_URL=https://your-secure-soc.example
export SOC_INGEST_KEY='your separate collector credential'
tail -F /var/log/suricata/eve.json | python3 integrations/suricata_forwarder.py
\`\`\`

This adapter supplies country ZZ without geo-IP enrichment; the global map only shows events whose collector supplies coordinates, and the absence of coordinates does not reduce your event counts. It does not make claims about attacker locations.

## Incident workflow

1. Validate incoming observations and confidence with original sensor logs.
2. Triage alerts and correlate with asset criticality and identity events.
3. Select Investigate to record ongoing work.
4. Request an AI advisory report only when information handling policy permits external model processing.
5. Any containment requires approval and separate verified endpoint/firewall tooling. In this MVP, selecting Contain records only a case status.
6. Record resolution and evidence retention in your ticketing system; connect a production case system before operational deployment.

## Troubleshooting

- Empty incident table: Only high/critical events create cases automatically.
- Empty map: Your collectors have not provided latitude/longitude hints; the app does not guess geolocation.
- Empty CISA panel: Wait for the first synchronization or inspect the service logs; feed failures do not fabricate CVEs.
- 401 unauthorized: Confirm the operator key in browser settings, or the distinct collector key on ingest.
- 503 AI not configured: Supply SOC_AI_KEY on server and restart.
- Stale data: Confirm timestamp, network path, access logs, queue health and source sensors; polling is not instantaneous.

## Backup and recovery

Back up the SQLite volume using SQLite's online backup API or a quiesced service. Test restore procedures and move to PostgreSQL for production resilience.

The legacy Africa Shield application source is preserved on archive/pre-global-soc-rebuild-2026-11-12 in GitHub.
