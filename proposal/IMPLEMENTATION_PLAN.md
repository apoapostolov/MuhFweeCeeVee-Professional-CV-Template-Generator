# Research Hardening + Feature Backlog — Implementation Plan

> **For agentic workers:** Implement **one workstream at a time**. Prefer `subagent-driven-development` (fresh agent per task) or execute inline with checkpoints after each task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **Spec source:** [`FEATURE_BACKLOG_AND_RESEARCH_HARDENING.md`](./FEATURE_BACKLOG_AND_RESEARCH_HARDENING.md)

**Goal:** Make Research/Keywords trustworthy and cheap (field contracts, staged research, evidence-based keywords, Editor gap targeting), then ship remaining product features (cover letters, tracker, ATS polish) and engineering hygiene—without freeform AI dumps.

**Architecture:** Local-first Next.js app (`apps/web`) + filesystem catalog (`data/research/catalog.json`). Introduce a **Field Contract layer** that every research write and AI response must pass. Replace monolithic web research with **seed + staged enrich**. Keywords become **derived from JD text + evidence**, not LLM imagination. Editor targeting consumes the same hardened list.

**Tech stack:** TypeScript, Next.js App Router, Vitest, YAML/JSON on disk, OpenRouter (analysis vs research models), existing `apps/web/src/lib/research/*`.

**Version baseline:** `v1.2.4` (security). Ship increments as `1.3.0` (research contracts+stages), `1.4.0` (keywords+gap), `1.5.0` (product extras).

---

## Locked product decisions (defaults)

Resolve these unless the owner overrides before coding:

| # | Decision | Default |
|---|----------|---------|
| D1 | Research catalog vs companies metadata | **A:** Research catalog is source of truth for job targeting. Metadata file remains for legacy analysis labels only; UI labels “Research targets” vs “Legacy company labels”. No merge migration in 1.3. |
| D2 | Cheap model for non-web stages | Use **analysis model** (Settings `model`) for `seed_fill` / no-web stages; use **research model** only when `useWebSearch: true`. |
| D3 | Keyword weight without evidence | **Soft cap:** `weight = min(weight, 40)` unless `evidence.length > 0` or `source === "user"`. |
| D4 | Inventable PII | **Hard:** empty `contacts.*_email` / phone unless `status === "found"` **and** `sources.length >= 1`. People rows require `linkedin_url`. |
| D5 | Field refine defaults | **No web search** unless user toggles or contract `requiresWeb: true`. Single primary proposal; alternatives only for narrative string fields. |

---

## Dependency graph

```text
WS0 Docs drift
  └─► WS1 Field contracts + validate/apply
        ├─► WS2 Field refine typed + no-web default
        ├─► WS3 Staged company research + cost/cache
        └─► WS4 Job research slim + JD text
              └─► WS5 Keyword extract + evidence weights
                    └─► WS6 Editor gap + scoring + targeting persist
                          ├─► WS7 Cover letters
                          ├─► WS8 Application tracker
                          └─► WS9 Deterministic ATS checker
WS10 Engineering health (parallel after WS1; can interleave)
WS11 MCP + optional integrations (after WS3–WS5)
```

**Do not start WS7–WS9 before WS5–WS6 exit criteria.**

---

## File map (create / own)

| Path | Responsibility |
|------|----------------|
| `apps/web/src/lib/research/contracts/types.ts` | Contract types, field status, envelope types |
| `apps/web/src/lib/research/contracts/companyFields.ts` | Company path → contract definitions |
| `apps/web/src/lib/research/contracts/jobFields.ts` | Job path → contract definitions |
| `apps/web/src/lib/research/contracts/validate.ts` | `validateFieldValue`, `validateEnvelope`, coerce |
| `apps/web/src/lib/research/contracts/merge.ts` | Safe merge into entity (empty-only vs overwrite) |
| `apps/web/src/lib/research/contracts/index.ts` | Public exports |
| `apps/web/src/lib/research/envelope.ts` | Parse AI envelope JSON |
| `apps/web/src/lib/research/costEstimate.ts` | Preflight token/cost estimates |
| `apps/web/src/lib/research/researchCache.ts` | Disk cache by linkedin/domain key |
| `apps/web/src/lib/research/keywordExtract.ts` | Local JD n-gram + title extract |
| `apps/web/src/lib/research/keywordScore.ts` | Evidence-aware weight function |
| `apps/web/src/lib/research/keywordGap.ts` | CV text vs job keywords gap report |
| `apps/web/src/lib/research/skillLexicon.ts` | Small curated skill/tool list (expand later) |
| `apps/web/src/app/api/research/companies/enrich/route.ts` | Staged company enrich |
| `apps/web/src/app/api/research/jobs/extract-keywords/route.ts` | JD → keywords (local ± cheap AI) |
| `apps/web/src/app/api/research/jobs/gap/route.ts` | Gap analysis for cvId + jobId |
| `apps/web/src/components/composer/research/*` | Split research UI from mega-controller over time |
| `data/applications/` | Tracker store (later) |
| `data/cover_letters/` | Cover letter YAML (later) |
| `proposal/PROGRESS.md` | Checkbox rollup updated each PR |

