import {
  backfillCompanyResearchSources,
  backfillJobResearchSources,
} from "./research-source-backfill";
import { mergeWeightedKeywords } from "./weighted-keywords";
import type {
  CompanyContacts,
  CompanyOffice,
  ResearchedCompany,
  ResearchedJobPosition,
  ResearchCatalog,
  WeightedKeyword,
} from "./types";

const CATALOG_VERSION = 2;

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

function pickString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOffice(input: unknown, legacy?: Record<string, unknown>): CompanyOffice {
  const record = asRecord(input);
  const country =
    pickString(record ?? {}, "country") ??
    pickString(legacy ?? {}, "office_country") ??
    "";
  return {
    country,
    city: pickString(record ?? {}, "city") ?? pickString(legacy ?? {}, "office_city"),
    label: pickString(record ?? {}, "label") ?? pickString(legacy ?? {}, "office_label"),
    office_type: pickString(record ?? {}, "office_type") as CompanyOffice["office_type"],
    timezone: pickString(record ?? {}, "timezone"),
    street_address: pickString(record ?? {}, "street_address"),
    address_line_2: pickString(record ?? {}, "address_line_2"),
    postal_code: pickString(record ?? {}, "postal_code"),
    region_state: pickString(record ?? {}, "region_state"),
    formatted_address:
      pickString(record ?? {}, "formatted_address") ?? pickString(legacy ?? {}, "address"),
    maps_url: pickString(record ?? {}, "maps_url"),
  };
}

function normalizeContacts(input: unknown, legacy?: Record<string, unknown>): CompanyContacts | undefined {
  const record = asRecord(input);
  const legacyContacts = asRecord(legacy?.contacts);
  const merged: CompanyContacts = {
    general_email:
      pickString(record ?? {}, "general_email") ??
      pickString(record ?? {}, "email") ??
      pickString(legacyContacts ?? {}, "email"),
    hr_email: pickString(record ?? {}, "hr_email"),
    recruitment_email: pickString(record ?? {}, "recruitment_email"),
    phone:
      pickString(record ?? {}, "phone") ??
      pickString(legacyContacts ?? {}, "phone"),
    phone_secondary: pickString(record ?? {}, "phone_secondary"),
    careers_page_url: pickString(record ?? {}, "careers_page_url"),
    press_email: pickString(record ?? {}, "press_email"),
    website:
      pickString(record ?? {}, "website") ??
      pickString(legacyContacts ?? {}, "website"),
  };
  const hasValue = Object.values(merged).some((v) => typeof v === "string" && v.length > 0);
  return hasValue ? merged : undefined;
}

