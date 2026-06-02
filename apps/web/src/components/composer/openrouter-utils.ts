export type OpenRouterModelOption = {
  id: string;
  name: string;
  contextLength: number | null;
  promptPricePer1M: number | null;
  completionPricePer1M: number | null;
  mixedPricePer1M: number | null;
  isFree: boolean;
  supportsImageGeneration: boolean;
};

export type AnalysisCostEstimate = {
  overhead: number;
  analysisInputTokens: number;
  analysisOutputTokens: number;
  photoAnalysisInputTokens: number;
  photoAnalysisOutputTokens: number;
  photoComparisonInputTokens: number;
  photoComparisonOutputTokens: number;
  analysisCost: number | null;
  photoAnalysisCost: number | null;
  photoComparisonCost: number | null;
};

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function modelOptionLabel(model: {
  id: string;
  name: string;
  mixedPricePer1M: number | null;
  promptPricePer1M: number | null;
  completionPricePer1M: number | null;
  isFree: boolean;
}): string {
  const mixed = model.mixedPricePer1M ?? model.promptPricePer1M ?? model.completionPricePer1M;
  const labelName = model.name || model.id;
  const mixedLabel = model.isFree ? "FREE" : mixed !== null ? `avg ${formatUsd(mixed)}/1M` : "avg N/A";
  return `${labelName}${model.isFree ? " FREE" : ""} • ${mixedLabel}`;
}

export function estimateOpenRouterCost(
  model: OpenRouterModelOption | null,
  inputTokens: number,
  outputTokens: number,
): number | null {
  if (!model) return null;
  if (model.isFree) return 0;
  const promptPrice = model.promptPricePer1M ?? model.mixedPricePer1M;
  const completionPrice = model.completionPricePer1M ?? model.mixedPricePer1M;
  if (promptPrice === null || completionPrice === null) return null;
  return (inputTokens / 1_000_000) * promptPrice + (outputTokens / 1_000_000) * completionPrice;
}

export function buildAnalysisCostEstimate(
  cvSizeTokenEstimate: number,
  fullCvOutputTokenEstimate: number,
  selectedAnalysisModel: OpenRouterModelOption | null,
): AnalysisCostEstimate {
  const overhead = 1.4;
  const analysisInputTokens = Math.round((cvSizeTokenEstimate + 1100) * overhead);
  const analysisOutputTokens = Math.round(fullCvOutputTokenEstimate * overhead);
  const photoAnalysisInputTokens = Math.round((850 + 1100) * overhead);
  const photoAnalysisOutputTokens = Math.round(420 * overhead);
  const photoComparisonInputTokens = Math.round((950 + 1100 * 2) * overhead);
  const photoComparisonOutputTokens = Math.round(900 * overhead);
  return {
    overhead,
    analysisInputTokens,
    analysisOutputTokens,
    photoAnalysisInputTokens,
    photoAnalysisOutputTokens,
    photoComparisonInputTokens,
    photoComparisonOutputTokens,
    analysisCost: estimateOpenRouterCost(selectedAnalysisModel, analysisInputTokens, analysisOutputTokens),
    photoAnalysisCost: estimateOpenRouterCost(
      selectedAnalysisModel,
      photoAnalysisInputTokens,
      photoAnalysisOutputTokens,
    ),
    photoComparisonCost: estimateOpenRouterCost(
      selectedAnalysisModel,
      photoComparisonInputTokens,
      photoComparisonOutputTokens,
    ),
  };
}

export function orderTemplateItems<T extends { id: string; name: string }>(
  items: T[],
): T[] {
  const priority = (id: string): number => {
    if (id === "cambridge-v1") return 0;
    if (id === "stanford-v1") return 1;
    if (id === "harvard-v1") return 2;
    if (id === "europass-v1") return 3;
    if (id === "edinburgh-v1") return 4;
    return 5;
  };
  return [...items].sort((a, b) => {
    const p = priority(a.id) - priority(b.id);
    if (p !== 0) return p;
    return a.name.localeCompare(b.name);
  });
}