Modify heavily:

- `apps/web/src/lib/research/types.ts`
- `apps/web/src/lib/research/research-field-refine.ts`
- `apps/web/src/lib/research/research-prompts.ts`
- `apps/web/src/lib/research/weighted-keywords.ts`
- `apps/web/src/lib/research/research-normalize.ts`
- `apps/web/src/app/api/research/field-refine/route.ts`
- `apps/web/src/app/api/research/companies/research/route.ts`
- `apps/web/src/app/api/research/job-positions/research/route.ts`
- `apps/web/src/components/composer/research-field-ai.tsx`
- `apps/web/src/components/composer/ResearchDetailForm.tsx`
- `apps/web/src/components/composer/useComposerController.ts` (thin calls only until WS10)
- `README.md`, `docs/API.md`, `CHANGELOG.md`

---

# Workstream 0 — Docs truth (½ session)

**Goal:** Stop advertising retired Keyword Studio / wrong research claims.

### Task 0.1: Fix README and docs drift

**Files:**
- Modify: `README.md`
- Modify: `docs/API.md` (if still listing dead keyword routes as live)
- Modify: `TODO.md` (mark stale keyword items)
- Create: `proposal/PROGRESS.md`

- [ ] **Step 1:** Remove or rewrite README lines that imply a live Keywords tab / `SQLITE_BIN` keyword troubleshooting as primary product (search `Keywords workspace`, `SQLITE_BIN`, `Keyword Studio`).
- [ ] **Step 2:** State clearly: keywords live under **Research → job positions → weighted keywords**; Keyword Studio is retired to `backup/retired-keywords/`.
- [ ] **Step 3:** Add link to `proposal/FEATURE_BACKLOG_AND_RESEARCH_HARDENING.md` and this plan under Documentation.
- [ ] **Step 4:** Create `proposal/PROGRESS.md` with workstream checklist mirroring this plan.
- [ ] **Step 5:** Commit

```bash
git add README.md docs/API.md TODO.md proposal/PROGRESS.md
git commit -m "docs: align README with retired Keyword Studio and research plan"
```

**Exit:** New user cannot believe Keyword Studio is the main path.

---

# Workstream 1 — Field contracts (Phase A)

**Goal:** Invalid freeform values cannot enter the catalog via AI or PATCH.

### Task 1.1: Contract type system

**Files:**
- Create: `apps/web/src/lib/research/contracts/types.ts`
- Create: `apps/web/src/lib/research/contracts/types.test.ts` (if pure helpers)

- [ ] **Step 1:** Define types:

```ts
export type FieldValueKind =
  | "string"
  | "enum"
  | "url"
  | "email"
  | "string_list"
  | "object_list"
  | "weighted_keywords"
  | "number";

export type FieldAiMode = "none" | "cheap" | "web" | "derived";

export type ResearchFieldContract = {
  path: string;
  kind: FieldValueKind;
  maxLength?: number;
  maxItems?: number;
  enumValues?: readonly string[];
  requiresWeb?: boolean;
  allowEmpty?: boolean;
  /** Never invent without sources (emails, phones, people). */
  requireSourcesToSet?: boolean;
  description: string;
};

export type FieldValueStatus = "found" | "not_found" | "uncertain" | "user_provided";

export type EnvelopeField = {
  value: unknown;
  confidence: number;
  status: FieldValueStatus;
  sources?: string[];
  evidence?: string;
};

export type ResearchAiEnvelope = {
  schema_version: 1;
  entity_type: "company" | "job_position";
  operation: "seed_fill" | "group_enrich" | "field_refine" | "keyword_extract";
  fields: Record<string, EnvelopeField>;
  usage?: {
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};
```

- [ ] **Step 2:** Commit `feat(research): add field contract types`

### Task 1.2: Company + job contract tables

**Files:**
- Create: `apps/web/src/lib/research/contracts/companyFields.ts`
- Create: `apps/web/src/lib/research/contracts/jobFields.ts`
- Create: `apps/web/src/lib/research/contracts/index.ts`
- Test: `apps/web/src/lib/research/contracts/contracts.catalog.test.ts`

- [ ] **Step 1:** Register **all paths** used in Research UI for company (identity.*, office.*, contacts.*, hiring.*, people, linkedin_jobs, research.notes) and job (identity.*, location.*, compensation.*, role.*, skills.*, weighted_keywords, ats.*, research.*).
- [ ] **Step 2:** Closed enums must match `types.ts` unions (`office_type`, `hiring_status`, employment/remote where present).
- [ ] **Step 3:** Tests: every registered path has unique `path`; lookup by path works; unknown path returns null.
- [ ] **Step 4:** Commit `feat(research): register company and job field contracts`

