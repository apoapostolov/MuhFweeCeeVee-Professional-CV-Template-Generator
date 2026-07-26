import { describe, expect, it } from "vitest";

import { getCompanyFieldContract } from "./contracts";
import {
  buildResearchFieldRefinePrompt,
  parseResearchFieldRefineProposals,
  truncateEntityJsonForPrompt,
} from "./research-field-refine";

describe("parseResearchFieldRefineProposals", () => {
  it("parses multi-proposal responses", () => {
    const result = parseResearchFieldRefineProposals(
      JSON.stringify({
        current_score: 62,
        proposals: [
          { value: "Acme Corp", confidence: 88, preview: "Legal brand alignment" },
          { value: "Acme Corporation", confidence: 71, preview: "Formal legal name" },
        ],
      }),
    );
    expect(result?.currentScore).toBe(62);
    expect(result?.proposals).toHaveLength(2);
    expect(result?.proposals[0].value).toBe("Acme Corp");
    expect(result?.proposals[0].confidence).toBe(88);
  });

  it("accepts a single legacy proposal object", () => {
    const result = parseResearchFieldRefineProposals(
      JSON.stringify({ current_score: 50, proposal: "Refined text" }),
    );
    expect(result?.proposals).toHaveLength(1);
    expect(result?.proposals[0].value).toBe("Refined text");
  });

  it("parses schema_version 1 envelope fields", () => {
    const result = parseResearchFieldRefineProposals(
      JSON.stringify({
        schema_version: 1,
        entity_type: "company",
        operation: "field_refine",
        fields: {
          "identity.industry": { value: "Software", confidence: 80, status: "found" },
        },
      }),
    );
    expect(result?.proposals).toHaveLength(1);
    expect(result?.proposals[0].value).toBe("Software");
  });

  it("rejects missing score for legacy proposals shape", () => {
    expect(
      parseResearchFieldRefineProposals(
        JSON.stringify({ proposals: [{ value: "x", confidence: 80 }] }),
      ),
    ).toBeNull();
  });
});

describe("buildResearchFieldRefinePrompt", () => {
  const contract = getCompanyFieldContract("identity.industry")!;

  it("omits web search block when useWebSearch is false", () => {
    const prompt = buildResearchFieldRefinePrompt({
      entityType: "company",
      fieldPath: "identity.industry",
      fieldLabel: "Industry",
      currentValue: "",
      entityJson: '{"name":"Acme"}',
      contract,
      useWebSearch: false,
    });
    expect(prompt).toContain("no web search");
    expect(prompt).not.toContain("MANDATORY LIVE WEB SEARCH");
  });

  it("includes contract enum hints for office_type", () => {
    const office = getCompanyFieldContract("office.office_type")!;
    const prompt = buildResearchFieldRefinePrompt({
      entityType: "company",
      fieldPath: "office.office_type",
      fieldLabel: "Office type",
      currentValue: "",
      entityJson: "{}",
      contract: office,
      useWebSearch: false,
    });
    expect(prompt).toContain("headquarters");
    expect(prompt).toContain("enum:");
  });
});

describe("truncateEntityJsonForPrompt", () => {
  it("truncates long payloads", () => {
    const long = "x".repeat(4000);
    const out = truncateEntityJsonForPrompt(long, 100);
    expect(out.length).toBeLessThan(120);
    expect(out).toContain("truncated");
  });
});