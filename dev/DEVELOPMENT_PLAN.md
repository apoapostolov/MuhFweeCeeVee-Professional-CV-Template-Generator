# Development Plan — MuhFweeCeeVee

## Current Focus

**Quality refactor epic** (audit items 1, 2, 4, 5, 6, 8, 9). Track progress in [`TODO.md`](../TODO.md).

## Execution Sequence (multi-session)

| Phase | Items | Goal |
|-------|-------|------|
| **0 — Foundation** | 2, 5, 9, 8, 4a–4b, 1a–1c | CI, audit, auth, tests, first composer extractions |
| **1 — UI split** | 1d–1j | Panel components + thin shell |
| **2 — Render split** | 6a–6d | Per-template modules + render-core |
| **3 — Hardening** | 4c–4d, V2, 9c, 2b | API tests, full validation on writes |

## Near-Term (after refactor epic)

- Companies tab / cover letters (product roadmap, out of this epic).
- E2E Playwright smoke in CI (optional job).

## Decision Log

- 2026-06-02: Refactor epic supersedes “docs only” focus in prior plan entry.

## Risks and Blockers

- `ComposerClient` state is monolithic — introduce `ComposerProvider` if prop drilling exceeds ~12 props per panel.