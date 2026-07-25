---
name: muhfweeceevee-development
description: |
  Use when developing, debugging, or extending MuhFweeCeeVee (MyFreeCeeVee) —
  the local-first CV composer at C:\git-public\MuhFweeCeeVee-Professional-CV-Template-Generator.
  Covers monorepo layout, Next.js composer UI, design system and UX patterns (theme tokens,
  form grid, controls), YAML CV storage, template rendering, PDF export, OpenRouter AI,
  company metadata, Photo Booth, and WSL dev workflow.
  Triggers: MuhFweeCeeVee, MFCV, CV template generator, composer, Print Room, editor form,
  UI component, design tokens, dark mode, cv_en_john_doe, harvard-v1, port 3005.
---

# MuhFweeCeeVee — Development Skill

Local-first CV composer: edit YAML CVs, preview HTML/PDF via academic templates, run
OpenRouter-backed analysis, and manage bilingual variants. **Read only the reference
files you need** — do not load all references up front.

## Session bootstrap (always)

1. Read [`AGENTS.md`](../../../AGENTS.md) for operating contract, privacy, and validation.
2. Start dev server before app code changes (see
   [`references/dev-workflow.md`](references/dev-workflow.md)).
3. Default web URL: **http://127.0.0.1:3005** (webpack + WSL file polling).

```bash
cd /mnt/c/git-public/MuhFweeCeeVee-Professional-CV-Template-Generator
npm run dev
npm run check    # eslint + tsc before declaring done
```

## What to load next (routing table)

| Your task | Read this reference |
|-----------|---------------------|
| First time on repo / “how does this work?” | [`references/architecture-overview.md`](references/architecture-overview.md) |
| UI panels, editor form, autosave, localStorage | [`references/web-app-composer.md`](references/web-app-composer.md) |
| Theme, design tokens, controls, new UI features | [`references/ui-ux-design-system.md`](references/ui-ux-design-system.md) |
| API routes, `cvStore`, companies, photos, auth | [`references/server-api-data.md`](references/server-api-data.md) |
| Templates, mappings, HTML render, PDF/Playwright | [`references/rendering-pipeline.md`](references/rendering-pipeline.md) |
| CV YAML shape, variant IDs, sync, validation | [`references/cv-yaml-variants.md`](references/cv-yaml-variants.md) |
| OpenRouter settings, field/company/photo AI | [`references/openrouter-ai.md`](references/openrouter-ai.md) |
| Ports, HMR, restart rules, pytest, release | [`references/dev-workflow.md`](references/dev-workflow.md) |
| `packages/schemas`, parser, MCP, retired keywords | [`references/packages-and-services.md`](references/packages-and-services.md) |
| Git safety, personal CVs, secrets | [`references/privacy-and-safety.md`](references/privacy-and-safety.md) |

Canonical docs outside this skill: [`docs/API.md`](../../../docs/API.md),
[`docs/CV_YAML_STANDARD.md`](../../../docs/CV_YAML_STANDARD.md),
[`PROJECT_CONVENTIONS.md`](../../../dev/PROJECT_CONVENTIONS.md),
[`DEV_SERVER_WORKFLOW.md`](../../../dev/DEV_SERVER_WORKFLOW.md).

## Mental model (30 seconds)

```text
Browser (ComposerClient)
  -> useComposerController (~2.6k lines, client state + fetch /api/*)
  -> panels: Print Room | Photo Booth | Editor | Templates | Settings

Next.js Route Handlers (/api/*, nodejs runtime)
  -> cvStore / templateStore / companyMetadataStore / photoGalleryStore
  -> repoPath() resolves monorepo root (data/, templates/)

Render path
  CV YAML + template.yaml + data/template_mappings/<templateId>.yaml
  -> bindSlots() -> template-specific render*() -> HTML
  -> Playwright PDF on /api/export/pdf
```

## Non-negotiables

- **Canonical data**: `data/cvs/*.yaml` is source of truth; never hand-edit generated PDFs.
- **Explicit mapping**: renderer maps CV fields via mapping YAML, not implicit key guessing.
- **Privacy**: only fictional sample CVs belong in git (`cv_en_john_doe.yaml`). See
  [`references/privacy-and-safety.md`](references/privacy-and-safety.md).
- **API auth**: when `MFCV_API_TOKEN` is set, mutations need Bearer or `x-mfcv-api-token`.
- **After code changes**: restart dev server per [`DEV_SERVER_WORKFLOW.md`](../../../dev/DEV_SERVER_WORKFLOW.md).
- **Sync `docs/API.md`** when adding or changing route handlers.

## Common edit map

| Change | Start here |
|--------|------------|
| New form field / editor UX | `useEditorFormRenderer.tsx`, `editor-compact-field-row.tsx`, `editor-compact-form-layout.ts` — see [`references/ui-ux-design-system.md`](references/ui-ux-design-system.md) |
| Panel layout / nav | `ComposerShell.tsx`, `ComposerNav.tsx`, `*Panel.tsx` — reuse nav/button tokens from UI reference |
| Client orchestration | `useComposerController.ts` (large — search before editing) |
| New API endpoint | `apps/web/src/app/api/**/route.ts` + `docs/API.md` |
| CV read/write/history | `apps/web/src/lib/server/cvStore.ts` |
| Variant/sync IDs | `apps/web/src/lib/server/cvVariants.ts` |
| New template renderer | `apps/web/src/lib/server/render/<template-id>.ts` + register in `renderCvTemplate.ts` |
| Template labels/layout | `templates/<id>/template.yaml`, `layout.yaml` |
| Field visibility in PDF | `apps/web/src/lib/cvTemplateVisibility.ts` |
| JSON schema validation | `packages/schemas/src/cvSchema.ts` |
| OpenRouter prompts | `apps/web/src/lib/server/openRouter*.ts`, `lib/field-ai-rewrite.ts` |

## Skill maintenance

When you discover durable project knowledge, add a focused skill under `skills/<category>/`
per [`SKILLS_GUIDE.md`](../../../dev/SKILLS_GUIDE.md). Update this skill’s references if the
architecture shifts (new package, retired subsystem, port change).