# Africa Shield SOC

Public, static SOC wall for **live reported threat activity from public feeds**. The globe and panels read a cache built by a scheduled job. The browser does not call the feeds, so there is no CORS problem and no API key.

This is a cached report. It is not a live attack stream, and it does not invent source-to-target paths.

Arnold Rurangwa.

## What the globe shows

Amber beams are DShield source addresses located in that country (about the last 30 days of sensor reports). Cyan marks are listed infrastructure addresses from URLhaus, ThreatFox, Feodo Tracker, and Spamhaus. The mark sits on a Natural Earth label point, which is a country locator, not a street and not a victim.

No arc is drawn unless one report names both a source country and a target country. The feeds below do not. DShield's "targets" field is a count of destination addresses worldwide, so it is not ranked as a target country.

If `public/data/snapshot.json` is missing or empty, the page loads `public/data/demo.json` and labels every marker, arc, and satellite as simulated demo filler.

The camera rotates slowly and can be dragged. A phone uses a lighter WebGL render. `prefers-reduced-motion` stops the rotation, particles, and count-up. If WebGL is unavailable, or you open `?view=2d`, the same cache is drawn on a 2D map. `?demo=1` forces the labeled demo.

## Feeds

| Feed | What is cached | Licence |
| --- | --- | --- |
| [abuse.ch URLhaus](https://urlhaus.abuse.ch/downloads/csv_recent/) | Recent malware URLs. Country comes from an IP literal in the URL. | Free with attribution. [Terms](https://urlhaus.abuse.ch/api/) |
| [abuse.ch ThreatFox](https://threatfox.abuse.ch/export/json/recent/) | Recent indicators. Country only when the indicator contains an IP literal. | Free with attribution. [Terms](https://threatfox.abuse.ch/api/) |
| [abuse.ch Feodo Tracker](https://feodotracker.abuse.ch/downloads/ipblocklist.json) | Botnet C2 addresses and the country Feodo publishes for each address. | Free with attribution. [Terms](https://feodotracker.abuse.ch/blocklist/) |
| [Spamhaus DROP and EDROP](https://www.spamhaus.org/drop/) | Listed networks. Country is the DB-IP country of the network address. | Use under the Spamhaus terms. This project attributes Spamhaus and does not resell the lists. |
| [SANS ISC DShield](https://isc.sans.edu/api/country/all?json) | Source addresses and reports by source country, plus a short list of top source IPs. | [CC BY-NC-SA 4.0](https://isc.sans.edu/api/). Attribute SANS Technology Institute, Internet Storm Center. Do not resell. |
| [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json) | Catalog entries in a side panel. Not placed on the globe. | US government work, public domain. |

IP countries that a feed does not already publish come from [DB-IP Country Lite](https://db-ip.com/db/lite.php), **CC BY 4.0**. IP geolocation by [DB-IP](https://db-ip.com).

Country outlines are Natural Earth 110m, public domain. The 3D view is [Three.js](https://github.com/mrdoob/three.js/) r170, MIT, vendored under `public/vendor/` so the page does not call a CDN.

These feeds need an API key and are not fetched: AbuseIPDB, AlienVault OTX, Cloudflare Radar, GreyNoise, Shodan, VirusTotal.

## Freshness

`.github/workflows/refresh-feeds.yml` runs at minute 17 and 47 of every hour, and on demand. It downloads the feeds and DB-IP Country Lite, writes `public/data/snapshot.json`, and on `main` commits that file.

`.github/workflows/pages.yml` deploys `public/` to GitHub Pages **only on a push to `main`**.

GitHub does not start a new workflow from a push made with the default token. A scheduled cache commit can land on `main` without the Pages workflow running again. The next push to `main` publishes it. A personal access token, or a deploy step inside the refresh job, would close that gap.

Each feed row shows the upstream timestamp when the file has one, and the header shows when this cache was built.

## Run locally

```bash
python3 scripts/fetch_feeds.py
python3 -m unittest discover -s tests -v
python3 scripts/privacy_scan.py
cd public && python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

## Tests

`tests/test_feeds.py` checks the parsers, the 24 hour window, DB-IP range lookup, and that a live snapshot does not invent target countries or arcs. It also checks that the demo file is flagged as filler, and that the forbidden public names are absent. The privacy scan skips `public/data/snapshot.json` because that file is untrusted feed text.

## Reporting a vulnerability

Email rurangwaarnold32@gmail.com. Please do not open a public issue for an unpatched vulnerability.
