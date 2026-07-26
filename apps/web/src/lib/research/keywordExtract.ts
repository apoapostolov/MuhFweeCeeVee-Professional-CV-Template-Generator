import { keywordCanonicalKey } from "./keyword-stem";
import {
  categorizeLexiconTerm,
  SKILL_PHRASES,
  SKILL_TERMS,
  type LexiconCategory,
} from "./skillLexicon";
import type { KeywordEvidence, WeightedKeyword } from "./types";
import { mergeWeightedKeywords } from "./weighted-keywords";

const GENERIC_STOP = new Set([
  "and",
  "the",
  "for",
  "with",
  "you",
  "our",
  "will",
  "are",
  "this",
  "that",
  "from",
  "your",
  "have",
  "has",
  "been",
  "using",
  "use",
  "work",
  "working",
  "team",
  "teams",
  "role",
  "job",
  "experience",
  "years",
  "year",
  "ability",
  "strong",
  "good",
  "etc",
  "including",
  "across",
  "within",
  "about",
  "into",
  "also",
  "other",
  "such",
  "than",
  "their",
  "they",
  "them",
  "we",
  "us",
  "or",
  "as",
  "an",
  "a",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "is",
  "be",
  "can",
  "must",
  "should",
  "may",
  "not",
]);

export type ExtractKeywordsInput = {
  rawJdText: string;
  jobTitle?: string;
  existing?: WeightedKeyword[];
};

export type ExtractKeywordsResult = {
  keywords: WeightedKeyword[];
  stats: {
    jdChars: number;
    phraseHits: number;
    termHits: number;
    titleHits: number;
  };
};

function countOccurrences(haystackLower: string, needleLower: string): number {
  if (!needleLower) return 0;
  let count = 0;
  let idx = 0;
  while (idx < haystackLower.length) {
    const found = haystackLower.indexOf(needleLower, idx);
    if (found < 0) break;
    count += 1;
    idx = found + Math.max(1, needleLower.length);
  }
  return count;
}

function wholeWordCount(textLower: string, termLower: string): number {
  if (!termLower || termLower.includes(" ")) {
    return countOccurrences(textLower, termLower);
  }
  const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");
  return (textLower.match(re) ?? []).length;
}

function snippetAround(text: string, needle: string, maxLen = 80): string {
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  const at = lower.indexOf(n);
  if (at < 0) return needle;
  const start = Math.max(0, at - 20);
  const end = Math.min(text.length, at + needle.length + 40);
  let snip = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snip = `…${snip}`;
  if (end < text.length) snip = `${snip}…`;
  return snip.slice(0, maxLen);
}

function baseWeight(args: {
  count: number;
  inTitle: boolean;
  category: LexiconCategory;
}): number {
  let w = 35 + Math.min(40, args.count * 12);
  if (args.inTitle) w += 20;
  if (args.category === "soft") w -= 10;
  if (args.category === "tool" || args.category === "skill") w += 5;
  if (args.category === "position" || args.category === "seniority") w += 8;
  return Math.max(0, Math.min(100, Math.round(w)));
}

function roleFromWeight(weight: number, inTitle: boolean): WeightedKeyword["role"] {
  if (inTitle || weight >= 75) return "must";
  if (weight >= 55) return "should";
  return "nice";
}

/**
 * Local JD + title keyword extraction (no AI, no web).
 */
export function extractKeywordsFromJd(input: ExtractKeywordsInput): ExtractKeywordsResult {
  const jd = input.rawJdText?.trim() ?? "";
  const title = input.jobTitle?.trim() ?? "";
  const jdLower = jd.toLowerCase();
  const titleLower = title.toLowerCase();
  const draft: WeightedKeyword[] = [];

  let phraseHits = 0;
  let termHits = 0;
  let titleHits = 0;

  const seen = new Set<string>();

  const addHit = (
    surface: string,
    count: number,
    kind: KeywordEvidence["kind"],
    category: LexiconCategory,
  ) => {
    const key = keywordCanonicalKey(surface);
    if (!key || seen.has(key)) return;
    if (count <= 0 && kind !== "title") return;
    seen.add(key);

    const inTitle = kind === "title" || wholeWordCount(titleLower, surface.toLowerCase()) > 0;
    if (inTitle) titleHits += 1;
    if (kind === "jd_quote") {
      if (surface.includes(" ")) phraseHits += 1;
      else termHits += 1;
    }

    const evidence: KeywordEvidence[] = [];
    if (kind === "jd_quote" && jd) {
      evidence.push({
        kind: "jd_quote",
        text: snippetAround(jd, surface),
        count,
      });
    }
    if (inTitle) {
      evidence.push({ kind: "title", text: title.slice(0, 120), count: 1 });
    }

    const weight = baseWeight({ count: Math.max(1, count), inTitle, category });
    draft.push({
      keyword: surface,
      weight,
      category,
      role: roleFromWeight(weight, inTitle),
      evidence,
      source: "extract",
      canonical_key: key,
    });
  };

  // Phrases first (longer matches)
  const phrases = [...SKILL_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const count = wholeWordCount(jdLower, phrase.toLowerCase());
    const titleCount = wholeWordCount(titleLower, phrase.toLowerCase());
    if (count > 0) {
      addHit(phrase, count, "jd_quote", categorizeLexiconTerm(phrase));
    } else if (titleCount > 0) {
      addHit(phrase, titleCount, "title", categorizeLexiconTerm(phrase));
    }
  }

  for (const term of SKILL_TERMS) {
    if (GENERIC_STOP.has(term.toLowerCase())) continue;
    const count = wholeWordCount(jdLower, term.toLowerCase());
    const titleCount = wholeWordCount(titleLower, term.toLowerCase());
    if (count > 0) {
      addHit(term, count, "jd_quote", categorizeLexiconTerm(term));
    } else if (titleCount > 0) {
      addHit(term, titleCount, "title", categorizeLexiconTerm(term));
    }
  }

  // Title tokens not in lexicon (position signals)
  for (const token of title.split(/[^a-zA-Z0-9+#./-]+/).filter((t) => t.length >= 3)) {
    if (GENERIC_STOP.has(token.toLowerCase())) continue;
    const key = keywordCanonicalKey(token);
    if (!key || seen.has(key)) continue;
    addHit(token, 1, "title", "position");
  }

  const merged = mergeWeightedKeywords([...(input.existing ?? []), ...draft]);
  // Prefer extract evidence when merging with empty existing
  return {
    keywords: merged,
    stats: {
      jdChars: jd.length,
      phraseHits,
      termHits,
      titleHits,
    },
  };
}
