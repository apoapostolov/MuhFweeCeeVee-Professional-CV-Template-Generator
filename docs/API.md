# API Reference

Internal HTTP API used by the web UI and `@muhfweeceevee/mcp-wrapper` (v0.2.0).

Base path: `/api`

## Health

- `GET /health` — `{ ok, service, version, apiAuthRequired, timestamp }`

## Authentication

Mutation, analysis, sync, export, and other cost-bearing routes call `assertApiAuthorized`.

| Situation | Behavior |
| --- | --- |
| Host is loopback (`localhost` / `127.0.0.1`) | Trusted (browser UI works without injecting the token) |
| `MFCV_API_TOKEN` set + non-loopback | Require `Authorization: Bearer <token>` or `x-mfcv-api-token` |
| Token unset + `NODE_ENV=production` + non-loopback | **401** — set `MFCV_API_TOKEN` before exposing the host |
| `MFCV_REQUIRE_API_TOKEN=true` and token missing | **503** |

OpenRouter `baseUrl` is allowlisted to `https://openrouter.ai` (SSRF protection). PDF/PNG export is serialized via `MFCV_EXPORT_CONCURRENCY` (default `1`).

`GET /cvs/:id?autoTranslate=true` is rejected (**405**). Create translated variants with `POST /cvs/variant` (`aiTranslate: true`).

## Since 1.2.2

### Print tweak query params (preview + export)

On `GET /preview/html`, `GET /export/pdf`, and `GET /export/image`:

| Param | Type | Notes |
|-------|------|--------|
| `removePhoto` | `1` / `true` | Forces photo off |
| `moveSkillsLeft` | `1` / `true` | Sidebar templates only |
| `sidebarTextScale` | `50`–`200` | Integer percent; active when param present |
| `contentTextScale` | `50`–`200` | Integer percent; active when param present |

Scaling uses CSS `zoom` on sidebar vs main content regions.

### OpenRouter `imageModel`

- `GET /settings/openrouter` includes `imageModel` (persisted in `data/settings/openrouter.yaml`).
- `PUT /settings/openrouter` accepts `imageModel` (image-generation-capable model id).

### Research APIs

- `GET /research/catalog` — list companies + job positions
- `PUT /research/catalog` — replace catalog (auth when token set)
- `GET|PUT|DELETE /research/companies/:companyId`
- `POST /research/companies/enrich` — staged company fill (`companyName`, `officeCountry`, `stages?`, `useWebSearch?` default false, optional website/linkedin/aboutText). Default stage: `identity`. Cache 7d unless `forceRefresh`.
- `POST /research/companies/research` — **deprecated** wrapper: all stages + `useWebSearch: true`
- `GET|PUT|DELETE /research/job-positions/:jobId`
- `POST /research/job-positions/research` — job research (`companyId`, `jobTitle`, optional JD; skips web when JD is long enough)
- `POST /research/jobs/extract-keywords` — local JD keyword extract (`jobId`, optional `rawJdText`, `replace?`); no web
- `POST /research/jobs/gap` — keyword gap report (`cvId`, `jobId`)
- `POST /research/field-refine` — per-field AI (`entityType`, `entityId`, `fieldPath`, `useWebSearch?: boolean` default false). Unknown paths 400; proposals validated against field contracts.

### Analysis (Editor + metadata)

- `POST /analysis/cv` — optional `jobPositionId`, `companyIds`
- `POST /analysis/field` — `professional_rewrite` / `shorten`; optional `jobPositionId`
- `POST /analysis/ats-check` — deterministic ATS rules (`cvId`, optional `jobId`); no LLM
- `POST /analysis/company-research` — **removed** (use Research staged enrich / `POST /research/catalog/import-metadata`)
- `POST /research/catalog/import-metadata` — import legacy Editor company-metadata shells into Research catalog (no AI)
- `POST /analysis/company-field` — metadata field refine (legacy)
- `GET|POST /cover-letters` — list/save/delete/restore; **AI draft** and **Humanize** are separate (`draftWithAi` vs `humanize`); version history under `data/cover_letters/history/`
  - `GET ?id=&versions=1` — version list; `GET ?id=&version=N` — one snapshot
  - `POST { action: "restore", id, version }` — restore snapshot as new revision
- `GET /api/ai-skills` — list product AI skills + hooks (metadata only)
- `GET|POST /applications` — kanban board of **application packets** (CV + photo + company + letter refs)
  - packet fields: `cv_id`, `photo_id`, `cover_letter_id`, `packet_title`, company/job, status, notes
  - `GET ?export=<id>` or `POST { action: "export", id }` → portable `muhfweeceevee.application_packet` JSON (embeds CV + letter body; photo re-link by id)
  - `POST { action: "import", packet, restoreCv?, restoreLetter? }` → new card (+ restore embeds)
  - `POST { action: "duplicate", id, overrides? }` → reuse CV/photo for a similar company (clears letter by default)

- `GET|POST /applications` — application board CRUD (`wishlist|applied|interview|offer|rejected|ghosted`)

### Company metadata auth

- `PUT /companies?source=example|personal` now requires API token when `MFCV_API_TOKEN` is set.

## Since 1.0.0

## 1) Render + Export Overrides

- `GET /preview/html`
- `GET /export/pdf`
- `GET /export/image`

