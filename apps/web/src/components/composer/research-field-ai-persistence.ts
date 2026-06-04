import type { ResearchFieldProposal } from "@/lib/research/research-field-refine";

import { STORAGE_KEYS } from "./constants";

export type PersistedResearchFieldSession = {
  currentScore: number;
  proposals: ResearchFieldProposal[];
};

export type ResearchFieldResearchStore = Record<string, PersistedResearchFieldSession>;

export type ResearchFieldStorageScope = {
  entityType: string;
  entityId: string;
  fieldPath: string;
};

function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseProposal(entry: unknown): ResearchFieldProposal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const confidence = clampScore(record.confidence);
  if (confidence === null || !("value" in record)) {
    return null;
  }
  const preview = typeof record.preview === "string" ? record.preview.trim() : "";
  if (!preview) {
    return null;
  }
  return { confidence, preview, value: record.value };
}

function parseSession(entry: unknown): PersistedResearchFieldSession | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const currentScore = clampScore(record.currentScore ?? record.current_score);
  const rawProposals = Array.isArray(record.proposals) ? record.proposals : [];
  const proposals = rawProposals
    .map((item) => parseProposal(item))
    .filter((item): item is ResearchFieldProposal => item !== null)
    .slice(0, 3);
  if (currentScore === null || proposals.length === 0) {
    return null;
  }
  return { currentScore, proposals };
}

export function researchFieldStorageKey(scope: ResearchFieldStorageScope): string {
  return `${scope.entityType}:${scope.entityId}:${scope.fieldPath}`;
}

function readStore(): ResearchFieldResearchStore {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.researchFieldProposals);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as ResearchFieldResearchStore;
  } catch {
    return {};
  }
}

function writeStore(store: ResearchFieldResearchStore): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.researchFieldProposals, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

export function readResearchFieldSession(key: string): PersistedResearchFieldSession | null {
  const session = readStore()[key];
  return parseSession(session);
}

export function writeResearchFieldSession(
  key: string,
  session: PersistedResearchFieldSession | null,
): void {
  const store = readStore();
  if (!session) {
    delete store[key];
  } else {
    store[key] = session;
  }
  writeStore(store);
}