import { NextResponse } from "next/server";

import { getAtPath, setAtPath } from "@/components/composer/form-path-utils";
import { parseFieldPath } from "@/lib/field-path-key";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readCv, writeCv } from "@/lib/server/cvStore";
import {
  isDefinedLanguageCode,
  languageDisplayName,
  translateFieldText,
} from "@/lib/server/translateFieldText";
import {
  buildCvVariantId,
  isSupportedLanguage,
  parseCvVariantId,
} from "@/lib/server/cvVariants";

export const runtime = "nodejs";

type TranslateFieldRequest = {
  sourceCvId?: unknown;
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

  const parsed = parseCvVariantId(sourceCvId);
  if (!parsed) {
    return NextResponse.json(
      { error: "sourceCvId must be a language variant id: cv_<language>_<iter>_<target>." },
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

  const targetCvId = buildCvVariantId({
    language: targetLanguageRaw,
    iteration: parsed.iteration,
    target: parsed.target,
  });

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
      sourceLanguage: parsed.language,
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