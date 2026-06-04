import { normalizeResearchCatalog } from "../../lib/research/research-normalize";
import type { ResearchCatalog } from "../../lib/research/types";

export const COMPOSER_SESSION_BACKUP_VERSION = 2;

/** @deprecated Use COMPOSER_SESSION_BACKUP_VERSION */
export const BROWSER_STORAGE_BACKUP_VERSION = COMPOSER_SESSION_BACKUP_VERSION;

export type ComposerSessionServerBackup = {
  researchCatalog: ResearchCatalog | null;
  companyMetadata: {
    personal: unknown | null;
    example: unknown | null;
  };
  cvs: Array<{ cvId: string; cv: unknown }>;
};

export type ComposerSessionBackupFile = {
  version: number;
  exportedAt: string;
  origin: string;
  localStorage: Record<string, string>;
  server: ComposerSessionServerBackup;
};

/** @deprecated Use ComposerSessionBackupFile */
export type BrowserStorageBackupFile = ComposerSessionBackupFile;

export type SessionBackupImportSummary = {
  localStorageKeys: number;
  researchCompanies: number;
  researchJobs: number;
  companyMetadataSources: number;
  cvs: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readAllBrowserLocalStorage(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const storage: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }
    storage[key] = window.localStorage.getItem(key) ?? "";
  }
  return storage;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchServerSessionSnapshot(): Promise<ComposerSessionServerBackup> {
  const [catalogPayload, personalPayload, examplePayload, cvListPayload] = await Promise.all([
    fetchJson("/api/research/catalog"),
    fetchJson("/api/companies?source=personal"),
    fetchJson("/api/companies?source=example"),
    fetchJson("/api/cvs"),
  ]);

  let researchCatalog: ResearchCatalog | null = null;
  if (isRecord(catalogPayload) && catalogPayload.ok) {
    researchCatalog = normalizeResearchCatalog({
      version: catalogPayload.version,
      companies: catalogPayload.companies,
      job_positions: catalogPayload.job_positions,
    });
  }

  const companyMetadata = {
    personal:
      isRecord(personalPayload) && personalPayload.ok ? (personalPayload.document ?? null) : null,
    example:
      isRecord(examplePayload) && examplePayload.ok ? (examplePayload.document ?? null) : null,
  };

  const cvItems = isRecord(cvListPayload) && Array.isArray(cvListPayload.items) ? cvListPayload.items : [];
  const cvIds = cvItems
    .map((entry) => {
      if (!isRecord(entry)) {
        return "";
      }
      return typeof entry.id === "string" ? entry.id.trim() : "";
    })
    .filter((id) => id.length > 0);

  const cvResponses = await Promise.all(
    cvIds.map(async (cvId) => {
      const payload = await fetchJson(`/api/cvs/${encodeURIComponent(cvId)}`);
      if (!isRecord(payload) || !payload.cv) {
        return null;
      }
      return { cvId, cv: payload.cv as unknown };
    }),
  );

  const cvs: Array<{ cvId: string; cv: unknown }> = cvResponses.filter(
    (entry): entry is { cvId: string; cv: unknown } => entry !== null,
  );

  return {
    researchCatalog,
    companyMetadata,
    cvs,
  };
}

export async function buildComposerSessionBackup(): Promise<ComposerSessionBackupFile> {
  const server = await fetchServerSessionSnapshot();
  return {
    version: COMPOSER_SESSION_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    origin: typeof window !== "undefined" ? window.location.origin : "",
    localStorage: readAllBrowserLocalStorage(),
    server,
  };
}

/** @deprecated Use buildComposerSessionBackup */
export async function buildBrowserStorageBackup(): Promise<ComposerSessionBackupFile> {
  return buildComposerSessionBackup();
}