### Task 1.3: validate + coerce

**Files:**
- Create: `apps/web/src/lib/research/contracts/validate.ts`
- Test: `apps/web/src/lib/research/contracts/validate.test.ts`

- [ ] **Step 1:** Implement:

```ts
export type ValidateResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function validateFieldValue(
  contract: ResearchFieldContract,
  raw: unknown,
  ctx?: { sources?: string[]; status?: FieldValueStatus },
): ValidateResult;
```

Rules:

- `url`: must parse with `URL`, protocol `https:` only (reuse patterns from `render/profile-links.ts` where possible).
- `email`: empty allowed if `allowEmpty`; else simple email regex; if `requireSourcesToSet` and non-empty → need `sources?.length`.
- `enum`: must be in `enumValues` (case-normalize lower where safe).
- `string`: trim, maxLength, reject multi-paragraph dumps if maxLength set.
- `string_list`: array of non-empty strings, maxItems, per-item maxLength.
- `weighted_keywords`: delegate to hardened parser (Task 1.4 can stub then tighten).
- `object_list` for people: each item needs `name`, `title`, `linkedin_url` (https linkedin).
- `object_list` for linkedin_jobs: `title` + `url` https.

- [ ] **Step 2:** Table-driven tests for: good URL, `javascript:` reject, bad enum, email without sources reject, people without linkedin reject.
- [ ] **Step 3:** Commit `feat(research): validate and coerce field contract values`

### Task 1.4: Harden weighted keyword parse (closed category + evidence shape)

**Files:**
- Modify: `apps/web/src/lib/research/types.ts` (`WeightedKeyword` + evidence)
- Modify: `apps/web/src/lib/research/weighted-keywords.ts`
- Test: `apps/web/src/lib/research/weighted-keywords.test.ts` (create if missing)

- [ ] **Step 1:** Extend type:

```ts
export type KeywordEvidence = {
  kind: "jd_quote" | "title" | "source_url" | "manual";
  text?: string;
  url?: string;
  count?: number;
};

export type WeightedKeyword = {
  keyword: string;
  weight: number;
  category?: WeightedKeywordCategory; // prefer closed only after normalize
  role?: "must" | "should" | "nice";
  rationale?: string;
  evidence?: KeywordEvidence[];
  source?: "extract" | "ai" | "user";
  canonical_key?: string;
};
```

- [ ] **Step 2:** On parse: drop unknown categories (or map known aliases); set `canonical_key` via `keywordCanonicalKey`; apply D3 soft cap when no evidence and source !== `user`.
- [ ] **Step 3:** Tests for cap, category reject, merge dedupe still works.
- [ ] **Step 4:** Commit `feat(research): evidence-aware weighted keyword normalization`

### Task 1.5: Envelope parse + merge

**Files:**
- Create: `apps/web/src/lib/research/envelope.ts`
- Create: `apps/web/src/lib/research/contracts/merge.ts`
- Test: `apps/web/src/lib/research/envelope.test.ts`
- Test: `apps/web/src/lib/research/contracts/merge.test.ts`

- [ ] **Step 1:** `parseResearchAiEnvelope(raw: string): ResearchAiEnvelope | null` — strict `schema_version === 1`, required fields object.
- [ ] **Step 2:** `applyEnvelopeToCompany(company, envelope, { mode: "empty_only" | "overwrite" })` / job variant — skip invalid fields; collect `applied[]` and `rejected[]`.
- [ ] **Step 3:** Tests: unknown path rejected; invalid enum not applied; empty_only preserves user website.
- [ ] **Step 4:** Commit `feat(research): parse AI envelopes and safe-merge into entities`

### Task 1.6: Wire validation on catalog writes

**Files:**
- Modify: `apps/web/src/lib/server/researchStore.ts` (or normalize path)
- Modify: `apps/web/src/lib/research/research-normalize.ts`
- Modify: `apps/web/src/app/api/research/catalog/route.ts`
- Modify: `apps/web/src/app/api/research/companies/[companyId]/route.ts`
- Modify: `apps/web/src/app/api/research/job-positions/[jobId]/route.ts`

- [ ] **Step 1:** After normalize, run a `sanitizeResearchedCompany` / `sanitizeResearchedJobPosition` that validates contracted leaf fields and strips illegal values (log counts in response optional).
- [ ] **Step 2:** PUT handlers return `warnings: string[]` for stripped fields (not hard 422 entire body at first—avoid breaking existing catalog; harden in 1.3.1 if needed).
- [ ] **Step 3:** Unit test sanitize on fixture with bad `office_type` and bad email.
- [ ] **Step 4:** Commit `feat(research): sanitize catalog entities through field contracts`

### Task 1.7: Contract-aware controls in Research form (minimal)

**Files:**
- Modify: `apps/web/src/components/composer/ResearchDetailForm.tsx`
- Possibly: `research-field-ai.tsx`