export function normalizeResearchedCompany(input: unknown): ResearchedCompany | null {
  const record = asRecord(input);
  if (!record) {
    return null;
  }
  const id = pickString(record, "id");
  const name = pickString(record, "name");
  const office = normalizeOffice(record.office, record);
  if (!id || !name || !office.country) {
    return null;
  }

  const identityRecord = asRecord(record.identity);
  const linkedinRecord = asRecord(record.linkedin);
  const hiringRecord = asRecord(record.hiring);
  const researchRecord = asRecord(record.research);

  return backfillCompanyResearchSources({
    id,
    name,
    office,
    identity: identityRecord
      ? {
          legal_name: pickString(identityRecord, "legal_name"),
          brand_name: pickString(identityRecord, "brand_name"),
          industry: pickString(identityRecord, "industry"),
          sub_industry: pickString(identityRecord, "sub_industry"),
          company_size: pickString(identityRecord, "company_size"),
          founded_year: pickString(identityRecord, "founded_year"),
          website: pickString(identityRecord, "website"),
          linkedin_company_url: pickString(identityRecord, "linkedin_company_url"),
          linkedin_company_id: pickString(identityRecord, "linkedin_company_id"),
          description: pickString(identityRecord, "description"),
        }
      : undefined,
    contacts: normalizeContacts(record.contacts, record),
    people: Array.isArray(record.people) ? (record.people as ResearchedCompany["people"]) : undefined,
    linkedin_jobs: Array.isArray(record.linkedin_jobs)
      ? (record.linkedin_jobs as ResearchedCompany["linkedin_jobs"])
      : undefined,
    linkedin: linkedinRecord
      ? {
          company_page_url: pickString(linkedinRecord, "company_page_url"),
          company_id: pickString(linkedinRecord, "company_id"),
          follower_count: pickString(linkedinRecord, "follower_count"),
          recent_posts_summary: pickString(linkedinRecord, "recent_posts_summary"),
        }
      : undefined,
    hiring: hiringRecord
      ? {
          hiring_status: pickString(hiringRecord, "hiring_status") as
            | "active"
            | "limited"
            | "frozen"
            | "unknown"
            | undefined,
          open_roles_count_estimate: pickString(hiringRecord, "open_roles_count_estimate"),
          typical_role_families: Array.isArray(hiringRecord.typical_role_families)
            ? hiringRecord.typical_role_families.map((v) => String(v).trim()).filter(Boolean)
            : undefined,
          employee_count_at_office: pickString(hiringRecord, "employee_count_at_office"),
          employee_count_company: pickString(hiringRecord, "employee_count_company"),
          glassdoor_rating: pickString(hiringRecord, "glassdoor_rating"),
        }
      : undefined,
    research: {
      notes: pickString(researchRecord ?? {}, "notes") ?? pickString(record, "notes"),
      sources: Array.isArray(researchRecord?.sources)
        ? researchRecord.sources.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      researched_at: pickString(researchRecord ?? {}, "researched_at") ?? pickString(record, "researched_at"),
      research_model: pickString(researchRecord ?? {}, "research_model") ?? pickString(record, "research_model"),
    },
  });
}

function parseWeightedKeywords(input: unknown): WeightedKeyword[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const out: WeightedKeyword[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) {
      continue;
    }
    const keyword = pickString(record, "keyword") ?? "";
    const weightRaw = Number(record.weight);
    if (!keyword || !Number.isFinite(weightRaw)) {
      continue;
    }
    out.push({
      keyword,
      weight: Math.max(0, Math.min(100, Math.round(weightRaw))),
      category: pickString(record, "category"),
      rationale: pickString(record, "rationale"),
    });
  }
  return mergeWeightedKeywords(out);
}

