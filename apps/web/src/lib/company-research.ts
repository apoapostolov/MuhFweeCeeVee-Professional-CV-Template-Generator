import { extractFirstJsonBlock } from "./field-ai-rewrite";

/** Shape used as the research output template (matches companies[] items). */
export const COMPANY_RESEARCH_RECORD_TEMPLATE = {
  id: "",
  name: "",
  priority: 1,
  company_details: {
    industry: "",
    website: "",
    headquarters: "",
    company_size: "",
    business_model: "",
    products_or_domains: [] as string[],
  },
  target_roles: [] as string[],
  target_functions: [] as string[],
  target_seniority: "",
  tailoring_priorities: [] as string[],
  value_proposition: "",
  motivation: "",
  keywords_to_echo: [] as string[],
  application_context: "",
  interview_context: "",
};

export function isEmptyResearchValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

export function mergeResearchedCompanyRecord(
  existing: Record<string, unknown>,
  researched: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing };

  for (const [key, researchedValue] of Object.entries(researched)) {
    if (key === "id") {
      continue;
    }
    const currentValue = merged[key];

    if (researchedValue !== null && typeof researchedValue === "object" && !Array.isArray(researchedValue)) {
      const currentRecord =
        currentValue !== null && typeof currentValue === "object" && !Array.isArray(currentValue)
          ? (currentValue as Record<string, unknown>)
          : {};
      merged[key] = mergeResearchedCompanyRecord(currentRecord, researchedValue as Record<string, unknown>);
      continue;
    }

    if (Array.isArray(researchedValue)) {
      if (isEmptyResearchValue(currentValue)) {
        merged[key] = researchedValue;
      }
      continue;
    }

    if (isEmptyResearchValue(currentValue)) {
      merged[key] = researchedValue;
    }
  }

  if (typeof merged.id !== "string" || merged.id.trim().length === 0) {
    const researchedId = researched.id;
    if (typeof researchedId === "string" && researchedId.trim().length > 0) {
      merged.id = researchedId.trim();
    }
  }

  const existingName = typeof merged.name === "string" ? merged.name.trim() : "";
  if (!existingName) {
    const researchedName = researched.name;
    if (typeof researchedName === "string" && researchedName.trim().length > 0) {
      merged.name = researchedName.trim();
    }
  }

  return merged;
}

export function buildCompanyResearchPrompt(payload: {
  companyName: string;
  existingRecord: Record<string, unknown>;
}): string {
  const templateJson = JSON.stringify(COMPANY_RESEARCH_RECORD_TEMPLATE, null, 2);
  const existingJson = JSON.stringify(payload.existingRecord, null, 2);

  return [
    "You are a career-research assistant populating company targeting metadata for CV tailoring.",
    "Use current, verifiable public information from the web about the company.",
    "Do not invent facts; if uncertain, use cautious wording and leave fields empty rather than guessing.",
    "",
    `Company to research: ${payload.companyName}`,
    "",
    "Existing partial record (JSON):",
    existingJson,
    "",
    "Target record schema (JSON shape — fill all fields you can verify):",
    templateJson,
    "",
    "Task: Research the company on the public web and return ONE complete company metadata object.",
    "Populate factual company_details, realistic target_roles/functions, tailoring_priorities, value_proposition, motivation, keywords_to_echo, and application_context.",
    "Preserve existing non-empty values from the partial record when they already look correct.",
    "products_or_domains, target_roles, target_functions, tailoring_priorities, and keywords_to_echo must be JSON arrays of strings.",
    "website must be a full URL when known.",
    "priority should be a positive integer (default 1 if unknown).",
    "id should be a short slug derived from the company name if missing.",
    "",
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    '{"company":{...}}',
  ].join("\n");
}

export function parseCompanyResearchResponse(raw: string): Record<string, unknown> | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const company = record.company;
  if (!company || typeof company !== "object" || Array.isArray(company)) {
    return null;
  }
  const name = (company as Record<string, unknown>).name;
  if (typeof name !== "string" || name.trim().length === 0) {
    return null;
  }
  return company as Record<string, unknown>;
}

export function resolveCompanyIdsToResearch(
  draft: unknown,
  selectedCompanyIds: string[],
): string[] {
  const companies = (draft as { companies?: unknown })?.companies;
  if (!Array.isArray(companies)) {
    return [];
  }

  const idsInDraft = companies
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return "";
      }
      const id = (entry as Record<string, unknown>).id;
      return typeof id === "string" ? id.trim() : "";
    })
    .filter((id) => id.length > 0);

  if (selectedCompanyIds.length === 0) {
    return idsInDraft;
  }

  const selected = new Set(selectedCompanyIds.map((id) => id.trim()).filter(Boolean));
  return idsInDraft.filter((id) => selected.has(id));
}