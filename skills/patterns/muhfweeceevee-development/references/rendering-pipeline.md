# Rendering Pipeline

## Orchestrator

`apps/web/src/lib/server/renderCvTemplate.ts` — `buildCvTemplateHtml(input)`:

1. `readCv(cvId)` from disk
2. `readTemplateVisibility` + `applyTemplateVisibility` (metadata-driven hides)
3. Load `templates/{templateId}/template.yaml`
4. Load mapping via `resolveMappingPath(cvId, templateId)` → `data/template_mappings/`
5. `bindSlots(cv, mapping)` → flat slot map for template
6. Optional approved photo: `resolvePhotoDataUrl(profilePhotoId)` → `slots["profile.photo"]`
7. Dispatch to template renderer:

| templateId | Module |
|------------|--------|
| `edinburgh-v1` | `render/edinburgh-v1.ts` |
| `harvard-v1` | `render/harvard-v1.ts` |
| `stanford-v1` | `render/stanford-v1.ts` |
| `cambridge-v1` | `render/cambridge-v1.ts` |
| `europass-v1` | `render/europass-v1.ts` |
| (fallback) | `render/generic.ts` |

Shared utilities: `render/shared.ts`, `render/profile-links.ts`, `render/themes.ts`.

## Mapping files

`data/template_mappings/<templateId>.yaml` — declares slot names → CV dot paths.
**Never** guess mappings in renderer code; update YAML when adding fields.

Per-CV overrides may exist as `cv_<id>__<template>.yaml` — resolved in `resolveMappingPath`.

## Template assets

Each `templates/<id>/`:

- `template.yaml` — labels per language, page margins, typography tokens
- `layout.yaml` — structural hints
- `license.yaml` — attribution

Catalog index: `templates/catalog.yaml`.

## Themes and photo modes

Client `constants.ts`:

- `themeOptionsForTemplate(templateId)` — per-template color themes
- `PHOTO_MODE_OPTIONS` — `default`, `on-circle`, `on-square`, `on-original`, `off`

Query params on export routes: `theme`, `photo`, `photoId`.

## Print tweaks (sidebar templates)

Templates with left sidebar: `cambridge-v1`, `edinburgh-v1`, `harvard-v1`, `stanford-v1`.

`render/tweaks.ts`:

- `removePhoto` — query `removePhoto=1`
- `moveSkillsLeft` — query `moveSkillsLeft=1` (skills column in sidebar)

Client: `appendPrintTweakParams()` in `constants.ts`.

## PDF export (`/api/export/pdf`)

1. `buildCvTemplateHtml` → full HTML document string
2. Dynamic `import("playwright")` → `chromium.launch({ headless: true })`
3. `page.setContent(html, { waitUntil: "networkidle" })`
4. `page.pdf({ format: "A4", printBackground: true, ... })`

**Requirements:** Playwright browsers installed (`npx playwright install chromium` in `apps/web`).

Preview without PDF: `GET /api/preview/html` (same HTML builder).

## HTML preview in Print Room

Controller sets `pdfUrl` roughly:

```text
/api/export/pdf?cvId=...&templateId=...&theme=...&photo=...&photoId=...&v=<cacheBust>
```

Increment `v` after CV saves to force iframe reload.

## Adding a new template (checklist)

1. Create `templates/<new-id>/` (copy from closest sibling)
2. Register in `templates/catalog.yaml`
3. Add `data/template_mappings/<new-id>.yaml`
4. Implement `render/<new-id>.ts` (or extend `generic.ts`)
5. Register branch in `renderCvTemplate.ts`
6. Add theme options in `constants.ts` if themed
7. Validate with John Doe sample: `cv_en_john_doe.yaml`
8. Screenshot / PDF visual check in Print Room

## `@muhfweeceevee/render-core`

Package exists but is **not** wired into the build path. All production rendering is
server-side under `apps/web/src/lib/server/render/`. Do not import render-core expecting behavior.