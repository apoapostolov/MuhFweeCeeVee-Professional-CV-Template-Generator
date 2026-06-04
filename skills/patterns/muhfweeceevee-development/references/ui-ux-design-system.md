# UI/UX Design System — Composer

How the MuhFweeCeeVee web app looks, behaves, and should be extended. **Reuse existing
components and CSS tokens** before inventing new patterns.

Source of truth: `apps/web/src/app/globals.css`, `components/composer/*`,
`ComposerShell.tsx`.

---

## Design intent (product UX)

| Principle | How it shows up |
|-----------|-----------------|
| **Paper studio** | Warm parchment surfaces, grid background, light grain — feels like drafting a CV on paper, not a generic SaaS dashboard |
| **Density without clutter** | Editor uses a fixed 4-column grid; deep YAML trees collapse by default with summary lines |
| **Print-first feedback loop** | Print Room is the default panel; PDF iframe is the ground truth for layout |
| **Bilingual by default** | Labels, tooltips, and confirm copy branch on `language === "bg"` |
| **Safe destructive actions** | Remove uses two-step confirm; delete photo uses modal |
| **AI as adjunct** | ✨ opens per-field rewrite; analysis lives in a collapsible drawer — never blocks core editing |
| **Template truth separate from app theme** | PDF template colors (`harvard-v1` + `theme=`) ≠ app light/dark mode |

---

## Visual theme (app chrome)

### Typography

| Role | Font | CSS |
|------|------|-----|
| Body | IBM Plex Sans (latin + cyrillic) | `--font-body-sans` via `layout.tsx` |
| Headings | Merriweather serif | `--font-title-serif` on `h1–h4` |

### Color tokens (`globals.css`)

Always prefer **CSS variables** over hardcoded hex for surfaces and chrome:

| Token | Light | Purpose |
|-------|-------|---------|
| `--background` | `#f4f2ea` | Page wash |
| `--foreground` | `#1f2937` | Primary text |
| `--ink-muted` | `#4b5563` | Secondary copy |
| `--surface-1` | `#fbfaf5` | Cards, inputs |
| `--surface-2` | `#efe9da` | Hover / selected chips |
| `--surface-3` | `#e6dcc7` | Deeper panels |
| `--line` | `#b8ac8e` | Borders |
| `--accent` | `#0d5c63` | Primary actions (teal) |
| `--accent-soft` | `#d9efef` | Soft highlights |
| `--ok` / `--warn` / `--danger` | teal / amber / red | Semantic (sparingly) |

Dark mode: `:root[data-theme="dark"]` — accent shifts to `#539bf5` (blue). Applied on
`<html>` or root via `document.documentElement.setAttribute("data-theme", mode)` in
`useComposerController` (`themeMode`: `light` | `dark` | `system` → `resolvedTheme`).

### Shell decoration

```text
<main class="app-shell paper-grid grain-overlay ...">
```

- **paper-grid** — 28px ruled lines
- **grain-overlay** — subtle noise
- **Dark compatibility** — large block in `globals.css` remaps legacy `bg-white`,
  `text-slate-*`, `bg-red-50`, etc. inside `.app-shell` when dark

**Rule for new UI:** wrap feature UI inside `.app-shell` (already on `ComposerShell`)
and use `var(--*)` for borders/backgrounds. If you must use Tailwind `bg-white` /
`text-slate-800`, they will auto-remap in dark mode inside the shell.

### App theme vs PDF template theme

| Concept | Controlled by | Affects |
|---------|---------------|---------|
| **App theme** | `ThemeModeToggle` → `themeMode` / `resolvedTheme` | Composer chrome, analysis score colors |
| **Template theme** | Print Room / Editor selectors → `themeOptionsForTemplate()` | Exported PDF/HTML only (`theme` query param) |

Do not conflate them in new UI copy or state names.

---

## Layout architecture

