# Development Plan — MuhFweeCeeVee

## Current Focus

**MuhFwee AI hardening.** Phases 1–3 now provide contextual chat, confirmed
management, multi-step plans, coherent batches, saved playbooks, conversation
management, direct workspace handoffs, and opt-in archived history backup. The
next executable slice is Phase 4: E2E, accessibility, budget/rate-limit,
stale-context, and MCP failure hardening. Track it in
[`TODO.md`](../TODO.md) and
[`AI_COPILOT_PANEL.md`](../docs/AI_COPILOT_PANEL.md).

## Execution Sequence (multi-session)

| Phase | Items | Goal |
|-------|-------|------|
| **0 — Foundation** | 2, 5, 9, 8, 4a–4b, 1a–1c | CI, audit, auth, tests, first composer extractions |
| **1 — UI split** | 1d–1j | Panel components + thin shell |
| **2 — Render split** | 6a–6d | Per-template modules + render-core |
| **3 — Hardening** | 4c–4d, V2, 9c, 2b | API tests, full validation on writes |

## Near-Term (after refactor epic)

- Internal **MuhFwee AI** copilot panel: phased contracts, read-only MCP
  assistant, confirmed management actions, then power-user workflows. See
  [`docs/AI_COPILOT_PANEL.md`](../docs/AI_COPILOT_PANEL.md).
- Companies tab / cover letters (product roadmap, out of this epic).
- E2E Playwright smoke in CI (optional job).

## Decision Log

- 2026-07-29: Prioritize application-operations backlog items 2–6 after the
  portable backup foundation; retain MuhFwee AI Phase 1 as the next optional
  epic.
- 2026-07-29: Complete MuhFwee AI Phase 1 with server-owned read-only tool
  filtering; Phase 2 must preserve the existing approval-token boundary.
- 2026-07-29: Complete MuhFwee AI Phase 2 by keeping approval execution outside
  the model turn and binding it to session, arguments, context, target content,
  expiry, and an exactly-once ledger claim.
- 2026-07-29: Complete MuhFwee AI Phase 3 with a non-mutating internal planning
  tool, individually bound batch execution, private playbook/session indexes,
  direct workspace handoffs, and explicit opt-in assistant-history portability.
- 2026-06-02: Refactor epic supersedes “docs only” focus in prior plan entry.

## Risks and Blockers

- `ComposerClient` state is monolithic — introduce `ComposerProvider` if prop drilling exceeds ~12 props per panel.
