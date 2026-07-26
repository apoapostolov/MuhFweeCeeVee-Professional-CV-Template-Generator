import {
  buildCompanyStageEnrichPrompt,
  estimateCompanyEnrichTokens,
  normalizeCompanyEnrichStages,
  type CompanyEnrichStage,
} from "@/lib/research/companyEnrich";
import { applyEnvelopeToEntity } from "@/lib/research/contracts";
import { parseResearchAiEnvelope } from "@/lib/research/envelope";
import { slugifyResearchId } from "@/lib/research/research-slug";
import type { ResearchedCompany } from "@/lib/research/types";
import {
  buildResearchCacheKey,
  readResearchCache,
  writeResearchCache,
} from "@/lib/research/researchCache";
import { researchWebSearchSystemMessage } from "@/lib/research/research-web-search";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";
import {
  findResearchedCompany,
  readResearchCatalog,
  upsertResearchedCompany,
} from "@/lib/server/researchStore";

export type CompanyEnrichInput = {
  companyId?: string;
  companyName: string;
  officeCountry: string;
  officeCity?: string;
  officeLabel?: string;
  website?: string;
  linkedinCompanyUrl?: string;
  aboutText?: string;
  stages?: unknown;
  useWebSearch?: boolean;
  forceRefresh?: boolean;
};

export type CompanyEnrichResult =
  | {
      ok: true;
      cached: boolean;
      stages: CompanyEnrichStage[];
      useWebSearch: boolean;
      model?: string;
      models?: string[];
      applied?: string[];
      rejected?: Array<{ path: string; error: string; stage?: string }>;
      company: ResearchedCompany;
      companies: ResearchedCompany[];
      tokenEstimate: { inputTokens: number; outputTokens: number };
    }
  | {
      ok: false;
      error: string;
      status: number;
      raw?: string;
      stage?: string;
      partialCompany?: ResearchedCompany;
    };

function shellCompany(payload: {
  companyId?: string;
  companyName: string;
  officeCountry: string;
  officeCity?: string;
  officeLabel?: string;
  website?: string;
  linkedinCompanyUrl?: string;
  existing?: ResearchedCompany | null;
}): ResearchedCompany {
  const id =
    payload.companyId ||
    payload.existing?.id ||
    slugifyResearchId(
      `${payload.companyName}_${payload.officeCountry}_${payload.officeCity ?? "office"}`,
    );
  return {
    id,
    name: payload.companyName,
    office: {
      country: payload.officeCountry,
      city: payload.officeCity || payload.existing?.office.city,
      label: payload.officeLabel || payload.existing?.office.label,
      office_type: payload.existing?.office.office_type,
    },
    identity: {
      ...payload.existing?.identity,
      website: payload.website || payload.existing?.identity?.website,
      linkedin_company_url:
        payload.linkedinCompanyUrl || payload.existing?.identity?.linkedin_company_url,
    },
    contacts: payload.existing?.contacts,
    people: payload.existing?.people,
    linkedin_jobs: payload.existing?.linkedin_jobs,
    hiring: payload.existing?.hiring,
    linkedin: payload.existing?.linkedin,
    research: payload.existing?.research,
  };
}

