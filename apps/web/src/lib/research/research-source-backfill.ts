import type { ResearchedCompany, ResearchedJobPosition } from "./types";

const HTTPS_URL = /^https:\/\/.+/i;

function toHttpsUrl(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }
  if (HTTPS_URL.test(trimmed)) {
    return trimmed;
  }
  if (/^http:\/\//i.test(trimmed)) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  return null;
}

export function mergeResearchSourceUrls(
  existing: string[] | undefined,
  discovered: string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const candidate of [...(existing ?? []), ...discovered]) {
    const https = toHttpsUrl(candidate);
    if (!https) {
      continue;
    }
    const key = https.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(https);
  }

  return merged;
}

export function harvestCompanyResearchSourceUrls(company: ResearchedCompany): string[] {
  const urls: string[] = [];

  const push = (value: string | undefined) => {
    const https = toHttpsUrl(value);
    if (https) {
      urls.push(https);
    }
  };

  push(company.identity?.website);
  push(company.identity?.linkedin_company_url);
  push(company.contacts?.website);
  push(company.contacts?.careers_page_url);
  push(company.office?.maps_url);
  push(company.linkedin?.company_page_url);

  for (const person of company.people ?? []) {
    push(person.linkedin_url);
    push(person.source);
  }

  for (const job of company.linkedin_jobs ?? []) {
    push(job.url);
  }

  return urls;
}

export function harvestJobResearchSourceUrls(job: ResearchedJobPosition): string[] {
  const urls: string[] = [];
  const push = (value: string | undefined) => {
    const https = toHttpsUrl(value);
    if (https) {
      urls.push(https);
    }
  };

  push(job.identity?.linkedin_url);
  return urls;
}

export function backfillCompanyResearchSources(company: ResearchedCompany): ResearchedCompany {
  const sources = mergeResearchSourceUrls(
    company.research?.sources,
    harvestCompanyResearchSourceUrls(company),
  );
  if (sources.length === 0 && !company.research) {
    return company;
  }
  return {
    ...company,
    research: {
      ...company.research,
      sources: sources.length > 0 ? sources : company.research?.sources,
    },
  };
}

export function backfillJobResearchSources(job: ResearchedJobPosition): ResearchedJobPosition {
  const sources = mergeResearchSourceUrls(
    job.research?.sources,
    harvestJobResearchSourceUrls(job),
  );
  if (sources.length === 0 && !job.research) {
    return job;
  }
  return {
    ...job,
    research: {
      ...job.research,
      sources: sources.length > 0 ? sources : job.research?.sources,
    },
  };
}