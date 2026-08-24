# Development Log — MuhFweeCeeVee

Append-only engineering journal for code, behavior, workflow, or meaningful
documentation changes. User-facing summaries belong in `CHANGELOG.md`.

## Entry Template

```md
## YYYY-MM-DD - Short title

- Context: why this change happened.
- Root cause: what prompted it, if applicable.
- Files changed: which files and why.
- Validation: commands run and results, or why validation was skipped.
- Follow-up risk: what remains uncertain or could break later.
```

## Recent Entries

### 2026-08-24 - Detector scope provenance

- Context: Distinguish whole-CV detector results from separately tested or
  provider-reported results for major CV sections.
- Contracts: Section results now identify sidebar, frontmatter, a specific
  experience position, backmatter, or a legacy mixed scope, plus their source.
- Validation: Schema and editor checks were run in the paired repositories.
- Follow-up risk: Legacy chunk scans cannot be split into finer scopes without
  rerunning the detector.

### 2026-08-24 - Versioned ATS and detector score metadata

- Context: Keep historical résumé-review results attached to the exact CV
  version and scan scope that produced them.
- Contracts: Added typed `metadata.ats_scores[]` and
  `metadata.detector_scores[]` entries with free-form provider results;
  detector rows may contain `section_scores[]`.
- Workflow: Missing groups receive presets for ApplyCove, CVParserPro, the local
  ATS checker, Sapling, QuillBot, GPTZero, and the local writing detector. The
  Metadata editor supports additional provider and section rows.
- Validation: Focused schema and editor tests pass in both paired repositories.
- Follow-up risk: Provider scores remain user-entered until the supported
  Sapling and GPTZero backend connectors are implemented.

### 2026-07-29 - MuhFwee AI Phase 3 power-user workflows

- Context: Make the copilot reusable across a large job-search portfolio
  without relaxing the confirmed-management boundary delivered in Phase 2.
- Contracts: Added typed plan and workspace-handoff events plus private
  playbook records. A server-owned `assistant_create_plan` tool produces visible
  2–8 step plans but never enters MCP execution.
- Workflow: The panel now exposes saved/built-in playbooks, searchable
  conversation history with active/archive and panel-scope filters, reversible
  archive, individually bound coherent approval batches, and user-activated
  navigation to the panel affected by a successful operation.
- Privacy: Portable backups still exclude assistant data by default. Explicit
  opt-in exports redacted proposal/tool arguments and private playbooks;
  imported conversations are forced archived so historical approvals cannot
  execute. Approval signing secrets and ledger token hashes are never exported.
- Validation: `npm run typecheck`, scoped assistant ESLint, 213 Vitest tests,
  and `npm run build` pass. The repository-wide lint command still stops on the
  five pre-existing React hook/ref errors in `ResearchPanel.tsx` and
  `applications-kanban.tsx`. The Windows dev server was restarted; health,
  playbook CRUD, redacted portable export, desktop playbook insertion, mobile
  library reachability, default-off backup control, and clean browser console
  were verified.
- Follow-up risk: Phase 4 still owns full keyboard/screen-reader journeys,
  long-history stress, budget/rate-limit behavior, and injected MCP
  crash/stale-context browser scenarios.

### 2026-07-29 - MuhFwee AI Phase 2 confirmed management

- Context: Continue the copilot from contextual reads into explicitly approved
  CV, Research, cover-letter, and application management.
- Contracts: approval proposals now include exact targets, bounded field-level
  previews, content-hash preconditions, cost/recovery guidance, expiry, and an
  idempotency key. Assistant events cover pending and resolved approvals.
- Runtime: guarded model calls persist a proposal and stop before mutation. A
  separate authorized endpoint rechecks current composer context and target
  content, issues and verifies a server-only token, atomically claims the
  operation, and then calls MCP. Repeated approval requests replay the stored
  result rather than executing twice.
- UI: accessible approval cards name the action and affected record, disclose
  before/after values, use proportional destructive or paid action labels, and
  offer **Keep current data**. Application selection and revision now enter the
  copilot context.
- Privacy: proposal/audit storage and the locally generated signing secret stay
  under ignored `data/assistant/`; audit arguments are redacted and approval
  tokens never enter browser traffic.
