import type { FieldRewriteProposal } from "@/lib/field-ai-rewrite";

import { STORAGE_KEYS } from "./constants";

export type PersistedFieldRewriteSession = {
  currentScore: number;
  proposals: FieldRewriteProposal[];
};

export type FieldRewriteProposalStore = Record<string, PersistedFieldRewriteSession>;

export type FieldRewriteStorageScope = {
  cvId: string;
  language: string;
  editorPath: string;
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

function parseSession(entry: unknown): PersistedFieldRewriteSession | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const currentScore = clampScore(record.currentScore ?? record.current_score);
  const rawProposals = Array.isArray(record.proposals) ? record.proposals : [];
  const proposals = rawProposals
    .map((item) => parseProposal(item))
    .filter((item): item is FieldRewriteProposal => item !== null)
    .slice(0, 3);
  if (currentScore === null || proposals.length < 3) {
    return null;
  }
  return { currentScore, proposals };
}

export function fieldRewriteStorageKey(scope: FieldRewriteStorageScope): string {
  const cvKey = scope.cvId.trim() || "_no_cv_";
  const language = scope.language.trim().toLowerCase() || "en";
  const editorPath = scope.editorPath.trim() || "_root_";
  const pathLabel = scope.pathLabel.trim() || "_field_";
  return `${cvKey}::${language}::${editorPath}::${pathLabel}`;
}

export function readFieldRewriteProposalStore(): FieldRewriteProposalStore {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.fieldRewriteProposals);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const store: FieldRewriteProposalStore = {};
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

export function readFieldRewriteSession(storageKey: string): PersistedFieldRewriteSession | null {
  if (!storageKey) {
    return null;
  }
  return readFieldRewriteProposalStore()[storageKey] ?? null;
}

export function writeFieldRewriteSession(
  storageKey: string,
  session: PersistedFieldRewriteSession | null,
): void {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }
  try {
    const store = readFieldRewriteProposalStore();
    if (session) {
      store[storageKey] = session;
    } else {
      delete store[storageKey];
    }
    window.localStorage.setItem(STORAGE_KEYS.fieldRewriteProposals, JSON.stringify(store));
  } catch {
    // no-op
  }
}

export function formatProposalCharacterCount(language: string, length: number): string {
  if (language === "bg") {
    return `(${length} знака)`;
  }
  return `(${length} character${length === 1 ? "" : "s"})`;
}