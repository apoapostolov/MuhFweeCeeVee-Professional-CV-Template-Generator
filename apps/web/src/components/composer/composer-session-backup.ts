import { normalizeResearchCatalog } from "../../lib/research/research-normalize";
import type { ResearchCatalog } from "../../lib/research/types";

export const COMPOSER_SESSION_BACKUP_VERSION = 4;

/** @deprecated Use COMPOSER_SESSION_BACKUP_VERSION */
export const BROWSER_STORAGE_BACKUP_VERSION = COMPOSER_SESSION_BACKUP_VERSION;

export type ComposerSessionServerBackup = {
  researchCatalog: ResearchCatalog | null;
  companyMetadata: {
    personal: unknown | null;
    example: unknown | null;
  };
  cvs: Array<{ cvId: string; cv: unknown }>;
  applications: Array<Record<string, unknown>>;
  coverLetters: Array<{
    document: Record<string, unknown>;
    versions: Array<Record<string, unknown>>;
  }>;
  careerEvidence?: Array<Record<string, unknown>>;
};

export type ComposerSessionBackupFile = {
  version: number;
  exportedAt: string;
  origin: string;
  localStorage: Record<string, string>;
  server: ComposerSessionServerBackup;
  assistantHistory?: Record<string, unknown>;
};

/** @deprecated Use ComposerSessionBackupFile */
export type BrowserStorageBackupFile = ComposerSessionBackupFile;

export type SessionBackupImportSummary = {
  localStorageKeys: number;
  researchCompanies: number;
  researchJobs: number;
  companyMetadataSources: number;
  cvs: number;
  applications: number;
  coverLetters: number;
  coverLetterVersions: number;
  careerEvidence: number;
  assistantSessions: number;
  assistantPlaybooks: number;
};

const PRIVATE_LOCAL_STORAGE_PREFIXES = ["mfcv_assistant_"];

