# TODO — MuhFweeCeeVee

**Epic:** Quality refactor (audit items 1, 2, 4, 5, 6, 8, 9) — multi-session.

**Index:** 1 = ComposerClient split · 2 = CI · 4 = tests · 5 = npm audit · 6 = render split · 8 = parser · 9 = API token

Rules: [`TODO_TEMPLATE.md`](dev/TODO_TEMPLATE.md) · Plan: [`DEVELOPMENT_PLAN.md`](dev/DEVELOPMENT_PLAN.md)

## Current Focus

- Break up god files, add CI/tests, harden validation and deploy auth.
- **Owners:** `apps/web/src/app/ComposerClient.tsx`, `apps/web/src/lib/server/renderCvTemplate.ts`, `packages/schemas/`, `.github/workflows/`

## Scope and Boundaries

- **Owns:** structure, CI, tests, render-core wiring, parser status docs, optional `MFCV_API_TOKEN`.
- **Does not own:** Companies tab, cover letters, full parser AI implementation, MCP wrapper features.

---

## Refactor Checklist

### 1 — Split `ComposerClient.tsx` (~6.3k LOC)

- [x] **1a** Extract `components/composer/types.ts`
- [x] **1b** Extract `components/composer/constants.ts` (themes, FIELD_META, storage keys)
- [x] **1c** Extract `components/composer/form-path-utils.ts`
- [x] **1d** Extract `SettingsPanel.tsx` + `OpenRouterSettingsCard.tsx` + `useOpenRouterSettings.ts`
- [x] **1e** Extract `TemplatesPanel.tsx`
- [x] **1f** Extract `WorkspacePanel.tsx` (Print Room)
- [x] **1g** Extract `EditorPanel.tsx` + `useEditorFormRenderer.tsx`
- [x] **1h** Extract `KeywordStudioPanel.tsx`
- [x] **1i** Extract `PhotoBoothPanel.tsx`
- [x] **1j** Slim `ComposerClient.tsx` to shell + nav + panel router (<800 LOC target)

### 2 — CI pipeline

- [x] **2a** Add `.github/workflows/ci.yml` (check, keywords pytest, build)
- [ ] **2b** Add schema/unit test job when `test:schemas` is stable on CI
- [ ] **2c** Branch protection notes in `CONTRIBUTING.md` (optional, maintainer)

### 4 — Automated tests

- [x] **4a** Vitest + `packages/schemas` tests (`validateCvV1`, JSON schema)
- [x] **4b** `cvVariants.test.ts` (variant id parse/build)
- [ ] **4c** API route tests: CV validation on POST, 400 on bad `cvId`
- [ ] **4d** Smoke test fixture from `data/cvs/cv_en_john_doe.yaml`

### 5 — Dependency audit

- [x] **5a** Run `npm audit fix`; document residual in log
- [ ] **5b** Bump `yaml` if still vulnerable after fix; re-run `npm run check`

### 6 — Split `renderCvTemplate.ts` (~3k LOC)

- [x] **6a** Extract `lib/server/render/types.ts` + `shared.ts` (helpers, slot bind)
- [x] **6b** One file per template (`edinburgh-v1.ts`, `harvard-v1.ts`, …)
- [x] **6c** Thin `renderCvTemplate.ts` dispatcher only
- [x] **6d** Wire `packages/render-core` to re-export or host shared HTML helpers

### 8 — Parser service status

- [x] **8a** `services/parser/README.md` — scaffold / not production
- [x] **8b** README + `docs/API.md` cross-link; no false “ready” claims

### 9 — Optional API token (deploy hardening)

- [x] **9a** `lib/server/apiAuth.ts` + `MFCV_API_TOKEN` in `.env.example`
- [x] **9b** Guard cost/mutation routes (CV write, analysis, OpenRouter settings)
- [ ] **9c** Document nginx + token header in `README` hosting section

### Cross-cutting (validation — supports item 4)

- [x] **V1** Add `validateCvV1JsonSchema()` using Ajv in `packages/schemas`
- [ ] **V2** Use combined validation on CV POST routes

---

## Active Prompt Queue

### [ ] Next session — API route tests (4c) + deploy token docs (9c)

Optional: further split `useComposerController.ts` if it approaches 2k LOC; keyword-tag-ui dedupe in `KeywordStudioPanel`.

Validation: `npm run check`, `npm run test`.

---

## Decision Log

- 2026-06-02: Multi-session refactor epic opened from codebase audit priorities 1,2,4,5,6,8,9.
- 2026-06-02: Phase 0 = CI, audit, apiAuth, schema tests, composer types/constants/utils extraction.

## Risks and Blockers

- Large panel extracts (1g–1i) need careful state prop drilling or context — do one panel per session.
- Playwright PDF tests are slow — defer to manual smoke until dedicated test job exists.