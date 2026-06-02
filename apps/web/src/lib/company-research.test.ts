import { describe, expect, it } from "vitest";

import {
  isEmptyResearchValue,
  mergeResearchedCompanyRecord,
  parseCompanyResearchResponse,
  resolveCompanyIdsToResearch,
} from "./company-research";

describe("company-research", () => {
  it("merges researched values into empty fields only", () => {
    const existing = {
      id: "acme",
      name: "Acme Corp",
      company_details: { industry: "", website: "https://acme.test" },
      target_roles: [],
    };
    const researched = {
      id: "acme-inc",
      name: "Acme Incorporated",
      company_details: {
        industry: "Software",
        website: "https://acme.com",
        headquarters: "London",
      },
      target_roles: ["Engineer"],
    };
    expect(mergeResearchedCompanyRecord(existing, researched)).toEqual({
      id: "acme",
      name: "Acme Corp",
      company_details: {
        industry: "Software",
        website: "https://acme.test",
        headquarters: "London",
      },
      target_roles: ["Engineer"],
    });
  });

  it("parses company object from model JSON", () => {
    const raw = JSON.stringify({
      company: { id: "acme", name: "Acme", target_roles: ["Engineer"] },
    });
    expect(parseCompanyResearchResponse(raw)?.name).toBe("Acme");
  });

  it("resolves selected company ids or all when none selected", () => {
    const draft = {
      companies: [{ id: "a" }, { id: "b" }],
    };
    expect(resolveCompanyIdsToResearch(draft, [])).toEqual(["a", "b"]);
    expect(resolveCompanyIdsToResearch(draft, ["b"])).toEqual(["b"]);
  });

  it("detects empty research values", () => {
    expect(isEmptyResearchValue("")).toBe(true);
    expect(isEmptyResearchValue([])).toBe(true);
    expect(isEmptyResearchValue("filled")).toBe(false);
  });
});