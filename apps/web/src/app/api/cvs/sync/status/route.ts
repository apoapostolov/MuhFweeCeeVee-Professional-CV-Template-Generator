import { NextResponse } from "next/server";

import { readCv } from "@/lib/server/cvStore";
import { parseCvVariantId, siblingLanguage, type CvLanguage } from "@/lib/server/cvVariants";

export const runtime = "nodejs";

type StatusRequest = {
  cvId?: unknown;
  sourceLanguage?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

function buildMissingFragment(source: unknown, target: unknown): unknown {
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) return source;
    const out: unknown[] = [];
    let hasChanges = false;
    for (let index = 0; index < source.length; index += 1) {
      const sub = buildMissingFragment(source[index], target[index]);
      out[index] = sub;
      if (sub !== undefined) hasChanges = true;
    }
    return hasChanges ? out : undefined;
  }
  if (source && typeof source === "object") {
    if (!target || typeof target !== "object" || Array.isArray(target)) return source;
    const src = source as Record<string, unknown>;
    const tgt = target as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let hasChanges = false;
    for (const [key, value] of Object.entries(src)) {
      if (isMissing(tgt[key])) {
        if (!isMissing(value)) {
          out[key] = value;
          hasChanges = true;
        }
        continue;
      }
      const sub = buildMissingFragment(value, tgt[key]);
      if (sub !== undefined) {
        out[key] = sub;
        hasChanges = true;
      }
    }
    return hasChanges ? out : undefined;
  }
  if (isMissing(target) && !isMissing(source)) return source;
  return undefined;
}

function collectChangedLeafPaths(fragment: unknown, basePath = ""): string[] {
  if (fragment === undefined) return [];
  if (Array.isArray(fragment)) {
    const paths: string[] = [];
    for (let index = 0; index < fragment.length; index += 1) {
      const child = fragment[index];
      if (child === undefined) continue;
      const childPath = basePath ? `${basePath}.${index}` : String(index);
      paths.push(...collectChangedLeafPaths(child, childPath));
    }
    return paths;
  }
  if (fragment && typeof fragment === "object") {
    const entries = Object.entries(fragment as Record<string, unknown>);
    if (entries.length === 0) return basePath ? [basePath] : [];
    return entries.flatMap(([key, value]) => {
      const childPath = basePath ? `${basePath}.${key}` : key;
      return collectChangedLeafPaths(value, childPath);
    });
  }
  return basePath ? [basePath] : [];
}

function resolveLastEditedAt(cv: unknown): string {
  const meta = asRecord(asRecord(cv)?.metadata);
  const value =
    (typeof meta?.last_edited_at === "string" && meta.last_edited_at) ||
    (typeof meta?.updated_at === "string" && meta.updated_at) ||
    "";
  return value;
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as StatusRequest;
  const cvId = typeof payload.cvId === "string" ? payload.cvId.trim() : "";
  if (!cvId) {
    return NextResponse.json({ error: "cvId is required." }, { status: 400 });
  }

  const parsed = parseCvVariantId(cvId);
  if (!parsed) {
    return NextResponse.json(
      { error: "cvId must be a language variant id: cv_<bg|en>_<iter>_<target>." },
      { status: 400 },
    );
  }

  const sourceLanguage: CvLanguage =
    payload.sourceLanguage === "bg" || payload.sourceLanguage === "en"
      ? payload.sourceLanguage
      : parsed.language;
  const targetLanguage = siblingLanguage(sourceLanguage);

  const sourceCvId = `cv_${sourceLanguage}_${parsed.iteration}_${parsed.target}`;
  const targetCvId = `cv_${targetLanguage}_${parsed.iteration}_${parsed.target}`;
  const [sourceCv, targetCv] = await Promise.all([readCv(sourceCvId), readCv(targetCvId)]);
  if (!sourceCv || !targetCv) {
    return NextResponse.json(
      { error: "Source or target language variant not found.", sourceCvId, targetCvId },
      { status: 404 },
    );
  }

  const fragment = buildMissingFragment(sourceCv, targetCv);
  const missingFieldPaths = fragment ? [...new Set(collectChangedLeafPaths(fragment))].sort((a, b) => a.localeCompare(b)) : [];
  const sourceLastEditedAt = resolveLastEditedAt(sourceCv);
  const targetLastEditedAt = resolveLastEditedAt(targetCv);
  const timestampsDiffer =
    sourceLastEditedAt.length > 0 &&
    targetLastEditedAt.length > 0 &&
    sourceLastEditedAt !== targetLastEditedAt;

  return NextResponse.json({
    ok: true,
    sourceCvId,
    targetCvId,
    sourceLanguage,
    targetLanguage,
    sourceLastEditedAt,
    targetLastEditedAt,
    timestampsDiffer,
    hasMissingFields: missingFieldPaths.length > 0,
    missingFieldCount: missingFieldPaths.length,
    missingFieldPaths,
    canSync: missingFieldPaths.length > 0 || timestampsDiffer,
  });
}
