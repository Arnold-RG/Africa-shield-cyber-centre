# Security policy

Do not place API keys, logs containing personal data, or unredacted incident evidence in a Git commit or issue.

- LIVE mode refuses to start unless separate strong admin and collector keys are configured.
- Run behind TLS with SSO, WAF, rate limiting, network segmentation and secret management before public deployment.
- The bundled admin token is a prototype operator gate, not a substitute for enterprise OIDC/RBAC/MFA.
- Collector credentials are independent of the operator credential; ingestion is bounded and schema validated.
- The AI capability is advisory. It cannot execute containment, delete data, or change infrastructure.
- Observed attacks are limited to telemetry actually ingested. CISA KEV is vulnerability intelligence, not a global live attack counter.
- Rotate keys, set retention policies, and do not send secrets/regulated data to AI.
- Keep dependencies patched; establish audit log export to immutable storage for production.

For vulnerabilities, contact the repository owner privately rather than publishing exploits.
