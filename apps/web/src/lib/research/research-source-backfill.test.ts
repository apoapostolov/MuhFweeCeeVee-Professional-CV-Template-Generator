import { describe, expect, it } from "vitest";

import {
  backfillCompanyResearchSources,
  backfillJobResearchSources,
  mergeResearchSourceUrls,
} from "./research-source-backfill";
import type { ResearchedCompany, ResearchedJobPosition } from "./types";

describe("research source backfill", () => {
  it("merges identity URLs into research.sources", () => {
    const company: ResearchedCompany = {
      id: "microsoft_us",
      name: "Microsoft",
      office: { country: "United States", city: "Redmond" },
      identity: {
        website: "https://www.microsoft.com",
        linkedin_company_url: "https://www.linkedin.com/company/microsoft",
      },
      research: { sources: [] },
    };

    const filled = backfillCompanyResearchSources(company);
    expect(filled.research?.sources).toEqual([
      "https://www.microsoft.com",
      "https://www.linkedin.com/company/microsoft",
    ]);
  });

  it("dedupes and upgrades http URLs", () => {
    expect(
      mergeResearchSourceUrls(
        ["http://example.com/page"],
        ["https://example.com/page", "https://other.com"],
      ),
    ).toEqual(["https://example.com/page", "https://other.com"]);
  });

  it("backfills job posting URL from identity", () => {
    const job: ResearchedJobPosition = {
      id: "job_1",
      company_id: "microsoft_us",
      title: "Software Engineer",
      weighted_keywords: [{ keyword: "typescript", weight: 80 }],
      identity: {
        linkedin_url: "https://www.linkedin.com/jobs/view/123",
      },
    };

    const filled = backfillJobResearchSources(job);
    expect(filled.research?.sources).toEqual(["https://www.linkedin.com/jobs/view/123"]);
  });
});