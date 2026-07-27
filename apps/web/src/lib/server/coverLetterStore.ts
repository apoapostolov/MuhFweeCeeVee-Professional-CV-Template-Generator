import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import { repoPath } from "./repoPaths";

export type CoverLetterVersionSource =
  | "save"
  | "ai_draft"
  | "humanize"
  | "restore"
  | "manual";

export type CoverLetterDocument = {
  id: string;
  cv_id: string;
  company_id?: string;
  job_id?: string;
  title: string;
  body: string;
  language?: string;
  /** Monotonic revision number (increments on each persisted change). */
  version: number;
  created_at: string;
  updated_at: string;
};

export type CoverLetterVersionMeta = {
  version: number;
  saved_at: string;
  source: CoverLetterVersionSource;
  title: string;
  /** First ~120 chars for UI preview. */
  body_preview: string;
};

export type CoverLetterVersionSnapshot = CoverLetterVersionMeta & {
  body: string;
};

const DIR = repoPath("data", "cover_letters");
const HISTORY_DIR = path.join(DIR, "history");
const MAX_HISTORY = 40;

function assertValidId(id: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/.test(id)) {
    throw new Error("Invalid cover letter id.");
  }
}

function filePath(id: string): string {
  return path.join(DIR, `${id}.yaml`);
}

function historyDir(id: string): string {
  return path.join(HISTORY_DIR, id);
}

