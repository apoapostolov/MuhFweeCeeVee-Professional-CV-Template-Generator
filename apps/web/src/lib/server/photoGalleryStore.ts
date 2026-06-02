import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { getPhotoAnalysisHistory, removePhotoAnalysisHistory } from "@/lib/server/photoAnalysisStore";
import { repoPath } from "@/lib/server/repoPaths";

export type PhotoBoothGalleryItem = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
  width: number;
  height: number;
  sizeBytes: number;
  analysis?: {
    score: number;
    verdict: "excellent" | "good" | "usable" | "weak";
    notes: string[];
    clothingProposals?: string[];
    analyzedAt: string;
    model: string;
  };
  analysisHistory?: Array<{
    score: number;
    verdict: "excellent" | "good" | "usable" | "weak";
    notes: string[];
    clothingProposals?: string[];
    analyzedAt: string;
    model: string;
  }>;
};

const PHOTOS_DIR = repoPath("photos");
const METADATA_FILE = "metadata.json";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

function normalizePhotoId(id: string): string {
  return path.basename(id).replace(/[^a-zA-Z0-9._-]/g, "");
}

function mimeTypeFromExtension(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
    default:
      return "image/jpeg";
  }
}

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

function sanitizeBaseName(fileName: string): string {
  const base = path.basename(fileName).replace(/\.[^.]+$/, "");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 80) : "photo";
}

function displayNameFromStoredId(storedId: string): string {
  const marker = "__";
  const index = storedId.indexOf(marker);
  if (index >= 0 && index < storedId.length - marker.length) {
    return storedId.slice(index + marker.length);
  }
  return storedId;
}

function buildStoredFileName(originalName: string, mimeType: string): string {
  const extFromName = path.extname(originalName).toLowerCase();
  const ext = ALLOWED_EXTENSIONS.has(extFromName) ? extFromName : extensionFromMimeType(mimeType);
  const id = `${crypto.randomUUID()}__${sanitizeBaseName(originalName)}${ext}`;
  return normalizePhotoId(id);
}

function readImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } {
  if (mimeType === "image/png" && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && buffer.length > 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return { width: 0, height: 0 };
}

async function ensurePhotosDir(): Promise<void> {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
}

async function bufferToDataUrl(filePath: string, mimeType: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function buildGalleryItem(fileName: string): Promise<PhotoBoothGalleryItem | null> {
  const id = normalizePhotoId(fileName);
  if (!id || id === METADATA_FILE) return null;
  const ext = path.extname(id).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;

  const filePath = path.join(PHOTOS_DIR, id);
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const mimeType = mimeTypeFromExtension(ext);
  const buffer = await fs.readFile(filePath);
  const { width, height } = readImageDimensions(buffer, mimeType);
  const history = await getPhotoAnalysisHistory(id);
  const analysis = history[0];

  return {
    id,
    name: displayNameFromStoredId(id),
    mimeType,
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    createdAt: stat.mtime.toISOString(),
    width,
    height,
    sizeBytes: stat.size,
    analysis: analysis
      ? {
          score: analysis.score,
          verdict: analysis.verdict,
          notes: analysis.notes,
          clothingProposals: analysis.clothingProposals,
          analyzedAt: analysis.analyzedAt,
          model: analysis.model,
        }
      : undefined,
    analysisHistory: history.map((entry) => ({
      score: entry.score,
      verdict: entry.verdict,
      notes: entry.notes,
      clothingProposals: entry.clothingProposals,
      analyzedAt: entry.analyzedAt,
      model: entry.model,
    })),
  };
}

export async function listPhotoBoothItems(): Promise<PhotoBoothGalleryItem[]> {
  await ensurePhotosDir();
  let entries: string[];
  try {
    entries = await fs.readdir(PHOTOS_DIR);
  } catch {
    return [];
  }

  const items = await Promise.all(entries.map((entry) => buildGalleryItem(entry)));
  return items
    .filter((item): item is PhotoBoothGalleryItem => item !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function addPhotoBoothFiles(
  files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
): Promise<PhotoBoothGalleryItem[]> {
  await ensurePhotosDir();
  const added: PhotoBoothGalleryItem[] = [];

  for (const file of files) {
    if (!file.mimeType.startsWith("image/")) continue;
    if (file.buffer.length === 0 || file.buffer.length > MAX_UPLOAD_BYTES) continue;

    const storedId = buildStoredFileName(file.name, file.mimeType);
    const filePath = path.join(PHOTOS_DIR, storedId);
    await fs.writeFile(filePath, file.buffer);

    const item = await buildGalleryItem(storedId);
    if (item) added.push(item);
  }

  return added;
}

export async function removePhotoBoothItem(photoId: string): Promise<boolean> {
  const safeId = normalizePhotoId(photoId);
  if (!safeId || safeId === METADATA_FILE) return false;
  const filePath = path.join(PHOTOS_DIR, safeId);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    return false;
  }
  await removePhotoAnalysisHistory(safeId);
  return true;
}

export async function readPhotoDataUrl(photoId: string): Promise<string> {
  const safeId = normalizePhotoId(photoId);
  if (!safeId) return "";
  const ext = path.extname(safeId).toLowerCase();
  const mimeType = mimeTypeFromExtension(ext);
  try {
    return await bufferToDataUrl(path.join(PHOTOS_DIR, safeId), mimeType);
  } catch {
    return "";
  }
}