- Validation: 211 tests passed (four live-research tests skipped), TypeScript,
  the production build, scoped ESLint, MCP syntax, and scoped Markdown lint
  passed. The restarted Windows server exposed 30 read and 22 guarded tools. A
  live fictional application proposal was approved exactly once, a duplicate
  approval replayed the stored result, and audit history recorded proposed,
  approved, and succeeded states; the disposable record was removed. Isolated
  Chrome covered desktop and 320 px approval cards, keyboard submission,
  rejection without mutation, full-viewport compact layout, and a clean
  console. Repository-wide ESLint remains blocked by the same five pre-existing
  React hook errors in `ResearchPanel.tsx` and `applications-kanban.tsx`.
- Follow-up risk: Phase 3 should add coherent multi-step/batch approval plans
  and direct navigation or refresh handoff for every affected workspace panel.

### 2026-07-29 - MuhFwee AI Phase 1 read-only copilot

- Context: Continue the copilot epic after Phase 0 safety contracts and the
  application-operations backlog.
- Runtime: added private local sessions, bounded conversation history,
  cancellable NDJSON turns, context-aware OpenRouter requests, token usage, and
  explicit error/terminal events.
- MCP: added a reconnectable server-owned stdio client. Runtime discovery is
  filtered to read/derived classes, narrowed to at most 16 context-relevant
  schemas, and policy-gated again immediately before execution.
- UI: added the lower-right launcher, docked desktop panel, compact full-screen
  sheet, contextual suggestions, visible tool activity, reconnect/retry,
  cancellation, draft persistence, focus restoration, and keyboard submission.
- Privacy: assistant history stays under ignored `data/assistant/` and is not
  part of portable backups. Secrets, local paths, and tool results retain the
  Phase 0 redaction and untrusted-content boundary.
- Validation: 205 tests passed (four live-research tests skipped), the
  production build and scoped assistant ESLint passed, and scoped Markdown
  lint returned zero errors. A live turn discovered `list_cvs`, visibly
  executed it through MCP, and returned the correct count. Isolated Chrome
  checks covered the docked desktop panel, compact 320 px layout, focus
  behavior, keyboard submission, immediate cancellation with the prompt
  retained, and a clean console. The restarted Windows server returned HTTP
  200. Repository-wide ESLint remains blocked by five pre-existing React hook
  errors in `ResearchPanel.tsx` and `applications-kanban.tsx`.
- Follow-up risk: Phase 2 must add previewable changes and consume the existing
  server-issued approval token before enabling any mutation or paid tool.

### 2026-07-29 - Power-user application operations items 2-6

- Context: Continue the highest-value missing-functionality backlog after
  portable whole-session backups.
- Submissions: freeze immutable, checksummed CV YAML/PDF, letter, photo, target,
  and ATS artifacts at apply time; expose downloads and current-vs-submitted
  drift.
- Operations: add activities, recruiter contacts, priorities, next actions,
  Today queue, Quick Intake, duplicate signals, saved filters, archive, and
  event-derived funnel analytics.
- Evidence: add a reusable career-evidence library with tags, verification,
  provenance, and hash-backed CV links.
- Portability and agents: session backup v4 and ZIP archive v2 include evidence
  and immutable submission assets; MCP v0.3.0 exposes the new application and
  evidence tools.
- Validation: 201 tests passed (four live-research tests skipped), TypeScript
  and scoped ESLint passed, MCP registered 73 unique classified tools, and the
  restarted Windows server returned HTTP 200. An isolated Chrome smoke covered
  Board, Today, Analytics, Evidence, Quick Intake, and application details with
  no console errors. A real immutable submission returned HTTP 201 and a
  114,975-byte `%PDF` asset.
- Validation baseline: repository-wide ESLint remains blocked by five existing
  React-rule errors in `ResearchPanel.tsx` and `applications-kanban.tsx`;
  markdown lint remains blocked by unrelated legacy files. Changed feature
  files and `docs/API.md` pass their scoped checks.
- Follow-up risk: Quick Intake is deliberately rule-based and does not fetch
  arbitrary URLs; CSV/JSON bulk intake remains optional backlog work.

### 2026-07-29 - MuhFwee AI Phase 0 safety contracts

- Context: Implement the first executable slice of the internal AI copilot
  backlog before exposing a model-driven chat surface.
- Contracts: added versioned context, session, event, approval, audit, and MCP
  tool-definition types plus runtime validation for the context boundary.
- Policy: classified all 62 MCP tools with structured target metadata and
  default-deny handling for unknown tools. MCP discovery now publishes
  advisory annotations and MuhFweeCeeVee policy metadata; the server remains
  authoritative.
