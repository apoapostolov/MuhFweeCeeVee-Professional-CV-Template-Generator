# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Editor language management now supports creating additional CV language variants from a modal picker.
- New variant creation flow can optionally run AI translation when OpenRouter is configured, then automatically switches to the new language.
- Editor sync now includes a dedicated modal to select source/target languages with per-language last update timestamps.

### Changed

- Language pill behavior is now dynamic per CV target and lists all detected variants (with English first when available).
- Variant/sync backend now supports explicit language-pair sync (`source -> target`) across all available variant languages.
- OpenRouter API key save flow now writes/updates `OPENROUTER_API_KEY` in local `.env`.

### Fixed

- Theme mode toggle titles are now hydration-safe (removed SSR/CSR mismatch in mode tooltip attributes).
- OpenRouter credit status now includes API error detail in the label for unauthorized key scenarios.
- OpenRouter credit panel now uses prepaid balance from `/credits` as the primary remaining amount instead of key limit-based values.

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

### Changed

- Consolidated feature set and UX flow for a stable first public release.
- Simplified repository release surface by keeping public-facing assets and examples.
