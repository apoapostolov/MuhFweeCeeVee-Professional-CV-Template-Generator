# Implementation progress

**Status: shipped in v1.3.0 (2026-07-26).** Keep as decision archive only.

Spec: `FEATURE_BACKLOG_AND_RESEARCH_HARDENING.md` (historical)  
Plan: `IMPLEMENTATION_PLAN.md` (historical)

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
- [x] WS1 Field contracts (types, catalogs, validate, envelope, merge, sanitize, enum UI)
- [x] WS2 Field refine typed + Include Research checkbox (D2/D5)
- [x] WS3 Staged company research (`/enrich`, cache, stages UI, cheap default)
- [x] WS4 JD text + slim job research (raw_jd_text, no 45–90 invent requirement)
- [x] WS5 Keyword extract (local lexicon + API + UI button)
- [x] WS6 Editor targeting + gap (metadata.targeting, gap panel, metadata AI research retired)
- [x] WS7 Cover letters (store, API, Letters tab, cheap AI draft)
- [x] WS8 Application tracker (board.json, Apps tab, add from Research target)
- [x] WS9 Deterministic ATS check (Editor button, no LLM)
- [x] WS10 Engineering health (live test gate, photo mediaUrl, nginx auth docs, render-core stub note)
- [x] WS11 MCP tools for enrich/extract/gap/ats/letters/apps

## D1 migration checklist (UI)

- [x] Editor targeting dropdowns bound only to Research catalog
- [x] Persist `metadata.targeting` company_id + job_id on CV
- [x] Restore targeting when CV loads
- [x] Analysis uses jobPositionId from Research selection
- [x] Metadata company AI research shows retired notice (→ Research tab)
- [x] Keyword gap panel in Editor Job Targeting
- [x] Optional: import metadata → catalog shells (`POST /research/catalog/import-metadata`)
- [x] Optional: remove `/api/analysis/company-research` routes entirely

## WS1–WS6 detail

- Contracts + D3 caps + sanitize on normalize
- Field ✨ + company enrich Include Research checkbox
- Local JD keyword extract
- CV targeting persist/restore + live gap panel
