# Packages and Services

## `@muhfweeceevee/schemas`

Path: `packages/schemas/src/`

Exports:

- `CV_SCHEMA_VERSION` (`cv.v1`)
- `validateCvV1`, `CV_V1_JSON_SCHEMA`
- `cvScoring` — rubric weights / thresholds for analysis UI

Consumed by: `apps/web` API routes on CV save.

Tests: `cvSchema.test.ts` — run via root `npm test` / vitest.

## `@muhfweeceevee/render-core`

Placeholder (`src/index.ts` only). **Do not use** for rendering — implementation is
in `apps/web/src/lib/server/render/`.

## `@muhfweeceevee/mcp-wrapper`

Path: `packages/mcp-wrapper/` (v0.2.0)

- `npm run mcp:api` → stdio MCP server (Research, analysis, CV sync, session backup, print-tweak URLs)
- Set `MFCV_API_TOKEN` when the web API requires auth
- HTTP client to web API (`CV_API_BASE_URL`, default `http://127.0.0.1:3000/api`)
- Tools: `list_cvs`, `save_cv`, `preview_html_url`, `photo_*`, `openrouter_*`, etc.

See [`mcp.md`](../../../../mcp.md). When dev server uses port **3005**:

```bash
CV_API_BASE_URL=http://127.0.0.1:3005/api npm run mcp:api
```

## `services/parser` (FastAPI)

- `npm run dev:parser` — uvicorn on `8001`, Python 3.12 venv under `services/parser/.venv`
- **Scaffold** — PDF parsing experiments; **production PDF uses Playwright in Next.js**
- Not on critical path for Composer UI

## Keywords subsystem (retired)

Active web app **does not** include `/api/analysis/keywords` routes.

Legacy code + tests + sqlite JD cache:

- `backup/retired-keywords/keywords/`
- `backup/retired-keywords/apps-web/src/app/api/analysis/keywords/`

`docs/API.md` still documents keywords APIs for historical releases. Before re-enabling:

1. Restore routes into `apps/web`
2. Set `SQLITE_BIN` to sqlite3 executable
3. See archived skill: `backup/retired-keywords/skills-sqlite-binary-path/SKILL.md`

Root `package.json` may lack `test:keywords` — verify before running pytest.

## Vitest

`vitest.config.ts` at repo root — schema package tests. Web app has **no** automated
component tests yet (`AGENTS.md` notes gap).

## Deploy artifacts

- `deploy/nginx/myfreeceevee.local.conf`
- `deploy/systemd/myfreeceevee-web.service`, `myfreeceevee-parser.service`

Production: `npm run build` then `npm run start` behind reverse proxy.