- [ ] **Step 1:** For enum contracts, render `<select>` with `enumValues` + empty option—not free text.
- [ ] **Step 2:** For url/email, use `type="url"` / `type="email"` + client-side validate before save.
- [ ] **Step 3:** Manual smoke: change office_type via select, save, reload.
- [ ] **Step 4:** Commit `feat(research): contract-aware form controls for enums and urls`

**WS1 Exit criteria:**

- [ ] `npx vitest run apps/web/src/lib/research/contracts apps/web/src/lib/research/envelope.test.ts apps/web/src/lib/research/weighted-keywords`
- [ ] Cannot persist `office_type: "banana"` or `https`-less website through sanitize
- [ ] Types export clean under `npm run typecheck`

---

# Workstream 2 — Field refine (typed, cheap)

**Goal:** ✨ is a constrained filler, not freeform web essay writer.

### Task 2.1: Rebuild refine prompt from contract

**Files:**
- Modify: `apps/web/src/lib/research/research-field-refine.ts`
- Test: `apps/web/src/lib/research/research-field-refine.test.ts`

- [ ] **Step 1:** `buildResearchFieldRefinePrompt` accepts `contract: ResearchFieldContract`, `useWebSearch: boolean`.
- [ ] **Step 2:** Prompt embeds **only** the field schema description + current value + short entity summary (not full entity JSON dump > N chars—truncate to identity + office + title).
- [ ] **Step 3:** Required response shape = `ResearchAiEnvelope` with single field key = `fieldPath`.
- [ ] **Step 4:** Tests: prompt contains path + enum values; does not include web block when `useWebSearch` false.
- [ ] **Step 5:** Commit `feat(research): contract-driven field refine prompts`

### Task 2.2: Field-refine API

**Files:**
- Modify: `apps/web/src/app/api/research/field-refine/route.ts`

- [ ] **Step 1:** Body: `{ entityType, entityId, fieldPath, useWebSearch?: boolean, overwrite?: boolean }`.
- [ ] **Step 2:** Resolve contract; 400 if unknown path.
- [ ] **Step 3:** If `useWebSearch` not true and contract does not force web → call OpenRouter with **analysis model** path (add `callOpenRouterAnalysisChat` or pass model override into research client).
- [ ] **Step 4:** Parse envelope → validate field → return `{ proposals: [{ value, confidence, status, sources, preview }], rejected?, usage }`. Keep UI compatibility: map envelope field to existing proposal list shape.
- [ ] **Step 5:** Never return unvalidated `unknown` for apply.
- [ ] **Step 6:** Commit `feat(api): harden POST /research/field-refine`

### Task 2.3: UI toggle + apply path

**Files:**
- Modify: `apps/web/src/components/composer/research-field-ai.tsx`
- Modify: `apps/web/src/components/composer/useComposerController.ts` (only the refine fetch)

- [ ] **Step 1:** Default `useWebSearch = false`. Checkbox “Search web (costs more)”.
- [ ] **Step 2:** On Apply, client may still PUT entity; server sanitize is backstop.
- [ ] **Step 3:** Disable auto-fire refine-on-open if it currently always web-searches (cost); require explicit click.
- [ ] **Step 4:** Commit `feat(ui): field refine defaults to no web search`

**WS2 Exit criteria:**

- [ ] Refine without web works for `identity.industry` / enums
- [ ] Web refine required for people emails (or blocked if no sources)
- [ ] Unit tests green

---

# Workstream 3 — Staged company research + cost

**Goal:** Default research ≤ ~40% cost of monolithic web call; full web opt-in.

### Task 3.1: Cost estimate helper

**Files:**
- Create: `apps/web/src/lib/research/costEstimate.ts`
- Test: `apps/web/src/lib/research/costEstimate.test.ts`

- [ ] **Step 1:** Estimate from stage flags + model pricing tables already used in Settings (reuse openrouter pricing helpers if present).
- [ ] **Step 2:** Return `{ estimatedUsd, stages, useWebSearch, model }`.
- [ ] **Step 3:** Commit `feat(research): preflight cost estimates for staged research`

### Task 3.2: Research cache

**Files:**
- Create: `apps/web/src/lib/research/researchCache.ts`
- Store under: `data/research/cache/` (gitignored)

- [ ] **Step 1:** Key = hash(`company|linkedinUrl|domain|stage|model`).
- [ ] **Step 2:** TTL default 7 days; `forceRefresh` bypasses.
- [ ] **Step 3:** Add `data/research/cache/.gitkeep` + `.gitignore` entry if needed.
- [ ] **Step 4:** Commit `feat(research): disk cache for staged company enrich`

### Task 3.3: Staged enrich API

**Files:**
- Create: `apps/web/src/app/api/research/companies/enrich/route.ts`
- Modify: `apps/web/src/lib/research/research-prompts.ts` (small per-group prompts)
- Modify: `apps/web/src/app/api/research/companies/research/route.ts` (delegate or mark deprecated)

