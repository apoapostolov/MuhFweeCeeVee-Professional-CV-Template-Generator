import { extractFirstJsonBlock } from "@/lib/field-ai-rewrite";

import type { ResearchFieldRefineEntity } from "./types";
import {
  parseResearchEntityHints,
  researchWebSearchPromptBlock,
  type ResearchWebSearchQueryHints,
} from "./research-web-search";
import { WEIGHTED_KEYWORD_AI_INSTRUCTIONS } from "./weighted-keywords";

export type ResearchFieldProposal = {
  confidence: number;
  preview: string;
  value: unknown;
};

export type ResearchFieldRefineResult = {
  currentScore: number;
  proposals: ResearchFieldProposal[];
};

function clampScore(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}

function proposalPreview(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseProposalEntry(entry: unknown): ResearchFieldProposal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const confidence = clampScore(record.confidence);
  if (confidence === null) {
    return null;
  }

  let value: unknown;
  if ("value" in record) {
    value = record.value;
  } else if (typeof record.text === "string") {
    value = record.text;
  } else {
    return null;
  }

  const preview =
    typeof record.preview === "string" && record.preview.trim().length > 0
      ? record.preview.trim()
      : proposalPreview(value);
  if (!preview.trim()) {
    return null;
  }

  return { confidence, preview, value };
}

export function buildResearchFieldRefinePrompt(payload: {
  entityType: ResearchFieldRefineEntity;
  fieldPath: string;
  fieldLabel: string;
  currentValue: string;
  entityJson: string;
  searchHints?: ResearchWebSearchQueryHints;
}): string {
  const keywordField = payload.fieldPath === "weighted_keywords";
  const hints =
    payload.searchHints ??
    (() => {
      const parsed = parseResearchEntityHints(payload.entityType, payload.entityJson);
      return {
        kind: "field_refine" as const,
        companyName: parsed.companyName,
        officeCountry: parsed.officeCountry,
        officeCity: parsed.officeCity,
        jobTitle: parsed.jobTitle,
        linkedinUrl: parsed.linkedinUrl,
        fieldPath: payload.fieldPath,
        fieldLabel: payload.fieldLabel,
      };
    })();

  return [
    researchWebSearchPromptBlock(hints),
    "You refine a single field in a career research record using live web search results.",
    "Return 1 to 3 alternative improved values for the requested field — do not change unrelated fields.",
    "Rank proposals by confidence (highest first). Fewer than 3 proposals is allowed when alternatives are not meaningfully distinct.",
    keywordField
      ? "Each proposal value must be a full weighted_keywords array."
      : "Each proposal value must be a complete replacement matching the field type (string, list, or structured object).",
    "Never invent private emails, direct dials, or people that cannot be verified publicly.",
    ...(keywordField ? ["", WEIGHTED_KEYWORD_AI_INSTRUCTIONS, ""] : []),
    `Entity type: ${payload.entityType}`,
    `Field path: ${payload.fieldPath}`,
    `Field label: ${payload.fieldLabel}`,
    `Current value:\n${payload.currentValue || "(empty)"}`,
    "",
    "Full entity context (JSON):",
    payload.entityJson,
    "",
    'Return ONLY valid JSON: {"current_score":0-100,"proposals":[{"value":<field value>,"confidence":0-100,"preview":"short summary"}]}',
  ].join("\n");
}

export function parseResearchFieldRefineProposals(raw: string): ResearchFieldRefineResult | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;

  const currentScore = clampScore(record.current_score ?? record.currentScore);
  if (currentScore === null) {
    return null;
  }

  const rawProposals = Array.isArray(record.proposals) ? record.proposals : [];
  const proposals = rawProposals
    .map((entry) => parseProposalEntry(entry))
    .filter((entry): entry is ResearchFieldProposal => entry !== null)
    .slice(0, 3);

  if (proposals.length > 0) {
    return { currentScore, proposals };
  }

  if (!("proposal" in record)) {
    return null;
  }

  const legacy = parseProposalEntry({
    value: record.proposal,
    confidence: record.confidence ?? 75,
    preview: record.preview,
  });
  if (!legacy) {
    const fallback = parseProposalEntry({ value: record.proposal, confidence: 75 });
    if (!fallback) {
      return null;
    }
    return { currentScore, proposals: [fallback] };
  }

  return { currentScore, proposals: [legacy] };
}

/** @deprecated Use parseResearchFieldRefineProposals */
export function parseResearchFieldRefineResponse(raw: string): unknown | null {
  const result = parseResearchFieldRefineProposals(raw);
  if (!result || result.proposals.length === 0) {
    return null;
  }
  return result.proposals[0].value;
}