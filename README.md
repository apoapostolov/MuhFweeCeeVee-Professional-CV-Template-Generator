# MyFreeCeeVee

Self-hosted CV templating system.

## Stack

- Next.js 15 (web)
- FastAPI (parser)
- YAML-first data model
- Chromium PDF export pipeline (Playwright)

## Initial Data and Templating Assets

- Seed CV YAML:
  - `data/cvs/cv_bg_004_alianz.yaml`
- Template catalog:
  - `templates/catalog.yaml`
- Bootstrap template:
  - `templates/professional-v1/template.yaml`
  - `templates/professional-v1/layout.yaml`
  - `templates/professional-v1/license.yaml`
- Seed CV-to-template mapping:
  - `data/template_mappings/cv_bg_004_alianz__professional-v1.yaml`
- Shared scoring constants:
  - `packages/schemas/src/cvScoring.ts`

## Documentation

- CV YAML baseline:
  - `docs/cv/CV_YAML_STANDARD.md`
- CV scoring standard:
  - `docs/cv/CV_SCORING_STANDARD.md`
- Initial templating bootstrap notes:
  - `docs/cv/INITIAL_TEMPLATING_BOOTSTRAP.md`

## Run (dev)

```bash
npm install
npm run dev
```

Parser service:

```bash
cd services/parser
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```
