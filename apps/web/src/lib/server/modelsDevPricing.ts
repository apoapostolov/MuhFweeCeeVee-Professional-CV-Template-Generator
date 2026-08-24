import type { AiModelPricing } from "./aiProviderTypes";

type ModelsDevModel = {
  cost?: {
    input?: unknown;
    output?: unknown;
  } | null;
};

type ModelsDevProvider = {
  models?: Record<string, ModelsDevModel>;
};

type ModelsDevCatalog = Record<string, ModelsDevProvider>;

type RequestedModel = Pick<AiModelPricing, "providerId" | "modelId">;

const MODELS_DEV_URL = "https://models.dev/api.json";
const CATALOG_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const PROVIDER_ALIASES: Record<string, string[]> = {
  "openai-codex": ["openai"],
  openai: ["openai"],
  anthropic: ["anthropic"],
  gemini: ["google"],
  "xai-oauth": ["xai"],
  xai: ["xai"],
  openrouter: ["openrouter"],
  deepseek: ["deepseek"],
  mistral: ["mistral"],
  groq: ["groq"],
};

let catalogCache: { fetchedAt: number; value: ModelsDevCatalog } | null = null;

async function readCatalog(forceRefresh: boolean): Promise<ModelsDevCatalog> {
  if (!forceRefresh && catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_MAX_AGE_MS) {
    return catalogCache.value;
  }
  const response = await fetch(MODELS_DEV_URL, {
    headers: { accept: "application/json", "user-agent": "MuhFweeCeeVee/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Models.dev request failed (${response.status}).`);
  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Models.dev returned invalid data.");
  catalogCache = { fetchedAt: Date.now(), value: value as ModelsDevCatalog };
  return catalogCache.value;
}

function findModel(catalog: ModelsDevCatalog, requested: RequestedModel): ModelsDevModel | null {
  const providerKeys = PROVIDER_ALIASES[requested.providerId] ?? [requested.providerId];
  for (const providerKey of providerKeys) {
    const models = catalog[providerKey]?.models ?? {};
    const exact = models[requested.modelId] ?? models[`openai/${requested.modelId}`];
    if (exact) return exact;
  }
  for (const provider of Object.values(catalog)) {
    const models = provider.models ?? {};
    const match = Object.entries(models).find(([id]) => id === requested.modelId || id.endsWith(`/${requested.modelId}`));
    if (match) return match[1];
  }
  return null;
}

export async function fetchModelsDevPricing(
  requestedModels: RequestedModel[],
  forceRefresh = false,
): Promise<AiModelPricing[]> {
  const catalog = await readCatalog(forceRefresh);
  const checkedAt = new Date().toISOString();
  return requestedModels.map((requested) => {
    const model = findModel(catalog, requested);
    const input = typeof model?.cost?.input === "number" ? model.cost.input : null;
    const output = typeof model?.cost?.output === "number" ? model.cost.output : null;
    return { ...requested, inputPer1M: input, outputPer1M: output, checkedAt };
  });
}