function isPortableLocalStorageKey(key: string): boolean {
  return !PRIVATE_LOCAL_STORAGE_PREFIXES.some((prefix) =>
    key.startsWith(prefix),
  );
}

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
    if (!key || !isPortableLocalStorageKey(key)) {
      continue;
    }
    storage[key] = window.localStorage.getItem(key) ?? "";
  }
  return storage;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}.`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(
      `Could not include ${url} in the session backup: ${
        error instanceof Error ? error.message : "request failed"
      }`,
    );
  }
}

async function fetchServerSessionSnapshot(): Promise<ComposerSessionServerBackup> {
  const [
    catalogPayload,
    personalPayload,
    examplePayload,
    cvListPayload,
    applicationsPayload,
    coverLettersPayload,
    evidencePayload,
  ] = await Promise.all([
    fetchJson("/api/research/catalog"),
    fetchJson("/api/companies?source=personal"),
    fetchJson("/api/companies?source=example"),
    fetchJson("/api/cvs"),
    fetchJson("/api/applications"),
    fetchJson("/api/cover-letters"),
    fetchJson("/api/evidence"),
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
        throw new Error(`CV "${cvId}" returned no document.`);
      }
      return { cvId, cv: payload.cv };
    }),
  );

  const cvs: Array<{ cvId: string; cv: unknown }> = cvResponses;

  const applications =
    isRecord(applicationsPayload) && Array.isArray(applicationsPayload.applications)
      ? applicationsPayload.applications.filter(isRecord)
      : [];

  const letterDocuments =
    isRecord(coverLettersPayload) && Array.isArray(coverLettersPayload.items)
      ? coverLettersPayload.items.filter(isRecord)
      : [];
  const coverLetters = await Promise.all(
    letterDocuments.map(async (document) => {
      const id = typeof document.id === "string" ? document.id.trim() : "";
      if (!id) {
        throw new Error("Cover-letter list returned an item without an id.");
      }
      const versionsPayload = await fetchJson(
        `/api/cover-letters?id=${encodeURIComponent(id)}&versions=1`,
      );
      const versionMetas =
        isRecord(versionsPayload) && Array.isArray(versionsPayload.versions)
          ? versionsPayload.versions.filter(isRecord)
          : [];
      const versions = await Promise.all(
        versionMetas.map(async (meta) => {
          const version = Number(meta.version);
          if (!Number.isFinite(version) || version < 1) {
            throw new Error(`Cover letter "${id}" returned an invalid version.`);
          }
          const payload = await fetchJson(
            `/api/cover-letters?id=${encodeURIComponent(id)}&version=${version}`,
          );
          if (!isRecord(payload) || !isRecord(payload.version)) {
            throw new Error(`Cover letter "${id}" version ${version} returned no body.`);
          }
          return payload.version;
        }),
      );
      return { document, versions };
    }),
  );
  const careerEvidence =
    isRecord(evidencePayload) && Array.isArray(evidencePayload.entries)
      ? evidencePayload.entries.filter(isRecord)
      : [];

  return {
    researchCatalog,
    companyMetadata,
    cvs,
    applications,
    coverLetters,
    careerEvidence,
  };
}

export async function buildComposerSessionBackup(
  options: { includeAssistantHistory?: boolean } = {},
): Promise<ComposerSessionBackupFile> {
  const server = await fetchServerSessionSnapshot();
  let assistantHistory: Record<string, unknown> | undefined;
  if (options.includeAssistantHistory) {
    const payload = await fetchJson("/api/assistant/portable-history");
    if (!isRecord(payload) || !isRecord(payload.assistantHistory)) {
      throw new Error("Assistant history export returned no portable history.");
    }
    assistantHistory = payload.assistantHistory;
  }
  return {
    version: COMPOSER_SESSION_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    origin: typeof window !== "undefined" ? window.location.origin : "",
    localStorage: readAllBrowserLocalStorage(),
    server,
    ...(assistantHistory ? { assistantHistory } : {}),
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
  const applications = backup.server.applications.length;
  const coverLetters = backup.server.coverLetters.length;
  const coverLetterVersions = backup.server.coverLetters.reduce(
    (total, letter) => total + letter.versions.length,
    0,
  );
  const careerEvidence = backup.server.careerEvidence?.length ?? 0;
  const assistantSessions = Array.isArray(backup.assistantHistory?.sessions)
    ? backup.assistantHistory.sessions.length
    : 0;
  return `Exported ${storageKeys} browser key${storageKeys === 1 ? "" : "s"}, ${companies} researched compan${companies === 1 ? "y" : "ies"}, ${jobs} job position${jobs === 1 ? "" : "s"}, ${metadataSources} metadata file${metadataSources === 1 ? "" : "s"}, ${cvs} CV${cvs === 1 ? "" : "s"}, ${applications} application${applications === 1 ? "" : "s"}, ${coverLetters} cover letter${coverLetters === 1 ? "" : "s"} with ${coverLetterVersions} saved version${coverLetterVersions === 1 ? "" : "s"}, ${careerEvidence} career evidence entr${careerEvidence === 1 ? "y" : "ies"}, and ${assistantSessions} opt-in assistant conversation${assistantSessions === 1 ? "" : "s"}.`;
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
  const applications = Array.isArray(server.applications)
    ? server.applications.filter(isRecord)
    : [];
  const coverLetters = Array.isArray(server.coverLetters)
    ? server.coverLetters
        .map((entry) => {
          if (!isRecord(entry) || !isRecord(entry.document)) {
            return null;
          }
          return {
            document: entry.document,
            versions: Array.isArray(entry.versions)
              ? entry.versions.filter(isRecord)
              : [],
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            document: Record<string, unknown>;
            versions: Array<Record<string, unknown>>;
          } => entry !== null,
        )
    : [];
  const careerEvidence = Array.isArray(server.careerEvidence)
    ? server.careerEvidence.filter(isRecord)
    : [];

  return {
    researchCatalog,
    companyMetadata: {
      personal: metadataRecord.personal ?? null,
      example: metadataRecord.example ?? null,
    },
    cvs,
    applications,
    coverLetters,
    careerEvidence,
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
    applications: [],
    coverLetters: [],
    careerEvidence: [],
  };

  if (
    Object.keys(localStorage).length === 0 &&
    !server.researchCatalog &&
    server.cvs.length === 0 &&
    server.applications.length === 0 &&
    server.coverLetters.length === 0
    && (server.careerEvidence?.length ?? 0) === 0
  ) {
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
    ...(isRecord(parsed.assistantHistory)
      ? { assistantHistory: parsed.assistantHistory }
      : {}),
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
    if (!isPortableLocalStorageKey(key)) continue;
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

async function restoreCoverLetter(
  entry: ComposerSessionServerBackup["coverLetters"][number],
): Promise<number> {
  const document = entry.document;
  const id = typeof document.id === "string" ? document.id.trim() : "";
  const cvId = typeof document.cv_id === "string" ? document.cv_id.trim() : "";
  if (!id || !cvId) {
    throw new Error("Cover-letter backup item is missing id or cv_id.");
  }

  const orderedVersions = [...entry.versions].sort(
    (a, b) => Number(a.version ?? 0) - Number(b.version ?? 0),
  );
  const states = [...orderedVersions, document];
  let restoredVersions = 0;
  let previousSignature = "";
  for (const state of states) {
    const title =
      typeof state.title === "string" && state.title.trim()
        ? state.title.trim()
        : "Cover letter";
    const body = typeof state.body === "string" ? state.body : "";
    const signature = `${title}\u0000${body}`;
    if (signature === previousSignature) {
      continue;
    }
    previousSignature = signature;
    const response = await fetch("/api/cover-letters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "save",
        id,
        cvId,
        companyId:
          typeof document.company_id === "string" ? document.company_id : undefined,
        jobId: typeof document.job_id === "string" ? document.job_id : undefined,
        title,
        body,
        language:
          typeof document.language === "string" ? document.language : undefined,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(
        payload.error ?? `Could not restore cover letter "${id}".`,
      );
    }
    restoredVersions += 1;
  }
  return restoredVersions;
}

async function restoreApplication(application: Record<string, unknown>): Promise<void> {
  const response = await fetch("/api/applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...application, action: "upsert" }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    const id = typeof application.id === "string" ? application.id : "unknown";
    throw new Error(
      payload.error ?? `Could not restore application "${id}".`,
    );
  }
}

async function restoreCareerEvidence(
  evidence: Record<string, unknown>,
): Promise<void> {
  const response = await fetch("/api/evidence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(evidence),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Could not restore career evidence.");
  }
}

export async function applyComposerSessionServerBackup(
  server: ComposerSessionServerBackup,
): Promise<
  Pick<
    SessionBackupImportSummary,
    | "researchCompanies"
    | "researchJobs"
    | "companyMetadataSources"
    | "cvs"
    | "applications"
    | "coverLetters"
    | "coverLetterVersions"
    | "careerEvidence"
  >
> {
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

  let coverLetterVersions = 0;
  for (const entry of server.coverLetters) {
    coverLetterVersions += await restoreCoverLetter(entry);
  }

  for (const application of server.applications) {
    await restoreApplication(application);
  }
  for (const evidence of server.careerEvidence ?? []) {
    await restoreCareerEvidence(evidence);
  }

  return {
    researchCompanies: server.researchCatalog?.companies.length ?? 0,
    researchJobs: server.researchCatalog?.job_positions.length ?? 0,
    companyMetadataSources,
    cvs: server.cvs.length,
    applications: server.applications.length,
    coverLetters: server.coverLetters.length,
    coverLetterVersions,
    careerEvidence: server.careerEvidence?.length ?? 0,
  };
}

export async function importComposerSessionBackupFromText(
  raw: string,
): Promise<SessionBackupImportSummary> {
  const backup = parseComposerSessionBackup(raw);
  const localStorageKeys = applyComposerSessionLocalStorage(backup);
  const serverSummary = await applyComposerSessionServerBackup(backup.server);
  let assistantSessions = 0;
  let assistantPlaybooks = 0;
  if (backup.assistantHistory) {
    const response = await fetch("/api/assistant/portable-history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(backup.assistantHistory),
    });
    if (!response.ok) {
      throw new Error(`Could not restore assistant history: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      sessions?: number;
      playbooks?: number;
    };
    assistantSessions = payload.sessions ?? 0;
    assistantPlaybooks = payload.playbooks ?? 0;
  }
  return {
    localStorageKeys,
    ...serverSummary,
    assistantSessions,
    assistantPlaybooks,
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
  return `Imported ${summary.localStorageKeys} browser key${summary.localStorageKeys === 1 ? "" : "s"}, ${summary.researchCompanies} researched compan${summary.researchCompanies === 1 ? "y" : "ies"}, ${summary.researchJobs} job position${summary.researchJobs === 1 ? "" : "s"}, ${summary.companyMetadataSources} metadata file${summary.companyMetadataSources === 1 ? "" : "s"}, ${summary.cvs} CV${summary.cvs === 1 ? "" : "s"}, ${summary.applications} application${summary.applications === 1 ? "" : "s"}, ${summary.coverLetters} cover letter${summary.coverLetters === 1 ? "" : "s"} with ${summary.coverLetterVersions} restored version${summary.coverLetterVersions === 1 ? "" : "s"}, ${summary.careerEvidence} career evidence entr${summary.careerEvidence === 1 ? "y" : "ies"}, ${summary.assistantSessions} archived assistant conversation${summary.assistantSessions === 1 ? "" : "s"}, and ${summary.assistantPlaybooks} playbook${summary.assistantPlaybooks === 1 ? "" : "s"}. Reloading…`;
}
