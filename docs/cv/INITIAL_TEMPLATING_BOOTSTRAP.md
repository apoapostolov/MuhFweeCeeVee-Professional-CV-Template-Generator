# Initial Templating Bootstrap

This document describes the initial templating assets implemented from the
imported CV YAML standard and scoring rules.

## Implemented Assets

- Seed CV:
  - `data/cvs/cv_bg_004_alianz.yaml`
- Template catalog:
  - `templates/catalog.yaml`
- Bootstrap template:
  - `templates/professional-v1/template.yaml`
  - `templates/professional-v1/layout.yaml`
  - `templates/professional-v1/license.yaml`
- CV-to-template mapping:
  - `data/template_mappings/cv_bg_004_alianz__professional-v1.yaml`

## Templating principles

- Mapping-first rendering (`cv_path -> slot_id`).
- Two-column professional baseline with explicit regions.
- Overflow behavior defined in template rules.
- Legal metadata required even for internal templates.

## Next implementation steps

1. Create renderer that reads mapping + template + CV YAML.
2. Build section components for each slot type.
3. Add pre-render validation (schema + missing required slots).
4. Wire export pipeline to Playwright PDF generator.
