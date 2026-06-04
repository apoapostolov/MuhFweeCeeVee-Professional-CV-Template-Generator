# LinkedIn integration libraries (research notes)

MFCV Research today uses **OpenRouter + web-grounded prompts** and user-pasted LinkedIn URLs. There is no public LinkedIn API for searching companies, people, or open jobs at scale. Before building custom scrapers or parsers, prefer an official or maintained client where your use case is supported.

## Recommended starting point (official)

| Library | Package | Notes |
|--------|---------|--------|
| [linkedin-api-js-client](https://github.com/linkedin-developers/linkedin-api-js-client) | `linkedin-api-client` | **Official** LinkedIn-maintained JS client (Rest.li, OAuth2, typed requests). **Server-side only** (no browser; CORS). Beta. Use for Marketing API, Sign In with LinkedIn profile (`/me`), partner products you are approved for—not arbitrary job search. |

Requires a [LinkedIn Developer app](https://www.linkedin.com/developers/apps/), product access per API (e.g. Sign In with LinkedIn, Advertising, Job Posting for partners), and OAuth tokens.

## Community / unofficial (evaluate risk carefully)

| Library | Repo | Notes |
|--------|------|--------|
| linkedin-private-api | [eilonmore/linkedin-private-api](https://github.com/eilonmore/linkedin-private-api) | Unofficial; mimics logged-in session. High ToS/account risk; brittle when LinkedIn changes UI. |
| linkedin-jobs-api | [VishwaGauravIn/linkedin-jobs-api](https://github.com/VishwaGauravIn/linkedin-jobs-api) | Job listing helpers; not an official API wrapper. Maintenance and compliance vary. |

Treat these as **last resort** for automation; prefer official products or manual URL import into Research.

## What LinkedIn actually exposes (2025–2026)

- **Sign In with LinkedIn / Profile API** — authenticated member’s own profile (`r_liteprofile` / successor scopes), not third-party company/job search.
- **Marketing / Account Intel** — B2B account data for approved marketing integrations ([Account Intel API](https://learn.microsoft.com/en-us/linkedin/marketing/account-intel/account-intel-api)).
- **Job Posting API** — create/manage postings for **approved partners**; not an open “search all jobs” API for new apps.
- **No open public REST** for “search company by name” or “scrape job feed” comparable to what the Research UI needs without partnership.

## Practical path for MFCV Research

1. **Short term (current)** — Keep AI research + catalog JSON; optional paste of `linkedin_company_url` / `linkedin_url` on entities.
2. **If you obtain LinkedIn partnership** — Integrate `linkedin-api-client` in Next.js **route handlers only**; map responses into `ResearchedCompany` / `ResearchedJobPosition` normalizers.
3. **If you need import only** — Consider CSV/JSON import from LinkedIn Recruiter exports or approved data vendors rather than scraping.
4. **Do not** embed unofficial scrapers in the client bundle; run server-side with explicit user consent and document ToS risk.

## npm install (when ready)

```bash
npm install linkedin-api-client --workspace=@muhfweeceevee/web
```

Wire OAuth in Settings (client id/secret, redirect URL) and store refresh tokens server-side—never in `localStorage` or gitignored catalog files.