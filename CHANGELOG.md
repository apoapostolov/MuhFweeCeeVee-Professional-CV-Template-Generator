# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-08-24

MuhFweeCeeVee now covers the daily job-search loop with a clearer handoff between writing, research, review, applications, and final submission. The work stays local by default, while AI remains something you can choose and control.

### Added

- **Provider choices for every AI job** — choose which service handles translation, research, CV review, photo feedback, writing help, and the built-in assistant. Connect Codex or xAI with a sign-in flow, choose a model and reasoning level where available, see usage limits, and get a rough cost before sending a larger request. Local model endpoints can be used alongside hosted providers.
- **MuhFwee AI copilot** — open a private assistant from any workspace screen, ask it to inspect the current CV or job-search material, follow its visible actions, and approve proposed changes before they are applied. Conversations can be searched, resumed, archived, and saved as reusable playbooks. The assistant can also hand you back to the exact CV, research record, letter, or application it was discussing.
- **CV review and AI-writing checks** — keep ATS results and writing-review findings with each CV, compare results by provider and by section, and review detector findings without pretending that missing evidence is a score. Skill ratings accept half-steps, and the editor now gives you clearer control over optional experience sections and hidden YAML fields.
- **A fuller application workspace** — work through application details, company information, saved snapshots, and a live timeline without losing your place. Track contacts and next actions, see what is due today, search and save useful board views, reuse career evidence, and freeze the exact CV, letter, photo, and PDF that went out.
- **Portable workspace backups** — export the records, photos, evidence, letters, application history, and submitted materials that belong to the workspace. Restoring a backup merges matching records without wiping work that is not in the archive.
- **More deliberate printing and version selection** — Print Room remembers presentation choices for each CV, language, and template, offers conservative help with page breaks, keeps exported documents properly identified, and puts matching CV names together with the newest semantic version first. Older versions remain easy to find below.

### Changed

- **Research now feeds the whole workflow** — a company and its roles can carry through targeting, keyword checks, letters, applications, and the final print step instead of living in separate screens.
- **Cover letters have a clearer writing loop** — create a letter from the selected CV and target, keep its history, draft with AI when wanted, and run humanizing as a separate deliberate pass.
- **Applications are easier to read at a glance** — stages, cards, colors, photos, locations, actions, and loading states now behave consistently in both light and dark themes. The editor actions stay where you need them while the board refreshes.
- **The editor is more legible and less surprising** — language follows the selected CV, nested sections are easier to scan, action controls have clearer labels and contrast, and the most important scoring actions sit beside the analysis heading.
- **Photos and exported files carry more context** — Photo Booth makes the approved state and available actions clearer, while PDF output preserves useful author, title, and subject information.

### Fixed

- **AI connections survive ordinary refreshes** — signed-in provider sessions remain available instead of silently dropping out, and workflows no longer disappear just because a provider has no API key.
- **Assistant responses stay in the conversation** — Codex replies render normally, the assistant shows the workspace context it is using, and reconnecting does not throw away the current draft.
- **Application changes are not lost during board activity** — saves remain durable while the board loads or refreshes, and timeline edits stay on the selected timeline.
- **CV and print selections stop following incidental file order** — names stay together, semantic versions sort from the newest at the top to the oldest at the bottom, and last-edited information settles ties when it exists.

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
