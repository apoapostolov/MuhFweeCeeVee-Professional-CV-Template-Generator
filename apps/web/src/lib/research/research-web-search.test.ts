import { describe, expect, it } from "vitest";

import {
  buildResearchWebSearchQueryHints,
  buildResearchWebSearchPlugin,
  researchWebSearchPromptBlock,
} from "./research-web-search";

describe("researchWebSearchPromptBlock", () => {
  it("includes mandatory search language and LinkedIn-first queries", () => {
    const block = researchWebSearchPromptBlock({
      kind: "company_office",
      companyName: "Acme",
      officeCountry: "Bulgaria",
      officeCity: "Sofia",
    });
    expect(block).toContain("MANDATORY LIVE WEB SEARCH");
    expect(block).toContain("LinkedIn");
    expect(block).toContain("Acme LinkedIn company page");
  });
});

describe("buildResearchWebSearchQueryHints", () => {
  it("suggests LinkedIn job search for job positions", () => {
    const queries = buildResearchWebSearchQueryHints({
      kind: "job_position",
      companyName: "Acme",
      jobTitle: "Engineer",
    });
    expect(queries.some((q) => q.includes("LinkedIn"))).toBe(true);
    expect(queries.some((q) => q.includes("linkedin.com/jobs"))).toBe(true);
  });
});

describe("buildResearchWebSearchPlugin", () => {
  it("returns null for perplexity native search", () => {
    expect(buildResearchWebSearchPlugin("perplexity/sonar-pro")).toBeNull();
  });

  it("returns web plugin for plain chat models", () => {
    const plugin = buildResearchWebSearchPlugin("openai/gpt-4o:online");
    expect(plugin?.id).toBe("web");
    expect(plugin?.include_domains).toContain("linkedin.com");
  });
});