import { RESEARCH_WEB_MODEL_DEFAULT } from "./research/research-web-search";

/** Shared research model resolution (client + server). */
export const DEFAULT_OPENROUTER_RESEARCH_MODEL = RESEARCH_WEB_MODEL_DEFAULT;

export function isWebCapableModelId(modelId: string): boolean {
  const normalized = modelId.trim().toLowerCase();
  return (
    normalized.includes("perplexity") ||
    normalized.includes("sonar") ||
    normalized.endsWith(":online")
  );
}

function ensureWebCapableModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) {
    return RESEARCH_WEB_MODEL_DEFAULT;
  }
  if (isWebCapableModelId(trimmed)) {
    return trimmed;
  }
  return `${trimmed}:online`;
}

/** Resolves the model id used for catalog/field web research API calls. */
export function resolveOpenRouterResearchModelId(researchModel: string): string {
  const env =
    typeof process !== "undefined" ? (process.env.OPENROUTER_COMPANY_RESEARCH_MODEL ?? "").trim() : "";
  if (env.length > 0) {
    return ensureWebCapableModelId(env);
  }
  const fromSettings = researchModel.trim();
  if (fromSettings.length > 0) {
    return ensureWebCapableModelId(fromSettings);
  }
  return RESEARCH_WEB_MODEL_DEFAULT;
}