import type { FieldRewriteProposal } from "@/lib/field-ai-rewrite";

import { STORAGE_KEYS } from "./constants";

export type PersistedCompanyFieldResearchSession = {
  proposals: FieldRewriteProposal[];
};

export type CompanyFieldResearchStore = Record<string, PersistedCompanyFieldResearchSession>;

export type CompanyFieldResearchStorageScope = {
  metadataSource: string;
  pathLabel: string;
};

function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseProposal(entry: unknown): FieldRewriteProposal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  const confidence = clampScore(record.confidence);
  if (!text || confidence === null) {
    return null;
  }
  return { text, confidence };
}

function parseSession(entry: unknown): PersistedCompanyFieldResearchSession | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const rawProposals = Array.isArray(record.proposals) ? record.proposals : [];
  const proposals = rawProposals
    .map((item) => parseProposal(item))
    .filter((item): item is FieldRewriteProposal => item !== null)
    .slice(0, 3);
  if (proposals.length < 3) {
    return null;
  }
  return { proposals };
}

export function companyFieldResearchStorageKey(scope: CompanyFieldResearchStorageScope): string {
  const source = scope.metadataSource.trim() || "example";
  const pathLabel = scope.pathLabel.trim() || "_field_";
  return `${source}::${pathLabel}`;
}

export function readCompanyFieldResearchStore(): CompanyFieldResearchStore {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.companyFieldResearchProposals);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const store: CompanyFieldResearchStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const session = parseSession(value);
      if (session) {
        store[key] = session;
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function readCompanyFieldResearchSession(
  storageKey: string,
): PersistedCompanyFieldResearchSession | null {
  if (!storageKey) {
    return null;
  }
  return readCompanyFieldResearchStore()[storageKey] ?? null;
}

export function writeCompanyFieldResearchSession(
  storageKey: string,
  session: PersistedCompanyFieldResearchSession | null,
): void {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }
  try {
    const store = readCompanyFieldResearchStore();
    if (session) {
      store[storageKey] = session;
    } else {
      delete store[storageKey];
    }
    window.localStorage.setItem(STORAGE_KEYS.companyFieldResearchProposals, JSON.stringify(store));
  } catch {
    // no-op
  }
}