import type { ResearchedCompany, ResearchedJobPosition } from "../types";
import { parseWeightedKeywordsFromProposal } from "../weighted-keywords";

import {
  HIRING_STATUS_VALUES,
  OFFICE_TYPE_VALUES,
} from "./companyFields";
import { EMPLOYMENT_TYPE_VALUES, REMOTE_POLICY_VALUES } from "./jobFields";
import { normalizeHttpsUrl } from "./validate";

export type SanitizeReport = {
  warnings: string[];
};

function stripBadUrl(value: string | undefined, path: string, warnings: string[]): string | undefined {
  if (!value || !value.trim()) return undefined;
  const url = normalizeHttpsUrl(value);
  if (!url) {
    warnings.push(`${path}: removed invalid URL`);
    return undefined;
  }
  return url;
}

function stripEmail(
  value: string | undefined,
  path: string,
  hasSources: boolean,
  warnings: string[],
): string | undefined {
  if (!value || !value.trim()) return undefined;
  if (!hasSources) {
    warnings.push(`${path}: removed email without research sources (D4)`);
    return undefined;
  }
  const text = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    warnings.push(`${path}: removed invalid email`);
    return undefined;
  }
  return text;
}

function stripPhone(
  value: string | undefined,
  path: string,
  hasSources: boolean,
  warnings: string[],
): string | undefined {
  if (!value || !value.trim()) return undefined;
  if (!hasSources) {
    warnings.push(`${path}: removed phone without research sources (D4)`);
    return undefined;
  }
  return value.trim().slice(0, 40);
}

function enumOrDrop(
  value: string | undefined,
  allowed: readonly string[],
  path: string,
  warnings: string[],
): string | undefined {
  if (!value || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  const match = allowed.find((v) => v === normalized || v === value.trim());
  if (!match) {
    warnings.push(`${path}: removed invalid enum "${value}"`);
    return undefined;
  }
  return match;
}

/**
 * Strip freeform/invalid AI garbage from a company after normalize (D3/D4 contracts).
 */
export function sanitizeResearchedCompany(company: ResearchedCompany): {
  company: ResearchedCompany;
  warnings: string[];
} {
  const warnings: string[] = [];
  const sources = company.research?.sources ?? [];
  const hasSources = sources.length > 0;

  const identity = company.identity
    ? {
        ...company.identity,
        website: stripBadUrl(company.identity.website, "identity.website", warnings),
        linkedin_company_url: (() => {
          const url = stripBadUrl(
            company.identity.linkedin_company_url,
            "identity.linkedin_company_url",
            warnings,
          );
          if (url && !/linkedin\.com/i.test(url)) {
            warnings.push("identity.linkedin_company_url: must be linkedin.com");
            return undefined;
          }
          return url;
        })(),
        company_size: company.identity.company_size,
        description: company.identity.description?.slice(0, 2000),
        industry: company.identity.industry?.slice(0, 80),
      }
    : undefined;

  const office = {
    ...company.office,
    office_type: enumOrDrop(
      company.office.office_type,
      OFFICE_TYPE_VALUES,
      "office.office_type",
      warnings,
    ) as ResearchedCompany["office"]["office_type"],
    maps_url: stripBadUrl(company.office.maps_url, "office.maps_url", warnings),
  };

  const contacts = company.contacts
    ? {
        ...company.contacts,
        general_email: stripEmail(
          company.contacts.general_email,
          "contacts.general_email",
          hasSources,
          warnings,
        ),
        hr_email: stripEmail(company.contacts.hr_email, "contacts.hr_email", hasSources, warnings),
        recruitment_email: stripEmail(
          company.contacts.recruitment_email,
          "contacts.recruitment_email",
          hasSources,
          warnings,
        ),
        press_email: stripEmail(
          company.contacts.press_email,
          "contacts.press_email",
          hasSources,
          warnings,
        ),
        email: stripEmail(company.contacts.email, "contacts.email", hasSources, warnings),
        phone: stripPhone(company.contacts.phone, "contacts.phone", hasSources, warnings),
        phone_secondary: stripPhone(
          company.contacts.phone_secondary,
          "contacts.phone_secondary",
          hasSources,
          warnings,
        ),
        phone_legacy: stripPhone(
          company.contacts.phone_legacy,
          "contacts.phone_legacy",
          hasSources,
          warnings,
        ),
        careers_page_url: stripBadUrl(
          company.contacts.careers_page_url,
          "contacts.careers_page_url",
          warnings,
        ),
        website: stripBadUrl(company.contacts.website, "contacts.website", warnings),
      }
    : undefined;

  const people = (company.people ?? [])
    .map((person) => {
      const linkedin = stripBadUrl(person.linkedin_url, "people.linkedin_url", warnings);
      if (!person.name?.trim() || !linkedin || !/linkedin\.com/i.test(linkedin)) {
        warnings.push(`people: dropped "${person.name ?? "?"}" without LinkedIn URL (D4)`);
        return null;
      }
      return {
        ...person,
        name: person.name.trim(),
        linkedin_url: linkedin,
        email: undefined, // never keep AI person emails without separate source policy
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const linkedin_jobs = (company.linkedin_jobs ?? [])
    .map((job) => {
      const url = stripBadUrl(job.url, "linkedin_jobs.url", warnings);
      if (!job.title?.trim() || !url) {
        warnings.push(`linkedin_jobs: dropped row without title+url`);
        return null;
      }
      return { ...job, title: job.title.trim(), url };
    })
    .filter((j): j is NonNullable<typeof j> => j !== null);

  const hiringStatus = enumOrDrop(
    company.hiring?.hiring_status,
    HIRING_STATUS_VALUES,
    "hiring.hiring_status",
    warnings,
  ) as "active" | "limited" | "frozen" | "unknown" | undefined;

  const hiring = company.hiring
    ? {
        ...company.hiring,
        hiring_status: hiringStatus,
      }
    : undefined;

  return {
    company: {
      ...company,
      identity,
      office,
      contacts,
      people: people.length > 0 ? people : undefined,
      linkedin_jobs: linkedin_jobs.length > 0 ? linkedin_jobs : undefined,
      hiring,
    },
    warnings,
  };
}

export function sanitizeResearchedJobPosition(job: ResearchedJobPosition): {
  job: ResearchedJobPosition;
  warnings: string[];
} {
  const warnings: string[] = [];
  const weighted_keywords = parseWeightedKeywordsFromProposal(job.weighted_keywords, {
    forceSource: undefined,
  });

  const identity = job.identity
    ? {
        ...job.identity,
        linkedin_url: stripBadUrl(job.identity.linkedin_url, "identity.linkedin_url", warnings),
        employment_type: enumOrDrop(
          job.identity.employment_type,
          EMPLOYMENT_TYPE_VALUES,
          "identity.employment_type",
          warnings,
        ),
        remote_policy: enumOrDrop(
          job.identity.remote_policy,
          REMOTE_POLICY_VALUES,
          "identity.remote_policy",
          warnings,
        ),
      }
    : undefined;

  const role = job.role
    ? {
        ...job.role,
        raw_jd_text: job.role.raw_jd_text?.slice(0, 50_000),
        description_summary: job.role.description_summary?.slice(0, 3000),
      }
    : undefined;

  return {
    job: {
      ...job,
      identity,
      role,
      weighted_keywords,
    },
    warnings,
  };
}
