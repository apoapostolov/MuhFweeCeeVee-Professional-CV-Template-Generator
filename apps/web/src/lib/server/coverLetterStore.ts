import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import { repoPath } from "./repoPaths";

export type CoverLetterDocument = {
  id: string;
  cv_id: string;
  company_id?: string;
  job_id?: string;
  title: string;
  body: string;
  language?: string;
  created_at: string;
  updated_at: string;
};

const DIR = repoPath("data", "cover_letters");

function assertValidId(id: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/.test(id)) {
    throw new Error("Invalid cover letter id.");
  }
}

function filePath(id: string): string {
  return path.join(DIR, `${id}.yaml`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
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
    return parsed as CoverLetterDocument;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeCoverLetter(
  doc: CoverLetterDocument,
): Promise<CoverLetterDocument> {
  assertValidId(doc.id);
  await ensureDir();
  const now = new Date().toISOString();
  const next: CoverLetterDocument = {
    ...doc,
    title: doc.title.trim() || "Cover letter",
    body: doc.body ?? "",
    created_at: doc.created_at || now,
    updated_at: now,
  };
  await fs.writeFile(filePath(doc.id), stringify(next), "utf-8");
  return next;
}

export async function deleteCoverLetter(id: string): Promise<boolean> {
  assertValidId(id);
  try {
    await fs.unlink(filePath(id));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function buildCoverLetterId(parts: {
  cvId: string;
  companyId?: string;
  jobId?: string;
}): string {
  const base = ["cl", parts.cvId.slice(0, 24), parts.jobId?.slice(0, 20) || parts.companyId?.slice(0, 16) || "general"]
    .join("_")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 70);
  return `${base}_${Date.now().toString(36).slice(-4)}`;
}
