# Security Policy

Security updates apply to the latest commit on the default branch.

## Reporting a vulnerability

Email **rurangwaarnold32@gmail.com** with the affected path, the impact, and steps to reproduce.

Please do not open a public issue for an unpatched vulnerability.

## Practice

- The site is static. The browser only reads files shipped with the page.
- Feed text is inserted with `textContent`. Links are rendered only when they start with `http`.
- No API keys and no secrets belong in this repository.
- The fetch job sends a contact address in its user agent because SANS ISC asks for one.