export async function runCompanyEnrich(
  input: CompanyEnrichInput,
): Promise<CompanyEnrichResult> {
  const useWebSearch = input.useWebSearch === true;
  const forceRefresh = input.forceRefresh === true;
  const stages = normalizeCompanyEnrichStages(input.stages, { useWebSearch });
  const companyName = input.companyName.trim();
  const officeCountry = input.officeCountry.trim();

  if (!companyName || !officeCountry) {
    return {
      ok: false,
      error: "companyName and officeCountry are required.",
      status: 400,
    };
  }

  const catalog = await readResearchCatalog();
  const companyId = input.companyId?.trim() || "";
  const existing = companyId ? findResearchedCompany(catalog, companyId) : null;
  if (companyId && !existing) {
    return { ok: false, error: `Company '${companyId}' not found.`, status: 404 };
  }

  const tokenEstimate = estimateCompanyEnrichTokens({ stages, useWebSearch });
  const cacheKey = buildResearchCacheKey({
    kind: "company_enrich",
    companyName,
    officeCountry,
    officeCity: input.officeCity ?? "",
    stages,
    useWebSearch,
    website: input.website ?? "",
    linkedinCompanyUrl: input.linkedinCompanyUrl ?? "",
  });

  if (!forceRefresh) {
    const cached = await readResearchCache<{
      company: ResearchedCompany;
      stages: CompanyEnrichStage[];
      model?: string;
    }>(cacheKey);
    if (cached?.payload?.company) {
      const catalogAfter = await upsertResearchedCompany({
        ...cached.payload.company,
        id: existing?.id ?? cached.payload.company.id,
        research: {
          ...cached.payload.company.research,
          last_operation: "group_enrich_cache",
          stages_completed: cached.payload.stages,
        },
      });
      const id = existing?.id ?? cached.payload.company.id;
      return {
        ok: true,
        cached: true,
        stages: cached.payload.stages,
        useWebSearch,
        model: cached.payload.model,
        company: findResearchedCompany(catalogAfter, id) ?? cached.payload.company,
        companies: catalogAfter.companies,
        tokenEstimate,
      };
    }
  }

  let company = shellCompany({
    companyId: existing?.id,
    companyName,
    officeCountry,
    officeCity: input.officeCity,
    officeLabel: input.officeLabel,
    website: input.website,
    linkedinCompanyUrl: input.linkedinCompanyUrl,
    existing,
  });

  const appliedAll: string[] = [];
  const rejectedAll: Array<{ path: string; error: string; stage: string }> = [];
  const models: string[] = [];

  for (const stage of stages) {
    const prompt = buildCompanyStageEnrichPrompt({
      stage,
      companyName,
      officeCountry,
      officeCity: input.officeCity,
      officeLabel: input.officeLabel,
      website: input.website,
      linkedinCompanyUrl: input.linkedinCompanyUrl,
      aboutText: input.aboutText,
      existing: company,
      useWebSearch,
    });
    const system = useWebSearch
      ? researchWebSearchSystemMessage(
          `Enrich company stage "${stage}" from live public sources. Return JSON envelope only.`,
        )
      : `Fill company stage "${stage}" from seed context only. No web search. Return JSON envelope only.`;

    const result = await callOpenRouterResearchChat(prompt, system, { useWebSearch });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        status: result.status === 400 ? 400 : 502,
        raw: result.raw,
        stage,
        partialCompany: company,
      };
    }
    models.push(result.model);

    const envelope = parseResearchAiEnvelope(result.content, {
      fallbackEntityType: "company",
      fallbackOperation: "group_enrich",
    });
    if (!envelope) {
      rejectedAll.push({ path: stage, error: "Could not parse stage envelope.", stage });
      continue;
    }

    const report = applyEnvelopeToEntity("company", company, envelope, {
      mode: "empty_only",
    });
    company = report.entity as ResearchedCompany;
    appliedAll.push(...report.applied.map((path) => `${stage}:${path}`));
    rejectedAll.push(...report.rejected.map((item) => ({ ...item, stage })));
  }

  company = {
    ...company,
    name: companyName,
    office: {
      ...company.office,
      country: officeCountry,
      city: input.officeCity || company.office.city,
      label: input.officeLabel || company.office.label,
    },
    research: {
      ...company.research,
      researched_at: new Date().toISOString(),
      research_model: models[models.length - 1],
      last_operation: "group_enrich",
      stages_completed: stages,
      usage: {
        prompt_tokens: tokenEstimate.inputTokens,
        completion_tokens: tokenEstimate.outputTokens,
      },
    },
  };

  const catalogAfter = await upsertResearchedCompany(company);
  const saved = findResearchedCompany(catalogAfter, company.id) ?? company;

  await writeResearchCache(cacheKey, {
    company: saved,
    stages,
    model: models[models.length - 1],
  });

  return {
    ok: true,
    cached: false,
    stages,
    useWebSearch,
    model: models[models.length - 1],
    models,
    applied: appliedAll,
    rejected: rejectedAll.length > 0 ? rejectedAll : undefined,
    company: saved,
    companies: catalogAfter.companies,
    tokenEstimate,
  };
}
