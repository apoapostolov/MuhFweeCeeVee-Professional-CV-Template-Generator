import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { readCv, writeCv } from "./cvStore";
import { repoPath } from "./repoPaths";

export const CAREER_EVIDENCE_KINDS = [
  "achievement",
  "responsibility",
  "skill",
  "project",
  "leadership",
  "domain",
] as const;
export type CareerEvidenceKind = (typeof CAREER_EVIDENCE_KINDS)[number];

export type CareerEvidenceEntry = {
  id: string;
  kind: CareerEvidenceKind;
  title: string;
  statement: string;
  metric?: string;
  tags: string[];
  role_families: string[];
  seniority?: string;
  industries: string[];
  source?: string;
  source_cv_ids: string[];
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
};

type CareerEvidenceLibrary = {
  version: 1;
  entries: CareerEvidenceEntry[];
};

const LIBRARY_PATH = repoPath("data", "evidence", "library.json");
const EMPTY: CareerEvidenceLibrary = { version: 1, entries: [] };

async function ensureLibrary(): Promise<void> {
  await fs.mkdir(path.dirname(LIBRARY_PATH), { recursive: true });
  try {
    await fs.access(LIBRARY_PATH);
  } catch {
    await fs.writeFile(LIBRARY_PATH, `${JSON.stringify(EMPTY, null, 2)}\n`, "utf8");
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))]
    : [];
}

function normalize(
  raw: Partial<CareerEvidenceEntry>,
  existing?: CareerEvidenceEntry,
): CareerEvidenceEntry {
  const now = new Date().toISOString();
  const kind = (CAREER_EVIDENCE_KINDS as readonly string[]).includes(
    String(raw.kind),
  )
    ? (raw.kind as CareerEvidenceKind)
    : existing?.kind ?? "achievement";
  return {
    id:
      (typeof raw.id === "string" && raw.id.trim()) ||
      existing?.id ||
      crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    kind,
    title:
      (typeof raw.title === "string" && raw.title.trim()) ||
      existing?.title ||
      "Evidence",
    statement:
      typeof raw.statement === "string"
        ? raw.statement.trim()
        : existing?.statement ?? "",
    metric:
      typeof raw.metric === "string" && raw.metric.trim()
        ? raw.metric.trim()
        : existing?.metric,
    tags: raw.tags !== undefined ? strings(raw.tags) : existing?.tags ?? [],
    role_families:
      raw.role_families !== undefined
        ? strings(raw.role_families)
        : existing?.role_families ?? [],
    seniority:
      typeof raw.seniority === "string" && raw.seniority.trim()
        ? raw.seniority.trim()
        : existing?.seniority,
    industries:
      raw.industries !== undefined
        ? strings(raw.industries)
        : existing?.industries ?? [],
    source:
      typeof raw.source === "string" && raw.source.trim()
        ? raw.source.trim()
        : existing?.source,
    source_cv_ids:
      raw.source_cv_ids !== undefined
        ? strings(raw.source_cv_ids)
        : existing?.source_cv_ids ?? [],
    last_verified_at:
      typeof raw.last_verified_at === "string" && raw.last_verified_at.trim()
        ? raw.last_verified_at.trim()
        : existing?.last_verified_at,
    created_at: existing?.created_at ?? raw.created_at ?? now,
    updated_at: existing?.id ? now : raw.updated_at ?? now,
  };
}

export async function readCareerEvidenceLibrary(): Promise<CareerEvidenceLibrary> {
  await ensureLibrary();
  try {
    const parsed = JSON.parse(await fs.readFile(LIBRARY_PATH, "utf8")) as {
      entries?: unknown[];
    };
    return {
      version: 1,
      entries: Array.isArray(parsed.entries)
        ? parsed.entries
            .filter(
              (entry): entry is Partial<CareerEvidenceEntry> =>
                Boolean(entry) && typeof entry === "object",
            )
            .map((entry) => normalize(entry))
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        : [],
    };
  } catch {
    return EMPTY;
  }
}

async function writeCareerEvidenceLibrary(
  library: CareerEvidenceLibrary,
): Promise<CareerEvidenceLibrary> {
  await ensureLibrary();
  const next = {
    version: 1 as const,
    entries: [...library.entries].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    ),
  };
  const temp = `${LIBRARY_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await fs.rename(temp, LIBRARY_PATH);
  return next;
}

export async function upsertCareerEvidence(
  input: Partial<CareerEvidenceEntry>,
): Promise<CareerEvidenceLibrary> {
  const library = await readCareerEvidenceLibrary();
  const existing = library.entries.find((entry) => entry.id === input.id);
  const entry = normalize(input, existing);
  if (!entry.statement) {
    throw new Error("Evidence statement is required.");
  }
  return writeCareerEvidenceLibrary({
    version: 1,
    entries: [
      ...library.entries.filter((candidate) => candidate.id !== entry.id),
      entry,
    ],
  });
}

export async function deleteCareerEvidence(
  id: string,
): Promise<CareerEvidenceLibrary> {
  const library = await readCareerEvidenceLibrary();
  return writeCareerEvidenceLibrary({
    version: 1,
    entries: library.entries.filter((entry) => entry.id !== id),
  });
}

export async function linkCareerEvidenceToCv(
  evidenceId: string,
  cvId: string,
): Promise<{ evidence: CareerEvidenceEntry; cvId: string }> {
  const library = await readCareerEvidenceLibrary();
  const evidence = library.entries.find((entry) => entry.id === evidenceId);
  if (!evidence) {
    throw new Error(`Evidence '${evidenceId}' not found.`);
  }
  const cv = await readCv(cvId);
  if (!cv) {
    throw new Error(`CV '${cvId}' not found.`);
  }
  const metadata =
    cv.metadata && typeof cv.metadata === "object" && !Array.isArray(cv.metadata)
      ? (cv.metadata as Record<string, unknown>)
      : {};
  const existing = Array.isArray(metadata.evidence_refs)
    ? metadata.evidence_refs.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
  const reference = {
    evidence_id: evidence.id,
    kind: evidence.kind,
    title: evidence.title,
    statement_sha256: crypto
      .createHash("sha256")
      .update(evidence.statement)
      .digest("hex"),
    linked_at: new Date().toISOString(),
  };
  await writeCv(
    cvId,
    {
      ...cv,
      metadata: {
        ...metadata,
        evidence_refs: [
          ...existing.filter((entry) => entry.evidence_id !== evidence.id),
          reference,
        ],
      },
    },
    { createSnapshot: true },
  );
  return { evidence, cvId };
}
