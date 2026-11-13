# WorldShield SOC

A global, static SOC dashboard for **near-real-time cached threat activity from public feeds**. The globe and panels read a cache built by a scheduled job. The browser does not call the feeds, so there is no CORS problem and no API key.

This is a cached report. It is not a live attack stream, and it does not invent source-to-target paths. Every snapshot is stamped with the fetch time and, when the publisher provides one, the upstream last-updated time.

A rule-based SOC analyst writes a Markdown, HTML, and JSON report from the same snapshot into `public/data/reports/`. An optional LLM hook can append a clearly labeled commentary when `OPENAI_API_KEY` is present. The hook is never required, and keys are never committed.

WorldShield SOC, by Vira.

## What the globe shows

Amber marks are DShield source addresses located in that country (about the last 30 days of sensor reports). These are **origins of traffic reported to sensors**, not victim countries.

Cyan marks are listed infrastructure addresses from URLhaus, ThreatFox, Feodo Tracker, SSLBL, and Spamhaus. The mark sits on a Natural Earth label point, which is a country locator, not a street and not a victim.

No arc is drawn unless one report names both a source country and a target country. The feeds below do not. DShield's "targets" field is a count of destination addresses worldwide, so it is not ranked as a target country.

If `public/data/snapshot.json` is missing or empty, the page loads `public/data/demo.json` and labels every marker, arc, and satellite as simulated demo filler.

The camera rotates slowly and can be dragged. A phone uses a lighter WebGL render. `prefers-reduced-motion` stops the rotation, particles, and count-up. If WebGL is unavailable, or you open `?view=2d`, the same cache is drawn on a 2D map. `?demo=1` forces the labeled demo.

## Feeds

| Feed | What is cached | Licence |
| --- | --- | --- |
| [abuse.ch URLhaus](https://urlhaus.abuse.ch/downloads/csv_recent/) | Recent malware URLs. Country comes from an IP literal in the URL. | Free with attribution. [Terms](https://urlhaus.abuse.ch/api/) |
| [abuse.ch ThreatFox](https://threatfox.abuse.ch/export/json/recent/) | Recent indicators, malware family, and confidence when published. Country only when the indicator contains an IP literal. | Free with attribution. [Terms](https://threatfox.abuse.ch/api/) |
| [abuse.ch Feodo Tracker](https://feodotracker.abuse.ch/downloads/ipblocklist.json) | Botnet C2 addresses, the country and ASN Feodo publishes for each address. | Free with attribution. [Terms](https://feodotracker.abuse.ch/blocklist/) |
| [abuse.ch SSLBL](https://sslbl.abuse.ch/blacklist/sslipblacklist.json) | Addresses associated with malicious SSL certificates. | Free with attribution. [Terms](https://sslbl.abuse.ch/blacklist/) |
| [Spamhaus DROP and EDROP](https://www.spamhaus.org/drop/) | Listed networks. Country is the DB-IP country of the network address. | Use under the Spamhaus terms. This project attributes Spamhaus and does not resell the lists. |
| [Spamhaus ASN-DROP](https://www.spamhaus.org/drop/asndrop.json) | Listed autonomous systems, used for the ASN panel. | Use under the Spamhaus terms. This project attributes Spamhaus and does not resell the lists. |
| [SANS ISC DShield](https://isc.sans.edu/api/country/all?json) | Source addresses and reports by source country, plus a short list of top source IPs. | [CC BY-NC-SA 4.0](https://isc.sans.edu/api/). Attribute SANS Technology Institute, Internet Storm Center. Do not resell. |
| [OpenPhish community feed](https://openphish.com/feed.txt) | Phishing URLs. Country only from an IP literal in the URL. No per-row timestamp. | Free community feed. Attribute OpenPhish. |
| [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | Catalog entries in a side panel. Not placed on the globe. | US government work, public domain. |

IP countries that a feed does not already publish come from [DB-IP Country Lite](https://db-ip.com/db/lite.php), **CC BY 4.0**. IP geolocation by [DB-IP](https://db-ip.com).

Country outlines are Natural Earth 110m, public domain. The 3D view is [Three.js](https://github.com/mrdoob/three.js/) r170, MIT, vendored under `public/vendor/` so the page does not call a CDN.

URLhaus and ThreatFox retired their keyless downloads in 2025–2026 (HTTP 410). They can be re-enabled by setting the environment variable `ABUSECH_AUTH_KEY` (a free key from [auth.abuse.ch](https://auth.abuse.ch/)) or a GitHub Actions secret of the same name. The key is never committed. Without it, those two feeds are marked failed and the rest of the cache still builds.

These feeds also need an API key and are not fetched: AbuseIPDB, AlienVault OTX, Cloudflare Radar, GreyNoise, Shodan, VirusTotal.

## SOC report

`scripts/analyze.py` reads the snapshot and writes:

- `public/data/reports/latest.md`
- `public/data/reports/latest.html`
- `public/data/reports/latest.json`

The default analyst is deterministic and rule-based: executive summary, trends, top threats, recommended actions, and method/caveats. It uses only facts already in the snapshot.

If the environment variable `OPENAI_API_KEY` is set, an optional hook may append an "LLM enrichment" section. The rule-based report remains authoritative. The key is never written to a file. Use `--no-llm` to skip the hook, or `--llm` to request it (it still no-ops without a key).

Severity labels on the dashboard are a local triage heuristic (ThreatFox confidence, Feodo C2 role, CISA ransomware use, and similar published fields). They are not vendor scores.

## Freshness

`.github/workflows/refresh-feeds.yml` runs at minute 17 and 47 of every hour, and on demand. It downloads the feeds and DB-IP Country Lite, writes `public/data/snapshot.json`, generates the SOC report, and on `main` commits those files.

`.github/workflows/generate-report.yml` rebuilds the report from the current snapshot, optionally attempting the LLM hook.

`.github/workflows/test.yml` runs pytest and the privacy scan.

`.github/workflows/pages.yml` deploys `public/` to GitHub Pages **only on a push to `main`**. These workflows are stored in the repository. Publishing the site to GitHub Pages is a separate, explicit step.

GitHub does not start a new workflow from a push made with the default token. A scheduled cache commit can land on `main` without the Pages workflow running again. The next push to `main` publishes it. A personal access token, or a deploy step inside the refresh job, would close that gap.

Each feed row shows the upstream timestamp when the file has one, and the header shows when this cache was built.

## Run locally

```bash
python3 scripts/fetch_feeds.py
python3 scripts/analyze.py --no-llm
python3 -m pytest -v
python3 scripts/privacy_scan.py
cd public && python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

Do not put API keys in the repository. See `.env.example`.

## Tests

`tests/test_feeds.py` and `tests/test_analyze.py` check the parsers, the 24 hour window, DB-IP range lookup, severity rules, the rule-based analyst, and that a live snapshot does not invent target countries or arcs. They also check that the demo file is flagged as filler, and that forbidden public names and personal contact details are absent from the site. The privacy scan skips `public/data/snapshot.json` and `public/data/reports/` because those files can contain untrusted feed text.

## Reporting a vulnerability

Please use a private GitHub security advisory on the repository. Do not open a public issue for an unpatched vulnerability.
