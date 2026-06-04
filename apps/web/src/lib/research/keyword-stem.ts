import { stemmer } from "stemmer";

/** Tokens we keep literal (acronyms, tech symbols) instead of Porter-stemming. */
const LITERAL_TOKEN =
  /^[a-z0-9+#./-]{1,12}$/i;

function stemToken(token: string): string {
  const lower = token.toLowerCase();
  if (!lower || !/[\p{L}]/u.test(lower)) {
    return lower;
  }
  if (LITERAL_TOKEN.test(lower) && (lower.length <= 4 || /[0-9+#./-]/.test(lower))) {
    return lower;
  }
  return stemmer(lower);
}

/** Canonical key for deduping and fuzzy match (integration ≈ integrating). */
export function keywordCanonicalKey(keyword: string): string {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  return parts.map((part) => stemToken(part)).join(" ");
}

export function tokenizeForKeywordMatch(text: string): Array<{ start: number; end: number; raw: string }> {
  const tokens: Array<{ start: number; end: number; raw: string }> = [];
  const re = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;
  let match = re.exec(text);
  while (match) {
    tokens.push({ start: match.index, end: match.index + match[0].length, raw: match[0] });
    match = re.exec(text);
  }
  return tokens;
}