import { describe, expect, it } from "vitest";

import { parseResearchFieldRefineProposals } from "./research-field-refine";

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

  it("rejects missing score", () => {
    expect(
      parseResearchFieldRefineProposals(
        JSON.stringify({ proposals: [{ value: "x", confidence: 80 }] }),
      ),
    ).toBeNull();
  });
});