```text
ComposerShell (full viewport, max-w 1900px)
├── ThemeModeToggle (fixed top-right)
├── ComposerNav (horizontal panel tabs)
├── Active panel (flex-1 min-h-0)
├── ComposerToastHost (bottom center)
└── ComposerOverlays (modals)
```

### Panel navigation (`ComposerNav`)

| `activePanel` | Label | Layout pattern |
|---------------|-------|----------------|
| `workspace` | Print Room | Sidebar 340px + PDF iframe |
| `photo_booth` | Photo Booth | Gallery + analysis |
| `editor` | Editor | Multi-column: tabs + form/yaml + analysis drawer |
| `templates` | Templates | Catalog cards |
| `settings` | Settings | OpenRouter card + credit |

**Primary nav button (selected):**

```text
rounded-md px-4 py-2 text-sm font-semibold bg-[var(--accent)] text-white
```

**Inactive:**

```text
bg-[var(--surface-2)] text-slate-800
```

Settings tab also shows `SettingsStatusIcon` (configured / error / not configured).

---

## Control catalog — what to use when

### Primary action

```text
rounded-md bg-[var(--accent)] px-3|4 py-1.5|2 text-xs|sm font-semibold text-white disabled:opacity-60
```

Examples: Refresh PDF, Save OpenRouter, modal Confirm, Editor analysis run.

### Secondary action

```text
rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[var(--surface-2)]
```

Examples: Open PDF, Cancel, Close modal, Hide settings.

### Tertiary / neutral

```text
border border-[var(--line)] bg-[var(--surface-2)] ... text-slate-800
```

### Destructive (confirmed)

- **Inline remove:** `ConfirmRemoveButton` — first click arms (red tint), second confirms within 8s
- **Modal delete:** rose border/bg (`border-rose-300 bg-rose-600`) in `ComposerOverlays`

Never use instant delete for user content.

### Segmented control (2+ mutually exclusive options)

Pattern: `inline-flex ... rounded-full border border-[var(--line)]`, segments with
`border-l`, selected segment `bg-[var(--accent)] text-white`.

Used for: language switcher (Print Room, Editor), panel tabs could use similar logic.

### Form labels + selects (sidebar / settings)

```text
<label class="block text-sm|xs font-medium text-slate-800">
  Label text
  <select|input class="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2|3 py-1.5|2" />
</label>
```

### Checkbox group (print tweaks)

Native `<input type="checkbox" class="h-4 w-4 rounded border-[var(--line)]" />` inside
`label.flex items-center gap-2 text-sm`.

### Cards / articles

```text
rounded-xl border border-[var(--line)] bg-white p-4
```

Inner grouped settings:

```text
rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3
```

### Toasts (`composer-toast.tsx`)

- `showToast(message)` from controller
- Bottom center, pill shape, max 3 visible, 3.2s auto-dismiss
- `aria-live="polite"`

Use for save confirmation and non-blocking errors — not for long-form content.

### Modals (`ComposerOverlays`, `AddCustomFieldModal`)

```text
fixed inset-0 z-50 flex items-center justify-center bg-black/40|45 p-4
  └── max-w-md|3xl rounded-xl border border-[var(--line)] bg-white shadow-xl
        ├── header border-b px-4 py-3
        └── body px-4 py-4
```

Copy pattern: title `text-base font-semibold`, helper `text-xs text-[var(--ink-muted)]`.

---

## Editor form system (most new features land here)

### Two layout modes

| Mode | When | Grid |
|------|------|------|
| **Compact** (default) | Analysis drawer collapsed | Parent `EDITOR_COMPACT_FORM_GRID_CLASS` |
| **Stacked** | Analysis drawer open | Per-field `EDITOR_STACKED_FIELD_GRID_CLASS` |

Constants live in `editor-compact-form-layout.ts` — **import constants, do not duplicate grid classes**.

### Compact grid columns

