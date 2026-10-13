# Africa Shield Cyber Centre

Threat-intelligence desk for East Africa, kept in Kigali by Arnold Rurangwa and ARNOVA Group.

The public site reads published feeds and lets a visitor keep incident notes in their own browser. It does not invent incidents, and it does not upload those notes.

**Live site:** https://arnold-rg.github.io/Africa-shield-cyber-centre/

## What you can do there

| Room | What it is |
| --- | --- |
| Home | The day’s catalog counts and the newest CISA entries |
| Desk | Search the full Known Exploited Vulnerabilities catalog, family totals, and recent indicators |
| Map | Country marks for ThreatFox IP indicators, sized by count |
| Report | A private notebook: search, status, export. Stored on the device |
| Learn, Events, Careers, About, Contact | The centre’s lessons, programme, listings, and offices |

## Where the numbers come from

Each deploy refreshes `africa-shield-centre/data/public-intel.json`.

- [CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [abuse.ch ThreatFox](https://threatfox.abuse.ch/export/) recent export
- [abuse.ch Feodo Tracker](https://feodotracker.abuse.ch/) blocklist
- Delegation files from AFRINIC, APNIC, ARIN, LACNIC, and RIPE NCC, used only to name the country an IP block is allocated to

A mark on the map sits on the country centroid. That is the registry country of the address, not a victim and not a street.

## Run it locally

```bash
cd africa-shield-centre
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/Home/

Refresh the snapshot before you start, from the repository root:

```bash
python3 scripts/fetch_public_intel.py
```

## Publishing

GitHub Actions workflow `.github/workflows/pages.yml` rebuilds the snapshot and deploys the static site. PHP, database files, and the server configuration are left out of that deploy.

The workflow runs when it is on `main`. GitHub Pages has to be set to **GitHub Actions** as the source (repository Settings → Pages). That switch is on the repository, not in this code.

## Self-hosted accounts

`includes/`, `api/`, and `Admin/*.php` are the older PHP services for a machine you run yourself. They expect MySQL and the schema in `database/schema.sql`. Create the first administrator there. Do not commit a password. The public website does not use those services, and the sign-in page on the public site does not send a password anywhere.
