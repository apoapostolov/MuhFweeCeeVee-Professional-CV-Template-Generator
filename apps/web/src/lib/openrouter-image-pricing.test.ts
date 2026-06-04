import { describe, expect, it } from "vitest";

import {
  compactImagePricingNote,
  formatImagePriceLabel,
  formatSelectedImageModelPricingLine,
  formatUsdPerImage,
  imageModelOptionLabel,
} from "./openrouter-image-pricing";

describe("openrouter-image-pricing", () => {
  it("formats sub-dollar image prices with three decimals", () => {
    expect(formatUsdPerImage(0.039)).toBe("$0.039");
  });

  it("labels gemini 2.5 flash image per image not per 1M", () => {
    const label = imageModelOptionLabel({
      id: "google/gemini-2.5-flash-image",
      name: "Google: Nano Banana (Gemini 2.5 Flash Image)",
      isFree: false,
      pricePerImageUsd: 0.039,
      pricePerImageMaxUsd: null,
      mixedPricePer1M: 1.4,
      promptPricePer1M: 0.3,
      completionPricePer1M: 2.5,
    });
    expect(label).toContain("~$0.039/img");
    expect(label).not.toContain("/1M");
  });

  it("shows from-prefix when a max price exists", () => {
    expect(
      formatImagePriceLabel({
        pricePerImageUsd: 0.067,
        pricePerImageMaxUsd: 0.151,
      }),
    ).toBe("from $0.067/img");
  });

  it("formats selected image model pricing for settings panel", () => {
    expect(
      formatSelectedImageModelPricingLine({
        isFree: false,
        pricePerImageUsd: 0.039,
        pricePerImageMaxUsd: null,
      }),
    ).toBe("$0.039 per image");
  });

  it("compacts verbose image pricing notes", () => {
    expect(compactImagePricingNote("1K output (~1290 image tokens)")).toBe("(~1290 tokens)");
    expect(
      formatSelectedImageModelPricingLine({
        isFree: false,
        pricePerImageUsd: 0.039,
        pricePerImageNote: "1K output (~1290 image tokens)",
      }),
    ).toBe("$0.039 per image • (~1290 tokens)");
  });

  it("formats selected image model pricing with min and max", () => {
    expect(
      formatSelectedImageModelPricingLine({
        isFree: false,
        pricePerImageUsd: 0.067,
        pricePerImageMaxUsd: 0.151,
      }),
    ).toBe("From $0.067 per image • Up to $0.15 per image");
  });
});