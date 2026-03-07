import fs from "node:fs/promises";

import { repoPath } from "@/lib/server/repoPaths";

export type StoredPhotoAnalysis = {
  score: number;
  verdict: "excellent" | "good" | "usable" | "weak";
  notes: string[];
  clothingProposals?: string[];
  analyzedAt: string;
  model: string;
};

type PhotoAnalysisStore = {
  version: 1;
  photos: Record<string, { history: StoredPhotoAnalysis[] }>;
};

const PHOTOS_DIR = repoPath("photos");
const STORE_PATH = repoPath("photos", "metadata.json");

async function ensurePhotosDir(): Promise<void> {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
}

function normalizePhotoId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "");
}

function normalizeStoredAnalysis(input: unknown): StoredPhotoAnalysis | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const scoreRaw = Number(record.score ?? 0);
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0;
  const verdictRaw = String(record.verdict ?? "").trim().toLowerCase();
  const verdict =
    verdictRaw === "excellent" || verdictRaw === "good" || verdictRaw === "usable" || verdictRaw === "weak"
      ? verdictRaw
      : "usable";
  const notes = Array.isArray(record.notes)
    ? record.notes
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 8)
    : [];
  const clothingProposals = Array.isArray(record.clothingProposals)
    ? record.clothingProposals
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 8)
    : [];
  const analyzedAtRaw = String(record.analyzedAt ?? "").trim();
  const analyzedAt = analyzedAtRaw || new Date().toISOString();
  const model = String(record.model ?? "").trim() || "unknown";
  return { score, verdict, notes, clothingProposals, analyzedAt, model };
}

async function readStore(): Promise<PhotoAnalysisStore> {
  await ensurePhotosDir();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { version: 1, photos: {} };
    }
    const record = parsed as Record<string, unknown>;
    const photosRaw = record.photos;
    const photos: PhotoAnalysisStore["photos"] = {};
    if (photosRaw && typeof photosRaw === "object" && !Array.isArray(photosRaw)) {
      for (const [id, value] of Object.entries(photosRaw as Record<string, unknown>)) {
        const safeId = normalizePhotoId(id);
        if (!safeId) continue;
        const valueRecord =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null;
        const historyRaw = Array.isArray(valueRecord?.history) ? valueRecord.history : [];
        const history = historyRaw
          .map((entry) => normalizeStoredAnalysis(entry))
          .filter((entry): entry is StoredPhotoAnalysis => entry !== null);
        photos[safeId] = { history };
      }
    }
    return { version: 1, photos };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, photos: {} };
    }
    return { version: 1, photos: {} };
  }
}

async function writeStore(store: PhotoAnalysisStore): Promise<void> {
  await ensurePhotosDir();
  const json = JSON.stringify(store, null, 2);
  const tempPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tempPath, json, "utf-8");
  await fs.rename(tempPath, STORE_PATH);
}

export async function getPhotoAnalysisHistory(photoId: string): Promise<StoredPhotoAnalysis[]> {
  const safeId = normalizePhotoId(photoId);
  if (!safeId) return [];
  const store = await readStore();
  const history = store.photos[safeId]?.history ?? [];
  return [...history].sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt));
}

export async function appendPhotoAnalysis(
  photoId: string,
  analysis: StoredPhotoAnalysis,
): Promise<StoredPhotoAnalysis[]> {
  const safeId = normalizePhotoId(photoId);
  if (!safeId) return [];
  const normalized = normalizeStoredAnalysis(analysis);
  if (!normalized) return [];
  const store = await readStore();
  const current = store.photos[safeId]?.history ?? [];
  const next = [normalized, ...current].slice(0, 50);
  store.photos[safeId] = { history: next };
  await writeStore(store);
  return next;
}

export async function removePhotoAnalysisHistory(photoId: string): Promise<void> {
  const safeId = normalizePhotoId(photoId);
  if (!safeId) return;
  const store = await readStore();
  if (!store.photos[safeId]) return;
  delete store.photos[safeId];
  await writeStore(store);
}
