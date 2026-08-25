import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse, stringify } from "yaml";
import { withCvReviewScoreDefaults } from "@muhfweeceevee/schemas";

import { repoPath } from "./repoPaths";
import {
  buildCvProfileVariantId,
  buildCvVariantIdLoose,
  isSupportedLanguage,
  parseCvProfileVariantId,
  parseCvVariantIdLoose,
  type CvLanguage,
} from "./cvVariants";
import { completeAiText } from "./aiProviderCompletion";

export type CvDocument = Record<string, unknown>;
export type CvGitVersionInfo = {
  tracked: boolean;
  commitCount: number;
  lastCommitHash: string | null;
  lastCommitAt: string | null;
};

export type CvVariantInfo = {
  id: string;
  language: CvLanguage | null;
  iteration: string | null;
  target: string | null;
  displayName: string;
  displayVersion: string;
  lastUpdatedAt: string | null;
  git: CvGitVersionInfo;
};

const CVS_DIR = repoPath("data", "cvs");
const HISTORY_DIR = path.join(CVS_DIR, "history");
const execFileAsync = promisify(execFile);

function assertValidCvId(cvId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/.test(cvId)) {
    throw new Error(
      "Invalid cvId. Use 2-80 chars: letters, numbers, underscore, hyphen.",
    );
  }
}

function cvPath(cvId: string): string {
  return path.join(CVS_DIR, `${cvId}.yaml`);
}

function cvHistoryPath(cvId: string): string {
  return path.join(HISTORY_DIR, cvId);
}

async function ensureCvDir(): Promise<void> {
  await fs.mkdir(CVS_DIR, { recursive: true });
}

function readMetadataVariantBlock(
  metadata: Record<string, unknown> | null,
): { iteration: string | null; target: string | null; language: string | null } {
  const variant =
    metadata?.variant && typeof metadata.variant === "object" && !Array.isArray(metadata.variant)
      ? (metadata.variant as Record<string, unknown>)
      : null;
  const iteration =
    typeof variant?.iteration === "string" && variant.iteration.trim().length > 0
      ? variant.iteration.trim()
      : null;
  const target =
    typeof variant?.target === "string" && variant.target.trim().length > 0
      ? variant.target.trim().toLowerCase()
      : null;
  const language =
    typeof variant?.language === "string" && variant.language.trim().length > 0
      ? variant.language.trim().toLowerCase()
      : null;
  return { iteration, target, language };
}

function metadataTimestamp(metadata: Record<string, unknown> | null): string | null {
  for (const key of ["updated_at", "last_edited_at", "updated_on"]) {
    const value = metadata?.[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  }
  return null;
}

function compareSemanticVersions(left: string, right: string): number {
  const parseVersion = (value: string): number[] => {
    const match = value.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
    return match ? [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)] : [0, 0, 0];
  };
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

export function compareCvVariantInfo(a: CvVariantInfo, b: CvVariantInfo): number {
  const aUpdated = a.lastUpdatedAt ? Date.parse(a.lastUpdatedAt) : NaN;
  const bUpdated = b.lastUpdatedAt ? Date.parse(b.lastUpdatedAt) : NaN;
  const aHasUpdated = Number.isFinite(aUpdated);
  const bHasUpdated = Number.isFinite(bUpdated);
  if (aHasUpdated !== bHasUpdated) return aHasUpdated ? -1 : 1;
  if (aHasUpdated && aUpdated !== bUpdated) return bUpdated - aUpdated;

  const nameOrder = a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: "base" });
  if (nameOrder !== 0) return nameOrder;
  const versionOrder = compareSemanticVersions(b.displayVersion, a.displayVersion);
  if (versionOrder !== 0) return versionOrder;
  return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
}