- [ ] **Step 1:** `POST` body:

```ts
{
  companyId?: string;
  companyName: string;
  officeCountry: string;
  officeCity?: string;
  officeLabel?: string;
  website?: string;
  linkedinCompanyUrl?: string;
  aboutText?: string; // user paste
  stages: Array<"identity" | "office" | "hiring" | "people" | "linkedin_jobs">;
  useWebSearch?: boolean; // default false; identity/office may still no-web
  forceRefresh?: boolean;
}
```

- [ ] **Step 2:** Stage 0 is client seed (create company via existing upsert with name/country/urls)—document; enrich assumes seed exists or creates shell.
- [ ] **Step 3:** For each requested stage, build **small** envelope prompt; validate+merge; accumulate usage.
- [ ] **Step 4:** Default UI stages: `["identity"]` only; `useWebSearch: false`.
- [ ] **Step 5:** Legacy `POST /research/companies/research` becomes wrapper: `stages: all, useWebSearch: true` with response header/warning `deprecated: use /enrich`.
- [ ] **Step 6:** Commit `feat(api): staged company enrich endpoint`

### Task 3.4: Company research UI

**Files:**
- Modify: Research panel components (`ResearchPanel.tsx`, `ResearchSidebar.tsx`, detail form)
- Modify: controller fetch for company research

- [ ] **Step 1:** Seed form fields: name, country, city, website, LinkedIn URL, optional About paste.
- [ ] **Step 2:** Checkboxes for stages + cost estimate display + “Include web search”.
- [ ] **Step 3:** Primary button “Fill identity (cheap)” vs secondary “Full web enrich”.
- [ ] **Step 4:** Show last `usage` and sources on entity.
- [ ] **Step 5:** Commit `feat(ui): staged company research controls`

### Task 3.5: Persist research meta usage

**Files:**
- Modify: `apps/web/src/lib/research/types.ts` (`ResearchMeta`)
- Modify: normalize + merge

- [ ] **Step 1:** Extend meta:

```ts
export type ResearchMeta = {
  notes?: string;
  sources?: string[];
  researched_at?: string;
  research_model?: string;
  last_operation?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; estimated_usd?: number };
  stages_completed?: string[];
};
```

- [ ] **Step 2:** Commit `feat(research): persist usage and stages on research meta`

**WS3 Exit criteria:**

- [ ] Default identity fill does not call Perplexity web search
- [ ] Cache hit skips network
- [ ] Docs/API updated for `/enrich`
- [ ] Manual cost compare note in `proposal/PROGRESS.md`

---

# Workstream 4 — Slim job research + JD text

**Goal:** Jobs store raw JD; AI job research is smaller and optional.

### Task 4.1: `role.raw_jd_text` + normalize

**Files:**
- Modify: `apps/web/src/lib/research/types.ts` (`JobRoleContent`)
- Modify: `apps/web/src/lib/research/research-normalize.ts`
- Modify: Research job form UI

- [ ] **Step 1:** Add `raw_jd_text?: string` (max ~50k chars truncate).
- [ ] **Step 2:** Textarea “Paste job description” + save.
- [ ] **Step 3:** Commit `feat(research): store raw job description text on jobs`

### Task 4.2: Slim job research prompt

**Files:**
- Modify: `apps/web/src/lib/research/research-prompts.ts`
- Modify: `apps/web/src/app/api/research/job-positions/research/route.ts`

- [ ] **Step 1:** Split operations: `from_jd_text` (no web, requires raw_jd_text) vs `from_web` (opt-in).
- [ ] **Step 2:** Remove requirement for 45–90 invented keywords in web prompt; keywords come from WS5 extract.
- [ ] **Step 3:** Response via envelope for role/skills/identity only.
- [ ] **Step 4:** Commit `feat(research): slim job research and separate JD-based fill`

**WS4 Exit criteria:** Job can be useful with paste-only, no web call.

---

# Workstream 5 — Keyword extraction pipeline (Phase C)

**Goal:** Evidence-backed keywords; AI optional classifier only.

### Task 5.1: Local extract

**Files:**
- Create: `apps/web/src/lib/research/skillLexicon.ts` (seed 200–400 common tech/soft terms; expandable)
- Create: `apps/web/src/lib/research/keywordExtract.ts`
- Test: `apps/web/src/lib/research/keywordExtract.test.ts`

- [ ] **Step 1:** Inputs: `rawJdText`, `jobTitle`, optional existing keywords.
- [ ] **Step 2:** Tokenize; match lexicon; title tokens; multi-word phrases from lexicon.
- [ ] **Step 3:** Build evidence `{ kind: "jd_quote"|"title", text, count }`.
- [ ] **Step 4:** Initial role: title matches → `must`; high count → `should`; else `nice`.
- [ ] **Step 5:** Tests with fixture JD containing TypeScript, Kubernetes, etc.
- [ ] **Step 6:** Commit `feat(research): local JD keyword extraction`

