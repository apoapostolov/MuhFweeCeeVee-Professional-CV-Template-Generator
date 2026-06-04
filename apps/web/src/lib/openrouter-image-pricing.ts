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

/** Shorten catalog notes for settings labels (drop redundant "1K output" / "image"). */
export function compactImagePricingNote(note: string): string {
  return note
    .replace(/^1K output\s*/i, "")
    .replace(/~1K image/gi, "~1K")
    .replace(/image tokens/gi, "tokens")
    .replace(/\s+/g, " ")
    .trim();
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
  const noteSuffix = pricePerImageNote ? ` (${compactImagePricingNote(pricePerImageNote)})` : "";
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

/** One-line pricing for the settings “Selected … Model Pricing” panel. */
export function formatSelectedImageModelPricingLine(
  model: ImagePerUnitPricing & { isFree?: boolean },
): string {
  if (model.isFree) return "FREE model";
  const { pricePerImageUsd, pricePerImageMaxUsd, pricePerImageNote } = model;
  if (pricePerImageUsd === null) {
    return "Per-image pricing unavailable.";
  }
  const minLabel = formatUsdPerImage(pricePerImageUsd);
  if (
    pricePerImageMaxUsd !== null &&
    pricePerImageMaxUsd !== undefined &&
    pricePerImageMaxUsd > pricePerImageUsd
  ) {
    const maxLabel = formatUsdPerImage(pricePerImageMaxUsd);
    const noteSuffix = pricePerImageNote
      ? ` • ${compactImagePricingNote(pricePerImageNote)}`
      : "";
    return `From ${minLabel} per image • Up to ${maxLabel} per image${noteSuffix}`;
  }
  const noteSuffix = pricePerImageNote ? ` • ${compactImagePricingNote(pricePerImageNote)}` : "";
  return `${minLabel} per image${noteSuffix}`;
}

export function formatImageModelPricingBox(model: ImagePerUnitPricing & { isFree?: boolean }): string {
  return formatSelectedImageModelPricingLine(model);
}