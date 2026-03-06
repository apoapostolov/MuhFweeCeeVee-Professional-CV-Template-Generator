import { NextResponse } from "next/server";

import { readCv, writeCv } from "@/lib/server/cvStore";
import {
  isSupportedLanguage,
  parseCvVariantId,
  type CvLanguage,
} from "@/lib/server/cvVariants";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";

export const runtime = "nodejs";

type SyncRequest = {
  cvId?: unknown;
  sourceLanguage?: unknown;
  targetLanguage?: unknown;
};

type SyncChangeItem = {
  path: string;
  direction: string;
  sourceLanguage: CvLanguage;
  targetLanguage: CvLanguage;
  sourceValue: unknown;
  previousTargetValue: unknown;
  nextTargetValue: unknown;
};

function languageName(language: CvLanguage): string {
  return language.toUpperCase();
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildMissingFragment(source: unknown, target: unknown): unknown {
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) {
      return source;
    }
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
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      return source;
    }
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

  if (isMissing(target) && !isMissing(source)) {
    return source;
  }
  return undefined;
}

function mergeMissing(target: unknown, fragment: unknown): unknown {
  if (fragment === undefined) {
    return target;
  }
  if (Array.isArray(fragment)) {
    const base = Array.isArray(target) ? [...target] : [];
    for (let index = 0; index < fragment.length; index += 1) {
      const value = fragment[index];
      if (value === undefined) continue;
      base[index] = mergeMissing(base[index], value);
    }
    return base;
  }
  if (fragment && typeof fragment === "object") {
    const base =
      target && typeof target === "object" && !Array.isArray(target)
        ? { ...(target as Record<string, unknown>) }
        : {};
    for (const [key, value] of Object.entries(fragment as Record<string, unknown>)) {
      base[key] = mergeMissing(base[key], value);
    }
    return base;
  }
  return target === undefined || target === null ? fragment : target;
}

function getByPath(input: unknown, path: string): unknown {
  if (!path) return input;
  return path.split(".").reduce<unknown>((cursor, segment) => {
    if (cursor === null || cursor === undefined) return undefined;
    if (Array.isArray(cursor)) {
      const idx = Number(segment);
      if (!Number.isInteger(idx)) return undefined;
      return cursor[idx];
    }
    if (typeof cursor !== "object") return undefined;
    return (cursor as Record<string, unknown>)[segment];
  }, input);
}

function collectChangedLeafPaths(fragment: unknown, basePath = ""): string[] {
  if (fragment === undefined) {
    return [];
  }
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
    if (entries.length === 0) {
      return basePath ? [basePath] : [];
    }
    const paths: string[] = [];
    for (const [key, value] of entries) {
      const childPath = basePath ? `${basePath}.${key}` : key;
      paths.push(...collectChangedLeafPaths(value, childPath));
    }
    return paths;
  }
  return basePath ? [basePath] : [];
}

function buildSyncChanges(args: {
  sourceCv: unknown;
  targetCvBefore: unknown;
  translatedFragment: unknown;
  sourceLanguage: CvLanguage;
  targetLanguage: CvLanguage;
}): SyncChangeItem[] {
  const direction: SyncChangeItem["direction"] =
    `${args.sourceLanguage.toUpperCase()} -> ${args.targetLanguage.toUpperCase()}`;
  const paths = collectChangedLeafPaths(args.translatedFragment);
  const uniquePaths = [...new Set(paths)].sort((a, b) => a.localeCompare(b));

  return uniquePaths
    .map((path) => {
      const sourceValue = getByPath(args.sourceCv, path);
      const previousTargetValue = getByPath(args.targetCvBefore, path);
      const nextTargetValue = getByPath(args.translatedFragment, path);
      const before = JSON.stringify(previousTargetValue);
      const after = JSON.stringify(nextTargetValue);
      if (before === after) {
        return null;
      }
      return {
        path,
        direction,
        sourceLanguage: args.sourceLanguage,
        targetLanguage: args.targetLanguage,
        sourceValue,
        previousTargetValue,
        nextTargetValue,
      } satisfies SyncChangeItem;
    })
    .filter((item): item is SyncChangeItem => Boolean(item));
}

