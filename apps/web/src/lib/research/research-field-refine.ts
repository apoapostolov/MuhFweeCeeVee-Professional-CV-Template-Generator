import { extractFirstJsonBlock } from "@/lib/field-ai-rewrite";

import type { ResearchFieldContract } from "./contracts/types";
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
  sources?: string[];
  status?: "found" | "not_found" | "uncertain" | "user_provided";
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
  if (!preview.trim() && value !== "" && value !== null) {
    return null;
  }

  const sources = Array.isArray(record.sources)
    ? record.sources.map((s) => String(s).trim()).filter(Boolean)
    : undefined;
  const statusRaw = String(record.status ?? "found").trim().toLowerCase();
  const status =
    statusRaw === "not_found" ||
    statusRaw === "uncertain" ||
    statusRaw === "user_provided" ||
    statusRaw === "found"
      ? statusRaw
      : "found";

  return { confidence, preview: preview || proposalPreview(value), value, sources, status };
}

const MAX_ENTITY_SUMMARY_CHARS = 2500;

/** Compact entity JSON for prompts (D5 cost control). */
export function truncateEntityJsonForPrompt(entityJson: string, maxChars = MAX_ENTITY_SUMMARY_CHARS): string {
  const trimmed = entityJson.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}\n…(truncated)`;
}

function contractSchemaHint(contract: ResearchFieldContract): string {
  const parts = [
    `kind: ${contract.kind}`,
    contract.description,
    contract.maxLength != null ? `maxLength: ${contract.maxLength}` : "",
    contract.maxItems != null ? `maxItems: ${contract.maxItems}` : "",
    contract.enumValues?.length ? `enum: ${contract.enumValues.join(" | ")}` : "",
    contract.requireSourcesToSet ? "requires sources[] for non-empty value (no inventing contacts)" : "",
    contract.listItemKind === "person" ? "each person needs name + linkedin_url (https linkedin.com)" : "",
    contract.listItemKind === "linkedin_job" ? "each job needs title + https url" : "",
  ].filter(Boolean);
  return parts.join("; ");
}

export function buildResearchFieldRefinePrompt(payload: {
  entityType: ResearchFieldRefineEntity;
  fieldPath: string;
  fieldLabel: string;
  currentValue: string;
  entityJson: string;
  contract: ResearchFieldContract;
  useWebSearch?: boolean;
  searchHints?: ResearchWebSearchQueryHints;
}): string {
  const keywordField = payload.fieldPath === "weighted_keywords";
  const useWebSearch = payload.useWebSearch === true;
  const narrative =
    payload.contract.kind === "string" && (payload.contract.maxLength ?? 0) >= 500;
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

  const lines: string[] = [];
  if (useWebSearch) {
    lines.push(researchWebSearchPromptBlock(hints));
    lines.push(
      "You refine a single career research field. You may use live web search when needed.",
    );
  } else {
    lines.push(
      "You refine a single career research field using ONLY the provided context (no web search).",
      "Do not invent public facts, emails, phones, or people. Prefer empty/not_found over guessing.",
    );
  }

  lines.push(
    `Field contract: ${contractSchemaHint(payload.contract)}`,
    "Return a JSON envelope only (no markdown).",
    narrative
      ? "You may return up to 3 proposals for this long narrative field."
      : "Return exactly 1 proposal (primary). Do not invent multiple variants.",
    keywordField
      ? "Proposal value must be a weighted_keywords array per instructions below."
      : "Proposal value must match the field contract type exactly.",
    "Never invent private emails, phones, or people without real sources.",
  );

  if (keywordField) {
    lines.push("", WEIGHTED_KEYWORD_AI_INSTRUCTIONS, "");
  }

  lines.push(
    `Entity type: ${payload.entityType}`,
    `Field path: ${payload.fieldPath}`,
    `Field label: ${payload.fieldLabel}`,
    `Current value:\n${payload.currentValue || "(empty)"}`,
    "",
    "Entity context (truncated JSON):",
    truncateEntityJsonForPrompt(payload.entityJson),
    "",
    "Preferred envelope shape:",
    JSON.stringify(
      {
        schema_version: 1,
        entity_type: payload.entityType,
        operation: "field_refine",
        fields: {
          [payload.fieldPath]: {
            value: "<typed value>",
            confidence: 0,
            status: "found|not_found|uncertain",
            sources: useWebSearch ? ["https://..."] : [],
          },
        },
      },
      null,
      2,
    ),
    "",
    "Legacy shape also accepted:",
    narrative
      ? '{"current_score":0-100,"proposals":[{"value":...,"confidence":0-100,"preview":"..."}]}'
      : '{"current_score":0-100,"proposals":[{"value":...,"confidence":0-100,"preview":"..."}]} (one proposal)',
  );

  return lines.join("\n");
}

export function parseResearchFieldRefineProposals(raw: string): ResearchFieldRefineResult | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;

  // Envelope shape
  if (
    record.schema_version === 1 &&
    record.fields &&
    typeof record.fields === "object" &&
    !Array.isArray(record.fields)
  ) {
    const fields = record.fields as Record<string, unknown>;
    const proposals: ResearchFieldProposal[] = [];
    for (const entry of Object.values(fields)) {
      const proposal = parseProposalEntry(entry);
      if (proposal) proposals.push(proposal);
    }
    if (proposals.length === 0) {
      return null;
    }
    const currentScore = clampScore(record.current_score ?? record.currentScore) ?? 50;
    return { currentScore, proposals: proposals.slice(0, 3) };
  }

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

  if (!("proposal" in record) && !("value" in record)) {
    return null;
  }

  const legacy = parseProposalEntry(
    "proposal" in record
      ? { value: record.proposal, confidence: record.confidence ?? 75, preview: record.preview }
      : record,
  );
  if (!legacy) {
    return null;
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