- Security: added proportional tool gating, HMAC approval tokens bound to
  session/tool/normalized arguments/current context revisions, secret and
  local-path redaction, and an explicit untrusted-tool-result boundary.
- Validation: 18 focused safety/schema tests passed; TypeScript and MCP source
  syntax checks passed. Tests prove guarded model calls receive no executable
  closure and stale, expired, or tampered approvals fail.
- Follow-up risk: Phase 1 must route every runtime MCP call through this gate.
  One-time token consumption and persistent approval audit storage belong with
  the Phase 2 mutation runtime.

### 2026-07-29 - Windows-native development host

- Context: Move the Next.js development host off WSL `/mnt/c` after repeated
  slow compilation, watcher memory pressure, generated-type corruption, and
  platform-specific dependency churn.
- Files changed: Windows start/stop/restart scripts, package scripts,
  `next.config.ts`, README, AGENTS, dev-server workflow, and hard-problem
  record.
- Runtime decision: Windows port 10004 is primary; `npm run dev:wsl` is the
  slower polling fallback. The WSL `fweecv-dev.service` is retired.
- Validation: WSL service disabled and inactive; tracked Windows process health
  returned HTTP 200; warm root request completed in 0.22 seconds; fictional
  PDF export returned 114,975 bytes in 1.22 seconds; live source and revert HMR
  probes appeared in 416 ms and 394 ms. Windows Playwright Chromium was
  installed for PDF generation. Full Vitest passed (176 tests, 4 skipped),
  TypeScript and focused Next-config ESLint passed, and all PowerShell launch
  scripts parsed successfully.

### 2026-07-29 - Internal AI copilot product specification

- Context: Develop the lower-right internal AI-panel idea into a complete
  power-user product and engineering backlog.
- Decision: use a docked contextual copilot backed by the existing MCP tool
  catalog, with a deterministic server-side policy layer. Reads may flow;
  writes, destructive operations, and paid analysis require scoped approval.
- Artifacts: `docs/AI_COPILOT_PANEL.md`, canonical TODO phases, documentation
  index, and development-plan routing.
- Scope: specification only; no user-visible application behavior changed.

### 2026-07-29 - Session backup v3 foundation

- Context: Begin the power-user safety roadmap by expanding session backups
  beyond CV and research data.
- Files changed: backup serialization/import, Settings backup UI, focused tests,
  changelog, and TODO.
- Validation: focused ESLint passed; full Vitest suite passed (174 tests, 4
  skipped); TypeScript passed after regenerating the stale `.next` cache;
  `git diff --check` passed; `/api/health` returned HTTP 200 from the restarted
  WSL dev server. Full ESLint remains blocked by five pre-existing React hook
  errors in `ResearchPanel.tsx` and `applications-kanban.tsx`.
- Initial scope: this entry covered the JSON-only foundation. The portable ZIP
  extension in the next entry adds ID-preserving photo assets. Imports merge
  matching IDs rather than deleting records absent from the backup.

### 2026-07-29 - Portable ZIP backup assets

- Context: Expand the session backup into a portable archive for power users
  managing many application packets.
- Files changed: ZIP archive builder/importer, Settings backup UI, photo
  ID-preserving restore API/store, archive tests, API/README/changelog/TODO,
  and the `jszip` web dependency.
- Behavior: archives contain the v3 JSON manifest, separate structured CV
  sources, referenced/approved photo files with per-photo analysis history,
  and optional PDFs generated from application CV/photo combinations using the
  selected template. Imports restore photos before merging application data.
- Validation: focused ESLint passed; full Vitest suite passed (176 tests, 4
  skipped); TypeScript passed with the WSL service stopped and generated cache
  cleared; a real fictional-sample PDF export returned 54,525 bytes; restarted
  `fweecv-dev.service` returned HTTP 200 for both `/` and `/api/health`; a
  temporary 310,446-byte PNG round-trip preserved its requested restore ID and
  was deleted after verification.
  Repository-wide ESLint still has five pre-existing React hook errors, and
  Markdown lint still has 22 pre-existing documentation errors.
- Remaining gap: cross-photo comparison history is not yet included.

### 2026-07-29 - Docker Compose deployment support

- Context: Add a maintained container path after triaging the abandoned fork's
  early Docker branch.
