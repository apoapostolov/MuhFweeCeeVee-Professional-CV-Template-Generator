# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3] - 2026-06-04

### Added

- **`@muhfweeceevee/mcp-wrapper` v0.2.0**: MCP tools for Research (catalog CRUD, company/job research, field refine), CV analysis (`analysis_cv`, `analysis_field`), CV workflow (`create_cv`, `cv_history`, `cv_sync`, `translate_field`), company metadata, session backup export/import (server data), and render URL builders (`export_pdf_url`, `export_image_url`) with **print tweak** query params.
- **`GET /api/health`**: lightweight readiness payload (`ok`, `apiAuthRequired`, version).
- OpenRouter **`imageModel`** persisted in `data/settings/openrouter.yaml` and exposed on **GET/PUT** `/api/settings/openrouter` (Settings save includes image model).

### Changed

- MCP wrapper sends **`MFCV_API_TOKEN`** (or `CV_API_TOKEN`) on every API call when configured; [`MCP.md`](dev/MCP.md) documents the full tool catalog and auth.
- [`docs/API.md`](docs/API.md) updated for v1.2.x Research APIs, print-tweak params, health, and retired Keyword Studio routes.
- **`PUT /api/companies`** requires API token when `MFCV_API_TOKEN` is set (aligned with other mutations).

### Removed

- Keyword Studio MCP tools (`keyword_*`) now return a clear **retired in v1.1.0** error instead of calling removed HTTP routes.

## [1.2.2] - 2026-06-04

### Added

- **Print Room → Tweaks**: **Sidebar Text Size** and **Content Text Size** with a checkbox to turn each on, a compact **− | % | +** control on the same row (right-aligned), and a typable center value (**50–200%**; ± moves in **5%** steps). Scales the sidebar or main CV column in PDF preview—including headings, body text, and icons—so you can fit content to a target page count.
- Settings **Research model** under **AI Provider** (recommended list, web-search status, and cost estimates tied to that model).
- Research field **✨** runs AI refinement as soon as you open it; **Research More** requests another batch when you need alternatives. Up to three proposals with confidence and **Apply** render **inline below each field** (same pattern as Editor Professional Rewrite), not in a side drawer.
- **Live web search** for company research, job research, and per-field refine (LinkedIn-first guidance; Perplexity Sonar and OpenRouter online search paths).

### Changed

- Settings **AI Provider**: Analysis, Research, and Image use the same neutral panel layout; **Base URL** is no longer shown in the UI; **Import / Export** section title matches the AI Provider heading style.
- Approximate research costs in Settings follow your selected **research** model instead of the analysis model.
- Image generation pricing line in Settings is shorter (compact per-image USD + token note).

## [1.2.1] - 2026-06-05

### Added

- **Settings → Import / Export Data**: full **session backup** JSON—browser `localStorage`, researched **companies and job positions** (`data/research/catalog.json`), **company metadata** files, and all **CV YAML** on the dev server. Import restores each layer (new `PUT /api/research/catalog`) and reloads the app.
- Research catalog list **two-click delete** (compact ✕, red confirm) for companies and job positions, with stable row height in the sidebar.

### Changed

- **Settings** layout: four responsive columns (stacked on mobile); **Import / Export** first, **AI Provider** (OpenRouter + cost estimates) second—no separate wide detail pane.
- Import / Export UI: side-by-side **Export JSON** and **Copy to Clipboard**, tall **Paste to Import Data** field with **Import JSON** in the bottom-right corner; empty import opens a file picker.
- Re-running **Research Company** on a **selected** catalog row **updates that company** instead of creating a duplicate entry.

### Fixed

- Research sidebar delete control no longer **jumps row height** when entering the red confirm state (matched box size idle vs armed).

## [1.2.0] - 2026-06-04

### Added

- **Research** tab (flagship): build and maintain a local catalog of target **companies** and **job positions** with OpenRouter-backed research, autosave, and a sidebar + detail editor for company identity, offices, role content, skills, compensation, and job notes.
- **Weighted keywords** per job (editable grid with score, category, and AI refine) plus **ATS helpers** (keywords and action verbs) stored on each researched position.
- **Job Targeting** in the CV Editor: pick a researched company and job; weighted keywords and ATS terms **highlight live** in form fields (score-colored underlines for weighted terms, **cyan** for ATS).
- Keyword matching uses **stem-aware** highlighting so inflected words (e.g. *monetizing* vs *monetization*) still count when a related keyword is in the profile.
- Research APIs: catalog read/write, company research, job research, per-field refine, and persistence under `data/research/` (catalog gitignored for local data).
- CV Editor **Flat sections** toggle (default **ON**, persisted): nested subsections render flush with no hierarchical left indent; turn **OFF** to restore tabulated 30px-per-depth indent for Experience, Education, and References.
- Editor **Save Section** (when Auto Save is OFF) now shows the same save toast and runs **field translation** to your other language variants as autosave does.
- Editor **Auto Save** toggle (persisted): when ON, **Save Section** is hidden and the section debounces to disk with a saving/saved pill; when OFF, **Save Section** appears and turns accent blue only while the section has unsaved edits.
- **AI stars** on **Score Section** and **Score Whole CV**; field rewrite scores show as a number on the current pill and with `%` on proposals.
- Job Targeting remembers your last selected **company** and **job position** in browser storage across reloads.
- Photo Booth gallery API (`/api/photos`) and dark overlay action buttons on thumbnails.
- OpenRouter **per-image** USD hints in Settings (from `data/settings/openrouter_image_pricing.yaml`).
- `.gitignore` / `AGENTS.md` rules to block personal CV paths (`Apostol`, `ApoApostolov`, `alianz`).

