import { describe, expect, it } from "vitest";

import {
  companyMetadataToResearchShell,
  mergeMetadataIntoCatalog,
} from "./importMetadataToCatalog";
import type { ResearchCatalog } from "./types";

const EMPTY: ResearchCatalog = { version: 2, companies: [], job_positions: [] };

describe("importMetadataToCatalog", () => {
  it("maps metadata shell fields", () => {
    const shell = companyMetadataToResearchShell({
      id: "acme",
      name: "Acme Corp",
      company_details: {
        industry: "software",
        website: "https://acme.example",
        headquarters: "Sofia, Bulgaria",
      },
      keywords_to_echo: ["typescript"],
      value_proposition: "Platform eng",
      source: "personal",
    });
    expect(shell.id).toBe("acme");
    expect(shell.name).toBe("Acme Corp");
    expect(shell.identity?.website).toBe("https://acme.example");
    expect(shell.office.city).toBe("Sofia");
    expect(shell.office.country).toBe("Bulgaria");
    expect(shell.research?.sources?.[0]).toMatch(/import:company_metadata/);
  });

  it("imports companies and target_roles as jobs without clobbering", () => {
    const first = mergeMetadataIntoCatalog(EMPTY, [
      {
        id: "acme",
        name: "Acme",
        target_roles: ["Engineer", "Lead"],
        keywords_to_echo: ["go"],
      },
    ]);
    expect(first.companies_added).toBe(1);
    expect(first.jobs_added).toBe(2);
    expect(first.catalog.job_positions).toHaveLength(2);

    const second = mergeMetadataIntoCatalog(first.catalog, [
      {
        id: "acme",
        name: "Acme",
        target_roles: ["Engineer", "Staff"],
      },
    ]);
    expect(second.companies_skipped).toBe(1);
    expect(second.companies_added).toBe(0);
    // Engineer skipped; Staff added
    expect(second.jobs_added).toBe(1);
    expect(second.catalog.job_positions).toHaveLength(3);
  });
});
