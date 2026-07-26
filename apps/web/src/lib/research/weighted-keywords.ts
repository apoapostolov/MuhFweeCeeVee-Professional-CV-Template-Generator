import type { KeywordEvidence, WeightedKeyword } from "./types";
import { keywordCanonicalKey } from "./keyword-stem";

export const WEIGHTED_KEYWORD_CATEGORIES = [
  "position",
  "seniority",
  "industry",
  "skill",
  "tool",
  "domain",
  "soft",
  "certification",
  "methodology",
] as const;

export type WeightedKeywordCategory = (typeof WEIGHTED_KEYWORD_CATEGORIES)[number];

/** D3: AI keywords without evidence cannot exceed this weight. */
export const UNVERIFIED_KEYWORD_WEIGHT_CAP = 40;

function normalizeCategory(raw: string | undefined): WeightedKeywordCategory | undefined {
  if (!raw) {
    return undefined;
  }
  const lower = raw.trim().toLowerCase();
  if (WEIGHTED_KEYWORD_CATEGORIES.includes(lower as WeightedKeywordCategory)) {
    return lower as WeightedKeywordCategory;
  }
  if (lower === "tech" || lower === "stack") {
    return "tool";
  }
  if (lower === "leadership" || lower === "management") {
    return "seniority";
  }
  // Closed enum only — drop freeform categories (D3)
  return undefined;
}

function normalizeRole(raw: unknown): WeightedKeyword["role"] | undefined {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "must" || value === "should" || value === "nice") {
    return value;
  }
  return undefined;
}

function normalizeSource(raw: unknown): WeightedKeyword["source"] | undefined {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "extract" || value === "ai" || value === "user") {
    return value;
  }
  return undefined;
}

function normalizeEvidence(raw: unknown): KeywordEvidence[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: KeywordEvidence[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const kind = String(record.kind ?? "").trim().toLowerCase();
    if (kind !== "jd_quote" && kind !== "title" && kind !== "source_url" && kind !== "manual") {
      continue;
    }
    const item: KeywordEvidence = { kind };
    if (typeof record.text === "string" && record.text.trim()) {
      item.text = record.text.trim().slice(0, 280);
    }
    if (typeof record.url === "string" && record.url.trim()) {
      item.url = record.url.trim();
    }
    const count = Number(record.count);
    if (Number.isFinite(count) && count > 0) {
      item.count = Math.round(count);
    }
    out.push(item);
  }
  return out.length > 0 ? out : undefined;
}

function hasEvidence(entry: WeightedKeyword): boolean {
  return Array.isArray(entry.evidence) && entry.evidence.length > 0;
}

/** Apply D3 soft cap unless user-owned or has evidence. */
export function applyUnverifiedWeightCap(entry: WeightedKeyword): WeightedKeyword {
  if (entry.source === "user" || hasEvidence(entry)) {
    return entry;
  }
  if (entry.weight <= UNVERIFIED_KEYWORD_WEIGHT_CAP) {
    return entry;
  }
  return { ...entry, weight: UNVERIFIED_KEYWORD_WEIGHT_CAP };
}

/** Prefer shorter surface form when stems collide; keep highest weight. */
function pickDisplayKeyword(current: string, candidate: string): string {
  const a = current.trim();
  const b = candidate.trim();
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  if (a.length <= b.length) {
    return a;
  }
  return b;
}

function mergeEvidence(
  a?: KeywordEvidence[],
  b?: KeywordEvidence[],
): KeywordEvidence[] | undefined {
  const combined = [...(a ?? []), ...(b ?? [])];
  if (combined.length === 0) return undefined;
  const seen = new Set<string>();
  const out: KeywordEvidence[] = [];
  for (const item of combined) {
    const key = `${item.kind}|${item.text ?? ""}|${item.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function mergeWeightedKeywords(keywords: WeightedKeyword[]): WeightedKeyword[] {
  const groups = new Map<string, WeightedKeyword>();

  for (const entry of keywords) {
    const keyword = entry.keyword.trim();
    if (!keyword) {
      continue;
    }
    const key = keywordCanonicalKey(keyword);
    if (!key) {
      continue;
    }
    const capped = applyUnverifiedWeightCap({
      ...entry,
      keyword,
      weight: Math.max(0, Math.min(100, Math.round(entry.weight))),
      category: normalizeCategory(
        typeof entry.category === "string" ? entry.category : undefined,
      ),
      role: entry.role,
      source: entry.source,
      evidence: entry.evidence,
      canonical_key: key,
    });

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, capped);
      continue;
    }
    const merged: WeightedKeyword = {
      keyword: pickDisplayKeyword(existing.keyword, capped.keyword),
      weight: Math.max(existing.weight, capped.weight),
      category: existing.category ?? capped.category,
      role: existing.role ?? capped.role,
      rationale: existing.rationale ?? capped.rationale,
      evidence: mergeEvidence(existing.evidence, capped.evidence),
      source:
        existing.source === "user" || capped.source === "user"
          ? "user"
          : existing.source === "extract" || capped.source === "extract"
            ? "extract"
            : existing.source ?? capped.source,
      canonical_key: key,
    };
    groups.set(key, applyUnverifiedWeightCap(merged));
  }

  return [...groups.values()].sort(
    (a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword),
  );
}

export function parseWeightedKeywordsFromProposal(
  proposal: unknown,
  options?: { forceSource?: WeightedKeyword["source"] },
): WeightedKeyword[] {
  const raw = Array.isArray(proposal)
    ? proposal
    : proposal &&
        typeof proposal === "object" &&
        Array.isArray((proposal as { weighted_keywords?: unknown }).weighted_keywords)
      ? (proposal as { weighted_keywords: unknown[] }).weighted_keywords
      : [];
  const draft: WeightedKeyword[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const keyword = String(record.keyword ?? "").trim();
    const weightRaw = Number(record.weight);
    if (!keyword || !Number.isFinite(weightRaw)) {
      continue;
    }
    // AI must not claim source: user (D3)
    let source = normalizeSource(record.source);
    if (source === "user" && options?.forceSource !== "user") {
      source = options?.forceSource ?? "ai";
    }
    if (options?.forceSource) {
      source = options.forceSource;
    }
    draft.push({
      keyword,
      weight: Math.max(0, Math.min(100, Math.round(weightRaw))),
      category: typeof record.category === "string" ? record.category : undefined,
      role: normalizeRole(record.role),
      rationale: typeof record.rationale === "string" ? record.rationale : undefined,
      evidence: normalizeEvidence(record.evidence),
      source: source ?? "ai",
    });
  }
  return mergeWeightedKeywords(draft);
}

export const WEIGHTED_KEYWORD_AI_INSTRUCTIONS = [
  "Weighted keywords power CV tailoring and ATS alignment.",
  "Prefer terms grounded in the job description. Attach evidence when possible:",
  '  evidence: [{ "kind": "jd_quote", "text": "short span from JD", "count": 1 }]',
  "Categories must be one of: " + WEIGHTED_KEYWORD_CATEGORIES.join(", ") + ".",
  "role: must | should | nice.",
  "Do not set source to user. Unverified terms will be weight-capped at 40.",
  "Canonical surface forms: ONE entry per concept; no inflection duplicates.",
].join("\n");
