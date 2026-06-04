import { describe, expect, it } from "vitest";

import { findKeywordHighlightSpans } from "./keyword-highlight";
import { keywordCanonicalKey } from "./keyword-stem";
import { mergeWeightedKeywords } from "./weighted-keywords";

describe("keywordCanonicalKey", () => {
  it("treats inflections as the same stem", () => {
    expect(keywordCanonicalKey("integration")).toBe(keywordCanonicalKey("integrating"));
    expect(keywordCanonicalKey("analyze")).toBe(keywordCanonicalKey("analyzing"));
  });

  it("keeps multi-word phrase stems per token", () => {
    expect(keywordCanonicalKey("Machine Learning")).toBe("machin learn");
  });
});

describe("mergeWeightedKeywords", () => {
  it("collapses duplicate stems and keeps max weight", () => {
    const merged = mergeWeightedKeywords([
      { keyword: "integrating", weight: 70 },
      { keyword: "integration", weight: 90 },
      { keyword: "Kubernetes", weight: 80 },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((k) => keywordCanonicalKey(k.keyword) === "integr")).toMatchObject({
      weight: 90,
    });
  });
});

describe("findKeywordHighlightSpans", () => {
  it("highlights stem-equivalent words in text", () => {
    const spans = findKeywordHighlightSpans("Led system integration and integrating APIs.", [
      { keyword: "integrate", weight: 85 },
    ]);
    expect(spans.length).toBeGreaterThanOrEqual(2);
    expect(spans.some((s) => s.weight === 85)).toBe(true);
  });

  it("keeps partial highlights when keyword spans overlap", () => {
    const spans = findKeywordHighlightSpans("Senior software engineer with Python and Django.", [
      { keyword: "software engineer", weight: 90 },
      { keyword: "Python", weight: 80 },
      { keyword: "Django", weight: 75 },
    ]);
    const text = "Senior software engineer with Python and Django.";
    const highlighted = spans.map((span) => text.slice(span.start, span.end)).join("|");
    expect(highlighted).toContain("software engineer");
    expect(highlighted).toContain("Python");
    expect(highlighted).toContain("Django");
  });
});