### Task 5.2: Score + merge

**Files:**
- Create: `apps/web/src/lib/research/keywordScore.ts`
- Modify: `weighted-keywords.ts`
- Test: `keywordScore.test.ts`

- [ ] **Step 1:** Implement weight formula from proposal (base by role + frequency + title − generic penalty).
- [ ] **Step 2:** Apply D3 cap.
- [ ] **Step 3:** Commit `feat(research): deterministic keyword scoring with evidence`

### Task 5.3: Extract API + optional cheap AI classify

**Files:**
- Create: `apps/web/src/app/api/research/jobs/extract-keywords/route.ts`

- [ ] **Step 1:** Body: `{ jobId, useAiClassify?: boolean }`.
- [ ] **Step 2:** Load job → extract local → optional AI only to assign category/role for ambiguous terms (analysis model, no web, envelope of weighted_keywords only).
- [ ] **Step 3:** Merge + write job; return keywords + stats.
- [ ] **Step 4:** Commit `feat(api): POST extract-keywords for jobs`

### Task 5.4: UI — Extract keywords button

**Files:**
- Modify: job detail form / research panel

- [ ] **Step 1:** Button “Extract from JD” primary; AI classify checkbox default off.
- [ ] **Step 2:** Table shows evidence tooltip (quote/count).
- [ ] **Step 3:** Remove or demote per-cell web refine for `weighted_keywords`.
- [ ] **Step 4:** Commit `feat(ui): JD keyword extract controls`

**WS5 Exit criteria:**

- [ ] ≥80% of keywords with weight≥60 have evidence in extract path tests
- [ ] No Perplexity call on default extract

---

# Workstream 6 — Editor targeting quality (P1)

**Goal:** Gap analysis + scoring + persisted target selection.

### Task 6.1: Gap engine

**Files:**
- Create: `apps/web/src/lib/research/keywordGap.ts`
- Test: `apps/web/src/lib/research/keywordGap.test.ts`

- [ ] **Step 1:** Input: CV document (or flattened text) + `WeightedKeyword[]`.
- [ ] **Step 2:** Output: `{ missingMust, missingShould, used, weak }` using stem matching from `keyword-stem.ts` / highlight matchers.
- [ ] **Step 3:** Commit `feat(research): keyword gap analysis against CV text`

### Task 6.2: Gap API + Editor panel

**Files:**
- Create: `apps/web/src/app/api/research/jobs/gap/route.ts`
- Modify: Editor panel UI (new section under Job Targeting)

- [ ] **Step 1:** `POST { cvId, jobId }` → gap report.
- [ ] **Step 2:** UI list missing must/should with weights.
- [ ] **Step 3:** Commit `feat(ui): editor keyword gap panel`

### Task 6.3: Persist targeting on CV

**Files:**
- Modify: CV metadata schema usage in editor
- Modify: `packages/schemas` if needed for optional metadata fields
- Modify: workspace persistence

- [ ] **Step 1:** Store `metadata.targeting = { company_id, job_id, updated_at }` on CV YAML.
- [ ] **Step 2:** Restore selection on load.
- [ ] **Step 3:** Commit `feat(editor): persist research company/job targeting on CV`

### Task 6.4: Analysis uses hardened keywords

**Files:**
- Modify: `apps/web/src/app/api/analysis/cv/route.ts`
- Modify: `apps/web/src/app/api/analysis/field/route.ts`
- Modify: job context builders in `research-prompts.ts`

- [ ] **Step 1:** Inject top must/should keywords + gap missing list into analysis prompts (structured bullet list, not free company essay).
- [ ] **Step 2:** Optional: `POST /analysis/field` action `keyword_bullet` for one missing keyword (analysis model, no web).
- [ ] **Step 3:** Commit `feat(analysis): score and rewrite against hardened job keywords`

### Task 6.5: Suggest bullet for missing keyword (UI)

**Files:**
- Editor gap panel + field AI

- [ ] **Step 1:** Button “Suggest bullet” → analysis field rewrite with keyword constraint.
- [ ] **Step 2:** User must Apply (no auto-write).
- [ ] **Step 3:** Commit `feat(ui): suggest CV bullet for missing keyword`

**WS6 Exit criteria:** Selecting a job shows explainable missing keywords; CV reload restores target.

---

# Workstream 7 — Cover letters (P2)

**Depends on:** WS6 targeting.

### Task 7.1: Data model + store

**Files:**
- Create: `apps/web/src/lib/server/coverLetterStore.ts`
- Create: `data/cover_letters/.gitkeep`
- Schema: optional `packages/schemas` cover letter shape

