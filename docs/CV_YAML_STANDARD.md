# CV YAML Standard (Imported Baseline)

This project uses a normalized YAML format for CV data inspired by the
existing standard from `git/lifestyle/job_cv/cv_versions/cv_yaml_standard.md`.

## Purpose

- Keep one canonical machine-readable source of CV facts.
- Support multiple rendering targets (`PDF`, `Europass`, `ATS-optimized`, role variants).
- Preserve chronology and evidence without loss.

## Top-Level Structure

```yaml
schema:
person:
positioning:
experience:
education:
skills:
references:
compliance:
optional_sections:
metadata:
```

## Required Sections (Minimum for rendering)

- `schema.id`
- `schema.version`
- `person.full_name`
- `experience[]` (can be empty for draft state)
- `skills` (at least one of `technical`, `languages`, `core_strengths`)
- `metadata.created_at`
- `metadata.updated_at`
- `metadata.language` (`bg` or `en`)

> _AI analysis targeting:_ target-company metadata now lives outside CV files in
> dedicated JSON metadata files, so the CV document itself stays reusable across
> multiple employers.

## Validation Rules

- Dates are ISO: `YYYY-MM-DD`.
- `experience.start_date <= experience.end_date` when `end_date` exists.
- Overlapping roles require explicit `parallel_role: true`.
- Unknown fields are allowed for forward compatibility.
- Review scores are optional metadata arrays. Each entry stores the provider in
  `label` and its exact result in free-form string `score`. Detector entries may
  include `section_scores[]` only for scopes the provider reported or that were
  submitted as separate tests. Stable scopes are sidebar, frontmatter, each
  experience position, and backmatter.
- Experience publication links are supported as:
  `experience[].publication_links[]` with object shape:
  - `url` (required for rendering link)
  - `title` (optional; auto-derived from URL when omitted)
  - any number of links per experience item

## Naming Convention

- CV files: `data/cvs/cv_<language>_<iteration>_<target>.yaml`
- Supported languages: `bg`, `en`
- Iteration format: 4 digits (`0001`, `0002`, ...)
- Example: `data/cvs/cv_en_john_doe.yaml`

## Review Score Metadata

```yaml
metadata:
  ats_scores:
    - label: ApplyCove
      score: "81/100; parseability 100"
  detector_scores:
    - label: Sapling
      score: "No whole-CV score; tested as separate sections"
      section_score_source: separate_tests
      section_scores:
        - label: Gameloft — Tracking Data Manager
          score: "5.1% AI"
          scope: experience
          experience_id: exp_gameloft_data_manager
```

Scores remain strings because providers expose incompatible scales,
classifications, compound results, and invalid or stale statuses. Do not average
providers or convert missing, blocked, stale, or invalid results to zero.

`score` is the whole-CV result when one was measured. If the provider could not
scan the full CV, it records that status instead of combining section scores.
`section_score_source` distinguishes a provider-native breakdown
(`provider_reported`) from independent submissions (`separate_tests`). Omit
`section_scores` when no section data exists. Use one `experience` result per
position; `experience_id` disambiguates multiple roles at the same company.

## Seed Example in this repo

- `data/cvs/cv_en_john_doe.yaml`

## Notes for parser and renderer

- Renderer should treat missing optional sections as empty.
- Template engine must map via explicit mapping files, never by implicit key guessing.
- Sanitization should preserve UTF-8 Bulgarian text.
