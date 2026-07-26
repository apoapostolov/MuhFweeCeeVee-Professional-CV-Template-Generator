import { describe, expect, it } from "vitest";

import type { ResearchAiEnvelope } from "./types";
import { applyEnvelopeToEntity } from "./merge";

describe("applyEnvelopeToEntity", () => {
  it("applies valid empty fields and rejects bad enum", () => {
    const company = {
      id: "acme_us",
      name: "Acme",
      office: { country: "United States", city: "Austin" },
      identity: { industry: "" },
    };
    const envelope: ResearchAiEnvelope = {
      schema_version: 1,
      entity_type: "company",
      operation: "field_refine",
      fields: {
        "identity.industry": {
          value: "Software",
          confidence: 80,
          status: "found",
        },
        "office.office_type": {
          value: "not-a-real-type",
          confidence: 90,
          status: "found",
        },
      },
    };
    const report = applyEnvelopeToEntity("company", company, envelope, {
      mode: "empty_only",
    });
    expect(report.applied).toContain("identity.industry");
    expect(report.rejected.some((r) => r.path === "office.office_type")).toBe(true);
    const entity = report.entity as { identity?: { industry?: string } };
    expect(entity.identity?.industry).toBe("Software");
  });

  it("skips non-empty in empty_only mode", () => {
    const company = {
      id: "acme_us",
      name: "Acme",
      office: { country: "United States" },
      identity: { website: "https://acme.com" },
    };
    const envelope: ResearchAiEnvelope = {
      schema_version: 1,
      entity_type: "company",
      operation: "seed_fill",
      fields: {
        "identity.website": {
          value: "https://evil.example",
          confidence: 99,
          status: "found",
        },
      },
    };
    const report = applyEnvelopeToEntity("company", company, envelope, {
      mode: "empty_only",
    });
    expect(report.applied).not.toContain("identity.website");
    const entity = report.entity as { identity?: { website?: string } };
    expect(entity.identity?.website).toBe("https://acme.com");
  });
});
