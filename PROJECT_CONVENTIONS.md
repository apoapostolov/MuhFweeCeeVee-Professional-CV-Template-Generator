# Project Conventions — MuhFweeCeeVee

## Naming Conventions

- **Source files (TS/TSX)** — Use kebab-case for project files when the
  ecosystem allows (`user-profile.tsx`, `api-client.ts`). Use PascalCase for
  component files that match the exported component name (`ComposerClient.tsx`,
  `PhotoBooth.tsx`).
- **Python files** — Use snake_case as required by Python convention
  (`analysis_engine.py`, `jd_scraper.py`).
- **Directories** — Use kebab-case for all directories
  (`apps/web/`, `packages/render-core/`, `services/parser/`, `data/template_mappings/`).
- **Package names** — Scoped under `@muhfweeceevee/` for internal packages
  (`@muhfweeceevee/web`, `@muhfweeceevee/schemas`, `@muhfweeceevee/render-core`,
  `@muhfweeceevee/mcp-wrapper`).
- **CV IDs** — Use the format `cv_<language>_<target>` or
  `cv_<language>_<iteration>_<target>` (e.g., `cv_en_john_doe`).
- **Template IDs** — Use kebab-case with version suffix
  (`cambridge-v1`, `edinburgh-v1`, `europass-v1`, `harvard-v1`, `stanford-v1`).
- **Config files** — Use the tool's default name whenever possible
  (`next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`).

## Directory Structure

```text
apps/web/          — Next.js web application (App Router)
packages/          — Shared packages
  schemas/         — CV schema definitions and scoring constants
  render-core/     — Shared rendering primitives
  mcp-wrapper/     — MCP stdio server wrapper
services/parser/   — FastAPI parser service (Python)
templates/         — YAML template definitions (one folder per template)
data/              — Sample CV data and template mappings
  cvs/             — CV YAML files
  settings/        — Company metadata, OpenRouter settings
  template_mappings/ — CV-to-template mapping files
keywords/          — Python keyword analysis engine
  config/          — Keyword database configs and taxonomies
  outputs/         — Analysis output files
  tests/           — Keyword engine test suite
docs/              — Project documentation
deploy/            — Deployment configs
  nginx/           — Nginx reverse proxy config
  systemd/         — Systemd service files
images/            — Screenshots and images
```

## Structural Rules

- **Keep files manageable.** Large single files become hard to reason about.
  In TypeScript/TSX, consider splitting above ~2,000 lines.
- **Keep depth manageable.** Prefer 3-4 levels of nesting from project root.
- **One clear home per concern.** A module should belong to exactly one package.
- **Keep tests close to code.** Place test files alongside the source.
- **Separate generated output.** Put generated files in `.next/`, `.venv/`,
  `node_modules/`, etc., all gitignored.

## CV YAML Conventions

- YAML is the canonical machine-readable source of CV facts.
- Required sections: `schema`, `person`, `experience`, `skills`, `metadata`.
- Dates follow ISO format (`YYYY-MM-DD`).
- Target company metadata lives in separate JSON files, not in CV YAML.
- Language variants use the `cv_<lang>_<target>` ID convention.
- See [`docs/CV_YAML_STANDARD.md`](docs/CV_YAML_STANDARD.md) for full schema.

## Documentation Conventions

- All project documentation lives in `docs/`, organized by subdirectory.
- Root-level exceptions: `README.md`, `CHANGELOG.md`, `CHANGELOG_GUIDE.md`,
  `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `LICENSE`.
- Templates have their own `templates/<template-id>/` folders with
  `template.yaml`, `layout.yaml`, and `license.yaml`.
- API documentation in `docs/API.md`.
- Add new API endpoints to `docs/API.md` when they are created.
