import { describe, expect, it } from "vitest";

import {
  evaluateCompanyResearchQuality,
  evaluateResearchSources,
} from "./research-quality";
import type { ResearchedCompany } from "./types";

describe("research quality heuristics", () => {
  it("passes when sources include https and LinkedIn", () => {
    const report = evaluateResearchSources(
      ["https://www.linkedin.com/company/example", "https://example.com/about"],
      { minSources: 1 },
    );
    expect(report.ok).toBe(true);
    expect(report.linkedInSourceCount).toBe(1);
  });

  it("fails when sources are missing", () => {
    const report = evaluateResearchSources([], { minSources: 1 });
    expect(report.ok).toBe(false);
  });

  it("evaluates company payload with identity and sources", () => {
    const company: ResearchedCompany = {
      id: "acme_us",
      name: "Acme",
      office: { country: "United States", city: "Boston" },
      identity: {
        industry: "Software",
        description: "Acme builds developer tools for distributed teams worldwide.",
        linkedin_company_url: "https://www.linkedin.com/company/acme",
      },
      research: {
        sources: ["https://www.linkedin.com/company/acme"],
      },
    };
    expect(evaluateCompanyResearchQuality(company).ok).toBe(true);
  });
});