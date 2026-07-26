import { findKeywordHighlightSpans } from "./keyword-highlight";
import type { WeightedKeyword } from "./types";

export type KeywordGapBucket = {
  keyword: string;
  weight: number;
  role?: WeightedKeyword["role"];
  category?: string;
  evidenceCount: number;
};

export type KeywordGapReport = {
  missingMust: KeywordGapBucket[];
  missingShould: KeywordGapBucket[];
  used: KeywordGapBucket[];
  weak: KeywordGapBucket[];
  cvTextLength: number;
  keywordCount: number;
};

function flattenCvText(value: unknown, parts: string[] = []): string[] {
  if (value === null || value === undefined) {
    return parts;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) parts.push(trimmed);
    return parts;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    parts.push(String(value));
    return parts;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      flattenCvText(item, parts);
    }
    return parts;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      // Skip noisy meta
      if (key === "schema" || key === "generated_from") continue;
      flattenCvText(child, parts);
    }
  }
  return parts;
}

export function flattenCvDocumentToText(cv: unknown): string {
  return flattenCvText(cv).join("\n");
}

function toBucket(entry: WeightedKeyword): KeywordGapBucket {
  return {
    keyword: entry.keyword,
    weight: entry.weight,
    role: entry.role,
    category: typeof entry.category === "string" ? entry.category : undefined,
    evidenceCount: entry.evidence?.length ?? 0,
  };
}

function isPresentInCv(cvText: string, keyword: WeightedKeyword): boolean {
  if (!cvText.trim() || !keyword.keyword.trim()) {
    return false;
  }
  return findKeywordHighlightSpans(cvText, [keyword]).length > 0;
}

/**
 * Compare job weighted keywords against flattened CV text (stem-aware via highlight).
 */
export function computeKeywordGap(
  cv: unknown,
  keywords: WeightedKeyword[],
): KeywordGapReport {
  const cvText = flattenCvDocumentToText(cv);
  const missingMust: KeywordGapBucket[] = [];
  const missingShould: KeywordGapBucket[] = [];
  const used: KeywordGapBucket[] = [];
  const weak: KeywordGapBucket[] = [];

  const sorted = [...keywords].sort((a, b) => b.weight - a.weight);
  for (const entry of sorted) {
    if (!entry.keyword?.trim()) continue;
    const present = isPresentInCv(cvText, entry);
    const bucket = toBucket(entry);
    if (present) {
      if (entry.weight < 45) {
        weak.push(bucket);
      } else {
        used.push(bucket);
      }
      continue;
    }
    const role = entry.role ?? (entry.weight >= 75 ? "must" : entry.weight >= 55 ? "should" : "nice");
    if (role === "must" || entry.weight >= 75) {
      missingMust.push({ ...bucket, role: "must" });
    } else if (role === "should" || entry.weight >= 55) {
      missingShould.push({ ...bucket, role: "should" });
    } else {
      // nice / low — still list under should weak bucket as optional miss
      missingShould.push({ ...bucket, role: role ?? "nice" });
    }
  }

  return {
    missingMust,
    missingShould: missingShould.filter((b) => b.role !== "nice").concat(
      missingShould.filter((b) => b.role === "nice").slice(0, 8),
    ),
    used,
    weak,
    cvTextLength: cvText.length,
    keywordCount: keywords.length,
  };
}
