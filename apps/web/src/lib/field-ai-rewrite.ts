export type FieldRewriteProposal = {
  text: string;
  confidence: number;
};

export type FieldRewriteResult = {
  currentScore: number;
  proposals: FieldRewriteProposal[];
};

function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseProposal(entry: unknown): FieldRewriteProposal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  const confidence = clampScore(record.confidence);
  if (!text || confidence === null) {
    return null;
  }
  return { text, confidence };
}

export function extractFirstJsonBlock(input: string): unknown {
  const trimmed = input.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
    try {
      return JSON.parse(withoutFence.trim());
    } catch {
      // fall through
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    // no-op
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // no-op
    }
  }
  return null;
}

export function parseFieldRewriteResponse(raw: string): FieldRewriteResult | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const currentScore = clampScore(record.current_score ?? record.currentScore);
  const rawProposals = Array.isArray(record.proposals) ? record.proposals : [];
  const proposals = rawProposals
    .map((entry) => parseProposal(entry))
    .filter((entry): entry is FieldRewriteProposal => entry !== null)
    .slice(0, 3);

  if (currentScore === null || proposals.length < 3) {
    return null;
  }

  return { currentScore, proposals };
}