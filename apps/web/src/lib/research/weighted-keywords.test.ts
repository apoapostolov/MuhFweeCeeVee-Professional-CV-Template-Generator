import { describe, expect, it } from "vitest";

import {
  UNVERIFIED_KEYWORD_WEIGHT_CAP,
  parseWeightedKeywordsFromProposal,
} from "./weighted-keywords";

describe("parseWeightedKeywordsFromProposal D3", () => {
  it("caps AI keywords without evidence at 40", () => {
    const list = parseWeightedKeywordsFromProposal([
      { keyword: "synergy", weight: 95, source: "ai" },
    ]);
    expect(list[0]?.weight).toBe(UNVERIFIED_KEYWORD_WEIGHT_CAP);
  });

  it("allows high weight with evidence", () => {
    const list = parseWeightedKeywordsFromProposal([
      {
        keyword: "TypeScript",
        weight: 90,
        source: "ai",
        evidence: [{ kind: "jd_quote", text: "TypeScript", count: 2 }],
      },
    ]);
    expect(list[0]?.weight).toBe(90);
  });

  it("allows user source full weight", () => {
    const list = parseWeightedKeywordsFromProposal(
      [{ keyword: "Clearance", weight: 95, source: "user" }],
      { forceSource: "user" },
    );
    expect(list[0]?.weight).toBe(95);
  });

  it("strips AI-claimed user source", () => {
    const list = parseWeightedKeywordsFromProposal([
      { keyword: "spoof", weight: 99, source: "user" },
    ]);
    expect(list[0]?.source).toBe("ai");
    expect(list[0]?.weight).toBe(UNVERIFIED_KEYWORD_WEIGHT_CAP);
  });

  it("drops unknown categories", () => {
    const list = parseWeightedKeywordsFromProposal([
      { keyword: "Go", weight: 50, category: "made_up_bucket", evidence: [{ kind: "title" }] },
    ]);
    expect(list[0]?.category).toBeUndefined();
  });
});
