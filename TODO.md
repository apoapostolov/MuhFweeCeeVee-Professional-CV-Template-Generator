# TODO — MuhFweeCeeVee

Post-**v1.3.0** follow-ups only. Shipped research/letters/board work is in
[`CHANGELOG.md`](CHANGELOG.md) and [`proposal/PROGRESS.md`](proposal/PROGRESS.md).

## Open (optional)

- [ ] **AI Copilot epic:** implement the internal lower-right **MuhFwee AI**
  launcher and docked, context-aware MCP management panel specified in
  [`docs/AI_COPILOT_PANEL.md`](docs/AI_COPILOT_PANEL.md).
  - [x] Phase 0: assistant schemas, MCP tool policy, approvals, redaction, and
    prompt-injection tests.
  - [x] Phase 1: read-only contextual chat, streaming, tool activity, reconnect,
    cancellation, and responsive/keyboard-complete panel.
  - [x] Phase 2: previewed and explicitly approved CV, research, letter, and
    application mutations with audit history.
  - [x] Phase 3: multi-step plans, batch approvals, playbooks, conversation
    search/archive, and backup-policy decision.
  - [ ] Phase 4: E2E, accessibility, cost-budget, stale-context, and MCP failure
    hardening.
- [ ] **Tests:** API route tests for CV POST validation / bad `cvId`.
- [ ] **Tests:** smoke fixture from `data/cvs/cv_en_john_doe.yaml` in CI if not already covered.
- [ ] **Engineering:** further split of `useComposerController` if it remains a pain point.
- [ ] **Parser:** only if product needs real PDF/DOCX import — scaffold lives in `services/parser/`.
- [ ] **Backup:** preserve cross-photo comparison history; portable ZIP backup
  already includes used photo files and per-photo analysis with ID-preserving
  restore.
- [ ] **Intake:** add CSV/JSON bulk import and an optional browser-bookmarklet
  capture path after the single-listing Quick Intake workflow has field use.

## Done recently (do not re-open)

- Research hardening (field contracts, staged enrich, JD keywords, targeting/gap)
- Letters + humanizer skill
- Board application packets (export/import/reuse)
- Deterministic ATS check
- API auth / SSRF / export concurrency (v1.2.4)
- ComposerClient panel extract; render split per template
- **D1 cleanup:** removed `/api/analysis/company-research`; metadata → catalog import; MCP retired
- Docker Compose deployment path: non-root web runtime, persistent local state,
  loopback-only publishing, and health checks.
- Application operations items 2–6: immutable submission snapshots;
  activity/contact timeline and Today queue; Quick Intake; career evidence with
  CV provenance; saved views, archive/duplicate controls, and event-derived
  analytics.
- MuhFwee AI Phase 1: contextual read-only chat, MCP discovery/policy filtering,
  visible tool events, streaming/cancellation, reconnect, and responsive panel.
- MuhFwee AI Phase 2: field-level mutation previews, revision/context
  preconditions, one-time approval execution, cost/destructive confirmation,
  and persistent audit history.
- MuhFwee AI Phase 3: visible multi-step plans; coherent, individually bound
  approval batches; saved playbooks; conversation search, scope filters, and
  archive/restore; direct panel handoffs; opt-in redacted history backup with
  archived-only restore.

## Process templates

See [`dev/TODO_TEMPLATE.md`](dev/TODO_TEMPLATE.md) if starting a new multi-session epic.
