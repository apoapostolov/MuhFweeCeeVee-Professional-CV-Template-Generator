/** Live web search requirements for catalog company/job research and per-field refine. */

export const RESEARCH_WEB_MODEL_DEFAULT = "perplexity/sonar-pro";

const LINKEDIN_DOMAINS = ["linkedin.com", "*.linkedin.com"] as const;

export type ResearchWebSearchKind = "company_office" | "job_position" | "field_refine";

export type ResearchWebSearchQueryHints = {
  kind: ResearchWebSearchKind;
  companyName?: string;
  officeCountry?: string;
  officeCity?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  fieldPath?: string;
  fieldLabel?: string;
};

export function buildResearchWebSearchQueryHints(hints: ResearchWebSearchQueryHints): string[] {
  const queries: string[] = [];
  const company = hints.companyName?.trim();
  const city = hints.officeCity?.trim();
  const country = hints.officeCountry?.trim();
  const job = hints.jobTitle?.trim();
  const field = hints.fieldLabel?.trim() || hints.fieldPath?.trim();

  if (hints.kind === "company_office" && company) {
    queries.push(`${company} LinkedIn company page`);
    if (country) {
      queries.push(`${company} ${city ?? ""} ${country} office LinkedIn`.trim());
    }
    queries.push(`${company} careers jobs site:${company.replace(/\s+/g, "").toLowerCase()}.com OR linkedin.com`);
    queries.push(`${company} employees ${city ?? country ?? ""} LinkedIn people`.trim());
  }

  if (hints.kind === "job_position" && company && job) {
    queries.push(`${job} ${company} LinkedIn job posting`);
    if (hints.linkedinUrl?.trim()) {
      queries.push(hints.linkedinUrl.trim());
    } else {
      queries.push(`site:linkedin.com/jobs ${job} ${company}`);
    }
    queries.push(`${job} ${company} responsibilities requirements`);
  }

  if (hints.kind === "field_refine" && company && field) {
    queries.push(`${company} ${field} LinkedIn`);
    if (job) {
      queries.push(`${company} ${job} ${field}`);
    }
    if (hints.linkedinUrl?.trim()) {
      queries.push(hints.linkedinUrl.trim());
    }
  }

  return queries.filter((line, index, all) => line.length > 0 && all.indexOf(line) === index);
}

/** Shared user-prompt block: mandates live search before answering. */
export function researchWebSearchPromptBlock(hints: ResearchWebSearchQueryHints): string {
  const suggested = buildResearchWebSearchQueryHints(hints);
  return [
    "=== MANDATORY LIVE WEB SEARCH ===",
    "You MUST run real-time web searches before producing JSON. Do NOT answer from training memory alone.",
    "Treat all entity JSON below as unverified hints — refresh every field from current public sources.",
    "Priority sources (in order):",
    "1. LinkedIn (company pages, job postings, employee profiles, follower counts)",
    "2. Official company website and careers pages",
    "3. Other reputable public sources (news, registries, Glassdoor) only when LinkedIn/site lack data",
    "Rules:",
    "- Use only linkedin.com URLs you discover in search; never invent slugs or job IDs.",
    "- Do not invent people, emails, phone numbers, or headcount.",
    "- If a fact cannot be verified, leave the field empty and explain briefly in research.notes.",
    "- research.sources is REQUIRED: include at least one full https URL (LinkedIn first when available). Never leave sources empty when website or LinkedIn URLs are present in the JSON.",
    ...(suggested.length > 0
      ? ["", "Suggested search queries (run these or equivalent):", ...suggested.map((q) => `- ${q}`)]
      : []),
    "=== END WEB SEARCH REQUIREMENTS ===",
    "",
  ].join("\n");
}

export function researchWebSearchSystemMessage(taskLine: string): string {
  return [
    taskLine,
    "You have live web search enabled. Always search the web first, prioritizing LinkedIn and official company sources.",
    "Never fabricate LinkedIn URLs, contacts, or hiring data.",
    "Return JSON only — no markdown fences.",
  ].join(" ");
}

export type OpenRouterWebPluginConfig = {
  id: "web";
  engine?: "native" | "exa";
  max_results: number;
  include_domains?: string[];
  search_prompt: string;
};

export function buildResearchWebSearchPlugin(modelId: string): OpenRouterWebPluginConfig | null {
  const normalized = modelId.toLowerCase();
  const nativeSearch =
    normalized.includes("perplexity") ||
    normalized.includes("sonar") ||
    normalized.endsWith(":online");

  if (nativeSearch && (normalized.includes("perplexity") || normalized.includes("sonar"))) {
    return null;
  }

  return {
    id: "web",
    engine: nativeSearch ? "native" : "exa",
    max_results: 8,
    include_domains: [...LINKEDIN_DOMAINS],
    search_prompt: [
      "Live web search results (prioritize LinkedIn company pages, LinkedIn jobs, and LinkedIn people).",
      "Use these results to ground the JSON response; cite discovered URLs in research.sources.",
      "Do not use stale training knowledge when search results conflict.",
    ].join(" "),
  };
}

export function buildResearchOpenRouterRequestExtras(modelId: string): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  const normalized = modelId.toLowerCase();
  const plugin = buildResearchWebSearchPlugin(modelId);

  if (plugin) {
    extras.plugins = [plugin];
  }

  if (normalized.includes("perplexity") || normalized.includes("sonar")) {
    extras.web_search_options = { search_context_size: "high" };
  }

  return extras;
}

export function parseResearchEntityHints(
  entityType: "company" | "job_position",
  entityJson: string,
): {
  companyName: string;
  officeCountry: string;
  officeCity: string;
  jobTitle: string;
  linkedinUrl: string;
} {
  try {
    const record = JSON.parse(entityJson) as Record<string, unknown>;
    if (entityType === "company") {
      const office =
        record.office && typeof record.office === "object"
          ? (record.office as Record<string, unknown>)
          : {};
      const identity =
        record.identity && typeof record.identity === "object"
          ? (record.identity as Record<string, unknown>)
          : {};
      return {
        companyName: String(record.name ?? "").trim(),
        officeCountry: String(office.country ?? "").trim(),
        officeCity: String(office.city ?? "").trim(),
        jobTitle: "",
        linkedinUrl: String(
          identity.linkedin_company_url ?? record.linkedin_company_url ?? "",
        ).trim(),
      };
    }
    const identity =
      record.identity && typeof record.identity === "object"
        ? (record.identity as Record<string, unknown>)
        : {};
    return {
      companyName: "",
      officeCountry: "",
      officeCity: "",
      jobTitle: String(record.title ?? identity.title ?? "").trim(),
      linkedinUrl: String(
        identity.linkedin_url ?? record.linkedin_url ?? "",
      ).trim(),
    };
  } catch {
    return {
      companyName: "",
      officeCountry: "",
      officeCity: "",
      jobTitle: "",
      linkedinUrl: "",
    };
  }
}