### Changed

- CV analysis and field rewrite prompts can include **researched job context** when a job position is selected in the Editor.
- **Experiences/Jobs** shows its section header again (visibility, title, collapse/add actions); individual job cards stay flush under it when indent is off.
- Subsection indent applies to the **visibility icon + title together** so the gap between eye and label matches the root section.
- Long text fields **wrap** in the form (no horizontal scroll); textarea row height follows **on-screen** wrap width; multiline fields can share one border with trailing AI/remove actions.
- Product branding: header **MuhFweeCeeVee**, document title, main panel title **CV Editor**.
- Nav order: **Print Room → Photo Booth → Editor → Research → Templates → Settings**.
- Settings **Approximate Cost per Check** lists each AI action with input/output token estimates and USD cost (not a single summary line).
- Editor **Auto Save** control is a three-part pill: label | **ON** | **OFF**.

### Fixed

- Single-line CV fields no longer show **invisible text** when keyword highlighting is active (opaque `bg-white` no longer overrides the highlight mirror layer).
- Research company/job selection no longer **clears stored IDs** on first load before the catalog hydrates.
- Keyword highlights keep **all non-overlapping matches** visible when multiple keywords hit the same field.
- Compact editor rows keep the visibility eye, field name, and input on one grid line (subgrid + actions column width).
- Professional Rewrite current-score pill shows **`%`** again.

## [1.1.0] - 2026-06-02

### Added

- New **per-field Professional Rewrite** in the Editor: AI returns ranked proposals with confidence scores, an inline **current score** pill, **Apply** per proposal, **Undo** after apply, and **Shorten to** limits (characters or lines). Proposals persist in the browser until you run a new rewrite for that field.
- New **autosave + translation workflow** for text fields: after you stop typing, the CV section saves automatically, a bottom-center toast confirms **CV template saved**, then OpenRouter translates that field into every other language variant you already have (all supported language codes except the one you are editing). A second toast reports when field translation finishes.
- New **`/api/cvs/translate-field`** endpoint for targeted cross-language field updates (requires OpenRouter; skips empty text).
- New **custom field** modal when adding fields to objects or lists: choose name, type (text, date, checklist, dropdown), options, and initial value. Custom field definitions live in section metadata and render with dedicated controls.
- New **template visibility toggles** per field and subsection so you can hide paths from PDF output without deleting data.
- New **collapse all subsections** control on Experience, Education, and References: **▴** collapses every entry; **▾** expands all when everything is collapsed.
- New **two-step remove** buttons (✕ then confirm check) for fields, list items, and metadata entries to prevent accidental deletes.
- New bottom-center **composer toasts** for save and translation feedback.
- New optional API protection via `MFCV_API_TOKEN` (Bearer or `x-mfcv-api-token`) on mutation routes when set in the environment.
- New Vitest coverage for field paths, field AI parsing, compact layout, custom fields, and CV schema helpers.

### Changed

- Editor UI was rebuilt as a modular **Composer** (Workspace, Templates, Editor, Photo Booth, Settings) with a compact single-row field grid, tighter vertical rhythm, and aligned AI proposal rows.
- Experience, Education, and References now **indent whole subsections** (eye, title, and fields together). Person, Positioning, Optional Sections, and Metadata stay flush—only true list subsections tabulate.
- Date fields use shared compact metrics and improved dark-theme calendar icon contrast.
- Template rendering code was split into per-template server modules (Edinburgh, Cambridge, Harvard, Stanford, generic) for easier maintenance.
- Workspace template/theme selectors now hydrate from saved preferences after load, fixing React hydration mismatches on first paint.

### Removed

- **Keyword Studio** tab, APIs, and in-repo `keywords/` pipeline were retired to `backup/retired-keywords/` (ATS-oriented keyword tooling is no longer part of the Composer UI).

### Fixed

- Fixed React hydration errors in Print Room when persisted template/theme differed from server defaults.
- Fixed nested subsection indentation so padding applies to headers and child rows together (not title-only).

## [1.0.2] - 2026-03-08

### Added

- New **Photo Booth** tab with drag-and-drop upload, per-image approval, and dedicated AI photo analysis actions.
- New multi-image AI comparison workflow in Photo Booth (2+ selected images) with ranked results and recommendation details.
- New `Settings` tab (right-aligned in the tab row) for OpenRouter setup and account credit visibility.
- New MCP wrapper package (`@muhfweeceevee/mcp-wrapper`) exposing key internal API operations as MCP tools.

### Changed

