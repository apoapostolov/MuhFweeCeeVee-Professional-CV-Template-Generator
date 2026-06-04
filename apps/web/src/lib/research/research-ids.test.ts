import { describe, expect, it } from "vitest";

import { allocateResearchedJobPositionId } from "./research-ids";
import type { ResearchCatalog } from "./types";

const emptyCatalog: ResearchCatalog = { version: 2, companies: [], job_positions: [] };

describe("allocateResearchedJobPositionId", () => {
  it("uses base slug for the first entry", () => {
    const id = allocateResearchedJobPositionId(emptyCatalog, "acme", "Software Engineer");
    expect(id).toBe("acme_software_engineer");
  });

  it("suffixes when the same company and title already exist", () => {
    const catalog: ResearchCatalog = {
      ...emptyCatalog,
      job_positions: [
        {
          id: "acme_software_engineer",
          company_id: "acme",
          title: "Software Engineer",
          weighted_keywords: [{ keyword: "typescript", weight: 80 }],
        },
      ],
    };
    expect(allocateResearchedJobPositionId(catalog, "acme", "Software Engineer")).toBe(
      "acme_software_engineer_2",
    );
  });

  it("increments suffix until unique", () => {
    const catalog: ResearchCatalog = {
      ...emptyCatalog,
      job_positions: [
        {
          id: "acme_software_engineer",
          company_id: "acme",
          title: "Software Engineer",
          weighted_keywords: [{ keyword: "a", weight: 1 }],
        },
        {
          id: "acme_software_engineer_2",
          company_id: "acme",
          title: "Software Engineer",
          weighted_keywords: [{ keyword: "b", weight: 1 }],
        },
      ],
    };
    expect(allocateResearchedJobPositionId(catalog, "acme", "Software Engineer")).toBe(
      "acme_software_engineer_3",
    );
  });
});