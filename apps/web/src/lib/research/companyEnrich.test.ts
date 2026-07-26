import { describe, expect, it } from "vitest";

import {
  buildCompanyStageEnrichPrompt,
  estimateCompanyEnrichTokens,
  normalizeCompanyEnrichStages,
} from "./companyEnrich";

describe("normalizeCompanyEnrichStages", () => {
  it("defaults to identity", () => {
    expect(normalizeCompanyEnrichStages(undefined)).toEqual(["identity"]);
  });

  it("drops people without web", () => {
    expect(
      normalizeCompanyEnrichStages(["identity", "people", "hiring"], { useWebSearch: false }),
    ).toEqual(["identity", "hiring"]);
  });

  it("keeps people with web", () => {
    expect(
      normalizeCompanyEnrichStages(["people", "identity"], { useWebSearch: true }),
    ).toEqual(["identity", "people"]);
  });
});

describe("buildCompanyStageEnrichPrompt", () => {
  it("requires no-web language when useWebSearch false", () => {
    const prompt = buildCompanyStageEnrichPrompt({
      stage: "identity",
      companyName: "Acme",
      officeCountry: "US",
      useWebSearch: false,
    });
    expect(prompt).toContain("no web search");
    expect(prompt).not.toContain("MANDATORY LIVE WEB SEARCH");
  });
});

describe("estimateCompanyEnrichTokens", () => {
  it("scales with stages and web", () => {
    const cheap = estimateCompanyEnrichTokens({ stages: ["identity"], useWebSearch: false });
    const rich = estimateCompanyEnrichTokens({
      stages: ["identity", "office", "hiring"],
      useWebSearch: true,
    });
    expect(rich.inputTokens).toBeGreaterThan(cheap.inputTokens);
    expect(rich.outputTokens).toBeGreaterThan(cheap.outputTokens);
  });
});
