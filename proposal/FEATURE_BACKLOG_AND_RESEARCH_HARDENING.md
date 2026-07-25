# Proposal: Feature backlog + Research / Keyword hardening

**Status:** draft for product direction  
**Date:** 2026-07-25  
**Scope:** MuhFweeCeeVee after security release `v1.2.4`  
**Audience:** product owner + implementing agents  

---

## 1. Why this document exists

Core CV compose/print/export is usable. The weakest product surface is **Research** (companies, jobs, keywords, field AI):

1. **Keyword research is not trustworthy** as an ATS or targeting tool.
2. **Company research is too expensive** (web-search models + huge one-shot JSON prompts).
3. **Fields are not schema-hardened** — AI returns freeform text/objects that only loosely match the TypeScript types, so every field feels random and hard to edit, score, or reuse.

This proposal lists **what is still left feature-wise**, then goes deep on a redesign of research/keywords so later work is intentional rather than more freeform AI.

---

## 2. Current state (honest)

### 2.1 What works well enough

| Area | Notes |
|------|--------|
| Print Room + templates | Stable templates, themes, photo modes, PDF/PNG |
| CV Form/YAML editor | Deep form tree, autosave, variants, language sync |
| Photo Booth | Upload, analyze, compare (cost-bearing AI) |
| Settings / OpenRouter | Models, credit, estimates |
| API auth (v1.2.4) | Loopback-aware token, SSRF allowlist, export concurrency |
| Research *catalog shell* | Local `data/research/catalog.json`, sidebar, CRUD routes |
| Job targeting UI | Weighted keyword + ATS highlight in Editor (stem-aware) |

### 2.2 What is broken or misleading

| Area | Reality |
|------|---------|
| **Keyword Studio** | Retired to `backup/retired-keywords/` (v1.1). README still mentions “Keywords workspace” / sqlite tips in places — **docs drift**. |
| **Weighted keywords** | Exist as a grid + AI refine, but categories are soft, weights are model-guessed, no grounding contract (JD quote / source URL / frequency). |
| **Company research** | Single OpenRouter **web-search** call with a **monolithic JSON shape** (identity, office, contacts, people, linkedin_jobs, hiring, sources). Expensive models (e.g. Perplexity Sonar), high token count, one failure wastes a full run. |
| **Field refine (✨)** | Prompt says “match field type” but **proposal `value` is `unknown`**. Only `weighted_keywords` is post-normalized. Other fields accept freeform strings/objects. Live web search on **every field** multiplies cost. |
| **Quality gates** | `research-quality.ts` checks coarse signals (sources, description length). Not field-level schema validation; not applied as hard reject on write in the main UX path. |
| **Parser** | Scaffold only (`services/parser`). |
| **Cover letters / job tracker / public profile** | README “Coming Soon”; not implemented as product loops. |
| **Companies tab vs Research** | Two company concepts: Editor **metadata** (`companies.*.json`) and Research **catalog**. Easy to confuse; dual research paths (`/analysis/company-research` vs `/research/companies/research`). |

### 2.3 Cost shape (why company research hurts)

```
Full company research ≈ 1× (large system + web-search block + huge shape prompt + full entity JSON)
                       × research model price (often >> analysis model)
                       × retries / “Research more” / per-field refine with web search

Per-field refine     ≈ N fields × (web search + full entityJson in prompt)
```

There is **no tiered research** (cheap shell → fill gaps), **no cache of public pages**, **no offline/manual-first path** that is first-class, and **no field schema** that would let a small model fill a boolean/enum/URL without web search.

---

## 3. Product problem statements (research)

### P1 — Freeform field values

**Today:**  
`ResearchFieldProposal.value: unknown`. Apply can write almost anything into nested paths. UI is mostly text/list editors without:

- enum allowlists (`office_type`, `hiring_status`, `employment_type`, …)
- URL validators
- length/units bands
- “empty vs unknown vs not found” semantics
- structured list item shapes (people, jobs) with required keys

**Symptom:** AI invents prose for phones, invents people, mixes languages, returns paragraphs where a URL was expected, returns a string where an array was expected, categories outside the weighted-keyword set.

**Desired:** Every research field has a **Field Contract** (JSON Schema or shared schema module). Model output is **validated and coerced**; invalid proposals never apply. UI controls match the contract (select, URL input, chip list, not free textarea for enums).

### P2 — Expensive company research

**Today:** One shot “research the whole company office” with live web search.

**Desired:**