export function formatBackupExportSummary(backup: ComposerSessionBackupFile): string {
  const storageKeys = Object.keys(backup.localStorage).length;
  const companies = backup.server.researchCatalog?.companies.length ?? 0;
  const jobs = backup.server.researchCatalog?.job_positions.length ?? 0;
  const metadataSources = ["personal", "example"].filter(
    (source) => backup.server.companyMetadata[source as keyof typeof backup.server.companyMetadata] !== null,
  ).length;
  const cvs = backup.server.cvs.length;
  return `Exported ${storageKeys} browser key${storageKeys === 1 ? "" : "s"}, ${companies} researched compan${companies === 1 ? "y" : "ies"}, ${jobs} job position${jobs === 1 ? "" : "s"}, ${metadataSources} metadata file${metadataSources === 1 ? "" : "s"}, ${cvs} CV${cvs === 1 ? "" : "s"}.`;
}

export async function serializeComposerSessionBackup(pretty = true): Promise<string> {
  const backup = await buildComposerSessionBackup();
  return JSON.stringify(backup, null, pretty ? 2 : 0);
}

/** @deprecated Use serializeComposerSessionBackup */
export async function serializeBrowserStorageBackup(pretty = true): Promise<string> {
  return serializeComposerSessionBackup(pretty);
}

function readLocalStorageMap(parsed: Record<string, unknown>): Record<string, string> | null {
  const source = isRecord(parsed.localStorage)
    ? parsed.localStorage
    : isRecord(parsed.storage)
      ? parsed.storage
      : null;
  if (!source) {
    return null;
  }
  const storage: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof key !== "string" || key.length === 0) {
      continue;
    }
    if (typeof value === "string") {
      storage[key] = value;
    } else if (value === null || value === undefined) {
      storage[key] = "";
    } else {
      storage[key] = JSON.stringify(value);
    }
  }
  return storage;
}

function readFlatLocalStorageMap(parsed: Record<string, unknown>): Record<string, string> | null {
  const flat: Record<string, string> = {};
  let hasStringValues = false;
  for (const [key, value] of Object.entries(parsed)) {
    if (
      key === "version" ||
      key === "exportedAt" ||
      key === "origin" ||
      key === "localStorage" ||
      key === "storage" ||
      key === "server"
    ) {
      continue;
    }
    if (typeof value === "string") {
      flat[key] = value;
      hasStringValues = true;
    }
  }
  return hasStringValues ? flat : null;
}

function readServerBackup(parsed: Record<string, unknown>): ComposerSessionServerBackup | null {
  if (!isRecord(parsed.server)) {
    return null;
  }
  const server = parsed.server;
  let researchCatalog: ResearchCatalog | null = null;
  if (isRecord(server.researchCatalog)) {
    researchCatalog = normalizeResearchCatalog(server.researchCatalog);
  }

  const metadataRecord = isRecord(server.companyMetadata) ? server.companyMetadata : {};
  const cvs = Array.isArray(server.cvs)
    ? server.cvs
        .map((entry) => {
          if (!isRecord(entry)) {
            return null;
          }
          const cvId = typeof entry.cvId === "string" ? entry.cvId.trim() : "";
          if (!cvId || entry.cv === undefined) {
            return null;
          }
          return { cvId, cv: entry.cv as unknown };
        })
        .filter((entry): entry is { cvId: string; cv: unknown } => entry !== null)
    : [];

  return {
    researchCatalog,
    companyMetadata: {
      personal: metadataRecord.personal ?? null,
      example: metadataRecord.example ?? null,
    },
    cvs,
  };
}

export function parseComposerSessionBackup(raw: string): ComposerSessionBackupFile {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Backup JSON is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Backup JSON is not valid.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Backup JSON must be an object.");
  }

  const localStorage =
    readLocalStorageMap(parsed) ?? readFlatLocalStorageMap(parsed) ?? {};
  const server = readServerBackup(parsed) ?? {
    researchCatalog: null,
    companyMetadata: { personal: null, example: null },
    cvs: [],
  };

  if (Object.keys(localStorage).length === 0 && !server.researchCatalog && server.cvs.length === 0) {
    const hasMetadata =
      server.companyMetadata.personal !== null || server.companyMetadata.example !== null;
    if (!hasMetadata) {
      throw new Error("No backup data found in JSON.");
    }
  }

  return {
    version:
      typeof parsed.version === "number" ? parsed.version : COMPOSER_SESSION_BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    origin: typeof parsed.origin === "string" ? parsed.origin : "",
    localStorage,
    server,
  };
}

