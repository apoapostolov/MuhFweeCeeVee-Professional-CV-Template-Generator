# OpenRouter and AI Features

## Configuration

| Surface | Location |
|---------|----------|
| UI | Settings panel → `OpenRouterSettingsCard.tsx` |
| Client hook | `useOpenRouterSettings.ts` |
| Server | `lib/server/openRouterSettings.ts` |
| Secret | `.env` → `OPENROUTER_API_KEY` (written when user saves in UI) |
| Cached models | `data/settings/openrouter_models.yaml` |
| Image pricing table | `data/settings/openrouter_image_pricing.yaml` |

Endpoints:

- `GET/PUT /api/settings/openrouter`
- `GET /api/settings/openrouter/credit`

**Cost awareness:** batch analysis and photo compare burn credits — confirm with user
before large runs (`AGENTS.md` approval rules).

## Analysis routes

| Route | Purpose | Key libs |
|-------|---------|----------|
| `POST /api/analysis/cv` | Section or full CV scoring vs companies | scoring in `packages/schemas`, prompts in server |
| `POST /api/analysis/field` | Rewrite single YAML path | `lib/field-ai-rewrite.ts` |
| `POST /api/analysis/company-research` | Fill company metadata record | `lib/company-research.ts`, `openRouterResearch.ts` |
| `POST /api/analysis/company-field` | One field on company doc | `lib/company-field-ai.ts` |
| `POST /api/analysis/photo` | Portrait quality + clothing tips | persists to photo metadata |
| `POST /api/analysis/photo/compare` | Rank 2+ images; cache by id set | `lookupOnly`, `forceNew` flags |

Client AI UX:

- `editor-field-ai.tsx` + `field-ai-proposals-persistence.ts`
- `company-field-ai.tsx` + `company-field-ai-persistence.ts`
- `PhotoBoothPanel.tsx` for image flows
- `ai-stars-icon.tsx` — visual affordance

## Company-aware CV analysis

Request includes optional `companyIds: string[]` from metadata store.
Empty list → generic analysis.

Company research merge: `mergeResearchedCompanyRecord()` in `lib/company-research.ts`.

## Field path keys

`lib/field-path-key.ts` — stable serialization for AI proposal cache keys
(`serializeFieldPath`).

## Image pricing (per-model)

`lib/openrouter-image-pricing.ts` — client estimates;
`lib/server/openRouterImagePricing.ts` — server reads YAML table for Settings UI costs.

## Models list

`openRouterModels.ts` fetches/refreshes model catalog; exposes prompt/completion $/1M
and `supportsImageGeneration` flag for model picker.

## Error handling notes

- OpenRouter may return HTTP 200 with `{ code: 401 }` in JSON body — check `ok`/`error` fields
- Surface failures via composer toasts and `settingsTabState: "error"`

## MCP exposure

`packages/mcp-wrapper` proxies analysis/settings tools over stdio — see [`packages-and-services.md`](packages-and-services.md).
Default API base `http://127.0.0.1:3000/api` — override with `CV_API_BASE_URL` when using port 3005.