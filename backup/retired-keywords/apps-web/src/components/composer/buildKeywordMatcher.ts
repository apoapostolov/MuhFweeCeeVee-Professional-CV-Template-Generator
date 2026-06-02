import type { KeywordBand, KeywordStudioResponse } from "./types";

export type KeywordMatcherEntry = {
  keyword: string;
  normalized: number;
  band: KeywordBand;
  weight: number;
  status: "missing" | "underused" | "used";
  cvHits: number;
  targetHits: number;
  recommendation: string;
  usageRatio: number;
  source?: "jd" | "senior_leadership" | "game_generic" | "combined";
  category?: string;
};

export type KeywordMatcher = {
  tokenIndex: Map<string, KeywordMatcherEntry>;
  phraseIndex: Map<string, KeywordMatcherEntry>;
  maxPhraseWords: number;
};

export function buildKeywordMatcher(
  keywords: KeywordStudioResponse["keywords"] | undefined,
): KeywordMatcher {
  const tokenIndex = new Map<string, KeywordMatcherEntry>();
  const phraseIndex = new Map<string, KeywordMatcherEntry>();
  let maxPhraseWords = 1;

  for (const item of keywords ?? []) {
    const normalizedTokens = item.keyword
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
    if (normalizedTokens.length === 0) {
      continue;
    }

    const phrase = normalizedTokens.join(" ");
    const existingPhrase = phraseIndex.get(phrase);
    if (!existingPhrase || item.weight > existingPhrase.weight) {
      phraseIndex.set(phrase, {
        keyword: item.keyword,
        normalized: item.normalized,
        band: item.band,
        weight: item.weight,
        status: item.status,
        cvHits: item.cvHits,
        targetHits: item.targetHits,
        recommendation: item.recommendation,
        usageRatio: item.usageRatio,
        source: item.source,
        category: item.category,
      });
    }

    maxPhraseWords = Math.max(maxPhraseWords, normalizedTokens.length);

    for (const token of normalizedTokens) {
      const existing = tokenIndex.get(token);
      if (!existing || item.weight > existing.weight) {
        tokenIndex.set(token, {
          keyword: item.keyword,
          normalized: item.normalized,
          band: item.band,
          weight: item.weight,
          status: item.status,
          cvHits: item.cvHits,
          targetHits: item.targetHits,
          recommendation: item.recommendation,
          usageRatio: item.usageRatio,
          source: item.source,
          category: item.category,
        });
      }
    }
  }

  return {
    tokenIndex,
    phraseIndex,
    maxPhraseWords: Math.max(1, Math.min(maxPhraseWords, 5)),
  };
}