/** @deprecated Use parseComposerSessionBackup */
export function parseBrowserStorageBackup(raw: string): ComposerSessionBackupFile {
  const parsed = parseComposerSessionBackup(raw);
  return parsed;
}

export function applyComposerSessionLocalStorage(backup: ComposerSessionBackupFile): number {
  if (typeof window === "undefined") {
    return 0;
  }

  let applied = 0;
  for (const [key, value] of Object.entries(backup.localStorage)) {
    window.localStorage.setItem(key, value);
    applied += 1;
  }
  return applied;
}

/** @deprecated Use applyComposerSessionLocalStorage */
export function applyBrowserStorageBackup(backup: ComposerSessionBackupFile): number {
  return applyComposerSessionLocalStorage(backup);
}

async function restoreResearchCatalog(catalog: ResearchCatalog): Promise<void> {
  const response = await fetch("/api/research/catalog", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(catalog),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not restore research catalog.");
  }
}

async function restoreCompanyMetadata(
  source: "personal" | "example",
  document: unknown,
): Promise<void> {
  const response = await fetch(`/api/companies?source=${source}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ document }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Could not restore ${source} company metadata.`);
  }
}

async function restoreCv(cvId: string, cv: unknown): Promise<void> {
  const response = await fetch(`/api/cvs/${encodeURIComponent(cvId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cv }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Could not restore CV "${cvId}".`);
  }
}

export async function applyComposerSessionServerBackup(
  server: ComposerSessionServerBackup,
): Promise<Pick<SessionBackupImportSummary, "researchCompanies" | "researchJobs" | "companyMetadataSources" | "cvs">> {
  if (server.researchCatalog) {
    await restoreResearchCatalog(server.researchCatalog);
  }

  let companyMetadataSources = 0;
  if (server.companyMetadata.personal !== null) {
    await restoreCompanyMetadata("personal", server.companyMetadata.personal);
    companyMetadataSources += 1;
  }
  if (server.companyMetadata.example !== null) {
    await restoreCompanyMetadata("example", server.companyMetadata.example);
    companyMetadataSources += 1;
  }

  for (const entry of server.cvs) {
    await restoreCv(entry.cvId, entry.cv);
  }

  return {
    researchCompanies: server.researchCatalog?.companies.length ?? 0,
    researchJobs: server.researchCatalog?.job_positions.length ?? 0,
    companyMetadataSources,
    cvs: server.cvs.length,
  };
}

export async function importComposerSessionBackupFromText(
  raw: string,
): Promise<SessionBackupImportSummary> {
  const backup = parseComposerSessionBackup(raw);
  const localStorageKeys = applyComposerSessionLocalStorage(backup);
  const serverSummary = await applyComposerSessionServerBackup(backup.server);
  return {
    localStorageKeys,
    ...serverSummary,
  };
}

/** @deprecated Use importComposerSessionBackupFromText */
export async function importBrowserStorageBackupFromText(
  raw: string,
): Promise<number> {
  const summary = await importComposerSessionBackupFromText(raw);
  return summary.localStorageKeys;
}

export function formatBackupImportSummary(summary: SessionBackupImportSummary): string {
  return `Imported ${summary.localStorageKeys} browser key${summary.localStorageKeys === 1 ? "" : "s"}, ${summary.researchCompanies} researched compan${summary.researchCompanies === 1 ? "y" : "ies"}, ${summary.researchJobs} job position${summary.researchJobs === 1 ? "" : "s"}, ${summary.companyMetadataSources} metadata file${summary.companyMetadataSources === 1 ? "" : "s"}, ${summary.cvs} CV${summary.cvs === 1 ? "" : "s"}. Reloading…`;
}