- [ ] **Step 1:** YAML files `cl_<lang>_<target>.yaml` with `{ id, cv_id, company_id?, job_id?, body, metadata }`.
- [ ] **Step 2:** CRUD API under `/api/cover-letters`.
- [ ] **Step 3:** Commit `feat: cover letter store and API`

### Task 7.2: Draft AI + Print template

**Files:**
- API draft route using analysis model + CV + job keywords (no web)
- Simple template in `templates/` or HTML render path
- UI tab “Cover letters” (can start minimal)

- [ ] **Step 1:** Draft from selected CV+job only.
- [ ] **Step 2:** Preview/export PDF via existing Playwright path pattern.
- [ ] **Step 3:** Commit `feat: cover letter draft and export`

**WS7 Exit criteria:** One letter draft generated from John Doe + sample job without web search.

---

# Workstream 8 — Application tracker (P2)

### Task 8.1: Tracker model + API

**Files:**
- Create: `apps/web/src/lib/server/applicationStore.ts`
- Create: `data/applications/board.json` (gitignored personal)
- API: `/api/applications`

```ts
type Application = {
  id: string;
  company_id?: string;
  job_id?: string;
  company_name: string;
  job_title: string;
  status: "wishlist" | "applied" | "interview" | "offer" | "rejected" | "ghosted";
  url?: string;
  applied_at?: string;
  notes?: string;
  updated_at: string;
};
```

- [ ] **Step 1:** CRUD + list by status.
- [ ] **Step 2:** Commit `feat: application tracker store and API`

### Task 8.2: Tracker UI

**Files:**
- New panel or sidebar board (kanban simple columns)

- [ ] **Step 1:** Create from current Research selection.
- [ ] **Step 2:** Commit `feat(ui): application tracker board`

**WS8 Exit criteria:** Move card applied → interview persists after reload.

---

# Workstream 9 — Deterministic ATS checker (P2)

### Task 9.1: Rule engine

**Files:**
- Create: `apps/web/src/lib/ats/deterministicChecks.ts`
- Test: `apps/web/src/lib/ats/deterministicChecks.test.ts`
- API: `POST /api/analysis/ats-check` `{ cvId, jobId? }`

Rules (examples):

- contact email/phone present
- length bands (pages proxy: char/word counts)
- must-keyword coverage % when job selected
- no empty sections required by template
- dates parseable

- [ ] **Step 1:** Pure functions + tests on John Doe fixture.
- [ ] **Step 2:** UI panel “ATS check” results list (pass/warn/fail)—**no LLM**.
- [ ] **Step 3:** Commit `feat: deterministic ATS checker`

**WS9 Exit criteria:** ATS check runs offline without OpenRouter key.

---

# Workstream 10 — Engineering health (P3, parallelizable)

### Task 10.1: Gate live research tests

**Files:**
- Modify: `apps/web/src/lib/research/research-perplexity.integration.test.ts`
- Modify: `.github/workflows/ci.yml` if needed

- [ ] **Step 1:** `describe.skipIf(!process.env.RUN_LIVE_RESEARCH || !HAS_OPENROUTER_KEY)`.
- [ ] **Step 2:** CI never sets `RUN_LIVE_RESEARCH`.
- [ ] **Step 3:** Commit `test: gate live Perplexity research behind RUN_LIVE_RESEARCH`

### Task 10.2: API route tests

**Files:**
- Create: `apps/web/src/app/api/research/field-refine/route.test.ts` (or integration-style with mocks)
- Create: tests for `assertApiAuthorized` already exist—add CV POST validation test

- [ ] **Step 1:** Mock OpenRouter; assert 400 on unknown field path; assert sanitize.
- [ ] **Step 2:** Commit `test: API validation for research field refine`

### Task 10.3: Split useComposerController

**Files:**
- Create: `useResearchController.ts`, `usePrintRoomController.ts`, `usePhotoBoothController.ts`, `useCvWorkspaceController.ts`
- Slim: `useComposerController.ts` composes hooks

- [ ] **Step 1:** Extract research catalog state + fetches first (highest churn for WS2–6).
- [ ] **Step 2:** Extract photo; then print; then residual.
- [ ] **Step 3:** No behavior change; manual smoke all tabs.
- [ ] **Step 4:** Commit per extract `refactor(composer): extract useResearchController` etc.

### Task 10.4: Photo list without full base64

**Files:**
- Modify: `photoGalleryStore.ts`, `apps/web/src/app/api/photos/route.ts`
- Optional: `GET /api/photos/[id]` for data URL

- [ ] **Step 1:** List returns metadata only; detail endpoint for full image.
- [ ] **Step 2:** Update Photo Booth client.
- [ ] **Step 3:** Commit `perf: photo gallery list without base64 payloads`

### Task 10.5: render-core honesty + deploy docs

**Files:**
- Modify: `packages/render-core` README or root README
- Modify: `README.md` hosting section for `MFCV_API_TOKEN` / nginx headers

