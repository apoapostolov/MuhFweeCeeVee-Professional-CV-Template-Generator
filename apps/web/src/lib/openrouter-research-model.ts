/** Shared research model resolution (client + server). */
export const DEFAULT_OPENROUTER_RESEARCH_MODEL = "perplexity/sonar";

export function resolveOpenRouterResearchModelId(settingsModel: string): string {
  const env =
    typeof process !== "undefined" ? (process.env.OPENROUTER_COMPANY_RESEARCH_MODEL ?? "").trim() : "";
  if (env.length > 0) {
    return env;
  }
  const normalized = settingsModel.trim().toLowerCase();
  if (normalized.includes("perplexity") || normalized.includes("sonar")) {
    return settingsModel.trim() || DEFAULT_OPENROUTER_RESEARCH_MODEL;
  }
  return DEFAULT_OPENROUTER_RESEARCH_MODEL;
}