```text
grid-cols-[1.5rem_8rem_minmax(0,1fr)_3.5rem]
  │         │              │            └── actions (✨, ✕, add)
  │         │              └── input
  │         └── label (truncate text-xs font-semibold)
  └── visibility toggle (eye) OR spacer
```

Company metadata editor uses **3 columns** (no visibility):
`EDITOR_COMPACT_METADATA_FORM_GRID_CLASS` → `[8rem_minmax(0,1fr)_3.5rem]`.

### Building a new field row

1. Use `EditorCompactFieldRow` (`editor-compact-field-row.tsx`) with `useFormGrid={true}`
2. **Leading:** `VisibilityToggleButton` for CV fields (maps to `metadata.template_visibility`)
3. **Label:** from `FIELD_META` in `constants.ts` (add bilingual entry if new path)
4. **Control:** use `EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS` or `EDITOR_COMPACT_DATE_INPUT_CLASS`
5. **Trailing:** `ConfirmRemoveButton` for arrays; optional `EditorFieldAiTrigger` (✨)

### Section containers

- **Tabulated arrays** (`experience`, `education`, `references`): `ROOT_ARRAY_EDITOR_PATHS`
  — items get role-first titles, collapsed by default, `border-t` between items
- **Object sections** (`person`, `positioning`): nested groups use `contents` on compact
  grid so inputs align to column 3

### Field type detection (`editor-form-fields.tsx`)

| Signal | Control |
|--------|---------|
| `isDateFieldKey` | `<input type="date" class="composer-date-input ...">` |
| `employment_type` in experience | `<select>` with `EMPLOYMENT_TYPE_OPTIONS` |
| `isUrlFieldPath` | URL input + validation hints |
| boolean | checkbox |
| number | number input |
| long text | textarea, `alignTop` on row |
| default string | compact text input |

### AI field rewrite (`editor-field-ai.tsx`)

- **Trigger:** 6×6 icon button, `iconButtonClass`, stars SVG (`AiStarsIcon`)
- **Expand:** toolbar row under field — Professional rewrite, Shorten + limit, Undo
- **Proposals:** up to 3 clickable cards below separator line
- **Scores:** `scoreTone(resolvedTheme, score)` from `analysis-ui-utils.ts`
- **Provider:** wrap field subtree in `EditorFieldAiProvider` with `pathLabel`, `cvId`, `templateId`

Skip AI on: bool, number, date, employment_type select, URL fields (`fieldSupportsAiRewrite`).

### Visibility toggle

`VisibilityToggleButton` — eye / eye-off, `aria-pressed`, bilingual `title`.
Writes through `writeTemplateVisibility` / `readTemplateVisibility`.

### Custom fields

`AddCustomFieldModal` + `custom-field-control.tsx` — types: text, date, checklist, dropdown.
Extend `custom-field-types.ts` if adding a new primitive type.

### YAML view

Monospace textarea + lint issues list; sync with form via controller — do not build a
second editor state outside `useComposerController`.

---

## Editor chrome (tabs, analysis, metadata)

### Section tabs

`EDITOR_TABS` in `constants.ts` — horizontal buttons, same accent selected pattern as nav.

### Form / YAML toggle

`EditorViewMode`: `form` | `yaml` — segmented or button pair in `EditorPanel`.

### Analysis drawer

- Collapsible right column; when open, fields switch to **stacked** layout
- Scores use emerald/amber/rose thresholds (85 / 70) via `scoreTone`
- Company checkboxes for targeting; source `example` | `personal`
- Run buttons: section vs full CV — primary accent styling

### Notices

Inline `editorNotice` / `companyMetadataNotice` — `text-xs` or `text-sm`, often amber/red
borders for errors. Prefer toast for transient success.

---

## Print Room UX

Left sidebar **Print Controls** (fixed 340px):

1. Language segmented control
2. CV pair `<select>`
3. Template `<select>`
4. Template theme `<select>` (from `themeOptionsForTemplate`)
5. Photo mode `<select>`
6. Tweaks checkboxes (disabled with `title` tooltip when template lacks sidebar)

