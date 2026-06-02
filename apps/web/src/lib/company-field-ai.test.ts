import { describe, expect, it } from "vitest";

import {
  parseCompanyFieldResearchResponse,
  resolveCompanyNameFromMetadataPath,
} from "./company-field-ai";

describe("parseCompanyFieldResearchResponse", () => {
  it("parses three research proposals", () => {
    const raw = JSON.stringify({
      proposals: [
        { text: "B2B SaaS analytics platform", confidence: 88 },
        { text: "Enterprise software / data", confidence: 72 },
        { text: "Productivity and analytics tooling", confidence: 65 },
      ],
    });
    expect(parseCompanyFieldResearchResponse(raw)).toEqual({
      proposals: [
        { text: "B2B SaaS analytics platform", confidence: 88 },
        { text: "Enterprise software / data", confidence: 72 },
        { text: "Productivity and analytics tooling", confidence: 65 },
      ],
    });
  });

  it("rejects fewer than three proposals", () => {
    const raw = JSON.stringify({
      proposals: [{ text: "Only one", confidence: 90 }],
    });
    expect(parseCompanyFieldResearchResponse(raw)).toBeNull();
  });
});

describe("resolveCompanyNameFromMetadataPath", () => {
  it("reads company name from draft path", () => {
    const draft = {
      companies: [{ id: "acme", name: "Acme Corp", company_details: { industry: "" } }],
    };
    expect(resolveCompanyNameFromMetadataPath(draft, ["companies", 0, "company_details", "industry"])).toBe(
      "Acme Corp",
    );
  });
});