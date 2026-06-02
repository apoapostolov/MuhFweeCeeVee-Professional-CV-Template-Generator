export type OpenRouterModelOption = {
  id: string;
  name: string;
  contextLength: number | null;
  promptPricePer1M: number | null;
  completionPricePer1M: number | null;
  mixedPricePer1M: number | null;
  isFree: boolean;
  supportsImageGeneration: boolean;
  pricePerImageUsd?: number | null;
  pricePerImageMaxUsd?: number | null;
  pricePerImageNote?: string | null;
};

export type AnalysisCostLine = {
  label: string;
  inputTokens: number;
  outputTokens: number;
  cost: number | null;
};

export type AnalysisCostEstimate = {
  overhead: number;
  analysisInputTokens: number;
  analysisOutputTokens: number;
  photoAnalysisInputTokens: number;
  photoAnalysisOutputTokens: number;
  photoComparisonInputTokens: number;
  photoComparisonOutputTokens: number;
  fieldRewriteInputTokens: number;
  fieldRewriteOutputTokens: number;
  fieldShortenInputTokens: number;
  fieldShortenOutputTokens: number;
  fieldTranslateInputTokens: number;
  fieldTranslateOutputTokens: number;
  analysisCost: number | null;
  photoAnalysisCost: number | null;
  photoComparisonCost: number | null;
  fieldRewriteCost: number | null;
  fieldShortenCost: number | null;
  fieldTranslateCost: number | null;
  lines: AnalysisCostLine[];
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
  const fieldRewriteInputTokens = Math.round((650 + 1100) * overhead);
  const fieldRewriteOutputTokens = Math.round(720 * overhead);
  const fieldShortenInputTokens = Math.round((520 + 1100) * overhead);
  const fieldShortenOutputTokens = Math.round(380 * overhead);
  const fieldTranslateInputTokens = Math.round((420 + 1100) * overhead);
  const fieldTranslateOutputTokens = Math.round(320 * overhead);
  const analysisCost = estimateOpenRouterCost(
    selectedAnalysisModel,
    analysisInputTokens,
    analysisOutputTokens,
  );
  const photoAnalysisCost = estimateOpenRouterCost(
    selectedAnalysisModel,
    photoAnalysisInputTokens,
    photoAnalysisOutputTokens,
  );
  const photoComparisonCost = estimateOpenRouterCost(
    selectedAnalysisModel,
    photoComparisonInputTokens,
    photoComparisonOutputTokens,
  );
  const fieldRewriteCost = estimateOpenRouterCost(
    selectedAnalysisModel,
    fieldRewriteInputTokens,
    fieldRewriteOutputTokens,
  );
  const fieldShortenCost = estimateOpenRouterCost(
    selectedAnalysisModel,
    fieldShortenInputTokens,
    fieldShortenOutputTokens,
  );
  const fieldTranslateCost = estimateOpenRouterCost(
    selectedAnalysisModel,
    fieldTranslateInputTokens,
    fieldTranslateOutputTokens,
  );
  const lines: AnalysisCostLine[] = [
    {
      label: "CV scoring (section or full CV)",
      inputTokens: analysisInputTokens,
      outputTokens: analysisOutputTokens,
      cost: analysisCost,
    },
    {
      label: "Professional Rewrite (one field)",
      inputTokens: fieldRewriteInputTokens,
      outputTokens: fieldRewriteOutputTokens,
      cost: fieldRewriteCost,
    },
    {
      label: "Shorten field (one field)",
      inputTokens: fieldShortenInputTokens,
      outputTokens: fieldShortenOutputTokens,
      cost: fieldShortenCost,
    },
    {
      label: "Translate field (one field, one target language)",
      inputTokens: fieldTranslateInputTokens,
      outputTokens: fieldTranslateOutputTokens,
      cost: fieldTranslateCost,
    },
    {
      label: "Photo analysis (single image)",
      inputTokens: photoAnalysisInputTokens,
      outputTokens: photoAnalysisOutputTokens,
      cost: photoAnalysisCost,
    },
    {
      label: "Photo comparison (two images)",
      inputTokens: photoComparisonInputTokens,
      outputTokens: photoComparisonOutputTokens,
      cost: photoComparisonCost,
    },
  ];
  return {
    overhead,
    analysisInputTokens,
    analysisOutputTokens,
    photoAnalysisInputTokens,
    photoAnalysisOutputTokens,
    photoComparisonInputTokens,
    photoComparisonOutputTokens,
    fieldRewriteInputTokens,
    fieldRewriteOutputTokens,
    fieldShortenInputTokens,
    fieldShortenOutputTokens,
    fieldTranslateInputTokens,
    fieldTranslateOutputTokens,
    analysisCost,
    photoAnalysisCost,
    photoComparisonCost,
    fieldRewriteCost,
    fieldShortenCost,
    fieldTranslateCost,
    lines,
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