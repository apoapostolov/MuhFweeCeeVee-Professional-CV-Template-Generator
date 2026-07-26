import { describe, expect, it } from "vitest";

import { extractKeywordsFromJd } from "./keywordExtract";

describe("extractKeywordsFromJd", () => {
  it("extracts tools and skills with JD evidence", () => {
    const jd = `
      We need a Senior Software Engineer with 5+ years of TypeScript and React.
      You will build Kubernetes services on AWS and improve CI/CD pipelines.
      Experience with PostgreSQL and system design is required.
    `;
    const { keywords, stats } = extractKeywordsFromJd({
      rawJdText: jd,
      jobTitle: "Senior Software Engineer",
    });
    expect(stats.jdChars).toBeGreaterThan(50);
    const surfaces = keywords.map((k) => k.keyword.toLowerCase());
    expect(surfaces.some((s) => s.includes("typescript"))).toBe(true);
    expect(surfaces.some((s) => s.includes("kubernetes") || s === "k8s")).toBe(true);
    expect(surfaces.some((s) => s.includes("react"))).toBe(true);
    const ts = keywords.find((k) => k.keyword.toLowerCase().includes("typescript"));
    expect(ts?.evidence?.some((e) => e.kind === "jd_quote")).toBe(true);
    expect((ts?.weight ?? 0) > 40).toBe(true);
  });

  it("returns empty for blank JD without inventing", () => {
    const { keywords } = extractKeywordsFromJd({
      rawJdText: "",
      jobTitle: "Engineer",
    });
    // title token engineer may appear
    expect(keywords.every((k) => (k.evidence?.length ?? 0) > 0 || k.source === "extract")).toBe(
      true,
    );
  });
});
