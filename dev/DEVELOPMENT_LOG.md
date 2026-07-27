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
