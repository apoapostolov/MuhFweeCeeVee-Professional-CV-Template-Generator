import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { repoPath } from "./repoPaths";

export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Kanban card + application packet refs.
 * Packet = CV + Photo + Company/Job + Cover letter bindings (always editable).
 */
export type Application = {
  id: string;
  company_id?: string;
  job_id?: string;
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  url?: string;
  applied_at?: string;
  notes?: string;
  /** Packet: linked CV id (data/cvs). */
  cv_id?: string;
  /** Packet: linked photo booth id. */
  photo_id?: string;
  /** Packet: linked cover letter id. */
  cover_letter_id?: string;
  /** Optional human label for the combo pack. */
  packet_title?: string;
  /**
   * Clock for “days without moving up”.
   * Set when the card is created or moved to a later stage.
   * Moving backward does not update this (does not reset the clock).
   */
  status_since: string;
  updated_at: string;
  created_at: string;
};

export function statusIndex(status: ApplicationStatus): number {
  return APPLICATION_STATUSES.indexOf(status);
}

/** Terminal / side outcomes — do not count as “moving up” for the dwell clock. */
export function isTerminalStatus(status: ApplicationStatus): boolean {
  return status === "rejected" || status === "ghosted";
}

/**
 * True when the move is forward progress on the hiring path
 * (later stage, excluding rejected/ghosted).
 */
export function isForwardProgress(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (from === to) return false;
  if (isTerminalStatus(to)) return false;
  if (isTerminalStatus(from)) {
    // Leaving a terminal column into a pipeline stage does not reset either
    // (clock already frozen while rejected/ghosted).
    return false;
  }
  return statusIndex(to) > statusIndex(from);
}

/** Days since status_since (0 if same calendar day / invalid). */
export function daysWithoutForwardProgress(
  statusSince: string,
  nowMs: number = Date.now(),
): number {
  const t = Date.parse(statusSince);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((nowMs - t) / (24 * 60 * 60 * 1000)));
}

/**
 * Resolve status_since on upsert.
 * Reset only on real forward pipeline moves (e.g. applied → interview).
 * Moving back, or into rejected/ghosted, keeps the existing clock.
 */
export function resolveStatusSince(params: {
  existing: Application | undefined;
  nextStatus: ApplicationStatus;
  now: string;
  explicit?: string;
}): string {
  if (params.explicit && params.explicit.trim()) {
    return params.explicit.trim();
  }
  if (!params.existing) {
    return params.now;
  }
  if (isForwardProgress(params.existing.status, params.nextStatus)) {
    return params.now;
  }
  return (
    params.existing.status_since ||
    params.existing.created_at ||
    params.now
  );
}

export type ApplicationBoard = {
  version: 1;
  applications: Application[];
};

/** Portable packet file for export / import / reuse. */
export type ApplicationPacketFile = {
  format: "muhfweeceevee.application_packet";
  version: 1;
  exported_at: string;
  source_application_id?: string;
  packet: {
    packet_title?: string;
    company_id?: string;
    job_id?: string;
    company_name: string;
    job_title: string;
    status: ApplicationStatus;
    url?: string;
    notes?: string;
    cv_id?: string;
    photo_id?: string;
    cover_letter_id?: string;
  };
  embeds?: {
    cover_letter?: {
      title: string;
      body: string;
      language?: string;
      cv_id?: string;
    };
    cv?: {
      id: string;
      document: Record<string, unknown>;
    };
    company?: {
      id?: string;
      name: string;
      website?: string;
    };
    job?: {
      id?: string;
      title: string;
      company_id?: string;
    };
    photo?: {
      id: string;
      name?: string;
    };
  };
};

export const PACKET_FORMAT = "muhfweeceevee.application_packet" as const;

const BOARD_PATH = repoPath("data", "applications", "board.json");

const EMPTY: ApplicationBoard = { version: 1, applications: [] };

async function ensureBoard(): Promise<void> {
  await fs.mkdir(path.dirname(BOARD_PATH), { recursive: true });
  try {
    await fs.access(BOARD_PATH);
  } catch {
    await fs.writeFile(BOARD_PATH, `${JSON.stringify(EMPTY, null, 2)}\n`, "utf-8");
  }
}