- Preview/export pipeline now applies approved Photo Booth image overrides without mutating CV YAML.
- Template preview cards now render using the currently selected Print Room CV and approved photo when available.
- CV targeting is now company-agnostic at CV level; target company metadata is managed in dedicated company metadata files.
- Editor AI targeting now supports metadata source selection and multi-company selection with inline metadata editing.
- OpenRouter configuration was moved from Editor to Settings with status icon states and compact remaining-credit display in the tab button.
- OpenRouter `Analysis Model` selection now separates pricing details from dropdown labels and shows approximate per-check cost estimates in a dedicated block.
- Settings now includes an image-generation model selector filtered to models with image-generation capability (future-ready; not yet wired to runtime generation flows).
- Editor Form View for nested structures now uses collapsible containers with collapsed-by-default nested sections and summary metadata headers.
- Experience entries in Form View now use semantic container naming (job title header, period/company subtitle) instead of generic numbered labels.
- Photo Booth UX was polished with compact gallery cards, overlay actions, clipboard paste support, and right-side analysis layout.
- Photo assets and analysis metadata now use filesystem-backed storage with safe migration from legacy browser-cached gallery data.
- Language-variant auto-resolution now accepts both CV id formats:
  `cv_<language>_<target>` and `cv_<language>_<iteration>_<target>`, removing the hard requirement for `iteration` in translation flows.

### Fixed

- Fixed Keywords analysis false-empty dataset behavior when sqlite binary resolution differs by runtime environment, preventing silent zero-item core rebuilds.

## [1.0.1] - 2026-03-07

### Added

- New modern templates in the gallery:
  - **Cambridge 1.0** with a full-width blue CV header, clean date-column timeline structure, dot-rated language/skills blocks, and formal UK-style layout balance
  - **Harvard 1.0** with a bold sidebar, timeline-style sections, and star-based language/skills scoring
  - **Stanford 1.0** with a clean sidebar, minimal content flow, and horizontal skill bars
- New Harvard theme options so you can quickly restyle the template: Default Slate, Blue, Pink, Red, and Amber Gold.
- New Stanford theme options: Default Slate, Blue, Pink, Red, and Amber Gold.
- New Cambridge theme options: Default Blue, Mustard Gold, Emerald Green, Steel Blue, and Rose Red.
- Harvard and Stanford now ship with broad data coverage on launch (projects, publication links, certifications/courses, awards, volunteering, patents, portfolio links, and competency groups).
- Stanford ships with refined visual details out of the box:
  - first-last header naming
  - white sidebar separators
  - dedicated divider under Work Experience heading
  - improved spacing/typography and skill-bar balance.
- Harvard ships with launch polish:
  - first-last header naming
  - improved photo/timeline marker alignment
  - driving-license row removed from sidebar personal details.
- Print Room now includes a `Photo` customization dropdown with:
  `Default`, `On - Circle`, `On - Square`, `On - Original Ratio`, and `Off`.
  The setting is applied to preview/export and is saved in browser state.
- In `On - Original Ratio` mode:
  - fallback now renders as a fixed 3:4 rectangle when no photo is available
  - photos are bottom-anchored to reduce overlap risk with nearby text.

### Changed

- Contact fields now support LinkedIn/GitHub values as full URL, short domain URL, or plain identifier (for example `in/name` or `username`), with compact display used across templates.
- Public sample CV id was simplified from numbered format to `cv_en_john_doe`, and all internal docs/references now point to the new id.
- Language management in Editor is much smoother:
  - add new language variants from a modal
  - optionally create an AI translation in one step
  - auto-switch into the new language right away
  - language pills update automatically (English stays first when available)
- SYNC is now more flexible:
  - choose any source and target language pair from a dedicated sync modal
  - preview last update timestamps before running sync
- OpenRouter setup is simpler:
  - saving your API key now updates local `.env` automatically
  - credit display now reflects prepaid balance behavior
- Editor is more comfortable for long editing sessions: AI Scoring Analysis can now be minimized into a side drawer with a quick handle toggle, giving Form/YAML more room when you just want to write.

### Fixed

- Fixed theme-toggle hydration warnings in the browser.
- Improved OpenRouter error feedback so invalid/unauthorized key issues are clearer.
- Removed driving-license row from sidebar personal details in Edinburgh for a cleaner layout.

## [1.0.0] - 2026-03-06

### Added

- Initial public release of the professional CV generator workspace.
- Print Room with live CV-to-template preview and export-ready output.
- Template gallery with implemented `europass-v1` and `edinburgh-v1` layouts.
- Theme support for Edinburgh template variants in preview/export.
- Editor with Form and YAML modes for section-level CV editing.
- AI scoring panel for section and full-CV feedback with actionable rewrite guidance.
- BG/EN variant workflow with sync and diff visibility between language variants.
- Keywords workspace for JD-driven keyword gap analysis:
  - role-focused keyword insights
  - missing / underused / used keyword buckets
  - weighted usage scoring
  - seniority, hard-skill, and soft-skill priority keyword surfaces
  - structured keyword hover diagnostics.
- Collection/data operations flow for keyword dataset refresh and growth tracking.
- Built-in sample CV content for public demonstration and local testing.
