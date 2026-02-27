# DEVELOPMENT_LOG

## 2026-02-27 - Bootstrap governance and stack init

Initialized repository bootstrap for MyFreeCeeVee architecture and
added operating docs.

- Added plan document: `DEVELOPMENT_PLAN.md`.
- Bootstrapped workspace structure:
  `apps/`, `services/`, `packages/`, `deploy/`, `data/`.
- Created Next.js web scaffold in `apps/web`.
- Added parser scaffold in `services/parser/main.py` and dependency file.
- Added systemd and nginx baseline config files under `deploy/`.
- Added project governance docs:
  `AGENTS.md`, `TODO.md`, `CHANGELOG.md`, `DEVELOPMENT_LOG.md`.

Validation run:

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- Parser import check -> pass
- Parser `/health` smoke test -> pass

## 2026-02-27 - CV YAML + scoring rules import and bootstrap templating

Imported the CV YAML rules, seed CV YAML (`cv_bg_004_alianz`), and CV scoring
rules into the project as initial templating + documentation assets.

- Added `data/cvs/cv_bg_004_alianz.yaml` as first canonical test CV.
- Added template catalog and bootstrap template:
  `templates/catalog.yaml`, `templates/professional-v1/*`.
- Added seed mapping file:
  `data/template_mappings/cv_bg_004_alianz__professional-v1.yaml`.
- Added documentation:
  `docs/cv/CV_YAML_STANDARD.md`,
  `docs/cv/CV_SCORING_STANDARD.md`,
  `docs/cv/INITIAL_TEMPLATING_BOOTSTRAP.md`.
- Added machine-readable scoring constants:
  `packages/schemas/src/cvScoring.ts` and schema exports update.
- Updated `README.md`, `TODO.md`, and `CHANGELOG.md` for doc-sync compliance.

Validation run:

- `markdownlint-cli2` on changed markdown files -> pass

## 2026-02-27 - Markdownlint rule parity with lifestyle repo

Aligned markdown lint rules with `/home/apoapostolov/git/lifestyle` by
adding root `.markdownlint.json` with the same disabled rule set.

Validation run:

- `npx -y markdownlint-cli2 README.md` -> pass with project config
