import type { ResearchedCompany } from "./types";
import { researchWebSearchPromptBlock } from "./research-web-search";

export const COMPANY_ENRICH_STAGES = [
  "identity",
  "office",
  "hiring",
  "people",
  "linkedin_jobs",
] as const;

export type CompanyEnrichStage = (typeof COMPANY_ENRICH_STAGES)[number];

export function isCompanyEnrichStage(value: string): value is CompanyEnrichStage {
  return (COMPANY_ENRICH_STAGES as readonly string[]).includes(value);
}

export function normalizeCompanyEnrichStages(
  raw: unknown,
  options?: { useWebSearch?: boolean },
): CompanyEnrichStage[] {
  const useWebSearch = options?.useWebSearch === true;
  const list = Array.isArray(raw)
    ? raw.map((item) => String(item).trim()).filter(isCompanyEnrichStage)
    : [];
  const stages = list.length > 0 ? list : (["identity"] as CompanyEnrichStage[]);
  // People / jobs need web; drop if no web (D2/D4)
  if (!useWebSearch) {
    return stages.filter((s) => s !== "people" && s !== "linkedin_jobs");
  }
  // preserve order of COMPANY_ENRICH_STAGES
  return COMPANY_ENRICH_STAGES.filter((s) => stages.includes(s));
}

function stageFieldPaths(stage: CompanyEnrichStage): string[] {
  switch (stage) {
    case "identity":
      return [
        "identity.legal_name",
        "identity.brand_name",
        "identity.industry",
        "identity.sub_industry",
        "identity.company_size",
        "identity.founded_year",
        "identity.website",
        "identity.linkedin_company_url",
        "identity.description",
      ];
    case "office":
      return [
        "office.city",
        "office.label",
        "office.office_type",
        "office.timezone",
        "office.street_address",
        "office.postal_code",
        "office.region_state",
        "office.formatted_address",
        "office.maps_url",
      ];
    case "hiring":
      return [
        "hiring.hiring_status",
        "hiring.open_roles_count_estimate",
        "hiring.typical_role_families",
        "hiring.employee_count_at_office",
        "hiring.employee_count_company",
        "hiring.glassdoor_rating",
        "contacts.careers_page_url",
      ];
    case "people":
      return ["people"];
    case "linkedin_jobs":
      return ["linkedin_jobs"];
    default:
      return [];
  }
}

export function buildCompanyStageEnrichPrompt(payload: {
  stage: CompanyEnrichStage;
  companyName: string;
  officeCountry: string;
  officeCity?: string;
  officeLabel?: string;
  website?: string;
  linkedinCompanyUrl?: string;
  aboutText?: string;
  existing?: ResearchedCompany | null;
  useWebSearch: boolean;
}): string {
  const fields = stageFieldPaths(payload.stage);
  const lines: string[] = [];

  if (payload.useWebSearch) {
    lines.push(
      researchWebSearchPromptBlock({
        kind: "company_office",
        companyName: payload.companyName,
        officeCountry: payload.officeCountry,
        officeCity: payload.officeCity,
        linkedinUrl: payload.linkedinCompanyUrl,
      }),
    );
    lines.push(
      `You enrich ONLY the "${payload.stage}" group for a company office research record.`,
    );
  } else {
    lines.push(
      `You fill ONLY the "${payload.stage}" group for a company research record using provided seed data (no web search).`,
      "Do not invent emails, phones, people, or job listings. Prefer empty/not_found over guessing.",
    );
  }

  lines.push(
    "Return JSON envelope only:",
    JSON.stringify(
      {
        schema_version: 1,
        entity_type: "company",
        operation: "group_enrich",
        fields: Object.fromEntries(
          fields.map((path) => [
            path,
            {
              value: "<typed>",
              confidence: 0,
              status: "found|not_found|uncertain",
              sources: payload.useWebSearch ? ["https://..."] : [],
            },
          ]),
        ),
      },
      null,
      2,
    ),
    "",
    `Company name: ${payload.companyName}`,
    `Office country: ${payload.officeCountry}`,
    payload.officeCity ? `Office city: ${payload.officeCity}` : "",
    payload.officeLabel ? `Office label: ${payload.officeLabel}` : "",
    payload.website ? `Website seed: ${payload.website}` : "",
    payload.linkedinCompanyUrl ? `LinkedIn seed: ${payload.linkedinCompanyUrl}` : "",
    payload.aboutText
      ? `About text (user paste):\n${payload.aboutText.slice(0, 4000)}`
      : "",
    payload.existing
      ? `Existing partial record (do not invent over solid user data):\n${JSON.stringify(
          {
            identity: payload.existing.identity,
            office: payload.existing.office,
            contacts: {
              careers_page_url: payload.existing.contacts?.careers_page_url,
              website: payload.existing.contacts?.website,
            },
          },
          null,
          2,
        ).slice(0, 2000)}`
      : "",
    "",
    "Field paths for this stage only:",
    ...fields.map((path) => `- ${path}`),
    payload.stage === "people"
      ? "people: array of {name, title, linkedin_url}; linkedin_url required; max 5."
      : "",
    payload.stage === "linkedin_jobs"
      ? "linkedin_jobs: array of {title, url}; url required https; max 10."
      : "",
    payload.stage === "identity"
      ? "company_size enum: 1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10000+|unknown"
      : "",
    payload.stage === "office"
      ? "office_type enum: headquarters|branch|regional_hub|remote_hub|coworking|unknown"
      : "",
    payload.stage === "hiring"
      ? "hiring_status enum: active|limited|frozen|unknown; careers_page_url https only"
      : "",
  );

  return lines.filter((line) => line.length > 0).join("\n");
}

/** Rough token estimates for UI cost preflight (not billing-accurate). */
export function estimateCompanyEnrichTokens(payload: {
  stages: CompanyEnrichStage[];
  useWebSearch: boolean;
}): { inputTokens: number; outputTokens: number } {
  const baseIn = payload.useWebSearch ? 1800 : 900;
  const baseOut = payload.useWebSearch ? 1200 : 500;
  const perStageIn = payload.useWebSearch ? 400 : 220;
  const perStageOut = payload.useWebSearch ? 900 : 350;
  const n = Math.max(1, payload.stages.length);
  return {
    inputTokens: baseIn + perStageIn * n,
    outputTokens: baseOut + perStageOut * n,
  };
}