function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function isStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

function normalizeOptionalId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeApplication(raw: Partial<Application> & { id: string }): Application {
  const status =
    typeof raw.status === "string" && isStatus(raw.status) ? raw.status : "wishlist";
  const created_at =
    typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString();
  const status_since =
    typeof raw.status_since === "string" && raw.status_since.trim()
      ? raw.status_since.trim()
      : created_at;
  return {
    id: raw.id,
    company_id: normalizeOptionalId(raw.company_id),
    job_id: normalizeOptionalId(raw.job_id),
    company_name: (raw.company_name ?? "Company").trim() || "Company",
    job_title: (raw.job_title ?? "Role").trim() || "Role",
    status,
    url: normalizeOptionalId(raw.url),
    applied_at: normalizeOptionalId(raw.applied_at),
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    cv_id: normalizeOptionalId(raw.cv_id),
    photo_id: normalizeOptionalId(raw.photo_id),
    cover_letter_id: normalizeOptionalId(raw.cover_letter_id),
    packet_title: normalizeOptionalId(raw.packet_title),
    status_since,
    created_at,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

export async function readApplicationBoard(): Promise<ApplicationBoard> {
  await ensureBoard();
  try {
    const raw = await fs.readFile(BOARD_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ApplicationBoard;
    if (!parsed || !Array.isArray(parsed.applications)) {
      return EMPTY;
    }
    return {
      version: 1,
      applications: parsed.applications.map((app) =>
        normalizeApplication(app as Application & { id: string }),
      ),
    };
  } catch {
    return EMPTY;
  }
}

async function writeBoard(board: ApplicationBoard): Promise<ApplicationBoard> {
  await ensureBoard();
  const next = {
    version: 1 as const,
    applications: [...board.applications]
      .map((app) => normalizeApplication(app))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  };
  await fs.writeFile(BOARD_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return next;
}

export async function getApplication(id: string): Promise<Application | null> {
  const board = await readApplicationBoard();
  return board.applications.find((a) => a.id === id) ?? null;
}

export type UpsertApplicationInput = Partial<Application> & {
  company_name: string;
  job_title: string;
  status?: ApplicationStatus;
};

export async function upsertApplication(
  input: UpsertApplicationInput,
): Promise<ApplicationBoard> {
  const board = await readApplicationBoard();
  const now = new Date().toISOString();
  const id =
    (typeof input.id === "string" && input.id.trim()) || newId();
  const existing = board.applications.find((a) => a.id === id);
  const status =
    input.status && isStatus(input.status) ? input.status : existing?.status ?? "wishlist";

  const status_since = resolveStatusSince({
    existing,
    nextStatus: status,
    now,
    explicit:
      typeof input.status_since === "string" ? input.status_since : undefined,
  });

  const nextApp = normalizeApplication({
    id,
    company_id:
      input.company_id !== undefined ? input.company_id : existing?.company_id,
    job_id: input.job_id !== undefined ? input.job_id : existing?.job_id,
    company_name: input.company_name.trim() || existing?.company_name || "Company",
    job_title: input.job_title.trim() || existing?.job_title || "Role",
    status,
    url: input.url !== undefined ? input.url : existing?.url,
    applied_at: input.applied_at !== undefined ? input.applied_at : existing?.applied_at,
    notes: input.notes !== undefined ? input.notes : existing?.notes,
    cv_id: input.cv_id !== undefined ? input.cv_id : existing?.cv_id,
    photo_id: input.photo_id !== undefined ? input.photo_id : existing?.photo_id,
    cover_letter_id:
      input.cover_letter_id !== undefined
        ? input.cover_letter_id
        : existing?.cover_letter_id,
    packet_title:
      input.packet_title !== undefined ? input.packet_title : existing?.packet_title,
    status_since,
    created_at: existing?.created_at || now,
    updated_at: now,
  });

  const rest = board.applications.filter((a) => a.id !== id);
  return writeBoard({ version: 1, applications: [...rest, nextApp] });
}

export async function deleteApplication(id: string): Promise<ApplicationBoard> {
  const board = await readApplicationBoard();
  return writeBoard({
    version: 1,
    applications: board.applications.filter((a) => a.id !== id),
  });
}

/** Duplicate a packet for reuse (e.g. same CV/photo, new company). */
export async function duplicateApplication(
  id: string,
  overrides?: Partial<UpsertApplicationInput>,
): Promise<{ board: ApplicationBoard; application: Application }> {
  const existing = await getApplication(id);
  if (!existing) {
    throw new Error(`Application '${id}' not found.`);
  }
  const board = await upsertApplication({
    company_name: overrides?.company_name ?? existing.company_name,
    job_title: overrides?.job_title ?? existing.job_title,
    status: overrides?.status ?? "wishlist",
    company_id:
      overrides?.company_id !== undefined ? overrides.company_id : existing.company_id,
    job_id: overrides?.job_id !== undefined ? overrides.job_id : existing.job_id,
    url: overrides?.url !== undefined ? overrides.url : existing.url,
    notes: overrides?.notes !== undefined ? overrides.notes : existing.notes,
    cv_id: overrides?.cv_id !== undefined ? overrides.cv_id : existing.cv_id,
    photo_id: overrides?.photo_id !== undefined ? overrides.photo_id : existing.photo_id,
    // New packet usually needs a new letter for a new company — clear unless override
    cover_letter_id:
      overrides?.cover_letter_id !== undefined
        ? overrides.cover_letter_id
        : undefined,
    packet_title:
      overrides?.packet_title ??
      (existing.packet_title
        ? `${existing.packet_title} (copy)`
        : `${existing.job_title} @ ${existing.company_name} (copy)`),
  });
  const created = board.applications[0];
  if (!created) {
    throw new Error("Duplicate failed.");
  }
  return { board, application: created };
}

export function applicationToPacketStub(app: Application): ApplicationPacketFile["packet"] {
  return {
    packet_title: app.packet_title,
    company_id: app.company_id,
    job_id: app.job_id,
    company_name: app.company_name,
    job_title: app.job_title,
    status: app.status,
    url: app.url,
    notes: app.notes,
    cv_id: app.cv_id,
    photo_id: app.photo_id,
    cover_letter_id: app.cover_letter_id,
  };
}

export function isApplicationPacketFile(value: unknown): value is ApplicationPacketFile {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.format !== PACKET_FORMAT) return false;
  if (record.version !== 1) return false;
  const packet = record.packet;
  if (!packet || typeof packet !== "object") return false;
  const p = packet as Record<string, unknown>;
  return typeof p.company_name === "string" && typeof p.job_title === "string";
}

/**
 * Import a portable packet as a new board card.
 * Does not write CV/letter files — caller may restore embeds first and pass resolved ids.
 */
export async function importApplicationPacket(
  file: ApplicationPacketFile,
  resolved?: {
    cv_id?: string;
    photo_id?: string;
    cover_letter_id?: string;
    company_id?: string;
    job_id?: string;
  },
): Promise<{ board: ApplicationBoard; application: Application }> {
  const p = file.packet;
  const board = await upsertApplication({
    company_name: p.company_name,
    job_title: p.job_title,
    status: p.status && isStatus(p.status) ? p.status : "wishlist",
    company_id: resolved?.company_id ?? p.company_id,
    job_id: resolved?.job_id ?? p.job_id,
    url: p.url,
    notes: p.notes,
    cv_id: resolved?.cv_id ?? p.cv_id,
    photo_id: resolved?.photo_id ?? p.photo_id,
    cover_letter_id: resolved?.cover_letter_id ?? p.cover_letter_id,
    packet_title: p.packet_title,
  });
  const application = board.applications[0];
  if (!application) {
    throw new Error("Import failed.");
  }
  return { board, application };
}

export function packetCompleteness(app: Application): {
  cv: boolean;
  photo: boolean;
  company: boolean;
  letter: boolean;
  score: number;
} {
  const cv = Boolean(app.cv_id);
  const photo = Boolean(app.photo_id);
  const company = Boolean(app.company_id || app.company_name);
  const letter = Boolean(app.cover_letter_id);
  const score = [cv, photo, company, letter].filter(Boolean).length;
  return { cv, photo, company, letter, score };
}