1. **Manual/seed first** — name, country, city, LinkedIn URL, website (user paste) costs $0.
2. **Cheap structured fill** — small model, **no web search**, fill only empty fields from known URLs or pasted “About” text.
3. **Targeted web enrich** — only for chosen field groups (`identity`, `office`, `hiring`, `people`) with small response schemas.
4. **Hard cost caps** — max tokens, max web calls per entity, show estimate before run, store `research.cost_usd` / token usage.
5. **Cache** — by `linkedin_company_url` / domain so re-open does not re-burn.

### P3 — Keyword research quality

**Today after Keyword Studio retirement:**

- Keywords live mainly as **job.weighted_keywords** + **job.ats**.
- Extraction is AI-driven from job research or field refine.
- Editor highlighting is better than the underlying **keyword quality**.
- No JD text store, no term frequency, no gap analysis pipeline in-app (old sqlite JD corpus is in backup).

**Desired:** Keywords are **derived artifacts**, not freeform essays:

| Property | Rule |
|----------|------|
| Surface form | Canonical display string |
| Canonical key | Stem/normalized key (already partly exist) |
| Weight | Deterministic function of evidence (see below), not pure LLM vibes |
| Category | Closed enum only |
| Evidence | At least one of: JD quote span, source URL, occurrence count |
| Role | `must` / `should` / `nice` (maps to ATS + human priority) |

Weights should prefer **evidence**:

```
weight = clamp(0–100,
  base_from_role_bucket
  + bonus_for_jd_frequency
  + bonus_for_title_match
  − penalty_for_generic_terms
)
```

LLM may **propose candidates**; a local normalizer **scores and dedupes**. User can override.

### P4 — Dual company systems

Editor company metadata vs Research catalog duplicates mental model and API surface.

**Desired (choose one north star):**

- **A (recommended):** Research catalog is source of truth for “targets”; Editor targeting only picks `company_id` + `job_id` from catalog; thin metadata file becomes import/export or retires.
- **B:** Metadata remains for scoring labels; Research is optional enrichment — then UI must never mix “Research company” and “metadata company” without labels.

---

## 4. Field-hardened research format (design proposal)

### 4.1 Field Contract module

New package or module, e.g. `packages/schemas/src/researchFieldContracts.ts` (or `apps/web/src/lib/research/contracts/`).

Per field path (examples):

| Path | Type | Constraints | AI mode |
|------|------|-------------|---------|
| `identity.website` | url | https only | no-web if user pasted |
| `identity.linkedin_company_url` | url | host contains linkedin.com | no-web if pasted |
| `identity.industry` | string | max 80 chars, optional taxonomy list | cheap |
| `identity.company_size` | enum | `1-10`…`10000+` / unknown | cheap |
| `office.office_type` | enum | existing union | cheap |
| `office.country` | string | ISO name or ISO-2 | required seed |
| `contacts.hr_email` | email or empty | never invent | web only with source |
| `people[]` | object list | `name`+`title`+`linkedin_url` required if row present | web only |
| `linkedin_jobs[]` | object list | `title`+`url` required | web only |
| `hiring.hiring_status` | enum | active/limited/frozen/unknown | cheap or web |
| `weighted_keywords[]` | object list | keyword, weight 0–100, category enum, evidence | derived |
| `role.responsibilities[]` | string list | max N items, max length each | from JD text |
| `ats.keywords[]` | string list | normalized, no free prose | derived |

### 4.2 Response envelope (all AI research)

Stop accepting “whatever JSON”. Require:

```json
{
  "schema_version": 1,
  "entity_type": "company" | "job_position",
  "operation": "seed_fill" | "group_enrich" | "field_refine" | "keyword_extract",
  "fields": {
    "<field_path>": {
      "value": <typed>,
      "confidence": 0-100,
      "status": "found" | "not_found" | "uncertain" | "user_provided",
      "sources": ["https://..."],
      "evidence": "optional short quote"
    }
  },
  "usage": { "model": "...", "prompt_tokens": 0, "completion_tokens": 0 }
}
```

Server pipeline:

1. Parse JSON (strict).  
2. **Validate each field** against Field Contract.  
3. Drop/repair invalid keys; never apply unknown paths.  
4. Merge only into empty or user-flagged “overwrite” fields.  
5. Persist `research.last_operation`, sources, usage.

### 4.3 Field refine without freeform chaos

Per-field ✨:

- Load contract for `fieldPath`.
- Prompt includes **exact JSON Schema snippet** for that field only (not whole entity as write target).
- Default **no web search** unless contract marks `requires_web: true` or user toggles “Search web”.
- Response: single typed `value` + confidence + sources — not 3 prose variants by default (optional “alternatives” only for free-text narrative fields).

