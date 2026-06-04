import { keywordCanonicalKey, tokenizeForKeywordMatch } from "./keyword-stem";
import { mergeWeightedKeywords } from "./weighted-keywords";
import type { WeightedKeyword } from "./types";

export type KeywordHighlightTheme = "light" | "dark";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Shared Tailwind classes for weight-graded keyword text (thin dotted underline). */
export const KEYWORD_WEIGHT_UNDERLINE_CLASS =
  "underline decoration-1 decoration-dotted underline-offset-2";

export function keywordWeightTone(theme: KeywordHighlightTheme, weight: number): string {
  if (theme === "dark") {
    if (weight >= 85) return "text-emerald-300";
    if (weight >= 70) return "text-amber-300";
    return "text-rose-300";
  }
  if (weight >= 85) return "text-emerald-700";
  if (weight >= 70) return "text-amber-700";
  return "text-rose-700";
}

type StemIndex = {
  singleWord: Map<string, { weight: number; keyword: string }>;
  phrases: Array<{ stems: string[]; weight: number; keyword: string }>;
};

function buildKeywordStemIndex(keywords: WeightedKeyword[]): StemIndex {
  const merged = mergeWeightedKeywords(keywords);
  const singleWord = new Map<string, { weight: number; keyword: string }>();
  const phrases: StemIndex["phrases"] = [];

  for (const entry of merged) {
    const key = keywordCanonicalKey(entry.keyword);
    if (!key) {
      continue;
    }
    const stems = key.split(" ").filter(Boolean);
    if (stems.length <= 1) {
      singleWord.set(key, { weight: entry.weight, keyword: entry.keyword });
    } else {
      phrases.push({ stems, weight: entry.weight, keyword: entry.keyword });
    }
  }

  phrases.sort((a, b) => b.stems.length - a.stems.length);
  return { singleWord, phrases };
}

type HighlightSpan = { start: number; end: number; weight: number };

export type EditorKeywordHighlightKind = "weighted" | "ats";

export type EditorKeywordHighlightSpan =
  | { start: number; end: number; kind: "weighted"; weight: number }
  | { start: number; end: number; kind: "ats" };

/** Mid cyan — readable on light and dark editor surfaces. */
export function atsKeywordTone(theme: KeywordHighlightTheme): string {
  return theme === "dark" ? "text-cyan-400" : "text-cyan-600";
}

/** Merge weighted overlaps by max weight; weighted beats ATS on the same character. */
function resolveEditorKeywordHighlightSpans(
  spans: EditorKeywordHighlightSpan[],
  textLength: number,
): EditorKeywordHighlightSpan[] {
  if (spans.length === 0 || textLength <= 0) {
    return [];
  }

  type CharTag = { kind: "weighted"; weight: number } | { kind: "ats" };
  const tags: Array<CharTag | null> = new Array(textLength).fill(null);

  for (const span of spans) {
    const start = Math.max(0, span.start);
    const end = Math.min(textLength, span.end);
    for (let index = start; index < end; index += 1) {
      if (span.kind === "weighted") {
        const existing = tags[index];
        if (!existing || existing.kind !== "weighted" || span.weight > existing.weight) {
          tags[index] = { kind: "weighted", weight: span.weight };
        }
      } else if (!tags[index]) {
        tags[index] = { kind: "ats" };
      }
    }
  }

  const resolved: EditorKeywordHighlightSpan[] = [];
  let runStart = -1;
  let runTag: CharTag | null = null;
  for (let index = 0; index <= textLength; index += 1) {
    const tag = index < textLength ? tags[index] : null;
    const sameRun =
      tag &&
      runTag &&
      tag.kind === runTag.kind &&
      (tag.kind !== "weighted" || runTag.kind !== "weighted" || tag.weight === runTag.weight);
    if (tag && (runStart < 0 || sameRun)) {
      if (runStart < 0) {
        runStart = index;
        runTag = tag;
      }
      continue;
    }
    if (runStart >= 0 && runTag) {
      if (runTag.kind === "weighted") {
        resolved.push({ start: runStart, end: index, kind: "weighted", weight: runTag.weight });
      } else {
        resolved.push({ start: runStart, end: index, kind: "ats" });
      }
      runStart = -1;
      runTag = null;
    }
    if (tag) {
      runStart = index;
      runTag = tag;
    }
  }

  return resolved;
}

