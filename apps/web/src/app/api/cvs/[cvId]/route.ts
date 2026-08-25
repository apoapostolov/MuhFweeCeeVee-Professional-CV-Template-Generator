import { validateCvV1 } from "@muhfweeceevee/schemas";
import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";

import { analyzeCvCompatibility } from "@/lib/server/cvCompatibility";
import { isSupportedLanguage } from "@/lib/server/cvVariants";
import { clampPrintTextScale } from "@/lib/print-text-scale";
import {
  deleteCv,
  ensureLanguageVariant,
  getCvGitVersionInfo,
  readCv,
  writeCv,
} from "@/lib/server/cvStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ cvId: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { cvId: initialCvId } = await context.params;
  const url = new URL(request.url);
  const requestedLanguage = url.searchParams.get("language");
  // Side-effecting AI translation is not allowed on GET.
  // Use POST /api/cvs/variant with aiTranslate: true instead.
  if (url.searchParams.get("autoTranslate") === "true") {
    return NextResponse.json(
      {
        error:
          "autoTranslate is not supported on GET. Use POST /api/cvs/variant with aiTranslate: true.",
      },
      { status: 405 },
    );
  }

  let resolvedCvId = initialCvId;
  let variantCreated = false;
  if (requestedLanguage && isSupportedLanguage(requestedLanguage)) {
    try {
      const resolved = await ensureLanguageVariant(initialCvId, requestedLanguage, {
        autoTranslate: false,
      });
      resolvedCvId = resolved.cvId;
      variantCreated = resolved.created;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to resolve requested language variant.",
        },
        { status: 404 },
      );
    }
  }

  const cv = await readCv(resolvedCvId);
  if (!cv) {
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }

  const templateId = url.searchParams.get("templateId") ?? "europass-v1";
  const warnings = await analyzeCvCompatibility(resolvedCvId, cv, templateId);
  const git = await getCvGitVersionInfo(resolvedCvId);
  return NextResponse.json({
    cvId: resolvedCvId,
    requestedCvId: initialCvId,
    variantCreated,
    cv,
    warnings,
    git,
  });
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const { cvId } = await context.params;
  const body = (await request.json()) as { cv?: unknown };
  const validation = validateCvV1(body.cv);

  if (!validation.valid) {
    return NextResponse.json(
      { error: "cv payload failed validation.", issues: validation.issues },
      { status: 422 },
    );
  }

  try {
    await writeCv(cvId, body.cv as Record<string, unknown>, {
      createSnapshot: true,
    });
    return NextResponse.json({
      ok: true,
      cvId,
      git: await getCvGitVersionInfo(cvId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save CV.",
      },
      { status: 500 },
    );
  }
}

function normalizeTweakPatch(value: Record<string, unknown>): Record<string, unknown> {
  const patch = { ...value };
  for (const key of ["intelligentPagination", "removePhoto", "moveSkillsLeft", "sidebarTextScaleEnabled", "contentTextScaleEnabled"]) {
    if (key in patch) patch[key] = patch[key] === true || patch[key] === 1 || patch[key] === "1" || patch[key] === "true";
  }
  for (const key of ["sidebarTextScale", "contentTextScale"]) {
    if (key in patch) patch[key] = clampPrintTextScale(Number(patch[key]));
  }
  return patch;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { cvId } = await context.params;
  const body = (await request.json()) as {
    templateId?: unknown;
    language?: unknown;
    tweaks?: unknown;
  };
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  const language = typeof body.language === "string" ? body.language.trim().toLowerCase() : "";
  if (!templateId || !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(templateId) || !isSupportedLanguage(language)) {
    return NextResponse.json({ error: "templateId and supported language are required." }, { status: 400 });
  }
  if (!body.tweaks || typeof body.tweaks !== "object" || Array.isArray(body.tweaks)) {
    return NextResponse.json({ error: "tweaks must be an object." }, { status: 400 });
  }
  const cv = await readCv(cvId);
  if (!cv) return NextResponse.json({ error: "CV not found." }, { status: 404 });
  const metadata = cv.metadata && typeof cv.metadata === "object" && !Array.isArray(cv.metadata)
    ? cv.metadata as Record<string, unknown>
    : {};
  const currentPrintTweaks = metadata.print_tweaks && typeof metadata.print_tweaks === "object" && !Array.isArray(metadata.print_tweaks)
    ? metadata.print_tweaks as Record<string, unknown>
    : {};
  const currentScopes = currentPrintTweaks.scopes && typeof currentPrintTweaks.scopes === "object" && !Array.isArray(currentPrintTweaks.scopes)
    ? currentPrintTweaks.scopes as Record<string, unknown>
    : {};
  const currentTemplateScopes = currentScopes[templateId] && typeof currentScopes[templateId] === "object" && !Array.isArray(currentScopes[templateId])
    ? currentScopes[templateId] as Record<string, unknown>
    : {};
  const currentScope = currentTemplateScopes[language] && typeof currentTemplateScopes[language] === "object" && !Array.isArray(currentTemplateScopes[language])
    ? currentTemplateScopes[language] as Record<string, unknown>
    : {};
  const next = {
    ...currentScope,
    ...normalizeTweakPatch(body.tweaks as Record<string, unknown>),
  };
  await writeCv(cvId, {
    ...cv,
    metadata: {
      ...metadata,
      print_tweaks: {
        ...currentPrintTweaks,
        version: typeof currentPrintTweaks.version === "number" ? currentPrintTweaks.version : 1,
        scopes: {
          ...currentScopes,
          [templateId]: {
            ...currentTemplateScopes,
            [language]: next,
          },
        },
      },
    },
  }, { createSnapshot: false });
  return NextResponse.json({ ok: true, cvId, templateId, language, tweaks: next });
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const { cvId } = await context.params;
  const deleted = await deleteCv(cvId);
  if (!deleted) {
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, cvId });
}