function withUpdatedMetadata(input: CvDocument): CvDocument {
  const nowIso = new Date().toISOString();
  const nowDate = nowIso.slice(0, 10);
  const metadataRaw = input.metadata;
  const metadata =
    metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
      ? (metadataRaw as Record<string, unknown>)
      : {};
  const reviewMetadata = withCvReviewScoreDefaults(metadata);

  const cvId = String(input.id ?? "");
  const profile = parseCvProfileVariantId(cvId);
  const parsed = parseCvVariantIdLoose(cvId);
  const inferred = parsed ?? null;
  const variantMeta = readMetadataVariantBlock(metadata);

  return {
    ...input,
    metadata: {
      ...reviewMetadata,
      language:
        (inferred?.language as string | undefined) ??
        (metadata.language as string | undefined) ??
        "bg",
      variant:
        profile
          ? {
              cv_id: buildCvProfileVariantId(profile),
              iteration: profile.iteration,
              target: variantMeta.target ?? inferred?.target ?? "",
              language: profile.language,
            }
          : inferred
            ? {
                cv_id: buildCvVariantIdLoose(inferred),
                iteration: inferred.iteration,
                target: inferred.target,
                language: inferred.language,
              }
            : (metadata.variant as Record<string, unknown> | undefined),
      created_at: (metadata.created_at as string | undefined) ?? nowDate,
      updated_at: nowIso,
      updated_on: (metadata.updated_on as string | undefined) ?? nowDate,
      last_edited_at: nowIso,
    },
  };
}

export async function listCvIds(): Promise<string[]> {
  await ensureCvDir();
  const entries = await fs.readdir(CVS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name.replace(/\.yaml$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

async function gitVersionInfo(cvId: string): Promise<CvGitVersionInfo> {
  const root = repoPath();
  const rel = path.relative(root, cvPath(cvId));
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--follow", "--format=%H|%cI", "--", rel],
      { cwd: root },
    );
    const lines = stdout
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return {
        tracked: false,
        commitCount: 0,
        lastCommitHash: null,
        lastCommitAt: null,
      };
    }

    const [lastHash = null, lastAt = null] = lines[0].split("|");
    return {
      tracked: true,
      commitCount: lines.length,
      lastCommitHash: lastHash,
      lastCommitAt: lastAt,
    };
  } catch {
    return {
      tracked: false,
      commitCount: 0,
      lastCommitHash: null,
      lastCommitAt: null,
    };
  }
}

export async function listCvVariants(): Promise<CvVariantInfo[]> {
  const ids = await listCvIds();
  const variants = await Promise.all(
    ids.map(async (id) => {
      const parsed = parseCvVariantIdLoose(id);
      const doc = await readCv(id);
      const metadata =
        doc?.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
          ? (doc.metadata as Record<string, unknown>)
          : null;
      const metadataLanguage =
        typeof metadata?.language === "string" ? metadata.language.trim().toLowerCase() : "";
      const variantMeta = readMetadataVariantBlock(metadata);
      const parsedTarget =
        parsed?.target && parsed.target.trim().length > 0 ? parsed.target.trim().toLowerCase() : null;
      const internalName =
        (typeof metadata?.internal_name === "string" && metadata.internal_name.trim()) || id;
      const internalVersion =
        (typeof metadata?.internal_version === "string" && metadata.internal_version.trim()) || "1.0";
      return {
        id,
        language:
          parsed?.language ??
          (isSupportedLanguage(metadataLanguage) ? metadataLanguage : null) ??
          (variantMeta.language && isSupportedLanguage(variantMeta.language) ? variantMeta.language : null),
        iteration: parsed?.iteration ?? variantMeta.iteration,
        target: parsedTarget ?? variantMeta.target,
        displayName: internalName,
        displayVersion: internalVersion,
        lastUpdatedAt: metadataTimestamp(metadata),
        git: await gitVersionInfo(id),
      };
    }),
  );
  return variants.sort(compareCvVariantInfo);
}

