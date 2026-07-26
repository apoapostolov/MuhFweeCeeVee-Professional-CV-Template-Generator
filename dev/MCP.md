# MCP Wrapper (`@muhfweeceevee/mcp-wrapper`)

MCP stdio server that proxies the MuhFweeCeeVee web API (`/api/*`).

**Version:** 0.2.0

## Install

From repo root:

```bash
npm install
```

## Run

```bash
npm run mcp:api
```

Set the API base (include `/api`):

```bash
CV_API_BASE_URL=http://127.0.0.1:3005/api npm run mcp:api
```

Default: `http://127.0.0.1:3000/api`

## Authentication

When the web app has `MFCV_API_TOKEN` set, configure the same value for MCP:

```bash
MFCV_API_TOKEN=your-token CV_API_BASE_URL=http://127.0.0.1:3005/api npm run mcp:api
```

(`CV_API_TOKEN` is accepted as an alias.) MCP sends `Authorization: Bearer …` and `x-mfcv-api-token` on every request.

## Client config (stdio)

```json
{
  "mcpServers": {
    "muhfweeceevee-api": {
      "command": "npm",
      "args": ["run", "mcp:api"],
      "cwd": "/path/to/MuhFweeCeeVee-Professional-CV-Template-Generator",
      "env": {
        "CV_API_BASE_URL": "http://127.0.0.1:3005/api",
        "MFCV_API_TOKEN": "optional-when-server-requires-auth"
      }
    }
  }
}
```

## Tool catalog

### Meta

| Tool | Description |
|------|-------------|
| `api_info` | Wrapper version, API base, auth status, tool groups |

### CVs

| Tool | API |
|------|-----|
| `list_cvs` | `GET /cvs` |
| `get_cv` | `GET /cvs/:id` |
| `create_cv` | `POST /cvs` |
| `save_cv` | `PUT /cvs/:id` |
| `cv_history` | `GET /cvs/:id/history` |
| `create_cv_variant` | `POST /cvs/variant` |
| `cv_sync_status` | `POST /cvs/sync/status` |
| `cv_sync` | `POST /cvs/sync` |
| `translate_field` | `POST /cvs/translate-field` |

### Templates & render

| Tool | API |
|------|-----|
| `list_templates` | `GET /templates` |
| `preview_html_url` | Builds `GET /preview/html?…` URL |
| `export_pdf_url` | Builds `GET /export/pdf?…` URL |
| `export_image_url` | Builds `GET /export/image?…` URL |

Print tweak query params (optional on URL tools): `removePhoto`, `moveSkillsLeft`, `sidebarTextScale`, `contentTextScale`.

### Research (v1.2+)

| Tool | API |
|------|-----|
| `research_catalog_get` | `GET /research/catalog` |
| `research_catalog_put` | `PUT /research/catalog` |
| `research_company_get` | `GET /research/companies/:id` |
| `research_company_put` | `PUT /research/companies/:id` |
| `research_company_delete` | `DELETE /research/companies/:id` |
| `research_company_run` | `POST /research/companies/research` |
| `research_job_get` | `GET /research/job-positions/:id` |
| `research_job_put` | `PUT /research/job-positions/:id` |
| `research_job_delete` | `DELETE /research/job-positions/:id` |
| `research_job_run` | `POST /research/job-positions/research` |
| `research_field_refine` | `POST /research/field-refine` |

### Analysis

| Tool | API |
|------|-----|
| `analysis_cv` | `POST /analysis/cv` |
| `analysis_field` | `POST /analysis/field` |
| `company_metadata_research` | **RETIRED** — use `research_company_enrich` / `research_catalog_import_metadata` |
| `research_catalog_import_metadata` | `POST /research/catalog/import-metadata` |
| `company_metadata_field_research` | `POST /analysis/company-field` |

### Photos

| Tool | API |
|------|-----|
| `photo_list` | `GET /photos` |
| `photo_upload_base64` | `POST /photos` |
| `photo_delete` | `DELETE /photos?id=` |
| `photo_analyze` | `POST /analysis/photo` |
| `photo_compare` | `POST /analysis/photo/compare` |

### Company metadata files

| Tool | API |
|------|-----|
| `companies_metadata_get` | `GET /companies` or `?source=example\|personal` |
| `companies_metadata_put` | `PUT /companies?source=` |

### OpenRouter settings

| Tool | API |
|------|-----|
| `openrouter_settings_get` | `GET /settings/openrouter` |
| `openrouter_settings_update` | `PUT /settings/openrouter` (`model`, `researchModel`, `imageModel`, …) |
| `openrouter_credit` | `GET /settings/openrouter/credit` |

### Session backup

| Tool | Description |
|------|-------------|
| `session_backup_export` | Server data only (catalog, metadata, CVs) |
| `session_backup_import` | Restore from `{ server: { … } }` or full backup object |

Browser `localStorage` is not available over MCP; use the web **Settings → Import / Export** UI for full session JSON.

### Retired (Keyword Studio)

These tools remain registered but **always error** with a retirement message:

- `keyword_analysis`
- `keyword_datasets`
- `keyword_datasets_rebuild`
- `keyword_manage`

## Notes

- The web dev server must be running.
- Full HTTP reference: [`docs/API.md`](../docs/API.md)
- Health check: `GET /api/health`