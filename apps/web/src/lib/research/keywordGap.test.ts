import { describe, expect, it } from "vitest";

import { computeKeywordGap, flattenCvDocumentToText } from "./keywordGap";

describe("computeKeywordGap", () => {
  it("flags missing must keywords and detects used ones", () => {
    const cv = {
      person: { full_name: "Jane Doe" },
      positioning: { headline: "TypeScript engineer building React apps" },
      experience: [{ bullets: ["Shipped React dashboards"] }],
    };
    const report = computeKeywordGap(cv, [
      { keyword: "TypeScript", weight: 90, role: "must", source: "user" },
      { keyword: "Kubernetes", weight: 85, role: "must", source: "user" },
      { keyword: "React", weight: 70, role: "should", source: "user" },
      { keyword: "synergy", weight: 30, role: "nice", source: "ai" },
    ]);
    expect(report.used.some((k) => k.keyword === "TypeScript")).toBe(true);
    expect(report.used.some((k) => k.keyword === "React")).toBe(true);
    expect(report.missingMust.some((k) => k.keyword === "Kubernetes")).toBe(true);
    expect(flattenCvDocumentToText(cv)).toContain("TypeScript");
  });
});
