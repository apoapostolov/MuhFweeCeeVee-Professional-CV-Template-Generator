import type { WeightedKeyword } from "./types";
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

function normalizeCategory(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const lower = raw.trim().toLowerCase();
  if (WEIGHTED_KEYWORD_CATEGORIES.includes(lower as WeightedKeywordCategory)) {
    return lower;
  }
  if (lower === "tech" || lower === "stack") {
    return "tool";
  }
  if (lower === "leadership" || lower === "management") {
    return "seniority";
  }
  return lower;
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

export function mergeWeightedKeywords(keywords: WeightedKeyword[]): WeightedKeyword[] {
  const groups = new Map<
    string,
    { keyword: string; weight: number; category?: string; rationale?: string }
  >();

  for (const entry of keywords) {
    const keyword = entry.keyword.trim();
    if (!keyword) {
      continue;
    }
    const key = keywordCanonicalKey(keyword);
    if (!key) {
      continue;
    }
    const weight = Math.max(0, Math.min(100, Math.round(entry.weight)));
    const category = normalizeCategory(entry.category);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        keyword,
        weight,
        category,
        rationale: entry.rationale?.trim(),
      });
      continue;
    }
    existing.weight = Math.max(existing.weight, weight);
    existing.keyword = pickDisplayKeyword(existing.keyword, keyword);
    if (!existing.category && category) {
      existing.category = category;
    }
    if (!existing.rationale && entry.rationale?.trim()) {
      existing.rationale = entry.rationale.trim();
    }
  }

  return [...groups.values()].sort((a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword));
}

export function parseWeightedKeywordsFromProposal(proposal: unknown): WeightedKeyword[] {
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
    draft.push({
      keyword,
      weight: Math.max(0, Math.min(100, Math.round(weightRaw))),
      category: typeof record.category === "string" ? record.category : undefined,
      rationale: typeof record.rationale === "string" ? record.rationale : undefined,
    });
  }
  return mergeWeightedKeywords(draft);
}

export const WEIGHTED_KEYWORD_AI_INSTRUCTIONS = [
  "Weighted keywords power CV tailoring and ATS alignment. Produce a LARGE, diverse set (target 45–90 entries after dedup), not ~20 obvious terms.",
  "",
  "Coverage buckets (use category on each entry):",
  "- position (8–18): role-specific nouns/verbs from the posting — deliverables, scope, tech named in the JD, team/product context.",
  "- seniority (6–12): level signals — ownership, mentorship, strategy, stakeholder mgmt, IC vs lead, years band language.",
  "- industry (15–30): modern domain vocabulary beyond the JD — adjacent trends, stack ecosystem, regulations, methodologies, buyer/market terms for this industry even if not listed on the posting.",
  "- skill | tool | domain | soft | certification | methodology: fill remaining depth; prefer specific over generic.",
  "",
  "Canonical surface forms (critical):",
  "- ONE entry per concept. Use dictionary/base forms: integrate (not integrating AND integration), analyze (not analysis AND analyzing).",
  "- Do not list inflection variants, plural duplicates, or near-synonyms that share the same root.",
  "- Multi-word phrases OK when the phrase is the unit (e.g. machine learning, product discovery).",
  "",
  "Weights 0–100: position/seniority core terms 75–95; industry adjacency 55–80; supporting soft/domain 35–65; generic filler (team player, fast-paced) avoid or ≤30.",
  "Optional short rationale on high-weight terms only.",
].join("\n");