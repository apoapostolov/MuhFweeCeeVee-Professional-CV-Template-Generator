# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-07-27

Power-user job-search workflow: research → tailored CV → letter → application pack → print.

### Added

- **Research as the company/job source** — one catalog for companies and roles; Editor picks a target (no parallel company-metadata research path).
- **Cost-controlled AI research** — **Include Research** checkbox: off = analysis model only; on = research model + live web. Same control on company enrich and field ✨.
- **Staged company enrich** — cheap identity fill by default; deeper stages when you ask for research.
- **Local JD keyword extract** — pull weighted keywords from job text without inventing a full AI job dossier.
- **Editor keyword gap + targeting** — persist Research company/job on the CV; see what the JD asks for vs what you wrote.
- **Letters** — save cover letters tied to CV + Research target; cheap AI draft.
- **Humanizer skill on letters** — second-pass rewrite kills generic AI-isms (`ai-skills/humanizer`); manual **Humanize** is a separate step from AI draft.
- **Letter versioning** — server snapshots on save / AI / Humanize; load into editor without writing; delete snapshots; local **Undo** stack.
- **Applications** (kanban) — by stage with application **packets** (CV + photo + company + letter).
- **Applications drag-and-drop** — click header for details; drag header between columns with soft lean; segmented icon actions.
- **Applications dwell counter** — `Nd` in header (pastel red when **> 30 days**); resets only on real pipeline progress (not back / rejected / ghosted); **editable in details** to fix stuck or accidental resets.
- **Print Room tweaks remembered** per **CV + template + language** (sidebar/content scale, remove photo, skills left).
- **Import company metadata → Research catalog** — no AI shells from legacy Editor metadata files.
- **ATS check** (Editor) — deterministic rules, no LLM; optional job keyword coverage.
- **MCP tools** for enrich, keywords, gap, ATS, letters, packets, catalog import.

### Changed

- Field contracts + keyword score caps: empty beats fake emails/phones.
- Photo gallery list uses lightweight `mediaUrl` instead of full base64 for every thumbnail.
- Nav label: **Applications** (was Board); packet editor labels clarified (EN/BG).

### Removed

- Dead `/api/prototype` scaffold.
- `backup/retired-keywords/` archive (recover from git history if needed).
- **`POST /api/analysis/company-research`** (D1) — use Research staged enrich.

### Fixed

- Dark mode vertical scrollbars; no horizontal scrollbar chrome in the app shell.
- Print Room Refresh / Open / Print fit one row in the sidebar.
- Letters body fills editor column; toolbar does not overlap content.

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

- **`@muhfweeceevee/mcp-wrapper` v0.2.0**: MCP tools for Research, CV analysis, CV workflow, company metadata, session backup, and render URL builders.
- **`GET /api/health`**: lightweight readiness payload.
- OpenRouter **imageModel** persisted in settings.

### Changed

- MCP wrapper sends **`MFCV_API_TOKEN`** when configured.
- Keyword Studio MCP tools return retired errors.
