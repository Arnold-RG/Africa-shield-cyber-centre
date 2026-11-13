# Security

WorldShield SOC is a static dashboard over a public-feed cache. It does not collect accounts, and it does not require an API key at browser runtime.

- Do not commit secrets. The optional `OPENAI_API_KEY` belongs in a GitHub Actions secret or a local environment variable, never in the repository.
- The scheduled job talks only to documented public feed URLs.
- Domain names in indicators are not resolved.
- Please report vulnerabilities through a private GitHub security advisory. Do not open a public issue for an unpatched vulnerability.
