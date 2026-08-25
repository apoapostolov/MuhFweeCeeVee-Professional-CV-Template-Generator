# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-08-24

1.4.0 replaces the single OpenRouter account with twenty AI providers. API keys, OAuth subscriptions, and local endpoints each carry a credit or quota you can watch as you work. The rest of the job-search loop stays local.

### Added

- **Twenty AI providers.** Leave the single OpenRouter account behind. Add API-key providers, OAuth subscriptions (Codex, xAI), or a local endpoint. Credit and quota remaining stay visible while you use AI features. Limits and a rough cost show before a large request.
- **MuhFwee AI copilot.** Open a private assistant from any workspace screen. It reads current context, shows its steps, and waits for approval before editing a CV, research record, letter, or application. Conversations can be searched, archived, or saved as playbooks.
- **CV review stored on the document.** ATS and writing-review findings stay with each CV. Compare by provider or section. Detector hits are findings, not a score when evidence is missing. Skill ratings accept half-steps.
- **Application trail.** Details and company notes sit with snapshots and a live timeline. Track contacts and next actions, see what is due today, and freeze the exact CV, letter, photo, and PDF that went out.
- **Portable workspace backups.** Export the workspace records plus photos, evidence, and submitted materials. Restore merges matching records and leaves other local work alone.
- **Print Room version order.** Presentation choices are remembered per CV, language, and template. Page-break help stays conservative. Exported PDFs keep author, title, and subject. Matching names sit together, newest semantic version first. Clone a version from the editor or Print Room.

### Changed

- **Smart Pagination in Print Room.** Print Room now gives you two ways to handle a crowded page:
  - **Normal.** Makes a small, measured compaction to rescue a single line break when it can.
  - **Aggressive.** Also tightens heading and separator spacing, opens a little extra page room, and uses stronger line compaction to recover up to three lines.
  Large sections can flow across pages instead of leaving a big blank patch, while short orphan fragments are kept together when possible.
- **Research feeds the rest of the loop.** A company and its roles carry through targeting, keyword checks, letters, applications, and print instead of living on isolated screens.
- **Cover letter writing loop.** Create a letter from the selected CV and target. Keep its history. Draft with AI when wanted. Run humanizing as a separate pass.
- **Application board consistency.** Stages, cards, and loading states behave the same in light and dark themes. Editor actions stay put while the board refreshes. Saves survive a board reload.
- **Editor scanability.** Language follows the selected CV. Nested sections are easier to scan. Scoring actions sit beside the analysis heading.
- **Photo Booth and PDF context.** Approved state and available actions are clearer. PDF output keeps useful author, title, and subject fields.

### Fixed

- Signed-in provider sessions survive ordinary refreshes instead of dropping out. Workflows no longer vanish just because a provider has no API key.
- Codex replies render in the conversation. The assistant shows the workspace context it is using. Reconnecting does not throw away the current draft.
- Application saves stay durable while the board loads or refreshes. Timeline edits stay on the selected timeline.
- CV and print pickers no longer follow incidental file order. Names stay together. Semantic versions sort newest to oldest. Last-edited breaks ties when it exists.

## [1.3.1] - 2026-07-29

### Added

- **Docker Compose deployment** — run MuhFweeCeeVee as a local container with
  PDF/PNG export support, health checks, loopback-only access, and durable CV,
  photo, and runtime-settings storage. The application runs unprivileged and
  requires an explicit local API token.

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