### 4.4 Company research: staged jobs

| Stage | Name | Model | Web | Output |
|------:|------|-------|-----|--------|
| 0 | Seed | none | no | User form: name, country, city, URLs |
| 1 | Identity shell | cheap | no/optional | website, industry, size, short description from known URL paste |
| 2 | Office | cheap/web | optional | address fields if public |
| 3 | Hiring snapshot | web | yes | hiring_status, careers URL, open roles count estimate |
| 4 | People (opt-in) | web | yes | max 5 people with LinkedIn URLs only |
| 5 | LinkedIn jobs sample (opt-in) | web | yes | max N jobs with real URLs |

UI: checkboxes “What to research” + cost estimate. Default stages: **0+1 only**.

---

## 5. Keyword system redesign

### 5.1 Principles

1. **Job description text is first-class** — store `role.raw_jd_text` (user paste or fetch-once).  
2. **Extract locally first** — n-grams, skill lexicon, title tokens; AI only to classify/merge.  
3. **Evidence or it doesn’t rank high** — weight without evidence capped (e.g. ≤40).  
4. **Closed category enum** — reject freeform categories at write.  
5. **Gap analysis returns** — missing / used / weak against **selected CV**, not a global sqlite corpus (unless we deliberately revive a corpus later).  
6. **Editor highlights consume the same normalized list** — one pipeline, no dual keyword stores.

### 5.2 Suggested data model (job)

```ts
type KeywordEvidence = {
  kind: "jd_quote" | "title" | "source_url" | "manual";
  text?: string;       // short span from JD
  url?: string;
  count?: number;
};

type HardenedWeightedKeyword = {
  keyword: string;
  canonical_key: string;
  weight: number;                 // 0–100, mostly derived
  category: WeightedKeywordCategory; // closed enum
  role: "must" | "should" | "nice";
  evidence: KeywordEvidence[];
  source: "extract" | "ai" | "user";
};
```

### 5.3 UX

- **Paste JD** → Extract (local + optional cheap AI) → editable table with evidence tooltips.  
- **Import from LinkedIn job URL** (later) → one web call → fill role + keywords.  
- **Gap panel in Editor** when job selected: top missing must-have terms with one-click insert suggestions into CV bullets (still user-approved).  
- Deprecate “Research more on every field” as the keyword path.

### 5.4 What not to do

- Do not revive full Keyword Studio + Firecrawl corpus as the default path without a cost model.  
- Do not run Perplexity per keyword cell.  
- Do not let AI invent company-specific stack keywords without JD evidence.

---

## 6. Broader feature backlog (non-research)

Prioritized for product completeness after research hardening. Not all must ship; order is recommendation.

### P0 — Research / keywords (this proposal)

- [ ] Field contracts + validation on all research writes  
- [ ] Staged company research + cost estimates / caps  
- [ ] JD-first keyword extraction + evidence weights  
- [ ] Field refine: typed schema, web opt-in, no freeform apply  
- [ ] Unify or clearly separate metadata vs Research catalog  
- [ ] Fix README drift (retired Keywords Studio / sqlite notes)

### P1 — Targeting quality in Editor

- [ ] Real gap analysis panel (missing must/should vs CV text)  
- [ ] Analysis scoring uses hardened keywords (not free text soup)  
- [ ] One-click “suggest bullet rewrite for missing keyword” (analysis model, no web)  
- [ ] Persist selected `company_id` + `job_id` on CV metadata variant  

### P2 — Product features still promised / empty

| Feature | Status | Proposal |
|---------|--------|----------|
| Cover letters | Coming Soon | New entity `cover_letter` YAML + template; AI draft from CV+job only after research hardened |
| Job application tracker | Coming Soon | Lightweight board: company, job, status, date, link to catalog ids |
| Public CV website | Coming Soon | Optional static export; out of scope until privacy story is solid |
| ATS checker polish | Coming Soon | Deterministic checks (length, contact, keyword coverage) — not another LLM dump |
| PDF template parser | Scaffold | Keep scaffold until research cost is under control; don’t prioritize |

### P3 — Engineering health

- [ ] Split `useComposerController.ts` (~3.3k LOC) into workspace / research / print / photo hooks  
- [ ] API route tests (validation, auth)  
- [ ] Gate live integration tests in CI (`RUN_LIVE_RESEARCH`)  
- [ ] `packages/render-core` either real or marked stub in README  
- [ ] Photo gallery list without full base64 payloads  
- [ ] Deploy docs for nginx + token (TODO 9c)

### P4 — Optional integrations

