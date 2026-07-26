import { describe, expect, it } from "vitest";

import { parseResearchAiEnvelope } from "./envelope";

describe("parseResearchAiEnvelope", () => {
  it("parses schema_version 1 envelope", () => {
    const raw = JSON.stringify({
      schema_version: 1,
      entity_type: "company",
      operation: "field_refine",
      fields: {
        "identity.industry": {
          value: "Fintech",
          confidence: 70,
          status: "found",
        },
      },
    });
    const envelope = parseResearchAiEnvelope(raw);
    expect(envelope?.fields["identity.industry"]?.value).toBe("Fintech");
  });

  it("wraps legacy single-field proposal", () => {
    const raw = JSON.stringify({
      current_score: 50,
      proposals: [{ value: "Hybrid", confidence: 88 }],
    });
    const envelope = parseResearchAiEnvelope(raw, {
      singleFieldPath: "identity.remote_policy",
      fallbackEntityType: "job_position",
    });
    expect(envelope?.fields["identity.remote_policy"]?.value).toBe("Hybrid");
    expect(envelope?.operation).toBe("field_refine");
  });
});