Right: **PDF iframe** — always verify layout here after render changes.

Buttons: Refresh (primary), Open / Print (secondary).

---

## Photo Booth UX

- Grid thumbnails, verdict pills (`photoVerdictPillClass` in panel)
- Approve photo → drives `approvedPhotoId` + export `photoId` param
- Compare flow uses multi-select + cached AI comparison
- Delete → **modal** confirm (not `ConfirmRemoveButton`)

---

## Settings UX

`OpenRouterSettingsCard`:

- Collapsible card `rounded-md border ... bg-[var(--surface-1)] p-3`
- Show/Hide toggles password + model fields
- Save = primary accent; credit line compact in nav via `settingsCreditCompact`

---

## Bilingual copy rules

1. Pass `language` / `selectedLanguage` (`bg` | `en` for full UI; more codes in `LANGUAGE_OPTIONS` for variants)
2. Mirror strings in components (see `ConfirmRemoveButton`, `AddCustomFieldModal`, `VisibilityToggleButton`)
3. Add `FIELD_META` **en** and **bg** keys for new labeled paths
4. Tooltips: `title` attribute, not placeholder-only hints

---

## Accessibility patterns already in use

- Icon-only buttons: `aria-label`, `aria-pressed` where toggle
- Toasts: `role="status"`, `aria-live="polite"`
- Decorative SVGs: `aria-hidden="true"`
- Sr-only spacers in grid when leading column empty

Extend the same patterns on new controls.

---

## Checklist: adding a new composer feature

1. **Panel home** — extend `ActivePanel` + `ComposerNav` + `ComposerShell` branch only if it is a top-level surface; otherwise nest in Editor/Settings
2. **State** — add to `useComposerController` (or extract hook if >~100 lines)
3. **Types** — `components/composer/types.ts`
4. **API** — route under `app/api/` + `docs/API.md`
5. **UI** — reuse:
   - tokens `var(--line)`, `var(--accent)`, `var(--surface-1)`
   - `EditorCompactFieldRow` + layout constants
   - `ConfirmRemoveButton` / modal overlay pattern
   - `showToast` for feedback
   - `scoreTone` for numeric AI scores
6. **i18n** — bg + en strings
7. **Dark mode** — test with `resolvedTheme === "dark"`; avoid new hardcoded light-only colors outside `.app-shell` overrides
8. **FIELD_META** — if exposing new YAML paths in form view

---

## Anti-patterns (do not introduce)

| Avoid | Use instead |
|-------|-------------|
| New color palette per panel | Existing CSS variables |
| Radix/shadcn for simple buttons | Tailwind + composer patterns (Radix exists for some primitives — match nearby usage) |
| Full-width unlabeled inputs in editor | `EditorCompactFieldRow` grid |
| Instant delete | `ConfirmRemoveButton` or modal |
| Blocking alerts | `showToast` or inline notice |
| Duplicate grid class strings | Import from `editor-compact-form-layout.ts` |
| Client-side PDF layout experiments | Server render + Print Room iframe |

---

## Key files quick index

| Concern | File |
|---------|------|
| Tokens + dark overrides | `app/globals.css` |
| Fonts | `app/layout.tsx` |
| Shell + panels | `ComposerShell.tsx`, `*Panel.tsx` |
| Nav + theme toggle | `ComposerNav.tsx`, `composer-ui.tsx` |
| Form grid | `editor-compact-form-layout.ts`, `editor-compact-field-row.tsx` |
| Field widgets | `useEditorFormRenderer.tsx`, `editor-form-fields.tsx` |
| AI field UI | `editor-field-ai.tsx` |
| Labels i18n | `constants.ts` → `FIELD_META` |
| Modals | `ComposerOverlays.tsx`, `add-custom-field-modal.tsx` |
| Scores | `analysis-ui-utils.ts` |
| Toasts | `composer-toast.tsx` |