import fs from "node:fs/promises";

import { parse } from "yaml";

import { repoPath } from "./repoPaths";

export type ImagePricingEntry = {
  usdPerImage: number | null;
  usdPerImageMax?: number | null;
  note?: string;
  noteMax?: string;
  source?: string;
};

export type ImagePricingCatalog = {
  updatedAt: string;
  models: Record<string, ImagePricingEntry>;
};

const PRICING_FILE = repoPath("data", "settings", "openrouter_image_pricing.yaml");

let cachedCatalog: ImagePricingCatalog | null = null;

function parseEntry(raw: unknown): ImagePricingEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (!("usdPerImage" in record)) return null;
  const usdPerImage =
    record.usdPerImage === null
      ? null
      : typeof record.usdPerImage === "number" && Number.isFinite(record.usdPerImage)
        ? record.usdPerImage
        : null;
  const usdPerImageMax =
    typeof record.usdPerImageMax === "number" && Number.isFinite(record.usdPerImageMax)
      ? record.usdPerImageMax
      : undefined;
  return {
    usdPerImage,
    usdPerImageMax,
    note: typeof record.note === "string" ? record.note : undefined,
    noteMax: typeof record.noteMax === "string" ? record.noteMax : undefined,
    source: typeof record.source === "string" ? record.source : undefined,
  };
}

export async function loadOpenRouterImagePricingCatalog(): Promise<ImagePricingCatalog> {
  if (cachedCatalog) return cachedCatalog;

  try {
    const raw = await fs.readFile(PRICING_FILE, "utf-8");
    const parsed = parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      cachedCatalog = { updatedAt: "", models: {} };
      return cachedCatalog;
    }
    const record = parsed as Record<string, unknown>;
    const modelsRaw = record.models;
    const models: Record<string, ImagePricingEntry> = {};
    if (modelsRaw && typeof modelsRaw === "object" && !Array.isArray(modelsRaw)) {
      for (const [id, entry] of Object.entries(modelsRaw)) {
        const parsedEntry = parseEntry(entry);
        if (parsedEntry) models[id] = parsedEntry;
      }
    }
    cachedCatalog = {
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
      models,
    };
    return cachedCatalog;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      cachedCatalog = { updatedAt: "", models: {} };
      return cachedCatalog;
    }
    throw error;
  }
}

export function lookupImagePricing(
  catalog: ImagePricingCatalog,
  modelId: string,
): ImagePricingEntry | null {
  return catalog.models[modelId] ?? null;
}

/** Clear cache (tests). */
export function resetOpenRouterImagePricingCache(): void {
  cachedCatalog = null;
}