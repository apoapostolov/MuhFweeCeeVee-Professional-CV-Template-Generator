# CV YAML, Variants, and Validation

Canonical spec: [`docs/CV_YAML_STANDARD.md`](../../../../docs/CV_YAML_STANDARD.md).

## Document shape

Required top-level sections (JSON Schema enforced):

```yaml
schema:      # id, version, profile_type, locale
person:      # full_name, contact (email required)
positioning: # headline, profile_summary
experience:  # array (may be empty in draft)
education:   # array
skills:      # technical | languages | core_strengths
metadata:    # dates, language, variant?, visibility?, ATS/detector scores?
```

Optional: `references`, `compliance`, `optional_sections`, custom fields via editor.

## Validation

`packages/schemas/src/cvSchema.ts` — `CV_V1_JSON_SCHEMA` + `validateCvV1(document)`.

Used on `POST /api/cvs` and updates. Issues return `{ valid, issues: [{ path, message }] }`.

Scoring constants: `cvScoring.ts` (analysis rubric references).

## File location

- Path: `data/cvs/{cvId}.yaml`
- Public sample in git: `data/cvs/cv_en_john_doe.yaml`
- Personal files: gitignored patterns (`*Apostol*`, `cv_*_private.yaml`, `history/`)

## CV ID formats (`cvVariants.ts`)

| Pattern | Example | Notes |
|---------|---------|-------|
| Standard | `cv_en_0001_john_doe` | `cv_{lang}_{iteration}_{target}` |
| No iteration | `cv_en_john_doe` | loose parser |
| Profile slug | `cv_apoapostolov_en_001` | `cv_{profile}_{lang}_{iteration}` — target from `metadata.variant` |

**Sync languages** hard-coded: `bg` | `en` for bilingual sync modal.

Helper functions:

- `parseCvVariantId`, `parseCvVariantIdLoose`, `parseCvProfileVariantId`
- `buildCvVariantId`, `resolveSiblingCvId` — language switching in UI
- `cvVariantGroupKey` — group variants in workspace picker

## Metadata variant block

On save, `cvStore.withUpdatedMetadata()` normalizes:

```yaml
metadata:
  language: en
  variant:
    cv_id: cv_en_0001_john_doe
    iteration: "0001"
    target: john_doe
    language: en
  updated_at: "2026-06-04"
  template_visibility:
    experience.2: false
  ats_scores:
    - label: ApplyCove
      score: "81/100"
  detector_scores:
    - label: Sapling
      score: "mixed section results"
      section_scores:
        - label: Frontmatter
          score: "5.1% AI"
```

`ats_scores[]` and `detector_scores[]` use free-form string scores so exact
provider wording survives. Detector entries can add `section_scores[]` for
stable per-job, frontmatter, or backmatter scopes. Missing groups receive the
built-in provider presets when a CV is loaded; initialized arrays are preserved.

## Target companies (external)

**Not** stored in CV YAML. Analysis uses `data/settings/companies.*.json` entries with
`company_id`, `company_details`, `target_roles`, `keywords_to_echo`, etc.

Editor binds `analysisCompanyIds` from checkbox selection.

## Variant operations (API)

| Endpoint | Behavior |
|----------|----------|
| `POST /api/cvs/variant` | Clone to new language; `aiTranslate: true` optional |
| `POST /api/cvs/sync/status` | List siblings + `lastEditedAt` |
| `POST /api/cvs/sync` | Merge missing fields + translate fragments BG↔EN |
| `POST /api/cvs/translate-field` | Single path translation |

Client modals: variant create, language sync — wired in `useComposerController`.

## Template mappings per CV

Global: `data/template_mappings/harvard-v1.yaml` etc.

Per-CV override naming: `cv_<cvId>__<templateId>.yaml` (see `resolveMappingPath`).

## Dates and content rules

- ISO dates: `YYYY-MM-DD`
- `experience[].publication_links[]` with `url`, optional `title`
- `parallel_role: true` when overlapping roles
- UTF-8 preserved (Bulgarian + English)

## Editing tips for agents

- Prefer loading real YAML from disk over inventing structure
- After schema changes, update **both** `cvSchema.ts` and `docs/CV_YAML_STANDARD.md`
- Test save round-trip via API or Editor autosave
- Use John Doe for public repro steps only
