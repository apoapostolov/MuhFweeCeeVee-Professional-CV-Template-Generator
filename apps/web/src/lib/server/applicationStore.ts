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

export const APPLICATION_PRIORITIES = ["low", "normal", "high"] as const;
export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number];

export const APPLICATION_ACTIVITY_TYPES = [
  "created",
  "applied",
  "status_change",
  "recruiter_contact",
  "follow_up_sent",
  "phone_screen",
  "interview_round",
  "assessment",
  "offer",
  "rejection",
  "note",
] as const;
export type ApplicationActivityType =
  (typeof APPLICATION_ACTIVITY_TYPES)[number];

export type ApplicationContact = {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
};

export type ApplicationActivity = {
  id: string;
  type: ApplicationActivityType;
  occurred_at: string;
  summary: string;
  notes?: string;
  contact_id?: string;
  meeting_url?: string;
  round?: string;
  outcome?: string;
  from_status?: ApplicationStatus;
  to_status?: ApplicationStatus;
};

export type ApplicationNextAction = {
  title: string;
  due_at: string;
  priority: ApplicationPriority;
  contact_id?: string;
  meeting_url?: string;
  reminder_state: "none" | "scheduled" | "dismissed";
  completed_at?: string;
};

export type ApplicationSubmissionAsset = {
  file: string;
  sha256: string;
  bytes: number;
};

export type ApplicationSubmissionSnapshot = {
  id: string;
  submitted_at: string;
  source?: string;
  submission_url?: string;
  confirmation_reference?: string;
  template_id: string;
  theme?: string;
  cv_id: string;
  cv_revision?: string;
  cv_sha256: string;
  cover_letter_id?: string;
  cover_letter_version?: number;
  photo_id?: string;
  job_id?: string;
  assets: {
    manifest: ApplicationSubmissionAsset;
    cv_source: ApplicationSubmissionAsset;
    cv_pdf: ApplicationSubmissionAsset;
    cover_letter?: ApplicationSubmissionAsset;
    photo?: ApplicationSubmissionAsset;
  };
};

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
  /** Portfolio-scale organization and reporting fields. */
  priority?: ApplicationPriority;
  source?: string;
  location?: string;
  role_family?: string;
  cv_family?: string;
  archived_at?: string;
  raw_job_input?: string;
  deadline_at?: string;
  salary_text?: string;
  employment_type?: string;
  next_action?: ApplicationNextAction;
  contacts?: ApplicationContact[];
  activities?: ApplicationActivity[];
  submission_snapshots?: ApplicationSubmissionSnapshot[];
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Clamp editable dwell-day values (0 … ~27 years). */
export function clampDwellDays(days: number): number {
  if (!Number.isFinite(days)) return 0;
  return Math.max(0, Math.min(9999, Math.floor(days)));
}

/**
 * ISO timestamp for “this many whole days without forward progress”.
 * Used when the user manually fixes a stuck / accidentally reset counter.
 */
export function statusSinceFromDays(
  days: number,
  nowMs: number = Date.now(),
): string {
  const n = clampDwellDays(days);
  return new Date(nowMs - n * MS_PER_DAY).toISOString();
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

function isPriority(value: unknown): value is ApplicationPriority {
  return (
    typeof value === "string" &&
    (APPLICATION_PRIORITIES as readonly string[]).includes(value)
  );
}

function isActivityType(value: unknown): value is ApplicationActivityType {
  return (
    typeof value === "string" &&
    (APPLICATION_ACTIVITY_TYPES as readonly string[]).includes(value)
  );
}

function normalizeOptionalId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeContacts(value: unknown): ApplicationContact[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Partial<ApplicationContact> =>
        Boolean(entry) && typeof entry === "object",
    )
    .map((entry) => ({
      id: normalizeOptionalId(entry.id) ?? newId(),
      name: normalizeOptionalId(entry.name) ?? "Contact",
      role: normalizeOptionalId(entry.role),
      email: normalizeOptionalId(entry.email),
      phone: normalizeOptionalId(entry.phone),
      linkedin_url: normalizeOptionalId(entry.linkedin_url),
      notes: normalizeOptionalId(entry.notes),
      created_at:
        normalizeOptionalId(entry.created_at) ?? new Date().toISOString(),
    }));
}

