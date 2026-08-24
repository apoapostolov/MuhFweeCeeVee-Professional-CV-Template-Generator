import { NextResponse } from "next/server";

import { getAtPath, setAtPath } from "@/components/composer/form-path-utils";
import { parseFieldPath } from "@/lib/field-path-key";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readCv, writeCv } from "@/lib/server/cvStore";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";
import {
  isDefinedLanguageCode,
  languageDisplayName,
  translateFieldText,
} from "@/lib/server/translateFieldText";
import {
  isSupportedLanguage,
  parseCvVariantIdLoose,
  resolveSiblingCvId,
} from "@/lib/server/cvVariants";

export const runtime = "nodejs";

type TranslateFieldRequest = {
  sourceCvId?: unknown;
  targetCvId?: unknown;
  targetLanguage?: unknown;
  sectionPath?: unknown;
  fieldPath?: unknown;
  text?: unknown;
  fieldLabel?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const payload = (await request.json()) as TranslateFieldRequest;
  const sourceCvId = typeof payload.sourceCvId === "string" ? payload.sourceCvId.trim() : "";
  const targetCvIdInput = typeof payload.targetCvId === "string" ? payload.targetCvId.trim() : "";
  const targetLanguageRaw =
    typeof payload.targetLanguage === "string" ? payload.targetLanguage.trim().toLowerCase() : "";
  const sectionPath = typeof payload.sectionPath === "string" ? payload.sectionPath.trim() : "";
  const fieldPathKey = typeof payload.fieldPath === "string" ? payload.fieldPath.trim() : "";
  const text = typeof payload.text === "string" ? payload.text : "";
  const fieldLabel = typeof payload.fieldLabel === "string" ? payload.fieldLabel : undefined;

  if (!sourceCvId) {
    return NextResponse.json({ error: "sourceCvId is required." }, { status: 400 });
  }
  if (!sectionPath) {
    return NextResponse.json({ error: "sectionPath is required." }, { status: 400 });
  }
  if (!fieldPathKey) {
    return NextResponse.json({ error: "fieldPath is required." }, { status: 400 });
  }
  if (!isSupportedLanguage(targetLanguageRaw) || !isDefinedLanguageCode(targetLanguageRaw)) {
    return NextResponse.json({ error: "targetLanguage is invalid." }, { status: 400 });
  }

  const parsed = parseCvVariantIdLoose(sourceCvId);
  if (!parsed?.language) {
    return NextResponse.json(
      { error: "sourceCvId is not a recognized CV variant id." },
      { status: 400 },
    );
  }
  if (parsed.language === targetLanguageRaw) {
    return NextResponse.json(
      { error: "targetLanguage must differ from the source CV language." },
      { status: 400 },
    );
  }

  let fieldSegments;
  try {
    fieldSegments = parseFieldPath(fieldPathKey);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "fieldPath is invalid." },
      { status: 400 },
    );
  }
  if (fieldSegments.length === 0) {
    return NextResponse.json({ error: "fieldPath is empty." }, { status: 400 });
  }

  const targetCvId =
    targetCvIdInput || resolveSiblingCvId(sourceCvId, targetLanguageRaw) || "";
  if (!targetCvId) {
    return NextResponse.json(
      { error: "Could not resolve target CV id for translation." },
      { status: 400 },
    );
  }

  const openRouterSettings = await readOpenRouterSettings();
  if (!openRouterSettings.apiKey.trim()) {
    return NextResponse.json({
      ok: true,
      sourceCvId,
      targetCvId,
      targetLanguage: targetLanguageRaw,
      skipped: true,
      message: "OpenRouter is not configured; translation skipped.",
    });
  }

  const [, targetCv] = await Promise.all([readCv(sourceCvId), readCv(targetCvId)]);
  if (!targetCv) {
    return NextResponse.json(
      {
        error: `Target CV '${targetCvId}' not found. Create the ${languageDisplayName(targetLanguageRaw)} variant first.`,
      },
      { status: 404 },
    );
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return NextResponse.json({
      ok: true,
      sourceCvId,
      targetCvId,
      targetLanguage: targetLanguageRaw,
      skipped: true,
      message: "Empty source text; translation skipped.",
    });
  }

  let translatedText: string;
  try {
    translatedText = await translateFieldText({
      text: trimmedText,
      sourceLanguage: parsed.language as string,
      targetLanguage: targetLanguageRaw,
      fieldLabel,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Field translation failed.",
      },
      { status: 502 },
    );
  }

  const targetRecord = targetCv as Record<string, unknown>;
  const sectionDraft = getAtPath(targetRecord, [sectionPath]);
  const nextSectionDraft = setAtPath(sectionDraft, fieldSegments, translatedText);
  const nextCv = setAtPath(targetRecord, [sectionPath], nextSectionDraft) as Record<string, unknown>;

  await writeCv(targetCvId, nextCv, { createSnapshot: false });

  return NextResponse.json({
    ok: true,
    sourceCvId,
    targetCvId,
    targetLanguage: targetLanguageRaw,
    targetLanguageLabel: languageDisplayName(targetLanguageRaw),
    translatedText,
  });
}