function historyFilePath(id: string, version: number): string {
  return path.join(historyDir(id), `v${String(version).padStart(4, "0")}.yaml`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
}

function normalizeDoc(raw: Record<string, unknown>, id: string): CoverLetterDocument {
  const versionRaw = Number(raw.version);
  return {
    id,
    cv_id: String(raw.cv_id ?? "").trim(),
    company_id:
      typeof raw.company_id === "string" && raw.company_id.trim()
        ? raw.company_id.trim()
        : undefined,
    job_id:
      typeof raw.job_id === "string" && raw.job_id.trim() ? raw.job_id.trim() : undefined,
    title: String(raw.title ?? "Cover letter").trim() || "Cover letter",
    body: typeof raw.body === "string" ? raw.body : "",
    language: typeof raw.language === "string" ? raw.language : undefined,
    version: Number.isFinite(versionRaw) && versionRaw >= 1 ? Math.floor(versionRaw) : 1,
    created_at:
      typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString(),
    updated_at:
      typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

export async function listCoverLetters(): Promise<CoverLetterDocument[]> {
  await ensureDir();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(DIR);
  } catch {
    return [];
  }
  const items: CoverLetterDocument[] = [];
  for (const name of entries) {
    if (!name.endsWith(".yaml")) continue;
    const id = name.replace(/\.yaml$/, "");
    const doc = await readCoverLetter(id);
    if (doc) items.push(doc);
  }
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function readCoverLetter(id: string): Promise<CoverLetterDocument | null> {
  assertValidId(id);
  try {
    const raw = await fs.readFile(filePath(id), "utf-8");
    const parsed = parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeDoc(parsed as Record<string, unknown>, id);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeHistorySnapshot(
  doc: CoverLetterDocument,
  source: CoverLetterVersionSource,
): Promise<void> {
  await fs.mkdir(historyDir(doc.id), { recursive: true });
  const snapshot: CoverLetterVersionSnapshot = {
    version: doc.version,
    saved_at: doc.updated_at,
    source,
    title: doc.title,
    body: doc.body,
    body_preview: doc.body.replace(/\s+/g, " ").trim().slice(0, 120),
  };
  await fs.writeFile(historyFilePath(doc.id, doc.version), stringify(snapshot), "utf-8");

  // Cap history count
  try {
    const names = (await fs.readdir(historyDir(doc.id)))
      .filter((n) => /^v\d+\.yaml$/.test(n))
      .sort();
    while (names.length > MAX_HISTORY) {
      const oldest = names.shift();
      if (!oldest) break;
      await fs.unlink(path.join(historyDir(doc.id), oldest)).catch(() => undefined);
    }
  } catch {
    // ignore
  }
}

export async function listCoverLetterVersions(
  id: string,
): Promise<CoverLetterVersionMeta[]> {
  assertValidId(id);
  try {
    const names = (await fs.readdir(historyDir(id)))
      .filter((n) => /^v\d+\.yaml$/.test(n))
      .sort()
      .reverse();
    const out: CoverLetterVersionMeta[] = [];
    for (const name of names) {
      try {
        const raw = await fs.readFile(path.join(historyDir(id), name), "utf-8");
        const parsed = parse(raw) as CoverLetterVersionSnapshot;
        if (!parsed || typeof parsed !== "object") continue;
        out.push({
          version: Number(parsed.version) || 0,
          saved_at: String(parsed.saved_at ?? ""),
          source: (parsed.source as CoverLetterVersionSource) || "save",
          title: String(parsed.title ?? ""),
          body_preview: String(parsed.body_preview ?? "").slice(0, 120),
        });
      } catch {
        // skip bad file
      }
    }
    return out;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function readCoverLetterVersion(
  id: string,
  version: number,
): Promise<CoverLetterVersionSnapshot | null> {
  assertValidId(id);
  if (!Number.isFinite(version) || version < 1) return null;
  try {
    const raw = await fs.readFile(historyFilePath(id, version), "utf-8");
    const parsed = parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const snap = parsed as CoverLetterVersionSnapshot;
    return {
      version: Number(snap.version) || version,
      saved_at: String(snap.saved_at ?? ""),
      source: (snap.source as CoverLetterVersionSource) || "save",
      title: String(snap.title ?? ""),
      body: typeof snap.body === "string" ? snap.body : "",
      body_preview: String(snap.body_preview ?? "").slice(0, 120),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeCoverLetter(
  doc: CoverLetterDocument,
  options?: { source?: CoverLetterVersionSource; skipHistory?: boolean },
): Promise<CoverLetterDocument> {
  assertValidId(doc.id);
  await ensureDir();
  const now = new Date().toISOString();
  const existing = await readCoverLetter(doc.id);
  const source = options?.source ?? "save";

  const contentChanged =
    !existing ||
    existing.title !== (doc.title.trim() || "Cover letter") ||
    existing.body !== (doc.body ?? "");

  let version = existing?.version ?? 0;
  if (contentChanged) {
    // Snapshot the *previous* live state before overwriting (so undo/version has a base).
    if (existing && !options?.skipHistory) {
      await writeHistorySnapshot(existing, existing.version === 1 ? "manual" : "save");
    }
    version = (existing?.version ?? 0) + 1;
  } else if (existing) {
    version = existing.version;
  } else {
    version = 1;
  }

  const next: CoverLetterDocument = {
    ...doc,
    title: doc.title.trim() || "Cover letter",
    body: doc.body ?? "",
    version,
    created_at: existing?.created_at || doc.created_at || now,
    updated_at: contentChanged ? now : existing?.updated_at || now,
  };

  const tempPath = `${filePath(doc.id)}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, stringify(next), "utf-8");
  await fs.rename(tempPath, filePath(doc.id));

  // Also keep a snapshot of the new version for restore UI
  if (contentChanged && !options?.skipHistory) {
    await writeHistorySnapshot(next, source);
  }

  return next;
}

export async function deleteCoverLetter(id: string): Promise<boolean> {
  assertValidId(id);
  try {
    await fs.unlink(filePath(id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  // Best-effort history cleanup
  try {
    const dir = historyDir(id);
    const names = await fs.readdir(dir);
    await Promise.all(names.map((n) => fs.unlink(path.join(dir, n)).catch(() => undefined)));
    await fs.rmdir(dir).catch(() => undefined);
  } catch {
    // ignore
  }
  return true;
}

export function buildCoverLetterId(parts: {
  cvId: string;
  companyId?: string;
  jobId?: string;
}): string {
  const base = [
    "cl",
    parts.cvId.slice(0, 24),
    parts.jobId?.slice(0, 20) || parts.companyId?.slice(0, 16) || "general",
  ]
    .join("_")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 70);
  return `${base}_${Date.now().toString(36).slice(-4)}`;
}