/** Merge overlaps by keeping the highest weight per character, then coalesce runs. */
function resolveHighlightSpans(spans: HighlightSpan[], textLength: number): HighlightSpan[] {
  if (spans.length === 0 || textLength <= 0) {
    return [];
  }

  const weights = new Int16Array(textLength).fill(-1);
  for (const span of spans) {
    const start = Math.max(0, span.start);
    const end = Math.min(textLength, span.end);
    for (let index = start; index < end; index += 1) {
      if (span.weight > weights[index]) {
        weights[index] = span.weight;
      }
    }
  }

  const resolved: HighlightSpan[] = [];
  let runStart = -1;
  let runWeight = -1;
  for (let index = 0; index <= textLength; index += 1) {
    const weight = index < textLength ? weights[index] : -1;
    if (weight >= 0 && (runStart < 0 || weight === runWeight)) {
      if (runStart < 0) {
        runStart = index;
        runWeight = weight;
      }
      continue;
    }
    if (runStart >= 0) {
      resolved.push({ start: runStart, end: index, weight: runWeight });
      runStart = -1;
      runWeight = -1;
    }
    if (weight >= 0) {
      runStart = index;
      runWeight = weight;
    }
  }

  return resolved;
}

function tokenStemVariants(raw: string): string[] {
  const lower = raw.toLowerCase();
  const variants = new Set<string>([keywordCanonicalKey(raw)]);
  if (lower.includes("-")) {
    for (const part of lower.split("-").filter(Boolean)) {
      variants.add(keywordCanonicalKey(part));
    }
  }
  return [...variants];
}

function findStemHighlightSpans(text: string, keywords: WeightedKeyword[]): HighlightSpan[] {
  const { singleWord, phrases } = buildKeywordStemIndex(keywords);
  const tokens = tokenizeForKeywordMatch(text);
  if (tokens.length === 0) {
    return [];
  }

  const spans: HighlightSpan[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    for (const stem of tokenStemVariants(token.raw)) {
      const single = singleWord.get(stem);
      if (single) {
        spans.push({ start: token.start, end: token.end, weight: single.weight });
        break;
      }
    }

    for (const phrase of phrases) {
      if (index + phrase.stems.length > tokens.length) {
        continue;
      }
      let matches = true;
      for (let offset = 0; offset < phrase.stems.length; offset += 1) {
        const partStem = keywordCanonicalKey(tokens[index + offset].raw);
        if (partStem !== phrase.stems[offset]) {
          const hyphenParts = tokens[index + offset].raw.toLowerCase().split("-").filter(Boolean);
          const expandedStems = hyphenParts.map((part) => keywordCanonicalKey(part));
          if (
            expandedStems.length !== phrase.stems.length - offset &&
            expandedStems.join(" ") !== phrase.stems.slice(offset).join(" ")
          ) {
            matches = false;
            break;
          }
          for (let partIndex = 0; partIndex < expandedStems.length; partIndex += 1) {
            if (expandedStems[partIndex] !== phrase.stems[offset + partIndex]) {
              matches = false;
              break;
            }
          }
          if (!matches) {
            break;
          }
        }
      }
      if (matches) {
        spans.push({
          start: token.start,
          end: tokens[index + phrase.stems.length - 1].end,
          weight: phrase.weight,
        });
      }
    }
  }

  return spans;
}