export async function readCv(cvId: string): Promise<CvDocument | null> {
  assertValidCvId(cvId);
  try {
    const content = await fs.readFile(cvPath(cvId), "utf-8");
    const parsed = parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`CV file ${cvId} is not a YAML object.`);
    }
    const document = parsed as CvDocument;
    const metadataRaw = document.metadata;
    const metadata =
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? (metadataRaw as Record<string, unknown>)
        : {};
    return {
      ...document,
      metadata: withCvReviewScoreDefaults(metadata),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeCv(
  cvId: string,
  payload: CvDocument,
  options?: { createSnapshot?: boolean },
): Promise<void> {
  assertValidCvId(cvId);
  await ensureCvDir();
  const destination = cvPath(cvId);

  if (options?.createSnapshot) {
    const current = await readCv(cvId);
    if (current) {
      const historyDirectory = cvHistoryPath(cvId);
      await fs.mkdir(historyDirectory, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const snapshotDestination = path.join(historyDirectory, `${timestamp}.yaml`);
      await fs.writeFile(snapshotDestination, stringify(current), "utf-8");
    }
  }

  const normalized = withUpdatedMetadata({
    ...payload,
    id: cvId,
  });
  // Atomic replace: avoid truncated YAML on concurrent saves / process crash mid-write.
  const tempPath = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, stringify(normalized), "utf-8");
  try {
    await fs.rename(tempPath, destination);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EPERM" && code !== "EEXIST" && code !== "ENOTEMPTY") {
      throw error;
    }
    // Windows cannot rename over an existing file. CopyFile replaces the
    // destination and keeps the previous document intact if the copy fails.
    await fs.copyFile(tempPath, destination);
    await fs.unlink(tempPath);
  }
}

export async function cloneCvVersion(sourceCvId: string, requestedName: string): Promise<{ cvId: string; displayName: string; displayVersion: string }> {
  const source = await readCv(sourceCvId);
  if (!source) throw new Error(`Source CV '${sourceCvId}' does not exist.`);
  const name = requestedName.trim();
  if (!name) throw new Error("A new CV name is required.");
  const parsed = parseCvVariantIdLoose(sourceCvId);
  if (!parsed) throw new Error("The selected CV has no supported variant id.");
  const ids = await listCvIds();
  const matching = ids.map((id) => parseCvVariantIdLoose(id)).filter((item): item is NonNullable<typeof item> => {
    return item !== null && item.language === parsed.language && item.target === parsed.target;
  });
  const nextIteration = String(Math.max(0, ...matching.map((item) => Number(item.iteration) || 0)) + 1).padStart(3, "0");
  const cvId = buildCvVariantIdLoose({ language: parsed.language, iteration: nextIteration, target: parsed.target });
  const metadataRaw = source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? source.metadata as Record<string, unknown> : {};
  const previousVersion = typeof metadataRaw.internal_version === "string" ? Number(metadataRaw.internal_version) : NaN;
  const displayVersion = Number.isFinite(previousVersion) ? (previousVersion + 0.1).toFixed(1) : nextIteration;
  await writeCv(cvId, {
    ...cloneCvDocument(source),
    metadata: { ...metadataRaw, internal_name: name, internal_version: displayVersion },
  });
  return { cvId, displayName: name, displayVersion };
}