export function normalizeResearchedJobPosition(input: unknown): ResearchedJobPosition | null {
  const record = asRecord(input);
  if (!record) {
    return null;
  }
  const id = pickString(record, "id");
  const company_id = pickString(record, "company_id");
  const title = pickString(record, "title") ?? pickString(asRecord(record.identity) ?? {}, "title");
  const weighted_keywords = parseWeightedKeywords(record.weighted_keywords);
  if (!id || !company_id || !title) {
    return null;
  }

  const identityRecord = asRecord(record.identity);
  const locationRecord = asRecord(record.location);
  const compensationRecord = asRecord(record.compensation);
  const roleRecord = asRecord(record.role);
  const skillsRecord = asRecord(record.skills);
  const atsRecord = asRecord(record.ats);
  const researchRecord = asRecord(record.research);

  const skills_required = Array.isArray(skillsRecord?.skills_required)
    ? skillsRecord.skills_required.map((v) => String(v).trim()).filter(Boolean)
    : Array.isArray(record.skills_required)
      ? record.skills_required.map((v) => String(v).trim()).filter(Boolean)
      : undefined;

  return backfillJobResearchSources({
    id,
    company_id,
    title,
    weighted_keywords,
    identity: {
      title,
      normalized_title: pickString(identityRecord ?? {}, "normalized_title"),
      department: pickString(identityRecord ?? {}, "department"),
      seniority_level: pickString(identityRecord ?? {}, "seniority_level"),
      employment_type: pickString(identityRecord ?? {}, "employment_type"),
      remote_policy: pickString(identityRecord ?? {}, "remote_policy"),
      source:
        (pickString(identityRecord ?? {}, "source") as ResearchedJobPosition["source"]) ??
        (pickString(record, "source") as ResearchedJobPosition["source"]),
      linkedin_url:
        pickString(identityRecord ?? {}, "linkedin_url") ?? pickString(record, "linkedin_url"),
      linkedin_job_id: pickString(identityRecord ?? {}, "linkedin_job_id"),
    },
    location: locationRecord
      ? {
          country: pickString(locationRecord, "country"),
          city: pickString(locationRecord, "city"),
          relocation_offered:
            typeof locationRecord.relocation_offered === "boolean"
              ? locationRecord.relocation_offered
              : undefined,
        }
      : undefined,
    compensation: compensationRecord
      ? {
          salary_range_text: pickString(compensationRecord, "salary_range_text"),
          currency: pickString(compensationRecord, "currency"),
          benefits_summary: pickString(compensationRecord, "benefits_summary"),
        }
      : undefined,
    role: {
      description_summary:
        pickString(roleRecord ?? {}, "description_summary") ?? pickString(record, "description_summary"),
      responsibilities: Array.isArray(roleRecord?.responsibilities)
        ? roleRecord.responsibilities.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      qualifications: Array.isArray(roleRecord?.qualifications)
        ? roleRecord.qualifications.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      nice_to_have: Array.isArray(roleRecord?.nice_to_have)
        ? roleRecord.nice_to_have.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      reporting_to: pickString(roleRecord ?? {}, "reporting_to"),
      team_size: pickString(roleRecord ?? {}, "team_size"),
    },
    skills: {
      skills_required,
      skills_preferred: Array.isArray(skillsRecord?.skills_preferred)
        ? skillsRecord.skills_preferred.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      tools: Array.isArray(skillsRecord?.tools)
        ? skillsRecord.tools.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      certifications: Array.isArray(skillsRecord?.certifications)
        ? skillsRecord.certifications.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      languages: Array.isArray(skillsRecord?.languages)
        ? skillsRecord.languages.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      years_experience_min: pickString(skillsRecord ?? {}, "years_experience_min"),
    },
    ats: atsRecord
      ? {
          keywords: Array.isArray(atsRecord.keywords)
            ? atsRecord.keywords.map((v) => String(v).trim()).filter(Boolean)
            : undefined,
          action_verbs: Array.isArray(atsRecord.action_verbs)
            ? atsRecord.action_verbs.map((v) => String(v).trim()).filter(Boolean)
            : undefined,
        }
      : undefined,
    research: {
      notes: pickString(researchRecord ?? {}, "notes"),
      sources: Array.isArray(researchRecord?.sources)
        ? researchRecord.sources.map((v) => String(v).trim()).filter(Boolean)
        : undefined,
      researched_at: pickString(researchRecord ?? {}, "researched_at") ?? pickString(record, "researched_at"),
      research_model: pickString(researchRecord ?? {}, "research_model") ?? pickString(record, "research_model"),
    },
  });
}

export function normalizeResearchCatalog(input: unknown): ResearchCatalog {
  if (!input || typeof input !== "object") {
    return { version: CATALOG_VERSION, companies: [], job_positions: [] };
  }
  const record = input as Record<string, unknown>;
  const companies = Array.isArray(record.companies)
    ? record.companies
        .map((entry) => normalizeResearchedCompany(entry))
        .filter((entry): entry is ResearchedCompany => entry !== null)
    : [];
  const job_positions = Array.isArray(record.job_positions)
    ? record.job_positions
        .map((entry) => normalizeResearchedJobPosition(entry))
        .filter((entry): entry is ResearchedJobPosition => entry !== null)
    : [];
  return {
    version: typeof record.version === "number" ? record.version : CATALOG_VERSION,
    companies,
    job_positions,
  };
}

export function companyOfficeSummary(company: ResearchedCompany): string {
  return company.office.label ?? company.office.city ?? company.office.country;
}

/** Flat accessors for editor sidebar and legacy prompts */
export function companyLegacyFlat(company: ResearchedCompany): {
  office_country: string;
  office_city?: string;
  office_label?: string;
} {
  return {
    office_country: company.office.country,
    office_city: company.office.city,
    office_label: company.office.label,
  };
}