function normalizeActivities(value: unknown): ApplicationActivity[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Partial<ApplicationActivity> =>
        Boolean(entry) && typeof entry === "object",
    )
    .map((entry) => ({
      id: normalizeOptionalId(entry.id) ?? newId(),
      type: isActivityType(entry.type) ? entry.type : "note",
      occurred_at:
        normalizeOptionalId(entry.occurred_at) ?? new Date().toISOString(),
      summary: normalizeOptionalId(entry.summary) ?? "Activity",
      notes: normalizeOptionalId(entry.notes),
      contact_id: normalizeOptionalId(entry.contact_id),
      meeting_url: normalizeOptionalId(entry.meeting_url),
      round: normalizeOptionalId(entry.round),
      outcome: normalizeOptionalId(entry.outcome),
      from_status:
        typeof entry.from_status === "string" && isStatus(entry.from_status)
          ? entry.from_status
          : undefined,
      to_status:
        typeof entry.to_status === "string" && isStatus(entry.to_status)
          ? entry.to_status
          : undefined,
    }))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

function normalizeNextAction(value: unknown): ApplicationNextAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ApplicationNextAction>;
  const title = normalizeOptionalId(raw.title);
  const due_at = normalizeOptionalId(raw.due_at);
  if (!title || !due_at) return undefined;
  return {
    title,
    due_at,
    priority: isPriority(raw.priority) ? raw.priority : "normal",
    contact_id: normalizeOptionalId(raw.contact_id),
    meeting_url: normalizeOptionalId(raw.meeting_url),
    reminder_state:
      raw.reminder_state === "scheduled" || raw.reminder_state === "dismissed"
        ? raw.reminder_state
        : "none",
    completed_at: normalizeOptionalId(raw.completed_at),
  };
}

function normalizeSubmissionSnapshots(
  value: unknown,
): ApplicationSubmissionSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ApplicationSubmissionSnapshot =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as ApplicationSubmissionSnapshot).id === "string" &&
        typeof (entry as ApplicationSubmissionSnapshot).cv_id === "string" &&
        typeof (entry as ApplicationSubmissionSnapshot).template_id ===
          "string",
    )
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
}

function resolveActivities(params: {
  existing: Application | undefined;
  nextStatus: ApplicationStatus;
  now: string;
  explicit?: ApplicationActivity[];
  companyName: string;
  jobTitle: string;
}): ApplicationActivity[] {
  if (params.explicit !== undefined) {
    return params.explicit;
  }
  if (!params.existing) {
    return [
      {
        id: newId(),
        type: "created",
        occurred_at: params.now,
        summary: `Created ${params.jobTitle} at ${params.companyName}`,
      },
    ];
  }
  if (params.existing.status === params.nextStatus) {
    return params.existing.activities ?? [];
  }
  return [
    {
      id: newId(),
      type:
        params.nextStatus === "applied"
          ? "applied"
          : params.nextStatus === "offer"
            ? "offer"
            : params.nextStatus === "rejected"
              ? "rejection"
              : "status_change",
      occurred_at: params.now,
      summary: `Moved from ${params.existing.status} to ${params.nextStatus}`,
      from_status: params.existing.status,
      to_status: params.nextStatus,
    },
    ...(params.existing.activities ?? []),
  ];
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
    priority: isPriority(raw.priority) ? raw.priority : "normal",
    source: normalizeOptionalId(raw.source),
    location: normalizeOptionalId(raw.location),
    role_family: normalizeOptionalId(raw.role_family),
    cv_family: normalizeOptionalId(raw.cv_family),
    archived_at: normalizeOptionalId(raw.archived_at),
    raw_job_input:
      typeof raw.raw_job_input === "string" ? raw.raw_job_input : undefined,
    deadline_at: normalizeOptionalId(raw.deadline_at),
    salary_text: normalizeOptionalId(raw.salary_text),
    employment_type: normalizeOptionalId(raw.employment_type),
    next_action: normalizeNextAction(raw.next_action),
    contacts: normalizeContacts(raw.contacts),
    activities: normalizeActivities(raw.activities),
    submission_snapshots: normalizeSubmissionSnapshots(
      raw.submission_snapshots,
    ),
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
  const companyName =
    input.company_name.trim() || existing?.company_name || "Company";
  const jobTitle = input.job_title.trim() || existing?.job_title || "Role";
  const activities = resolveActivities({
    existing,
    nextStatus: status,
    now,
    explicit: input.activities,
    companyName,
    jobTitle,
  });

  const nextApp = normalizeApplication({
    id,
    company_id:
      input.company_id !== undefined ? input.company_id : existing?.company_id,
    job_id: input.job_id !== undefined ? input.job_id : existing?.job_id,
    company_name: companyName,
    job_title: jobTitle,
    status,
    url: input.url !== undefined ? input.url : existing?.url,
    applied_at:
      input.applied_at !== undefined
        ? input.applied_at
        : existing?.applied_at ??
          (status === "applied" ? now : undefined),
    notes: input.notes !== undefined ? input.notes : existing?.notes,
    cv_id: input.cv_id !== undefined ? input.cv_id : existing?.cv_id,
    photo_id: input.photo_id !== undefined ? input.photo_id : existing?.photo_id,
    cover_letter_id:
      input.cover_letter_id !== undefined
        ? input.cover_letter_id
        : existing?.cover_letter_id,
    packet_title:
      input.packet_title !== undefined ? input.packet_title : existing?.packet_title,
    priority:
      input.priority !== undefined ? input.priority : existing?.priority,
    source: input.source !== undefined ? input.source : existing?.source,
    location:
      input.location !== undefined ? input.location : existing?.location,
    role_family:
      input.role_family !== undefined
        ? input.role_family
        : existing?.role_family,
    cv_family:
      input.cv_family !== undefined ? input.cv_family : existing?.cv_family,
    archived_at:
      input.archived_at !== undefined
        ? input.archived_at
        : existing?.archived_at,
    raw_job_input:
      input.raw_job_input !== undefined
        ? input.raw_job_input
        : existing?.raw_job_input,
    deadline_at:
      input.deadline_at !== undefined
        ? input.deadline_at
        : existing?.deadline_at,
    salary_text:
      input.salary_text !== undefined
        ? input.salary_text
        : existing?.salary_text,
    employment_type:
      input.employment_type !== undefined
        ? input.employment_type
        : existing?.employment_type,
    next_action:
      input.next_action !== undefined
        ? input.next_action
        : existing?.next_action,
    contacts:
      input.contacts !== undefined ? input.contacts : existing?.contacts,
    activities,
    submission_snapshots:
      input.submission_snapshots !== undefined
        ? input.submission_snapshots
        : existing?.submission_snapshots,
    status_since,
    created_at: existing?.created_at || now,
    updated_at: now,
  });

  const rest = board.applications.filter((a) => a.id !== id);
  return writeBoard({ version: 1, applications: [...rest, nextApp] });
}

