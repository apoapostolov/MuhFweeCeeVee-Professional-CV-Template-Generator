# Server API and Data Layer

Base path: `/api`. Full contract: [`docs/API.md`](../../../../docs/API.md).

All listed routes use `export const runtime = "nodejs"` unless noted.

## Route inventory (active)

| Method | Path | Auth when token set | Store / lib |
|--------|------|---------------------|-------------|
| GET | `/api/cvs` | — | `listCvVariants` |
| POST | `/api/cvs` | yes | `writeCv`, `validateCvV1` |
| GET/PUT/DELETE | `/api/cvs/[cvId]` | mutating yes | `readCv`, `writeCv`, history |
| GET | `/api/cvs/[cvId]/history` | — | snapshot list |
| POST | `/api/cvs/variant` | yes | variant create + optional AI translate |
| POST | `/api/cvs/sync/status` | yes | sibling languages + timestamps |
| POST | `/api/cvs/sync` | yes | merge + translate missing fields |
| POST | `/api/cvs/translate-field` | yes | single field translation |
| GET | `/api/templates` | — | `listTemplates` → `catalog.yaml` |
| GET | `/api/companies` | — | example + personal merge |
| PUT | `/api/companies?source=` | yes | `companies.example.json` or `.personal.json` |
| GET/PUT | `/api/settings/openrouter` | PUT yes | `.env` + `data/settings/openrouter.yaml` |
| GET | `/api/settings/openrouter/credit` | — | OpenRouter credit API |
| GET | `/api/photos` | — | `photos/metadata.json` |
| POST/DELETE | `/api/photos` | yes | multipart upload / delete |
| POST | `/api/analysis/cv` | yes | OpenRouter scoring |
| POST | `/api/analysis/field` | yes | field rewrite |
| POST | `/api/analysis/company-research` | yes | company record AI fill |
| POST | `/api/analysis/company-field` | yes | single company field |
| POST | `/api/analysis/photo` | yes | portrait analysis |
| POST | `/api/analysis/photo/compare` | yes | multi-image ranking |
| GET | `/api/preview/html` | — | `buildCvTemplateHtml` |
| GET | `/api/export/pdf` | — | HTML + Playwright PDF |
| GET | `/api/export/image` | — | raster export variant |
| GET/POST | `/api/prototype` | — | experimental ingest (low traffic) |

**Retired (docs only):** `/api/analysis/keywords*` — implementation lives under
`backup/retired-keywords/`, not in active `apps/web`.

## API authentication

`lib/server/apiAuth.ts`:

- `MFCV_API_TOKEN` unset → all routes open (local dev default)
- Set → `POST`/`PUT`/`DELETE` and cost-bearing analysis routes call `assertApiAuthorized()`

Clients must send `Authorization: Bearer <token>` or `x-mfcv-api-token`.

## cvStore (`lib/server/cvStore.ts`)

- Directory: `data/cvs/` via `repoPath`
- File per CV: `{cvId}.yaml`
- History: `data/cvs/history/{cvId}/{iso-timestamp}.yaml` on writes
- Parse/stringify: `yaml` package
- Metadata enrichment: `withUpdatedMetadata()` sets `metadata.updated_at`, variant block
- Git info: optional `git log` per file for UI version display
- Validation on save: `validateCvV1` from `@muhfweeceevee/schemas`

**cvId validation:** `/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/`

## Company metadata (`lib/server/companyMetadataStore.ts`)

- Tracked example: `data/settings/companies.example.json`
- Personal (gitignored): `data/settings/companies.personal.json`
- `GET /api/companies?source=example|personal` returns editable document
- CV YAML does **not** embed target employers — analysis reads external metadata

## Photo gallery (`lib/server/photoGalleryStore.ts`)

- Files under `photos/` (repo root, gitignored)
- `photos/metadata.json` — analysis + comparison history
- Export routes accept `photoId` without mutating CV YAML

## OpenRouter settings (`lib/server/openRouterSettings.ts`)

- Persists model choice, base URL, masked key state
- Saving API key writes `OPENROUTER_API_KEY` to `.env`
- Model list cache: `data/settings/openrouter_models.yaml`
- Image pricing: `openRouterImagePricing.ts`, `data/settings/openrouter_image_pricing.yaml`

## Template catalog (`lib/server/templateStore.ts`)

Reads `templates/catalog.yaml` — ids: `cambridge-v1`, `stanford-v1`, `harvard-v1`,
`edinburgh-v1`, `europass-v1`.

## Error pattern

Route handlers return `NextResponse.json({ error: "..." }, { status: 4xx|5xx })`.
Client controller surfaces `editorNotice` / toasts from `error` field.

## Adding an endpoint

1. Create `apps/web/src/app/api/<segment>/route.ts`
2. Use `repoPath` for filesystem access, not hardcoded `../../`
3. Call `assertApiAuthorized` on mutations
4. Document in `docs/API.md`
5. Add client fetch in `useComposerController` or dedicated hook
6. Run `npm run check`