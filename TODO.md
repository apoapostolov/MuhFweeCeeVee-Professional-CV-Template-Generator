# TODO — MuhFweeCeeVee

Post-**v1.3.0** follow-ups only. Shipped research/letters/board work is in
[`CHANGELOG.md`](CHANGELOG.md) and [`proposal/PROGRESS.md`](proposal/PROGRESS.md).

## Open (optional)

- [ ] **Tests:** API route tests for CV POST validation / bad `cvId`.
- [ ] **Tests:** smoke fixture from `data/cvs/cv_en_john_doe.yaml` in CI if not already covered.
- [ ] **Engineering:** further split of `useComposerController` if it remains a pain point.
- [ ] **Parser:** only if product needs real PDF/DOCX import — scaffold lives in `services/parser/`.

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

## Process templates

See [`dev/TODO_TEMPLATE.md`](dev/TODO_TEMPLATE.md) if starting a new multi-session epic.
