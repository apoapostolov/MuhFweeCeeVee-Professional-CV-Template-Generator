import { extractFirstJsonBlock } from "@/lib/field-ai-rewrite";

import {
  normalizeResearchedCompany,
  normalizeResearchedJobPosition,
} from "./research-normalize";
import type { ResearchedCompany, ResearchedJobPosition } from "./types";
import { slugifyResearchId } from "./research-slug";
import { researchWebSearchPromptBlock } from "./research-web-search";
import { WEIGHTED_KEYWORD_AI_INSTRUCTIONS } from "./weighted-keywords";

export { slugifyResearchId };

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

const COMPANY_JSON_SHAPE = `{
  "company": {
    "id": "slug",
    "name": "display name",
    "identity": {
      "legal_name": "", "brand_name": "", "industry": "", "sub_industry": "",
      "company_size": "", "founded_year": "", "website": "",
      "linkedin_company_url": "", "linkedin_company_id": "", "description": ""
    },
    "office": {
      "country": "ISO country name", "city": "", "label": "Sofia HQ",
      "office_type": "headquarters|branch|regional_hub|remote_hub|coworking|unknown",
      "timezone": "", "street_address": "", "address_line_2": "",
      "postal_code": "", "region_state": "", "formatted_address": "", "maps_url": ""
    },
    "contacts": {
      "general_email": "", "hr_email": "", "recruitment_email": "",
      "phone": "", "phone_secondary": "", "careers_page_url": "", "press_email": "", "website": ""
    },
    "people": [{ "name": "", "title": "", "department": "", "seniority": "", "linkedin_url": "", "email": "", "location": "", "relevance": "", "source": "" }],
    "linkedin_jobs": [{ "title": "", "url": "", "location": "", "posted_at": "", "employment_type": "", "seniority": "", "remote_policy": "", "description_snippet": "" }],
    "linkedin": { "company_page_url": "", "company_id": "", "follower_count": "", "recent_posts_summary": "" },
    "hiring": {
      "hiring_status": "active|limited|frozen|unknown",
      "open_roles_count_estimate": "", "typical_role_families": [],
      "employee_count_at_office": "", "employee_count_company": "", "glassdoor_rating": ""
    },
    "research": { "notes": "", "sources": ["https://www.linkedin.com/company/example", "https://example.com"] }
  }
}`;

