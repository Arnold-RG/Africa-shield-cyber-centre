# AEGIS Global SOC — technical design

## Context

AEGIS is a global-facing SOC UI, not a public feed claiming all attacks on the internet.

Data trust classes:
1. **Observed security events** from authorized sensors via /api/v1/ingest; accuracy depends on collection and enrichment.
2. **Third-party intelligence** from CISA KEV; indicates exploited CVEs, not sensor observations or geolocation.
3. **Synthetic demonstration** events only when SOC_MODE=demo; documentation IPs, explicitly tagged.
4. **AI assessments** generated only from bounded observed case data and clearly treated as hypotheses.

## Current services

\`\`\`text
Suricata / SIEM / EDR / Cloud logs
                  |
                  | Collector key, HTTPS, schema validation
                  v
           FastAPI ingestion
                  |
          Deduplication / scoring
                  |
          SQLite WAL (MVP store)
             |          |
             v          v
          Cases       Audit log
             |          |
             +----------+------> REST read endpoints ---> Dashboard
             |
             +-- Advisory analysis (opt-in model API; no tool execution)

CISA KEV official JSON --scheduled poll--> Intel cache ----> Dashboard
\`\`\`

- One shared FastAPI app serves a static, responsive no-build frontend.
- Browser requests are same-origin; no broad CORS access.
- Live mode fails closed without distinct high-entropy operator and ingestion credentials.
- Case-state changes are audited; they do not execute network or host containment.
- Server-supplied polling interval controls periodic updates. No zero-latency or global-coverage guarantee.
- SQLite is a development/single-node MVP. Do not run multiple independent replicas against the same volume.

## Production target / roadmap

**Control plane:** SSO with OIDC and MFA, enterprise RBAC and service principals, tenant scoping and field-level redaction, IaC, immutable signed audit export, approval workflow before endpoint quarantine or firewall changes.

**Detection and data plane:** OpenTelemetry, Vector/Fluent Bit/Logstash, Kafka or NATS JetStream, streaming rule engine (Sigma and custom rules), threat-intelligence exchange (STIX/TAXII/MISP), asset inventory, ATT&CK correlation, rate/delay metrics, retry/dead-letter queues.

**Persistence:** PostgreSQL for cases/identity/workflows, ClickHouse or OpenSearch for large security event volumes, object storage for approved evidence, encrypted backups, partitioned retention, lifecycle policies.

**Operations:** Kubernetes, Helm/GitOps, horizontal workers, distributed tracing, metrics/SLO dashboards, key rotation, HPA, chaos tests, schema migrations, load tests, vulnerability scans and SBOM.

**AI guardrails:** tool-free analysis by default; policy validation, evidence citations, redaction, retrieval isolation, prompt-injection defense, human sign-off and false-positive evaluation before autonomous low-risk tasks. Autonomous disruptive remediation is out of scope until audited and approved.

## Threat model

Ingested event summaries, threat intelligence and AI output must be treated as untrusted. Sanitize all rendered strings, keep API keys off URLs, do not follow tool instructions from telemetry, and do not use external AI analysis for regulated events without a data handling assessment.

The supplied documentation example is for localhost or a trusted network. A bearer API key is not a production authentication architecture; protect behind a TLS proxy and identity provider.
