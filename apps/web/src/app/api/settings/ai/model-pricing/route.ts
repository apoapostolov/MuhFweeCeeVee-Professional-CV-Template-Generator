import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import type { AiModelPricing } from "@/lib/server/aiProviderTypes";
import { fetchModelsDevPricing } from "@/lib/server/modelsDevPricing";

export const runtime = "nodejs";

type PricingRequest = {
  models?: unknown;
  refresh?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as PricingRequest;
    const models = Array.isArray(body.models)
      ? body.models.flatMap((model): Array<Pick<AiModelPricing, "providerId" | "modelId">> => {
        if (!model || typeof model !== "object") return [];
        const value = model as Record<string, unknown>;
        return typeof value.providerId === "string" && typeof value.modelId === "string" && value.modelId.trim()
          ? [{ providerId: value.providerId, modelId: value.modelId.trim() }]
          : [];
      })
      : [];
    if (models.length > 50) throw new Error("Too many models requested.");
    return NextResponse.json({ prices: await fetchModelsDevPricing(models, body.refresh === true) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load model pricing.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
