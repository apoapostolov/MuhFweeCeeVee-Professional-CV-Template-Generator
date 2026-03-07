# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-03-07

### Added

- New schema `targeting.company_details` object to describe the intended employer (industry, website, etc.); useful for AI positioning advice.
- New modern templates in the gallery:
  - **Cambridge 1.0** with a full-width blue CV header, clean date-column timeline structure, dot-rated language/skills blocks, and formal UK-style layout balance
  - **Harvard 1.0** with a bold sidebar, timeline-style sections, and star-based language/skills scoring
  - **Stanford 1.0** with a clean sidebar, minimal content flow, and horizontal skill bars
- New Harvard theme options so you can quickly restyle the template: Default Slate, Blue, Pink, Red, and Amber Gold.
- New Stanford theme options: Default Slate, Blue, Pink, Red, and Amber Gold.
- New Cambridge theme options: Default Blue, Mustard Gold, Emerald Green, Steel Blue, and Rose Red.

### Changed

- Contact fields now support LinkedIn/GitHub values as full URL, short domain URL, or plain identifier (for example `in/name` or `username`), with compact display used across templates.
- Editor now includes a dedicated **Targeting** section with full field editing, including `target_company`, while keeping this data AI-only and excluded from rendered CV output.
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
- Harvard title name formatting is now intentional: it uses **First + Last** in the header instead of rendering full multi-part names.
- Editor is more comfortable for long editing sessions: AI Scoring Analysis can now be minimized into a side drawer with a quick handle toggle, giving Form/YAML more room when you just want to write.
- Stanford 1.0 got a full visual polish pass to match the real reference style more closely:
  - balanced sidebar/content proportions
  - cleaner typography scale for body and paragraph text
  - refined work/education layout with cleaner date alignment
  - first-last header naming in template title
  - sidebar separators now match the hard right-edge cut style
  - removed separator after positioning summary and removed Work Experience heading separator
  - rebalanced skill label/bar proportions and bar thickness
  - cleaner references block
  - added divider lines under the name and below the Work Experience section in the right column
- Theme swatches for Harvard and Stanford are now aligned to the intended visual palette order, with corrected additional accent colors.
- Stanford themes now use the exact requested swatch family (slate, blue, pink, red, amber) in both picker and rendering palette.
- Print Room now includes a `Photo` customization dropdown with:
  `Default`, `On - Circle`, `On - Square`, `On - Original Ratio`, and `Off`.
  The setting is applied to preview/export and is saved in browser state.
- In `On - Original Ratio` mode, when no photo is provided, fallback now renders as a fixed 3:4 rectangle instead of collapsing.
- In `On - Original Ratio` mode, photos are now bottom-anchored (not center-anchored) to reduce overlap risk with surrounding text blocks.
- Cambridge visual polish:
  - unified white sidebar/content backgrounds
  - year-tick timeline lines centered to date rows
  - vertical timeline rail moved left for cleaner spacing from year labels
  - references section rendered without timeline rail/tick styling
  - references layout fixed to stacked non-timeline blocks so organization/name/email cannot overlap
- Harvard and Stanford now surface a broader data range to better match Edinburgh coverage:
  courses/certifications, projects, awards, volunteering, patents, portfolio links, and competencies groups (core/social/other/publications).
- Stanford sidebar separators are now rendered as true white lines to match the intended look.
- Harvard and Stanford work-experience entries now also show embedded "Worked on projects" and "Publication links" details when provided, matching Edinburgh’s richer job-entry depth.
- Stanford Work Experience now includes a dedicated divider under the section heading before job entries.

### Fixed

- Fixed theme-toggle hydration warnings in the browser.
- Improved OpenRouter error feedback so invalid/unauthorized key issues are clearer.
- Polished Harvard visual alignment (photo and timeline marker positioning).
- Removed driving-license row from sidebar personal details in Edinburgh and Harvard for a cleaner layout.

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
