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
  updated_at: string;
  created_at: string;
};

export type ApplicationBoard = {
  version: 1;
  applications: Application[];
};

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

export async function readApplicationBoard(): Promise<ApplicationBoard> {
  await ensureBoard();
  try {
    const raw = await fs.readFile(BOARD_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ApplicationBoard;
    if (!parsed || !Array.isArray(parsed.applications)) {
      return EMPTY;
    }
    return { version: 1, applications: parsed.applications };
  } catch {
    return EMPTY;
  }
}

async function writeBoard(board: ApplicationBoard): Promise<ApplicationBoard> {
  await ensureBoard();
  const next = {
    version: 1 as const,
    applications: [...board.applications].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    ),
  };
  await fs.writeFile(BOARD_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return next;
}

function isStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export async function upsertApplication(
  input: Partial<Application> & {
    company_name: string;
    job_title: string;
    status?: ApplicationStatus;
  },
): Promise<ApplicationBoard> {
  const board = await readApplicationBoard();
  const now = new Date().toISOString();
  const id =
    (typeof input.id === "string" && input.id.trim()) || crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const existing = board.applications.find((a) => a.id === id);
  const status =
    input.status && isStatus(input.status) ? input.status : existing?.status ?? "wishlist";
  const nextApp: Application = {
    id,
    company_id: input.company_id?.trim() || existing?.company_id,
    job_id: input.job_id?.trim() || existing?.job_id,
    company_name: input.company_name.trim() || existing?.company_name || "Company",
    job_title: input.job_title.trim() || existing?.job_title || "Role",
    status,
    url: input.url?.trim() || existing?.url,
    applied_at: input.applied_at?.trim() || existing?.applied_at,
    notes: input.notes ?? existing?.notes,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
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
