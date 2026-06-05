import type { ResearchMeta, ResearchedCompany, ResearchedJobPosition } from "./types";

export type ResearchQualityReport = {
  ok: boolean;
  issues: string[];
  sourceCount: number;
  linkedInSourceCount: number;
};

const HTTPS_URL = /^https:\/\/.+/i;

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export function collectResearchSourceUrls(meta: ResearchMeta | undefined): string[] {
  return asStringList(meta?.sources).filter((url) => HTTPS_URL.test(url));
}

export function evaluateResearchSources(
  sources: string[],
  options?: { minSources?: number; requireLinkedIn?: boolean },
): ResearchQualityReport {
  const minSources = options?.minSources ?? 1;
  const requireLinkedIn = options?.requireLinkedIn ?? false;
  const issues: string[] = [];
  const linkedInSourceCount = sources.filter((url) => /linkedin\.com/i.test(url)).length;

  if (sources.length < minSources) {
    issues.push(`Expected at least ${minSources} https source URL(s), got ${sources.length}.`);
  }

  if (requireLinkedIn && linkedInSourceCount === 0) {
    issues.push("Expected at least one linkedin.com URL in research.sources.");
  }

  return {
    ok: issues.length === 0,
    issues,
    sourceCount: sources.length,
    linkedInSourceCount,
  };
}

export function assertPerplexityResearchModel(model: string): void {
  const normalized = model.toLowerCase();
  if (!normalized.includes("perplexity") && !normalized.includes("sonar")) {
    throw new Error(`Expected Perplexity/Sonar research model, got "${model}".`);
  }
}

export function evaluateCompanyResearchQuality(company: ResearchedCompany): ResearchQualityReport {
  const issues: string[] = [];
  const sources = collectResearchSourceUrls(company.research);
  const sourceReport = evaluateResearchSources(sources, {
    minSources: 1,
    requireLinkedIn: false,
  });
  issues.push(...sourceReport.issues);

  const linkedin = (company.identity?.linkedin_company_url ?? "").trim();
  const website = (company.identity?.website ?? company.contacts?.website ?? "").trim();
  const hasPublicProfile =
    (linkedin && HTTPS_URL.test(linkedin)) || (website && HTTPS_URL.test(website));
  const hasLinkedInSignal = sourceReport.linkedInSourceCount > 0 || /linkedin\.com/i.test(linkedin);

  if (!hasPublicProfile && !hasLinkedInSignal) {
    issues.push(
      "Expected linkedin_company_url or website, or a LinkedIn URL in research.sources.",
    );
  }

  const description = (company.identity?.description ?? "").trim();
  const industry = (company.identity?.industry ?? "").trim();
  if (description.length < 40 && industry.length < 3) {
    issues.push("Company lacks substantive description or industry after web research.");
  }

  if (!company.name.trim()) {
    issues.push("Company name is empty.");
  }

  if (!company.office?.country?.trim()) {
    issues.push("Office country is empty.");
  }

  return {
    ok: issues.length === 0,
    issues,
    sourceCount: sourceReport.sourceCount,
    linkedInSourceCount: sourceReport.linkedInSourceCount,
  };
}

export function evaluateJobResearchQuality(job: ResearchedJobPosition): ResearchQualityReport {
  const issues: string[] = [];
  const sources = collectResearchSourceUrls(job.research);
  const sourceReport = evaluateResearchSources(sources, { minSources: 1 });
  issues.push(...sourceReport.issues);

  const summary = (job.role?.description_summary ?? "").trim();
  const responsibilities = job.role?.responsibilities ?? [];
  if (summary.length < 30 && responsibilities.length === 0) {
    issues.push("Job lacks description_summary or responsibilities after web research.");
  }

  const keywords = job.weighted_keywords ?? [];
  if (keywords.length < 3) {
    issues.push(`Expected at least 3 weighted_keywords, got ${keywords.length}.`);
  }

  return {
    ok: issues.length === 0,
    issues,
    sourceCount: sourceReport.sourceCount,
    linkedInSourceCount: sourceReport.linkedInSourceCount,
  };
}