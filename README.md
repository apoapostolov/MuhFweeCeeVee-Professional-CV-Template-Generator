# MuhFweeCeeVee

*A self-hosted CV and job-search workspace you own instead of renting by the month.*

[![Repository Version](https://img.shields.io/badge/version-1.3.1-blue)](./package.json)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933)](https://nodejs.org/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED)](./deploy/docker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

MuhFweeCeeVee brings CV writing, job research, cover letters, applications,
evidence, scoring, and print-ready export into one local workspace. It keeps the
source material under your control, supports local ATS checks alongside
optional AI help, and can preserve the exact documents submitted for each job.

<p align="center">
  <img src="images/SCREENSHOT_01.png" alt="Print Room with a live PDF preview and template controls" width="100%">
</p>

## What's New in 1.3.1

- Run the complete web app through Docker Compose on a local host.
- Keep CVs, photos, and runtime settings in durable named volumes.
- Export PDF and PNG files from an unprivileged container with health checks.
- Bind to localhost by default and require an explicit API token for protected access.

The repository's current `main` branch also contains application operations and
the MuhFwee AI copilot listed under **Unreleased** in the
[changelog](./CHANGELOG.md).

## What You Can Do

- **Write one CV in the view you prefer.** Move between structured forms and YAML without maintaining two separate documents.
- **See the real output while editing.** Preview and print template-accurate PDFs in Cambridge, Stanford, Harvard, Europass, and Edinburgh styles.
- **Tailor and check for a specific job.** Extract weighted keywords, show the
  gaps in the Editor, and run a local ATS check before spending AI credits.
- **Create cover letters with context.** Bind each letter to a CV and target, keep version history, and run a separate humanizer pass.
- **Manage the full application trail.** Track stages, next actions, contacts,
  activity, and analytics, then freeze the exact submitted files as one packet.
- **Build a reusable evidence library.** Keep verified achievements and link them to the CV claims they support.
- **Ask the built-in copilot for help.** Review visible tool activity and approve every proposed CV, Research, letter, or application change at field level.
- **Back up the workspace.** Export a merge-restorable ZIP with structured records, referenced photos, evidence, submissions, and optional PDFs.

<p align="center">
  <img src="images/SCREENSHOT_03.png" alt="CV editor with structured fields and scoring feedback" width="49%">
  <img src="images/SCREENSHOT_05.png" alt="Template gallery comparing available CV layouts" width="49%">
</p>

## A Practical Workflow

1. Add your master CV in **Editor** using forms or YAML.
2. Save the company and role in **Research**, then extract the job's keywords.
3. Target that role from the CV and review the keyword gap and ATS check.
4. Draft and humanize a cover letter tied to the same CV and target.
5. Build the application in **Board** and generate the final PDF in **Print Room**.
6. When you apply, freeze the complete submission packet and set the next action.

AI is optional. Local editing, templates, keyword extraction, ATS checks, board
operations, and backups remain useful without an external model.

## Templates and Print

Print Room renders the actual PDF inside the app. Per CV, template, and language,
it remembers presentation tweaks such as text scale, photo mode, and column
balance.

<p align="center">
  <img src="images/SCREENSHOT_02.png" alt="Dark theme Print Room with a live CV PDF" width="49%">
  <img src="images/SCREENSHOT_06.png" alt="Photo Booth profile-photo review" width="49%">
</p>

## Data, Privacy, and AI

CVs, application data, photos, and settings stay on the host you control.
Private MuhFwee AI conversations and playbooks are excluded from backups by
default. If explicitly included, conversation history is redacted and restored
as archived history so old approvals cannot run.

External AI or research features send the relevant job, company, or CV context
to the provider you configure. Review that provider's privacy terms before
using sensitive personal data.

When the app is reachable beyond localhost, set `MFCV_API_TOKEN`. Non-loopback
mutation, analysis, and export requests are denied without the token. Put a TLS
reverse proxy such as Caddy or nginx in front of any remote deployment.

## Quick Start

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
npm run bootstrap
npx playwright install chromium
npm run dev:windows:start
```

Open `http://127.0.0.1:10004`. On other platforms, use `npm run dev`; the
production app defaults to port `3000`.

## Docker Compose

```bash
cp deploy/docker/compose.env.example .env.docker
# Set a long, random MFCV_API_TOKEN in .env.docker.
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
```

Open `http://127.0.0.1:3000` and check `/api/health`. Keep `.env.docker` local.
`docker compose down` preserves named volumes; adding `--volumes` deliberately
erases container-managed CV, photo, and runtime configuration data.

## Development

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- [Documentation index](./docs/DOCUMENTATION_INDEX.md)
- [CV YAML standard](./docs/CV_YAML_STANDARD.md)
- [CV scoring standard](./docs/CV_SCORING_STANDARD.md)
- [API reference](./docs/API.md)
- [Contributor guide](./CONTRIBUTING.md)

MuhFweeCeeVee is available under the [MIT License](./LICENSE).