export function buildOfficeCompanyResearchPrompt(payload: {
  companyName: string;
  officeCountry: string;
  officeCity?: string;
  officeLabel?: string;
}): string {
  return [
    researchWebSearchPromptBlock({
      kind: "company_office",
      companyName: payload.companyName,
      officeCountry: payload.officeCountry,
      officeCity: payload.officeCity,
    }),
    "You are a career research assistant gathering public information about a specific company office.",
    "linkedin_jobs must list roles discovered on LinkedIn or the company careers site — not guessed titles.",
    "people must be real LinkedIn profiles found in search; otherwise return an empty people array.",
    "",
    `Company: ${payload.companyName}`,
    `Office country: ${payload.officeCountry}`,
    payload.officeCity ? `Office city: ${payload.officeCity}` : "",
    payload.officeLabel ? `Office label: ${payload.officeLabel}` : "",
    "",
    "Return ONLY valid JSON (no markdown) with shape:",
    COMPANY_JSON_SHAPE,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function parseOfficeCompanyResearchResponse(raw: string): ResearchedCompany | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const company = (parsed as Record<string, unknown>).company;
  if (!company || typeof company !== "object") {
    return null;
  }
  const record = company as Record<string, unknown>;
  const name = String(record.name ?? "").trim();
  const officeRecord =
    record.office && typeof record.office === "object"
      ? (record.office as Record<string, unknown>)
      : record;
  const officeCountry = String(
    officeRecord.country ?? record.office_country ?? "",
  ).trim();
  if (!name || !officeCountry) {
    return null;
  }
  const id =
    String(record.id ?? "").trim() ||
    slugifyResearchId(`${name}_${officeCountry}_${officeRecord.city ?? "office"}`);

  return normalizeResearchedCompany({
    ...record,
    id,
    name,
    office: {
      ...(typeof record.office === "object" ? record.office : {}),
      country: officeCountry,
      city: officeRecord.city ?? record.office_city,
      label: officeRecord.label ?? record.office_label,
      formatted_address: officeRecord.formatted_address ?? record.address,
    },
  });
}

const JOB_JSON_SHAPE = (companyId: string) => `{
  "job_position": {
    "id": "optional-hint-only",
    "company_id": "${companyId}",
    "title": "string",
    "identity": {
      "title": "", "normalized_title": "", "department": "", "seniority_level": "",
      "employment_type": "", "remote_policy": "", "source": "linkedin|manual|research",
      "linkedin_url": "", "linkedin_job_id": ""
    },
    "location": { "country": "", "city": "", "relocation_offered": false },
    "compensation": { "salary_range_text": "", "currency": "", "benefits_summary": "" },
    "role": {
      "description_summary": "", "responsibilities": [], "qualifications": [],
      "nice_to_have": [], "reporting_to": "", "team_size": ""
    },
    "skills": {
      "skills_required": [], "skills_preferred": [], "tools": [], "certifications": [],
      "languages": [], "years_experience_min": ""
    },
    "weighted_keywords": [{ "keyword": "string", "weight": 0, "category": "position|seniority|industry|skill|tool|domain|soft|certification|methodology", "rationale": "" }],
    "ats": { "keywords": [], "action_verbs": [] },
    "research": { "notes": "", "sources": ["https://www.linkedin.com/company/example", "https://example.com"] }
  }
}`;

export function buildJobPositionResearchPrompt(payload: {
  company: ResearchedCompany;
  jobTitle: string;
  jobDescription?: string;
  linkedinUrl?: string;
}): string {
  const office = payload.company.office;
  return [
    researchWebSearchPromptBlock({
      kind: "job_position",
      companyName: payload.company.name,
      officeCountry: office.country,
      officeCity: office.city,
      jobTitle: payload.jobTitle,
      linkedinUrl: payload.linkedinUrl,
    }),
    "You are a job-market research assistant building a weighted keyword profile for CV tailoring and ATS alignment.",
    "Derive responsibilities, skills, and keywords from the live LinkedIn job posting or careers page when available.",
    WEIGHTED_KEYWORD_AI_INSTRUCTIONS,
    "",
    `Company: ${payload.company.name} (${office.label ?? office.city ?? ""}, ${office.country})`,
    `Industry context: ${payload.company.identity?.industry ?? "unknown"} / ${payload.company.identity?.sub_industry ?? ""}`,
    `Job title: ${payload.jobTitle}`,
    payload.linkedinUrl ? `LinkedIn URL: ${payload.linkedinUrl}` : "",
    payload.jobDescription ? `Job description:\n${payload.jobDescription}` : "",
    "",
    "Return ONLY valid JSON (no markdown) with shape:",
    JOB_JSON_SHAPE(payload.company.id),
  ].join("\n");
}

export function parseJobPositionResearchResponse(
  raw: string,
  companyId: string,
): ResearchedJobPosition | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const job = (parsed as Record<string, unknown>).job_position;
  if (!job || typeof job !== "object") {
    return null;
  }
  const record = job as Record<string, unknown>;
  const title = String(record.title ?? asRecord(record.identity)?.title ?? "").trim();
  if (!title) {
    return null;
  }
  const id =
    String(record.id ?? "").trim() || slugifyResearchId(`${companyId}_${title}`);

  const normalized = normalizeResearchedJobPosition({
    ...record,
    id,
    company_id: companyId,
    title,
  });
  if (!normalized || normalized.weighted_keywords.length === 0) {
    return null;
  }
  return normalized;
}

export function buildFieldAiJobContext(payload: {
  job: ResearchedJobPosition;
  company: ResearchedCompany;
}): string {
  const office = payload.company.office;
  const keywords = payload.job.weighted_keywords
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .map((k) => `${k.keyword} (weight ${k.weight})`)
    .join(", ");
  return [
    `Target job position: ${payload.job.title}`,
    `Target company office: ${payload.company.name} — ${office.label ?? office.city ?? ""}, ${office.country}`,
    payload.job.role?.description_summary
      ? `Role summary: ${payload.job.role.description_summary}`
      : payload.job.description_summary
        ? `Role summary: ${payload.job.description_summary}`
        : "",
    `Preferred keywords (use only when they fit naturally; never force irrelevant terms): ${keywords}`,
  ]
    .filter(Boolean)
    .join("\n");
}