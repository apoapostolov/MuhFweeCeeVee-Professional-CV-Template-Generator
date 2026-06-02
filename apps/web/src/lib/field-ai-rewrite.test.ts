import { describe, expect, it } from "vitest";

import { parseFieldRewriteResponse } from "./field-ai-rewrite";

describe("parseFieldRewriteResponse", () => {
  it("parses fenced JSON with three proposals", () => {
    const raw = `\`\`\`json
{
  "current_score": 58,
  "proposals": [
    { "text": "Led cross-functional delivery.", "confidence": 91 },
    { "text": "Drove delivery across teams.", "confidence": 84 },
    { "text": "Managed project delivery.", "confidence": 72 }
  ]
}
\`\`\``;
    const result = parseFieldRewriteResponse(raw);
    expect(result).toEqual({
      currentScore: 58,
      proposals: [
        { text: "Led cross-functional delivery.", confidence: 91 },
        { text: "Drove delivery across teams.", confidence: 84 },
        { text: "Managed project delivery.", confidence: 72 },
      ],
    });
  });

  it("rejects fewer than three proposals", () => {
    const raw = JSON.stringify({
      current_score: 70,
      proposals: [{ text: "One", confidence: 80 }],
    });
    expect(parseFieldRewriteResponse(raw)).toBeNull();
  });
});