import { describe, expect, it } from "vitest";

import { collectEditorAtsTerms } from "./editor-ats-keywords";
import {
  atsKeywordTone,
  findEditorKeywordHighlightSpans,
  highlightEditorKeywordsHtml,
} from "./keyword-highlight";

describe("collectEditorAtsTerms", () => {
  it("dedupes keywords and action verbs case-insensitively", () => {
    expect(
      collectEditorAtsTerms({
        keywords: ["Python", "python"],
        action_verbs: ["Led", "led"],
      }),
    ).toEqual(["Python", "Led"]);
  });
});

describe("findEditorKeywordHighlightSpans", () => {
  it("marks ATS terms with ats kind", () => {
    const spans = findEditorKeywordHighlightSpans("Used Python for APIs.", [], ["Python"]);
    expect(spans).toEqual([{ start: 5, end: 11, kind: "ats" }]);
  });

  it("prefers weighted styling when ATS and weighted overlap", () => {
    const spans = findEditorKeywordHighlightSpans(
      "Senior Python engineer.",
      [{ keyword: "Python", weight: 90 }],
      ["Python"],
    );
    expect(spans.some((span) => span.kind === "weighted" && span.weight === 90)).toBe(true);
    expect(spans.some((span) => span.kind === "ats")).toBe(false);
  });
});

describe("highlightEditorKeywordsHtml", () => {
  it("uses cyan tone class for ATS highlights", () => {
    const html = highlightEditorKeywordsHtml("Python dev", [], ["Python"], "light");
    expect(html).toContain(atsKeywordTone("light"));
    expect(html).toContain("Python");
  });
});