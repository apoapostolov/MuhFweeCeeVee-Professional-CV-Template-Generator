## Highlights

Editor-focused release: per-field AI rewrite with proposals, autosave with cross-language field translation, custom fields, template visibility toggles, and a modular Composer UI.

### Added

- Per-field **Professional Rewrite** with ranked proposals, scores, Apply/Undo, Shorten limits, and persisted proposals.
- **Autosave + translation** for text fields with bottom-center toasts (save confirmation, then translation complete across existing language variants).
- **Custom fields** modal (text, date, checklist, dropdown).
- **Template visibility** toggles per field/subsection.
- **Collapse all subsections** on Experience, Education, and References.
- Two-step **confirm remove** buttons.
- Optional `MFCV_API_TOKEN` API protection for mutations.

### Changed

- Modular Composer layout with compact editor grid and subsection indentation for list-based sections.
- Template renderers split per template family.

### Removed

- Keyword Studio retired (moved to `backup/retired-keywords/`).

### Fixed

- Workspace hydration mismatch for template/theme selectors.
- Subsection indent applies to full blocks, not titles only.

See [CHANGELOG.md](./CHANGELOG.md) for full details.