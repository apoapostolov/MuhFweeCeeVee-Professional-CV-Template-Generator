import { describe, expect, it } from "vitest";

import {
  COMPANY_FIELD_CONTRACTS,
  getCompanyFieldContract,
  getJobFieldContract,
  getResearchFieldContract,
  JOB_FIELD_CONTRACTS,
  listResearchFieldContracts,
} from "./index";

describe("research field contract catalogs", () => {
  it("has unique company paths", () => {
    const paths = COMPANY_FIELD_CONTRACTS.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("has unique job paths", () => {
    const paths = JOB_FIELD_CONTRACTS.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("looks up office_type and weighted_keywords", () => {
    expect(getCompanyFieldContract("office.office_type")?.kind).toBe("enum");
    expect(getJobFieldContract("weighted_keywords")?.kind).toBe("weighted_keywords");
    expect(getResearchFieldContract("company", "contacts.hr_email")?.requireSourcesToSet).toBe(
      true,
    );
  });

  it("lists contracts by entity", () => {
    expect(listResearchFieldContracts("company").length).toBeGreaterThan(10);
    expect(listResearchFieldContracts("job_position").length).toBeGreaterThan(10);
  });
});