- Files changed: `Dockerfile`, `.dockerignore`, `docker-compose.yml`,
  `deploy/docker/entrypoint.sh`, `deploy/docker/compose.env.example`, and
  Docker instructions in `README.md`; OpenRouter settings now support a
  container-specific persistent environment-file path.
- Validation: WSL `docker compose config` passes. The live image build reached
  `npm ci` but the npm registry connection reset; repository-wide lint and type
  checks remain blocked by pre-existing errors.
- Follow-up risk: retry `docker compose up --build` on a stable network and
  confirm PDF export before production use.

### 2026-06-02 - Composer panel extract (1g–1i)

- Context: Continue decomposing `ComposerClient.tsx` per audit item 1.
- Files changed:
  - `KeywordStudioPanel.tsx`, `PhotoBoothPanel.tsx`, `EditorPanel.tsx`, `useEditorFormRenderer.tsx`
  - `analysis-ui-utils.ts`, `buildKeywordMatcher.ts`, `keyword-tag-ui.ts`
  - `ComposerClient.tsx` now routes editor/keywords/photo booth to panels (~2460 LOC)
- Validation: `npm run check`, `npm run test` (9 tests).
- Follow-up risk: ESLint unused-import warnings in extracted modules; shell &lt;800 LOC (1j) and
  `renderCvTemplate.ts` split (6a) remain.

### 2026-06-02 - Composer panel extract (1d–1f)

- Context: Continue `ComposerClient.tsx` decomposition per `TODO.md` audit item 1.
- Files changed:
  - `components/composer/{SettingsPanel,OpenRouterSettingsCard,TemplatesPanel,WorkspacePanel}.tsx`
  - `components/composer/{openrouter-utils,useOpenRouterSettings}.ts`
  - `ComposerClient.tsx` now routes workspace/templates/settings to panels (~5078 LOC,
    down ~500 from pre-extract)
- Validation: `npm run check`, `npm run test` (9 tests pass).
- Follow-up risk: Editor/Keywords/Photo Booth still inline (1g–1i); shell target
  &lt;800 LOC not reached.

### 2026-06-02 - Quality refactor phase 0 (audit items 1,2,4,5,6,8,9)

- Context: Start multi-session refactor from codebase audit priorities.
- Files changed:
  - CI: `.github/workflows/ci.yml`
  - Tests: `vitest.config.ts`, schema + cvVariants tests, Ajv in `validateCvV1`
  - Composer: `components/composer/{types,constants,form-path-utils}.ts`; slimmed
    `ComposerClient.tsx` (~800 lines removed)
  - Auth: `apiAuth.ts`, guards on CV write/analysis/settings routes
  - Parser: `services/parser/README.md`
  - `packages/render-core` stub documented; `TODO.md` checklist epic
- Validation: `npm run test` (9 tests), `npm run check` (pending final run).
- Follow-up risk: `npm audit` still reports 2 issues needing Next bump; panel
  extracts 1d–1j and render split 6a–6d remain.

### 2026-06-02 - Import shared defaults documentation

- Context: Align MuhFweeCeeVee with `/mnt/c/git/defaults` instruction templates
  adapted for this product; skip Vite-only and over-scoped templates.
- Files changed:
  - `AGENTS.md`: full operating contract (stack, validation, privacy, skills).
  - `docs/DOCUMENTATION_INDEX.md`: map of all process and product docs.
  - `CHANGELOG_TEMPLATE.md`, `TODO_TEMPLATE.md`, `TODO.md`, `DEVELOPMENT_PLAN.md`.
  - `DEV_SERVER_WORKFLOW.md`: Next.js stale-UI recovery + custom port.
  - `skills/`: `next-dev-workflow`, `subagent-delegation`, `sqlite-binary-path`.
  - `.gitignore`: track agent docs and `skills/`; `package.json`: `lint:md`,
    `test:keywords`.
- Validation: `npm run bootstrap`; `npm run check`; `npm run lint:md` on scoped doc paths.
- Follow-up risk: run `npm run bootstrap` after pulling; add CI workflow separately.

### 2026-03-08 - Keyword sqlite path and CV variant ids

- Context: Documented in `HARD_PROBLEMS.md` (sqlite binary mismatch, variant id
  formats). Skills now capture sqlite guidance under `skills/gotchas/`.

## Notes

- Prefer newest entries at the top.
- Use absolute dates.
- Do not duplicate `CHANGELOG.md` marketing tone here.
