import type { CompanyMetadata } from "@/lib/server/companyMetadataStore";
import { allocateResearchedJobPositionId } from "./research-ids";
import { slugifyResearchId } from "./research-slug";
import type {
  ResearchCatalog,
  ResearchedCompany,
  ResearchedJobPosition,
  WeightedKeyword,
} from "./types";

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseHeadquarters(raw: string | undefined): {
  country: string;
  city?: string;
  formatted_address?: string;
} {
  if (!raw) {
    return { country: "unknown" };
  }
  // "London, UK" / "Remote-first" → best-effort
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts[0],
      country: parts[parts.length - 1] || "unknown",
      formatted_address: raw,
    };
  }
  return { country: "unknown", formatted_address: raw, city: parts[0] };
}

/** Map legacy Editor company-metadata row → Research catalog company shell. */
export function companyMetadataToResearchShell(
  meta: CompanyMetadata,
): ResearchedCompany {
  const details =
    meta.company_details && typeof meta.company_details === "object"
      ? meta.company_details
      : {};
  const website = asString(details.website);
  const industry = asString(details.industry);
  const companySize = asString(details.company_size);
  const headquarters = asString(details.headquarters);
  const office = parseHeadquarters(headquarters);
  const products = Array.isArray(details.products_or_domains)
    ? details.products_or_domains.map((p) => String(p).trim()).filter(Boolean)
    : [];

  const notes = [
    meta.value_proposition ? `Value: ${meta.value_proposition}` : "",
    meta.motivation ? `Motivation: ${meta.motivation}` : "",
    meta.application_context ? `Application: ${meta.application_context}` : "",
    meta.interview_context ? `Interview: ${meta.interview_context}` : "",
    products.length ? `Domains: ${products.join(", ")}` : "",
    meta.target_functions?.length
      ? `Functions: ${meta.target_functions.join(", ")}`
      : "",
    meta.target_seniority ? `Seniority: ${meta.target_seniority}` : "",
    meta.tailoring_priorities?.length
      ? `Priorities: ${meta.tailoring_priorities.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const id =
    (meta.id && meta.id.trim()) ||
    slugifyResearchId(meta.name) ||
    `co_${Date.now().toString(36)}`;

  return {
    id,
    name: meta.name.trim() || id,
    identity: {
      brand_name: meta.name.trim(),
      industry,
      company_size: companySize,
      website,
      description: meta.value_proposition || meta.motivation,
    },
    office: {
      country: office.country || "unknown",
      city: office.city,
      formatted_address: office.formatted_address,
      office_type: "unknown",
    },
    contacts: {
      website,
    },
    research: {
      notes: notes || undefined,
      sources: [`import:company_metadata:${meta.source ?? "unknown"}`],
      last_operation: "import_metadata",
      researched_at: new Date().toISOString(),
    },
  };
}

function keywordsFromMetadata(meta: CompanyMetadata): WeightedKeyword[] {
  return (meta.keywords_to_echo ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .map((keyword) => ({
      keyword,
      weight: 50,
      source: "user" as const,
      role: "should" as const,
    }));
}

/** Optional job shells from target_roles on metadata. */
export function companyMetadataToJobShells(
  meta: CompanyMetadata,
  companyId: string,
  catalog: ResearchCatalog,
): ResearchedJobPosition[] {
  const roles = meta.target_roles ?? [];
  const keywords = keywordsFromMetadata(meta);
  const jobs: ResearchedJobPosition[] = [];
  let working = catalog;

  for (const title of roles) {
    const trimmed = title.trim();
    if (!trimmed) continue;
    const id = allocateResearchedJobPositionId(working, companyId, trimmed);
    const job: ResearchedJobPosition = {
      id,
      company_id: companyId,
      title: trimmed,
      weighted_keywords: keywords,
      source: "manual",
      research: {
        notes: meta.application_context,
        sources: [`import:company_metadata:${meta.source ?? "unknown"}`],
        last_operation: "import_metadata",
        researched_at: new Date().toISOString(),
      },
    };
    jobs.push(job);
    working = {
      ...working,
      job_positions: [...working.job_positions, job],
    };
  }
  return jobs;
}

export type ImportMetadataResult = {
  catalog: ResearchCatalog;
  companies_added: number;
  companies_skipped: number;
  jobs_added: number;
};

/**
 * Merge company-metadata rows into Research catalog shells.
 * Does not overwrite existing company ids when skipExisting is true (default).
 */
export function mergeMetadataIntoCatalog(
  catalog: ResearchCatalog,
  companies: CompanyMetadata[],
  options?: { skipExisting?: boolean; importJobs?: boolean },
): ImportMetadataResult {
  const skipExisting = options?.skipExisting !== false;
  const importJobs = options?.importJobs !== false;
  let next: ResearchCatalog = {
    version: catalog.version || 2,
    companies: [...catalog.companies],
    job_positions: [...catalog.job_positions],
  };
  let companies_added = 0;
  let companies_skipped = 0;
  let jobs_added = 0;

  for (const meta of companies) {
    if (!meta.name?.trim()) continue;
    const shell = companyMetadataToResearchShell(meta);
    const exists = next.companies.some((c) => c.id === shell.id);
    if (exists && skipExisting) {
      companies_skipped += 1;
    } else if (exists) {
      next = {
        ...next,
        companies: next.companies.map((c) => (c.id === shell.id ? shell : c)),
      };
    } else {
      next = { ...next, companies: [...next.companies, shell] };
      companies_added += 1;
    }

    // Jobs still import for existing companies (new titles only when skipExisting).
    if (importJobs) {
      const jobs = companyMetadataToJobShells(meta, shell.id, next);
      for (const job of jobs) {
        const jobExists = next.job_positions.some(
          (j) =>
            j.company_id === shell.id &&
            j.title.toLowerCase() === job.title.toLowerCase(),
        );
        if (jobExists && skipExisting) continue;
        if (jobExists) {
          next = {
            ...next,
            job_positions: next.job_positions.map((j) =>
              j.company_id === shell.id &&
              j.title.toLowerCase() === job.title.toLowerCase()
                ? job
                : j,
            ),
          };
          continue;
        }
        next = {
          ...next,
          job_positions: [...next.job_positions, job],
        };
        jobs_added += 1;
      }
    }
  }

  next = {
    ...next,
    companies: [...next.companies].sort((a, b) => a.name.localeCompare(b.name)),
    job_positions: [...next.job_positions].sort((a, b) =>
      a.title.localeCompare(b.title),
    ),
  };

  return { catalog: next, companies_added, companies_skipped, jobs_added };
}
