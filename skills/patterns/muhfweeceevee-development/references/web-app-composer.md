# Web App — Composer UI

## Layering

```text
ComposerClient
  useComposerController()     # ~2600 lines: all client state + side effects
  ComposerShell               # layout + panel switch
    ComposerNav               # Print Room | Photo Booth | Editor | Templates | Settings
    WorkspacePanel            # print preview
    EditorPanel               # form/yaml editor + analysis drawer
    PhotoBoothPanel
    TemplatesPanel
    SettingsPanel
    ComposerOverlays          # modals (sync, variants, custom fields, etc.)
```

**Rule:** Prefer small targeted hooks/utils over growing `useComposerController.ts` further.
Extract new concerns to dedicated files under `components/composer/` or `lib/`.

## Controller responsibilities (`useComposerController.ts`)

- Loads lists: CVs (`GET /api/cvs`), templates (`GET /api/templates`), photos, companies
- Selection state: `selectedCvId`, `selectedTemplateId`, theme, photo mode, language pair
- Editor: YAML string + parsed object, autosave debounce (`TEXT_FIELD_AUTOSAVE_MS = 850`)
- Analysis: full CV + per-section via `POST /api/analysis/cv`
- Variants: `POST /api/cvs/variant`, sync status/sync
- Print Room: builds `pdfUrl` from `/api/export/pdf` query params + cache-bust `v=`
- OpenRouter: delegated to `useOpenRouterSettings()`
- Toasts: `useComposerToast()`

Search the file for the feature name before editing — it is the integration hub.

## Editor subsystem

| Module | Role |
|--------|------|
| `useEditorFormRenderer.tsx` | Renders nested form from CV object paths |
| `editor-form-fields.tsx` | Field widgets (text, lists, dates, etc.) |
| `editor-compact-form-layout.ts` | Collapsible sections, summary metadata |
| `form-path-utils.ts` | `getAtPath`, `setAtPath`, array append/remove |
| `section-draft.ts` | Section-level draft state before commit to CV |
| `editor-field-ai.tsx` | Per-field AI rewrite UI |
| `field-ai-proposals-persistence.ts` | localStorage for AI proposals |

**Form paths** mirror YAML structure (e.g. `experience.0.title`). Root array sections
configured in `constants.ts` → `ROOT_ARRAY_EDITOR_PATHS`.

**Experience labels:** role-first titles with period/company subtitles (not generic indices).

## Workspace persistence (browser)

`workspace-persistence.ts` stores in `localStorage`:

- Last CV, template, theme, photo mode
- Keys in `constants.ts` → `STORAGE_KEYS`

Clears stale UI when debugging HMR — see [`dev-workflow.md`](dev-workflow.md).

## Template visibility (print vs editor)

`lib/cvTemplateVisibility.ts` — `metadata.template_visibility` map of dot-path → boolean.
Applied server-side in `renderCvTemplate` via `applyTemplateVisibility()` so hidden
sections never reach PDF HTML.

## Types

Shared response shapes: `components/composer/types.ts` (`CvListResponse`, `SyncResponse`,
`PhotoBoothItem`, etc.). Keep in sync with API JSON bodies.

## Styling

- Tailwind utility classes + CSS variables in `globals.css`
- `composer-ui.tsx`, `analysis-ui-utils.ts` — shared chips, toggles
- Theme mode: `light` | `dark` | `system` on shell

## Client-only constraints

- All composer panels are under `"use client"` tree
- PDF preview uses `<iframe src={pdfUrl}>` or open-in-tab — not SSR of CV content
- Image analysis sends `imageDataUrl` base64 to API routes

## Adding UI features checklist

1. Extend types in `types.ts` if API shape changes
2. Add API call in controller (or extract hook)
3. Build presentational component in `*Panel.tsx` or new file
4. Wire props through `ComposerShell` from controller
5. Hard refresh / restart dev server after route handler changes