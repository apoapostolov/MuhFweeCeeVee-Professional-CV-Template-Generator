import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { repoPath } from "@/lib/server/repoPaths";

const CACHE_DIR = repoPath("data", "research", "cache");
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ResearchCacheEntry<T> = {
  key: string;
  savedAt: string;
  expiresAt: string;
  payload: T;
};

function cacheFilePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return path.join(CACHE_DIR, `${safe}.json`);
}

export function buildResearchCacheKey(parts: Record<string, unknown>): string {
  const normalized = JSON.stringify(parts, Object.keys(parts).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 40);
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function readResearchCache<T>(
  key: string,
): Promise<ResearchCacheEntry<T> | null> {
  try {
    const raw = await fs.readFile(cacheFilePath(key), "utf-8");
    const parsed = JSON.parse(raw) as ResearchCacheEntry<T>;
    if (!parsed?.expiresAt || Date.parse(parsed.expiresAt) < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeResearchCache<T>(
  key: string,
  payload: T,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  await ensureCacheDir();
  const now = Date.now();
  const entry: ResearchCacheEntry<T> = {
    key,
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    payload,
  };
  await fs.writeFile(cacheFilePath(key), `${JSON.stringify(entry, null, 2)}\n`, "utf-8");
}
