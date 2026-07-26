# Implementation progress

Spec: `FEATURE_BACKLOG_AND_RESEARCH_HARDENING.md`  
Plan: `IMPLEMENTATION_PLAN.md`

## Locked decisions

| ID | Status | Note |
|----|--------|------|
| **D1** | **Agreed 2026-07-26** | One company/job list = Research catalog. Editor only picks company+job. Drop analysis company research AI. |
| **D2** | **Agreed 2026-07-26** | Checkbox “Include Research (search web — costs more)”; OFF = Analysis model; ON = Research model + web. |
| **D3** | **Agreed 2026-07-26** | Keyword score ≤40 without evidence; badges from JD / unverified / you set; soft keep rows. |
| **D4** | **Agreed 2026-07-26** | No inventable emails/phones; people need LinkedIn; user-typed always OK; empty better than fake. |
| **D5** | **Agreed 2026-07-26** | Field ✨: web off by default; same Include Research checkbox; one main proposal; no auto web. |

## Workstreams

- [x] WS0 Docs drift (README + proposal links)
- [x] WS1 Field contracts (types, catalogs, validate, envelope, merge, sanitize on normalize) — core lib done; enum UI (1.7) deferred to next pass
- [ ] WS2 Field refine typed
- [ ] WS3 Staged company research
- [ ] WS4 JD text + slim job research
- [ ] WS5 Keyword extract
- [ ] WS6 Editor targeting + gap (implements D1 in product)
- [ ] WS7 Cover letters
- [ ] WS8 Application tracker
- [ ] WS9 Deterministic ATS
- [ ] WS10 Engineering health
- [ ] WS11 MCP / optional

## WS1 detail

- [x] Contract types + company/job catalogs
- [x] validateFieldValue + tests
- [x] Weighted keyword evidence + D3 soft cap
- [x] Envelope parse + merge
- [x] sanitize on normalizeResearchedCompany/Job
- [ ] Contract-aware enum selects in ResearchDetailForm (1.7)
- [ ] Wire field-refine API to envelope (WS2)

## D1 migration checklist (UI)

- [ ] Hide or mark Editor company metadata multi-select as legacy
- [ ] Editor targeting dropdowns bound only to Research catalog
- [ ] Persist `metadata.targeting` company_id + job_id on CV
- [ ] Analysis uses jobPositionId from catalog only
- [ ] Remove/disable `/analysis/company-research` + `/analysis/company-field` + UI
- [ ] Import path: metadata → catalog shells + notes (optional)
- [ ] Stop using `/api/companies` for live targeting after migration