function findLiteralHighlightSpans(text: string, keywords: WeightedKeyword[]): HighlightSpan[] {
  const merged = mergeWeightedKeywords(keywords);
  const sorted = [...merged].sort((a, b) => b.keyword.length - a.keyword.length);
  const spans: HighlightSpan[] = [];

  for (const entry of sorted) {
    const phrase = entry.keyword.trim();
    if (!phrase) {
      continue;
    }
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escaped.replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`,
      "giu",
    );
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        weight: entry.weight,
      });
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
      }
      match = pattern.exec(text);
    }

    if (phrase.includes(" ")) {
      const hyphenated = escaped.replace(/\s+/g, "-");
      const hyphenPattern = new RegExp(
        `(?<![\\p{L}\\p{N}_])${hyphenated}(?![\\p{L}\\p{N}_])`,
        "giu",
      );
      hyphenPattern.lastIndex = 0;
      let hyphenMatch = hyphenPattern.exec(text);
      while (hyphenMatch) {
        spans.push({
          start: hyphenMatch.index,
          end: hyphenMatch.index + hyphenMatch[0].length,
          weight: entry.weight,
        });
        if (hyphenMatch[0].length === 0) {
          hyphenPattern.lastIndex += 1;
        }
        hyphenMatch = hyphenPattern.exec(text);
      }
    }
  }

  return spans;
}

export function findKeywordHighlightSpans(text: string, keywords: WeightedKeyword[]): HighlightSpan[] {
  if (!text || keywords.length === 0) {
    return [];
  }

  const stemSpans = findStemHighlightSpans(text, keywords);
  const literalSpans = findLiteralHighlightSpans(text, keywords);
  return resolveHighlightSpans([...stemSpans, ...literalSpans], text.length);
}

function weightedSpansToEditorSpans(spans: HighlightSpan[]): EditorKeywordHighlightSpan[] {
  return spans.map((span) => ({
    start: span.start,
    end: span.end,
    kind: "weighted" as const,
    weight: span.weight,
  }));
}

export function findEditorKeywordHighlightSpans(
  text: string,
  weightedKeywords: WeightedKeyword[],
  atsTerms: string[],
): EditorKeywordHighlightSpan[] {
  if (!text) {
    return [];
  }

  const atsWeighted: WeightedKeyword[] = atsTerms.map((term) => ({ keyword: term, weight: 1 }));
  const atsSpans = weightedSpansToEditorSpans(
    findKeywordHighlightSpans(text, atsWeighted),
  ).map((span) => ({ start: span.start, end: span.end, kind: "ats" as const }));
  const jobSpans = weightedSpansToEditorSpans(findKeywordHighlightSpans(text, weightedKeywords));

  return resolveEditorKeywordHighlightSpans([...atsSpans, ...jobSpans], text.length);
}

/** @deprecated Prefer findKeywordHighlightSpans; kept for tests. */
export function buildKeywordMatchers(
  keywords: WeightedKeyword[],
): Array<{ keyword: string; weight: number; pattern: RegExp }> {
  const merged = mergeWeightedKeywords(keywords);
  return merged.map((entry) => {
    const escaped = entry.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      keyword: entry.keyword.trim(),
      weight: entry.weight,
      pattern: new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu"),
    };
  });
}

export function highlightEditorKeywordsHtml(
  text: string,
  weightedKeywords: WeightedKeyword[],
  atsTerms: string[],
  theme: KeywordHighlightTheme,
): string {
  if (!text || (weightedKeywords.length === 0 && atsTerms.length === 0)) {
    return escapeHtml(text);
  }

  const spans = findEditorKeywordHighlightSpans(text, weightedKeywords, atsTerms);
  if (spans.length === 0) {
    return escapeHtml(text);
  }

  let cursor = 0;
  let html = "";
  for (const span of spans) {
    if (span.start < cursor) {
      continue;
    }
    html += escapeHtml(text.slice(cursor, span.start));
    const tone =
      span.kind === "ats" ? atsKeywordTone(theme) : keywordWeightTone(theme, span.weight);
    const chunk = escapeHtml(text.slice(span.start, span.end));
    html += `<mark class="font-bold ${KEYWORD_WEIGHT_UNDERLINE_CLASS} ${tone} bg-transparent">${chunk}</mark>`;
    cursor = span.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

export function highlightKeywordHtml(
  text: string,
  keywords: WeightedKeyword[],
  theme: KeywordHighlightTheme,
): string {
  return highlightEditorKeywordsHtml(text, keywords, [], theme);
}