- [ ] LinkedIn: stay paste-URL only unless legal/ToS review passes (`docs/RESEARCH_LINKEDIN_LIBRARIES.md`)  
- [ ] MCP tools updated for staged research ops  
- [ ] Import JD from file (PDF/DOCX) via parser when parser is real  

---

## 7. Phased delivery plan

### Phase A — Contracts (1–2 sessions)

1. Author JSON Schema / TS contracts for company + job fields.  
2. Server: `validateResearchPatch(path, value)` used by field-refine apply + catalog PUT.  
3. UI: enum/url controls for contracted fields; reject free text for enums.  
4. Tests: invalid AI payloads dropped; valid payloads apply.

**Exit:** Cannot apply freeform garbage into `office_type`, URLs, or keyword categories.

### Phase B — Cost control for company research (1–2 sessions)

1. Seed form + staged enrich API (`operation` + `groups[]`).  
2. Default no-web identity fill.  
3. Usage logging + preflight cost estimate in UI.  
4. Cache by LinkedIn URL / domain.

**Exit:** Default company “research” is ≥50% cheaper than today’s full web JSON call on typical models; full web is opt-in.

### Phase C — Keyword pipeline (2–3 sessions)

1. `raw_jd_text` + paste UI.  
2. Local extract + normalize + evidence.  
3. Optional cheap AI classify only.  
4. Editor gap panel + scoring hook.  
5. Remove/disable auto web refine on keyword fields.

**Exit:** Keywords without evidence cannot dominate weights; gap list is explainable.

### Phase D — Product extras (later)

Cover letter, tracker, ATS deterministic checker — only after A–C.

---

## 8. Success metrics

| Metric | Target |
|--------|--------|
| Company research default path cost | ≤ 40% of current full web research (same model family) |
| Field refine invalid apply rate | 0 (server rejects) |
| Keyword entries with evidence | ≥ 80% of weight≥60 terms |
| User “random freeform” complaints | Resolved by contracts + UI controls |
| Duplicate company concepts | Single primary target selection path in Editor |
| Docs accuracy | No Keyword Studio / sqlite dead ends in README |

---

## 9. Explicit non-goals (near term)

- Building a multi-tenant SaaS research API.  
- Scraping LinkedIn at scale.  
- Restoring Firecrawl JD corpus as the main keyword engine.  
- Full parser/OCR template reverse-engineering.  
- More freeform “AI write the whole company again” buttons.

---

## 10. Recommended next implementation slice

**Smallest high-leverage slice:**

1. **Field contracts** for the 15 highest-traffic research fields + `weighted_keywords`.  
2. **Field refine** returns typed envelope; web search **off** by default.  
3. **Company research** split into Seed + Identity (no web) + optional Web enrich.  
4. **JD paste → keyword extract** (local) replacing “hope the big research call invented good keywords.”

Do not add cover letters or tracker until that slice feels correct in daily use.

---

## 11. Open decisions for the owner

1. **Research catalog vs companies metadata** — merge (A) or strict dual with UI labels (B)?  
2. **Default research model** — force a cheap model for non-web stages even if Settings research model is Sonar?  
3. **Keyword evidence required** — hard reject high weight without evidence, or soft cap?  
4. **People / emails** — disable inventable PII fields entirely until sources required? (Recommended: yes.)

---

## 12. References in repo

| Path | Relevance |
|------|-----------|
| `apps/web/src/lib/research/types.ts` | Current loose types |
| `apps/web/src/lib/research/research-prompts.ts` | Monolithic company/job JSON shapes |
| `apps/web/src/lib/research/research-field-refine.ts` | Freeform `value: unknown` |
| `apps/web/src/lib/research/weighted-keywords.ts` | Partial normalize/merge |
| `apps/web/src/lib/research/research-quality.ts` | Coarse post-checks only |
| `backup/retired-keywords/` | Old Keyword Studio / JD corpus |
| `docs/RESEARCH_LINKEDIN_LIBRARIES.md` | Integration caution |
| `TODO.md` | Older refactor queue (partially stale) |
| `CHANGELOG.md` | Research + keyword history |

---

## 13. Summary

**Left to implement feature-wise:** research/keyword trust + cost, Editor gap/ATS polish, then cover letters / tracker / public profile / real parser — in that order.

**Root cause of dissatisfaction:** AI is used as an unstructured writer with web search bolted on, instead of a **constrained filler** over a **hardened field schema** with **cheap local derivation** for keywords.

Ship **contracts → staged cheap research → evidence-based keywords** before any new freeform AI surfaces.
