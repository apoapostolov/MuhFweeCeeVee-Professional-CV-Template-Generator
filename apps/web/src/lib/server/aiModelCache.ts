import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import type { AiModel } from "./aiProviderTypes";
import { repoPath } from "./repoPaths";

type AiModelCacheDocument = {
  fetchedAt: string;
  models: AiModel[];
};

const CACHE_DIR = repoPath("work", "ai-model-cache");
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cachePath(providerId: string): string {
  const safeId = providerId.replace(/[^A-Za-z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safeId}.yaml`);
}

export async function readAiModelCache(providerId: string): Promise<AiModelCacheDocument | null> {
  try {
    const value = parse(await fs.readFile(cachePath(providerId), "utf8")) as Record<string, unknown>;
    const models = Array.isArray(value?.models) ? value.models : [];
    return {
      fetchedAt: typeof value?.fetchedAt === "string" ? value.fetchedAt : "",
      models: models.filter((model): model is AiModel => Boolean(model && typeof model === "object")),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function isAiModelCacheFresh(cache: AiModelCacheDocument | null): boolean {
  if (!cache?.fetchedAt) return false;
  const fetchedAt = Date.parse(cache.fetchedAt);
  return Number.isFinite(fetchedAt) && Date.now() - fetchedAt < CACHE_MAX_AGE_MS;
}

export async function writeAiModelCache(providerId: string, models: AiModel[]): Promise<AiModelCacheDocument> {
  const cache = { fetchedAt: new Date().toISOString(), models } satisfies AiModelCacheDocument;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cachePath(providerId), stringify(cache), "utf8");
  return cache;
}
