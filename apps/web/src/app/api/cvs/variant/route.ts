import { NextResponse } from "next/server";

import { isSupportedLanguage } from "@/lib/server/cvVariants";
import { ensureLanguageVariant } from "@/lib/server/cvStore";

export const runtime = "nodejs";

type CreateVariantRequest = {
  sourceCvId?: unknown;
  targetLanguage?: unknown;
  aiTranslate?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as CreateVariantRequest;

  const sourceCvId =
    typeof payload.sourceCvId === "string" ? payload.sourceCvId.trim() : "";
  const targetLanguageRaw =
    typeof payload.targetLanguage === "string" ? payload.targetLanguage.trim().toLowerCase() : "";
  const aiTranslate = payload.aiTranslate === true;

  if (!sourceCvId) {
    return NextResponse.json({ error: "sourceCvId is required." }, { status: 400 });
  }
  if (!targetLanguageRaw || !isSupportedLanguage(targetLanguageRaw)) {
    return NextResponse.json(
      { error: "targetLanguage must be a 2-8 letter language code." },
      { status: 400 },
    );
  }

  try {
    const result = await ensureLanguageVariant(sourceCvId, targetLanguageRaw, {
      autoTranslate: aiTranslate,
    });
    return NextResponse.json({
      ok: true,
      cvId: result.cvId,
      created: result.created,
      aiTranslate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create language variant.";
    const status = /does not exist|not exist|not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