- [ ] **Step 1:** Mark render-core as type stub until shared.
- [ ] **Step 2:** Document token + loopback policy (from v1.2.4).
- [ ] **Step 3:** Commit `docs: render-core stub status and deploy auth headers`

**WS10 Exit criteria:** CI deterministic; controller research slice <800 LOC.

---

# Workstream 11 — MCP + optional integrations (P4)

### Task 11.1: MCP tools for staged research

**Files:**
- Modify: `packages/mcp-wrapper/src/tools.mjs`
- Modify: `dev/MCP.md`

- [ ] **Step 1:** Add `company_enrich`, `extract_keywords`, `keyword_gap`; soft-deprecate monolithic research tool description.
- [ ] **Step 2:** Commit `feat(mcp): staged research and keyword tools`

### Task 11.2: LinkedIn policy stay paste-only

**Files:**
- Modify: `docs/RESEARCH_LINKEDIN_LIBRARIES.md` status note

- [ ] **Step 1:** Explicit non-goal: no scraping automation in 1.x without legal review.
- [ ] **Step 2:** Commit `docs: linkedin paste-only policy for research`

### Task 11.3: Parser JD import (deferred gate)

**Files:**
- Only after parser leaves scaffold

- [ ] **Step 1:** When parser can extract text from PDF, add `POST /api/research/jobs/import-jd` calling parser.
- [ ] **Step 2:** Until then, keep parser README “scaffold” and do not block releases.

---

## Release train

| Release | Workstreams | Theme |
|---------|-------------|--------|
| **1.3.0** | 0, 1, 2, 3 | Contracts + cheap staged company research + refine |
| **1.4.0** | 4, 5, 6 | JD keywords + Editor gap/targeting |
| **1.5.0** | 7, 8, 9 | Cover letter, tracker, ATS rules |
| **1.5.x** | 10, 11 | Engineering + MCP polish |

Each release: `npm run typecheck`, `npx vitest run --exclude '**/research-perplexity.integration.test.ts'`, CHANGELOG, tag.

---

## Global test commands

```bash
# Unit (CI-like)
npx vitest run --exclude '**/research-perplexity.integration.test.ts'

# Typecheck
npm run typecheck

# Live research only when intentional
RUN_LIVE_RESEARCH=1 npx vitest run apps/web/src/lib/research/research-perplexity.integration.test.ts
```

---

## Per-PR definition of done

- [ ] Touches only one workstream (or documented dependency exception)
- [ ] Tests for new pure functions
- [ ] `docs/API.md` updated if routes change
- [ ] `proposal/PROGRESS.md` checkboxes updated
- [ ] No new freeform AI apply path without contract validation
- [ ] Cost-bearing paths default to cheaper option when both exist

---

## Spec coverage checklist

| Proposal section | Workstream |
|------------------|------------|
| P1 freeform fields | WS1, WS2 |
| P2 expensive company research | WS3 |
| P3 keyword quality | WS4, WS5 |
| P4 dual companies | D1 + WS6 targeting; labels in WS0/WS6 |
| Field contracts + envelope | WS1 |
| Field refine | WS2 |
| Staged company research | WS3 |
| Keyword redesign | WS5 |
| Editor gap / scoring / persist | WS6 |
| Cover letters | WS7 |
| Tracker | WS8 |
| ATS polish | WS9 |
| Parser | WS11.3 deferred |
| Engineering P3 | WS10 |
| MCP / LinkedIn | WS11 |
| Docs drift | WS0 |
| Success metrics §8 | Exit criteria WS1–WS6 |

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Existing catalog data fails strict sanitize | Start with strip+warn, not hard 422; provide one-shot repair script |
| UI still bound to god controller | Extract research hook first (10.3) before more UI |
| Users still click Full web enrich | Default buttons + cost estimate + confirm dialog if estimatedUsd > threshold |
| Lexicon too small | Seed + allow user “promote term” to personal lexicon file later |
| Schema drift TS vs runtime | Single contract tables drive UI + validate + prompts |

---

## Execution order (first 10 tasks to run now)

1. Task 0.1 docs  
2. Task 1.1 types  
3. Task 1.2 catalogs  
4. Task 1.3 validate  
5. Task 1.4 keywords type  
6. Task 1.5 envelope/merge  
7. Task 1.6 wire sanitize  
8. Task 1.7 enum UI  
9. Task 2.1–2.3 refine  
10. Task 3.1–3.4 staged company  

Stop and demo after Task 1.7 and after Task 3.4 before starting keywords.

---

## Handoff

**Plan saved to:** `proposal/IMPLEMENTATION_PLAN.md`  
**Spec:** `proposal/FEATURE_BACKLOG_AND_RESEARCH_HARDENING.md`

**Execution options:**

1. **Subagent-driven** — one workstream/task per subagent, review between tasks (recommended for WS1+).  
2. **Inline** — implement in this session starting at Task 0.1 → WS1.

Say which option and whether to **lock D1–D5** as written or override any decision before coding.