### Query params

- `cvId` (required)
- `templateId` (required)
- `theme` (optional; template theme id)
- `photo` (optional; `default|on-circle|on-square|on-original|off`)
- `photoId` (optional; approved Photo Booth image id in `/photos`)
- `download=1` (pdf only; force attachment)

### Notes

- These endpoints now support approved Photo Booth images without mutating CV YAML.

## 2) Photo Booth Storage API

- `GET /photos`
- `POST /photos` (`multipart/form-data`, key: `files`, supports multiple)
- `DELETE /photos?id=<photoId>`

### `GET /photos` response highlights

- `items[]` now includes:
  - `analysis` (latest)
  - `analysisHistory[]` (full stored history)
- Legacy uploads are auto-migrated into `/photos` during load.

## 3) Photo AI Analysis

- `POST /analysis/photo`

### Request body

```json
{
  "photoId": "optional-photo-file-id.jpg",
  "fileName": "optional-display-name.jpg",
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

### Response body (highlights)

```json
{
  "ok": true,
  "analysis": {
    "score": 84,
    "verdict": "good",
    "notes": ["..."],
    "clothingProposals": ["..."],
    "analyzedAt": "2026-03-07T12:00:00.000Z",
    "model": "openai/gpt-4o-mini"
  },
  "history": []
}
```

### Notes

- If `photoId` is provided, analysis is persisted to `/photos/metadata.json`.
- Individual analysis now includes clothing proposals (types + colors).

## 4) Multi-image AI Comparison

- `POST /analysis/photo/compare`

### Preferred request body (multi-image)

```json
{
  "images": [
    { "name": "img-1.jpg", "imageDataUrl": "data:image/jpeg;base64,..." },
    { "name": "img-2.jpg", "imageDataUrl": "data:image/jpeg;base64,..." },
    { "name": "img-3.jpg", "imageDataUrl": "data:image/jpeg;base64,..." }
  ]
}
```

Optional cache controls:

```json
{
  "imageIds": ["photo-id-1.jpg", "photo-id-2.jpg"],
  "lookupOnly": true,
  "forceNew": false
}
```

### Backward-compatible pair body (still accepted)

```json
{
  "leftName": "img-1.jpg",
  "leftImageDataUrl": "data:image/jpeg;base64,...",
  "rightName": "img-2.jpg",
  "rightImageDataUrl": "data:image/jpeg;base64,..."
}
```

### Response body (highlights)

```json
{
  "ok": true,
  "cached": false,
  "comparison": {
    "criteria": [
      { "name": "Lighting & sharpness", "summary": "..." }
    ],
    "ranked": [
      {
        "name": "img-2.jpg",
        "score": 91,
        "verdict": "excellent",
        "strengths": ["..."],
        "risks": ["..."],
        "improvements": ["..."]
      }
    ],
    "winnerName": "img-2.jpg",
    "recommendation": "...",
    "recommendationDetails": ["..."],
    "analyzedAt": "2026-03-07T12:00:00.000Z",
    "model": "openai/gpt-4o-mini"
  },
  "history": []
}
```

### Cache behavior

- Comparison results are persisted in `/photos/metadata.json` keyed by selected image id set.
- `lookupOnly: true` returns cached comparison (if available) without generating a new AI call.
- `forceNew: true` forces a new comparison and appends it to comparison history.

## 5) CV Variant + Language Operations

- `POST /cvs/variant`
  - creates/ensures a language variant from `sourceCvId`
  - supports `aiTranslate: true`
- `POST /cvs/sync/status`
  - returns available language siblings + `lastEditedAt` per language
- `POST /cvs/sync`
  - source-target sync using missing-field merge + AI translation of missing fragments

## 6) Companies Metadata API

- `GET /companies`
- `PUT /companies?source=example|personal`

### Notes

- Returns the merged company list from tracked example metadata and optional
  personal metadata.
- Personal metadata lives in `data/settings/companies.personal.json` and is
  intentionally git-ignored.
- `GET /companies?source=...` returns the editable metadata document for that
  source.
- `PUT /companies?source=...` saves the full metadata document for that source.

## 7) OpenRouter Settings + Credit

- `GET /settings/openrouter` — `model`, `researchModel`, `imageModel`, model catalog
- `PUT /settings/openrouter` — `apiKey`, `model`, `researchModel`, `imageModel`, `baseUrl` (auth when token set); saving API key writes `.env` `OPENROUTER_API_KEY`
- `GET /settings/openrouter/credit` — credit/prepaid status from OpenRouter

## 8) Keywords Data APIs (retired in v1.1.0)

Routes removed from the app; use **Research** weighted keywords and Editor Job Targeting instead.

## 9) CV AI Analysis

- `POST /analysis/cv`

### Request body

```json
{
  "cvId": "cv_en_john_doe",
  "templateId": "cambridge-v1",
  "scope": "section",
  "sectionKey": "positioning",
  "companyIds": ["example-tech", "northstar-cloud"]
}
```

### Notes

- Both section and full-CV analysis can consume one or more selected companies
  from the external companies metadata store.
- Pass no `companyIds` to run generic analysis.

## Stability

- These APIs are internal app APIs used by the web UI.
- Shapes may evolve; keep client and server on same release tag.
