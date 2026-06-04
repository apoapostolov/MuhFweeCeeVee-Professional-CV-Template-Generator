import type { FieldRewriteProposal } from "./field-ai-rewrite";
import { extractFirstJsonBlock } from "./field-ai-rewrite";
import { researchWebSearchPromptBlock } from "./research/research-web-search";

export type CompanyFieldResearchResult = {
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

export function buildCompanyFieldResearchPrompt(payload: {
  companyName: string;
  fieldPath: string;
  fieldLabel: string;
  fieldKey: string;
  currentText: string;
  companyContext: Record<string, unknown>;
}): string {
  const contextJson = JSON.stringify(payload.companyContext, null, 2);
  const current =
    payload.currentText.trim().length > 0 ? payload.currentText.trim() : "(empty — research and suggest new content)";

  return [
    researchWebSearchPromptBlock({
      kind: "field_refine",
      companyName: payload.companyName,
      fieldPath: payload.fieldPath,
      fieldLabel: payload.fieldLabel,
    }),
    "You are a career-research assistant helping populate company targeting metadata for CV tailoring.",
    "Do not invent funding rounds, headcount, or product names unless you find them in reputable public sources.",
    "If information is uncertain, reflect that in lower confidence and cautious wording.",
    "",
    `Company name: ${payload.companyName}`,
    `Field label: ${payload.fieldLabel}`,
    `Field key: ${payload.fieldKey}`,
    `Field path: ${payload.fieldPath}`,
    "",
    "Known company record (JSON — may be partial):",
    contextJson,
    "",
    "Current field value:",
    current,
    "",
    "Task: Research this company and produce exactly three distinct candidate values for this field.",
    "Each proposal should be ready to paste into the metadata editor (plain text, no markdown fences).",
    "For list-style fields (roles, keywords, priorities), use concise newline-separated lines or comma-separated phrases as appropriate.",
    "For website fields, return a full URL when possible.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    '{"proposals":[{"text":string,"confidence":number}, ...]}',
    "Exactly three proposals required. confidence = how strongly you recommend that option (0-100).",
  ].join("\n");
}

export function parseCompanyFieldResearchResponse(raw: string): CompanyFieldResearchResult | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const rawProposals = Array.isArray(record.proposals) ? record.proposals : [];
  const proposals = rawProposals
    .map((entry) => parseProposal(entry))
    .filter((entry): entry is FieldRewriteProposal => entry !== null)
    .slice(0, 3);

  if (proposals.length < 3) {
    return null;
  }

  return { proposals };
}

export function resolveCompanyRecordFromMetadataPath(
  draft: unknown,
  path: Array<string | number>,
): Record<string, unknown> | null {
  if (path.length < 2 || path[0] !== "companies" || typeof path[1] !== "number") {
    return null;
  }
  const companies = (draft as { companies?: unknown })?.companies;
  if (!Array.isArray(companies)) {
    return null;
  }
  const company = companies[path[1]];
  if (!company || typeof company !== "object" || Array.isArray(company)) {
    return null;
  }
  return company as Record<string, unknown>;
}

export function resolveCompanyNameFromMetadataPath(draft: unknown, path: Array<string | number>): string {
  const company = resolveCompanyRecordFromMetadataPath(draft, path);
  if (!company) {
    return "";
  }
  const name = company.name;
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }
  const id = company.id;
  if (typeof id === "string" && id.trim().length > 0) {
    return id.trim();
  }
  return "";
}