export async function mutateApplication(
  id: string,
  mutate: (application: Application) => Application,
): Promise<{ board: ApplicationBoard; application: Application }> {
  const board = await readApplicationBoard();
  const existing = board.applications.find((entry) => entry.id === id);
  if (!existing) {
    throw new Error(`Application '${id}' not found.`);
  }
  const application = normalizeApplication({
    ...mutate(existing),
    id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  });
  const written = await writeBoard({
    version: 1,
    applications: [
      ...board.applications.filter((entry) => entry.id !== id),
      application,
    ],
  });
  return {
    board: written,
    application:
      written.applications.find((entry) => entry.id === id) ?? application,
  };
}

export async function appendApplicationActivity(
  id: string,
  input: Omit<ApplicationActivity, "id"> & { id?: string },
): Promise<{ board: ApplicationBoard; application: Application }> {
  const activity: ApplicationActivity = {
    ...input,
    id: input.id ?? newId(),
  };
  return mutateApplication(id, (application) => ({
    ...application,
    activities: [activity, ...(application.activities ?? [])],
  }));
}

export async function addApplicationContact(
  id: string,
  input: Omit<ApplicationContact, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  },
): Promise<{ board: ApplicationBoard; application: Application }> {
  const contact: ApplicationContact = {
    ...input,
    id: input.id ?? newId(),
    created_at: input.created_at ?? new Date().toISOString(),
  };
  return mutateApplication(id, (application) => ({
    ...application,
    contacts: [...(application.contacts ?? []), contact],
  }));
}

export function normalizeApplicationUrl(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (
        key.toLowerCase().startsWith("utm_") ||
        ["ref", "source", "tracking"].includes(key.toLowerCase())
      ) {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function normalizedIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findApplicationDuplicates(
  applications: Application[],
): Record<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const application of applications) {
    const keys = [
      normalizeApplicationUrl(application.url),
      `${normalizedIdentity(application.company_name)}::${normalizedIdentity(
        application.job_title,
      )}`,
    ].filter(Boolean);
    for (const key of keys) {
      const ids = groups.get(key) ?? [];
      ids.push(application.id);
      groups.set(key, ids);
    }
  }
  const duplicates: Record<string, string[]> = {};
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      duplicates[id] = [
        ...new Set([...(duplicates[id] ?? []), ...ids.filter((x) => x !== id)]),
      ];
    }
  }
  return duplicates;
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
