export type ImagePerUnitPricing = {
  pricePerImageUsd: number | null;
  pricePerImageMaxUsd?: number | null;
  pricePerImageNote?: string | null;
};

export function formatUsdPerImage(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
}

export function formatImagePriceLabel(pricing: ImagePerUnitPricing): string | null {
  const { pricePerImageUsd, pricePerImageMaxUsd, pricePerImageNote } = pricing;
  if (pricePerImageUsd === null) return null;
  const minLabel = formatUsdPerImage(pricePerImageUsd);
  if (
    pricePerImageMaxUsd !== null &&
    pricePerImageMaxUsd !== undefined &&
    pricePerImageMaxUsd > pricePerImageUsd
  ) {
    return `from ${minLabel}/img`;
  }
  const noteSuffix = pricePerImageNote ? ` (${pricePerImageNote})` : "";
  return `~${minLabel}/img${noteSuffix}`;
}

export function imageModelOptionLabel(model: {
  id: string;
  name: string;
  isFree: boolean;
  pricePerImageUsd?: number | null;
  pricePerImageMaxUsd?: number | null;
  mixedPricePer1M?: number | null;
  promptPricePer1M?: number | null;
  completionPricePer1M?: number | null;
}): string {
  const labelName = model.name || model.id;
  if (model.isFree) return `${labelName} FREE`;

  const perImage = formatImagePriceLabel({
    pricePerImageUsd: model.pricePerImageUsd ?? null,
    pricePerImageMaxUsd: model.pricePerImageMaxUsd ?? null,
  });
  if (perImage) {
    const short = perImage.replace(/\s*\([^)]*\)/, "");
    return `${labelName} • ${short}`;
  }

  const mixed = model.mixedPricePer1M ?? model.promptPricePer1M ?? model.completionPricePer1M ?? null;
  const mixedLabel = mixed !== null ? `avg $${mixed.toFixed(2)}/1M` : "pricing N/A";
  return `${labelName} • ${mixedLabel}`;
}

export function formatImageModelPricingBox(model: ImagePerUnitPricing & { isFree?: boolean }): string {
  if (model.isFree) return "FREE model";
  const label = formatImagePriceLabel(model);
  if (label) return label.replace(/^~/, "Approx. ").replace("/img", " per image");
  return "Per-image pricing unavailable — see OpenRouter model page.";
}