function extractFirstJsonBlock(input: string): unknown {
  const trimmed = input.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // no-op
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // no-op
    }
  }
  return null;
}

async function translateFragment(
  fragment: unknown,
  sourceLanguage: CvLanguage,
  targetLanguage: CvLanguage,
): Promise<unknown> {
  const settings = await readOpenRouterSettings();
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const prompt = [
    "Translate string values in this JSON object from source language to target language.",
    "Preserve object keys, structure, arrays, booleans, numbers, dates, ids, and emails exactly.",
    "Translate only user-facing text strings.",
    "Return JSON only.",
    `Source language: ${languageName(sourceLanguage)}`,
    `Target language: ${languageName(targetLanguage)}`,
    `JSON:\n${JSON.stringify(fragment, null, 2)}`,
  ].join("\n");

  const response = await fetch(settings.baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a strict JSON translator." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${raw}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractFirstJsonBlock(content);
  if (!parsed) {
    throw new Error("Could not parse translated JSON from OpenRouter response.");
  }
  return parsed;
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as SyncRequest;
  const cvId = typeof payload.cvId === "string" ? payload.cvId.trim() : "";
  if (!cvId) {
    return NextResponse.json({ error: "cvId is required." }, { status: 400 });
  }

  const parsed = parseCvVariantId(cvId);
  if (!parsed) {
    return NextResponse.json(
      { error: "cvId must be a language variant id: cv_<language>_<iter>_<target>." },
      { status: 400 },
    );
  }

  const sourceLanguageRaw =
    typeof payload.sourceLanguage === "string" ? payload.sourceLanguage.trim().toLowerCase() : parsed.language;
  const targetLanguageRaw =
    typeof payload.targetLanguage === "string" ? payload.targetLanguage.trim().toLowerCase() : "";
  if (!isSupportedLanguage(sourceLanguageRaw)) {
    return NextResponse.json({ error: "sourceLanguage is invalid." }, { status: 400 });
  }
  if (!isSupportedLanguage(targetLanguageRaw)) {
    return NextResponse.json({ error: "targetLanguage is invalid." }, { status: 400 });
  }
  if (sourceLanguageRaw === targetLanguageRaw) {
    return NextResponse.json(
      { error: "sourceLanguage and targetLanguage must be different." },
      { status: 400 },
    );
  }
  const sourceLanguage = sourceLanguageRaw;
  const targetLanguage = targetLanguageRaw;

  const sourceCvId = `cv_${sourceLanguage}_${parsed.iteration}_${parsed.target}`;
  const targetCvId = `cv_${targetLanguage}_${parsed.iteration}_${parsed.target}`;
  const [sourceCv, targetCvRaw] = await Promise.all([readCv(sourceCvId), readCv(targetCvId)]);
  if (!sourceCv) {
    return NextResponse.json({ error: `Source CV '${sourceCvId}' not found.` }, { status: 404 });
  }
  if (!targetCvRaw) {
    return NextResponse.json({ error: `Target CV '${targetCvId}' not found.` }, { status: 404 });
  }

  const targetCv = deepClone(targetCvRaw);
  const fragment = buildMissingFragment(sourceCv, targetCv);
  if (!fragment) {
    return NextResponse.json({
      ok: true,
      sourceCvId,
      targetCvId,
      changed: false,
      message: "No missing fields found.",
    });
  }

  let translated: unknown;
  try {
    translated = await translateFragment(fragment, sourceLanguage, targetLanguage);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Translation failed.",
        sourceCvId,
        targetCvId,
      },
      { status: 502 },
    );
  }

  const merged = mergeMissing(targetCv, translated) as Record<string, unknown>;
  await writeCv(targetCvId, merged, { createSnapshot: true });
  const changes = buildSyncChanges({
    sourceCv,
    targetCvBefore: targetCvRaw,
    translatedFragment: translated,
    sourceLanguage,
    targetLanguage,
  });

  return NextResponse.json({
    ok: true,
    sourceCvId,
    targetCvId,
    changed: true,
    message: "Missing fields synced and translated.",
    direction: `${sourceLanguage.toUpperCase()} -> ${targetLanguage.toUpperCase()}`,
    changes,
    changedFields: changes.length,
  });
}
