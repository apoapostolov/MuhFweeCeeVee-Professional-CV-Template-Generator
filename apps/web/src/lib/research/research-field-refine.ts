import { extractFirstJsonBlock } from "@/lib/field-ai-rewrite";

import type { ResearchFieldRefineEntity } from "./types";
import { WEIGHTED_KEYWORD_AI_INSTRUCTIONS } from "./weighted-keywords";

export function buildResearchFieldRefinePrompt(payload: {
  entityType: ResearchFieldRefineEntity;
  fieldPath: string;
  fieldLabel: string;
  currentValue: string;
  entityJson: string;
}): string {
  const keywordField = payload.fieldPath === "weighted_keywords";
  return [
    "You refine a single field in a career research record using public web sources.",
    "Return exactly one improved value for the requested field — do not change unrelated fields.",
    keywordField
      ? "Expand and improve the full weighted_keywords array (not a single string)."
      : "If the current value is already strong, make a modest improvement (clarity, specificity, verifiable detail).",
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
    keywordField
      ? 'Return ONLY valid JSON: {"proposal": [{ "keyword": "", "weight": 0, "category": "position|seniority|industry|skill|tool|domain|soft|certification|methodology", "rationale": "" }]}'
      : 'Return ONLY valid JSON: {"proposal": <string or array or object matching the field type>}',
  ].join("\n");
}

export function parseResearchFieldRefineResponse(raw: string): unknown | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (!("proposal" in (parsed as Record<string, unknown>))) {
    return null;
  }
  return (parsed as Record<string, unknown>).proposal;
}