export async function deleteCv(cvId: string): Promise<boolean> {
  assertValidCvId(cvId);
  try {
    await fs.unlink(cvPath(cvId));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function listCvSnapshots(cvId: string): Promise<string[]> {
  assertValidCvId(cvId);
  try {
    const entries = await fs.readdir(cvHistoryPath(cvId), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function cloneCvDocument(input: CvDocument): CvDocument {
  return JSON.parse(JSON.stringify(input)) as CvDocument;
}

function buildTranslationPrompt(
  sourceCv: CvDocument,
  sourceLanguage: string,
  targetLanguage: string,
): string {
  return [
    "Translate user-facing string values in this CV JSON object from source language to target language.",
    "Keep all keys, structure, ids, dates, numbers, booleans, urls and emails unchanged.",
    "Do not translate technical keys or enum-like values.",
    "Return JSON only.",
    `Source language code: ${sourceLanguage}`,
    `Target language code: ${targetLanguage}`,
    `JSON:\n${JSON.stringify(sourceCv, null, 2)}`,
  ].join("\n");
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

async function maybeTranslateCvDocument(args: {
  sourceCv: CvDocument;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<{ cv: CvDocument; status: string; mode: string }> {
  const completion = await completeAiText({
    role: "translation",
    messages: [
      { role: "system", content: "You are a strict JSON translator." },
      { role: "user", content: buildTranslationPrompt(args.sourceCv, args.sourceLanguage, args.targetLanguage) },
    ],
    temperature: 0.1,
    maxTokens: 16_000,
  });
  const translated = extractFirstJsonBlock(completion.text);
  if (!translated || typeof translated !== "object" || Array.isArray(translated)) {
    throw new Error("Could not parse translated CV JSON from the configured translation provider.");
  }

  return {
    cv: translated as CvDocument,
    status: "auto-generated-pending-review",
    mode: "configured-provider-json-translation",
  };
}

export async function ensureLanguageVariant(
  sourceCvId: string,
  targetLanguage: CvLanguage,
  options?: { autoTranslate?: boolean },
): Promise<{ cvId: string; created: boolean }> {
  const parsed = parseCvVariantIdLoose(sourceCvId);
  if (!parsed) {
    throw new Error(
      "Language variant auto-resolution requires cvId format cv_<language>_<target> or cv_<language>_<iteration>_<target>.",
    );
  }
  const normalizedTargetLanguage = targetLanguage.trim().toLowerCase();
  if (!isSupportedLanguage(normalizedTargetLanguage)) {
    throw new Error("Target language code is invalid. Use 2-8 alphabetic characters.");
  }

  const requestedCvId = buildCvVariantIdLoose({
    language: normalizedTargetLanguage,
    iteration: parsed.iteration,
    target: parsed.target,
  });

  const existing = await readCv(requestedCvId);
  if (existing) {
    return { cvId: requestedCvId, created: false };
  }

  if (!options?.autoTranslate) {
    throw new Error(`Variant '${requestedCvId}' does not exist.`);
  }

  const source = await readCv(sourceCvId);
  if (!source) {
    throw new Error(`Source CV '${sourceCvId}' does not exist.`);
  }

  let cloned = cloneCvDocument(source);
  let translationMode = "fallback-copy";
  let translationStatus = "auto-generated-pending-review";
  if (parsed.language !== normalizedTargetLanguage) {
    try {
      const translated = await maybeTranslateCvDocument({
        sourceCv: source,
        sourceLanguage: parsed.language,
        targetLanguage: normalizedTargetLanguage,
      });
      cloned = translated.cv;
      translationMode = translated.mode;
      translationStatus = translated.status;
    } catch (error) {
      cloned = cloneCvDocument(source);
      translationMode = "fallback-copy-translation-error";
      translationStatus = "auto-generated-pending-review";
      const metadataRaw = cloned.metadata;
      const metadata =
        metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
          ? (metadataRaw as Record<string, unknown>)
          : {};
      cloned.metadata = {
        ...metadata,
        translation_error: error instanceof Error ? error.message : "Unknown translation error.",
      };
    }
  }

  const sourceMetadata =
    source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
      ? (source.metadata as Record<string, unknown>)
      : {};
  const metadataRaw = cloned.metadata;
  const metadata =
    metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
      ? (metadataRaw as Record<string, unknown>)
      : {};

  cloned.metadata = {
    ...metadata,
    ...(typeof sourceMetadata.internal_name === "string" ? { internal_name: sourceMetadata.internal_name } : {}),
    ...(typeof sourceMetadata.internal_version === "string" ? { internal_version: sourceMetadata.internal_version } : {}),
    language: normalizedTargetLanguage,
    variant: {
      ...(metadata.variant && typeof metadata.variant === "object" && !Array.isArray(metadata.variant) ? metadata.variant as Record<string, unknown> : {}),
      cv_id: requestedCvId,
      iteration: parsed.iteration,
      target: parsed.target,
      language: normalizedTargetLanguage,
    },
    translation: {
      status: translationStatus,
      mode: translationMode,
      source_cv_id: sourceCvId,
      source_language: parsed.language,
      target_language: normalizedTargetLanguage,
      generated_at: new Date().toISOString(),
    },
  };

  await writeCv(requestedCvId, cloned, { createSnapshot: false });
  return { cvId: requestedCvId, created: true };
}

export async function getCvGitVersionInfo(cvId: string): Promise<CvGitVersionInfo> {
  return gitVersionInfo(cvId);
}
