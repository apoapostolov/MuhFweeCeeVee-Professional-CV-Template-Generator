# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- Dead `/api/prototype` control routes (unused scaffold).
- Stalled session docs (`docs/REQUEST_CATALOG_SINCE_SCORE_SECTION.md`, `docs/INITIAL_TEMPLATING_BOOTSTRAP.md`) and obsolete `dev/RELEASE_NOTES_v1.1.0.md`.
- `backup/retired-keywords/` Keyword Studio archive (recover from git history if needed).
- **`POST /api/analysis/company-research`** and `lib/company-research` (D1) — use Research staged enrich.

### Added

- **`POST /api/research/catalog/import-metadata`** — import legacy Editor company-metadata (example + personal) into Research catalog shells + target_roles as jobs (no AI). Research sidebar button + MCP `research_catalog_import_metadata`.
- **Letters versioning** — server snapshots on save / AI draft / Humanize; restore from history panel; local **Undo** stack before AI/Humanize/restore.
- Letters: **AI draft** and **Humanize** are separate steps (no auto-humanize after draft).
- **Board kanban drag-and-drop** — hold card ~180ms to lift; soft lean with mouse velocity; drop on columns (optimistic status update).

## [1.3.0] - 2026-07-26

Power-user job-search workflow: research → tailored CV → letter → application pack → print.

### Added

- **Research as the company/job source** — one catalog for companies and roles; Editor picks a target (no parallel company-metadata research path).
- **Cost-controlled AI research** — **Include Research** checkbox: off = analysis model only; on = research model + live web. Same control on company enrich and field ✨.
- **Staged company enrich** — cheap identity fill by default; deeper stages when you ask for research.
- **Local JD keyword extract** — pull weighted keywords from job text without inventing a full AI job dossier.
- **Editor keyword gap + targeting** — persist Research company/job on the CV; see what the JD asks for vs what you wrote.
- **Letters** — save cover letters tied to CV + Research target; cheap AI draft.
- **Humanizer skill on letters** — second-pass rewrite kills generic AI-isms (`ai-skills/humanizer`, from [apoapostolov/humanizer](https://github.com/apoapostolov/humanizer)); manual **Humanize** on any draft.
- **Board (applications)** — kanban by stage (Wishlist → Applied → Interview → Offer / Rejected / Ghosted).
- **Application packets** — each card binds **CV + profile photo + company + cover letter**; always editable; **Download pack** / **Open packet** JSON; **Copy for similar role** reuses CV/photo for another company.
- **ATS check** (Editor) — deterministic rules, no LLM; optional coverage against job keywords.
- **MCP tools** for staged enrich, keyword extract/gap, ATS check, letters, application packets (export/import/reuse).

### Changed

- Field contracts + keyword score caps: empty beats fake emails/phones; soft-cap unverified keyword weights.
- Photo gallery list uses lightweight `mediaUrl` instead of shipping full base64 for every thumbnail.
- Board nav label: **Board**; clearer packet editor labels (EN/BG).

### Fixed

- Dark mode: theme-aware vertical scrollbars; no horizontal scrollbar chrome in the app shell.
- Print Room: Refresh / Open / Print fit one row in the sidebar.

## [1.2.4] - 2026-07-25

### Security

- **Auth parity** on previously open cost/write routes: photo analysis/compare, CV sync/status, variant create, prototype control, OpenRouter credit, preview HTML, PDF/PNG export.
- **Loopback-aware API auth**: browser UI on `localhost`/`127.0.0.1` stays trusted; non-loopback requires `MFCV_API_TOKEN` when set; production non-loopback without a token is denied. Optional `MFCV_REQUIRE_API_TOKEN`.
- **SSRF guard** on OpenRouter `baseUrl` (https + `openrouter.ai` allowlist only).
- **Export concurrency** limit via `MFCV_EXPORT_CONCURRENCY` (default 1) for Playwright PDF/PNG.
- **No side-effect GET**: `autoTranslate` on `GET /api/cvs/:id` returns 405; use `POST /api/cvs/variant`.
- **Atomic CV writes** (temp file + rename) to avoid truncated YAML.
- Timing-safe token comparison.

## [1.2.3] - 2026-06-04

### Added

- **`@muhfweeceevee/mcp-wrapper` v0.2.0**: MCP tools for Research (catalog CRUD, company/job research, field refine), CV analysis (`analysis_cv`, `analysis_field`), CV workflow (`create_cv`, `cv_history`, `cv_sync`, `translate_field`), company metadata, session backup export/import (server data), and render URL builders (`export_pdf_url`, `export_image_url`) with **print tweak** query params.
- **`GET /api/health`**: lightweight readiness payload (`ok`, `apiAuthRequired`, version).
- OpenRouter **`imageModel`** persisted in `data/settings/openrouter.yaml` and exposed on **GET/PUT** `/api/settings/openrouter` (Settings save includes image model).

### Changed

- MCP wrapper sends **`MFCV_API_TOKEN`** (or `CV_API_TOKEN`) on every API call when configured; [`MCP.md`](dev/MCP.md) documents the full tool catalog and auth.
- [`docs/API.md`](docs/API.md) updated for v1.2.x Research APIs, print-tweak params, health, and retired Keyword Studio routes.
- **`PUT /api/companies`** requires API token when `MFCV_API_TOKEN` is set (aligned with other mutations).

### Removed

- Keyword Studio MCP tools (`keyword_*`) now return a clear **retired in v1.1.0** error instead of calling removed HTTP routes.

## [1.2.2] - 2026-06-04

### Added

- **Print Room → Tweaks**: **Sidebar Text Size** and **Content Text Size** with a checkbox to turn each on, a compact **− | % | +** control on the same row (right-aligned), and a typable center value (**50–200%**; ± moves in **5%** steps). Scales the sidebar or main CV column in PDF preview—including headings, body text, and icons—so you can fit content to a target page count.
- Settings **Research model** under **AI Provider** (recommended list, web-search status, and cost estimates tied to that model).
- Research field **✨** runs AI refinement as soon as you open it; **Research More** requests another batch when you need alternatives. Up to three proposals with confidence and **Apply** render **inline below each field** (same pattern as Editor Professional Rewrite), not in a side drawer.
- **Live web search** for company research, job research, and per-field refine (LinkedIn-first guidance; Perplexity Sonar and OpenRouter online search paths).

### Changed

- Settings **AI Provider**: Analysis, Research, and Image use the same neutral panel layout; **Base URL** is no longer shown in the UI; **Import / Export** section title matches the AI Provider heading style.
- Approximate research costs in Settings follow your selected **research** model instead of the analysis model.
- Image generation pricing line in Settings is shorter (compact per-image USD + token note).

## [1.2.1] - 2026-06-05

### Added

- **Settings → Import / Export Data**: full **session backup** JSON—browser `localStorage`, researched **companies and job positions** (`data/research/catalog.json`), **company metadata** files, and all **CV YAML** on the dev server. Import restores each layer (new `PUT /api/research/catalog`) and reloads the app.
- Research catalog list **two-click delete** (compact ✕, red confirm) for companies and job positions, with stable row height in the sidebar.
