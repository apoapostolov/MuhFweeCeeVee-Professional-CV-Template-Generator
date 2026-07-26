import { describe, expect, it } from "vitest";

import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";
import { getCompanyFieldContract } from "./contracts";
import { buildResearchFieldRefinePrompt, parseResearchFieldRefineProposals } from "./research-field-refine";
import {
  buildJobPositionResearchPrompt,
  buildOfficeCompanyResearchPrompt,
  parseJobPositionResearchResponse,
  parseOfficeCompanyResearchResponse,
} from "./research-prompts";
import {
  assertPerplexityResearchModel,
  evaluateCompanyResearchQuality,
  evaluateJobResearchQuality,
} from "./research-quality";
import {
  buildResearchOpenRouterRequestExtras,
  researchWebSearchSystemMessage,
} from "./research-web-search";

const HAS_OPENROUTER_KEY = Boolean(
  (process.env.OPENROUTER_API_KEY ?? "").trim().length > 0,
);

const LIVE_TIMEOUT_MS = 180_000;

async function callResearchWithRetry(
  prompt: string,
  system: string,
  attempts = 2,
): Promise<Awaited<ReturnType<typeof callOpenRouterResearchChat>>> {
  let last: Awaited<ReturnType<typeof callOpenRouterResearchChat>> = {
    ok: false,
    error: "No attempts made.",
  };
  for (let i = 0; i < attempts; i += 1) {
    last = await callOpenRouterResearchChat(prompt, system);
    if (last.ok) {
      return last;
    }
  }
  return last;
}

describe.skipIf(!HAS_OPENROUTER_KEY)("Perplexity live research quality", () => {
  it(
    "configures native Perplexity web search on the OpenRouter request",
    () => {
      const extras = buildResearchOpenRouterRequestExtras("perplexity/sonar-pro");
      expect(extras.web_search_options).toEqual({ search_context_size: "high" });
      expect(extras.plugins).toBeUndefined();
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "returns grounded company research with verifiable sources",
    async () => {
      const prompt = buildOfficeCompanyResearchPrompt({
        companyName: "Microsoft",
        officeCountry: "United States",
        officeCity: "Redmond",
        officeLabel: "Redmond HQ",
      });
      const system = researchWebSearchSystemMessage(
        "Research a company office for the user's career targeting catalog.",
      );

      const result = await callResearchWithRetry(prompt, system);
      expect(result.ok, !result.ok ? result.error : undefined).toBe(true);
      if (!result.ok) {
        return;
      }

      assertPerplexityResearchModel(result.model);

      let company = parseOfficeCompanyResearchResponse(result.content);
      if (!company) {
        const retry = await callOpenRouterResearchChat(prompt, system);
        if (retry.ok) {
          company = parseOfficeCompanyResearchResponse(retry.content);
        }
      }
      expect(company, "Response should parse as company JSON").not.toBeNull();
      if (!company) {
        return;
      }

      expect(company.name.toLowerCase()).toContain("microsoft");
      expect(company.office.country.toLowerCase()).toMatch(/united states|usa|us/);

      const quality = evaluateCompanyResearchQuality(company);
      expect(quality.issues, quality.issues.join("; ")).toHaveLength(0);
      expect(quality.sourceCount).toBeGreaterThanOrEqual(1);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "returns field refine proposals after web search",
    async () => {
      const entityJson = JSON.stringify({
        id: "microsoft_us",
        name: "Microsoft",
        office: { country: "United States", city: "Redmond" },
        identity: {
          industry: "Technology",
          description: "Technology company.",
          website: "https://www.microsoft.com",
        },
        research: { sources: ["https://www.microsoft.com"] },
      });

      const contract = getCompanyFieldContract("identity.description");
      expect(contract).not.toBeNull();
      const prompt = buildResearchFieldRefinePrompt({
        entityType: "company",
        fieldPath: "identity.description",
        fieldLabel: "Company description",
        currentValue: "Technology company.",
        entityJson,
        contract: contract!,
        useWebSearch: true,
        searchHints: {
          kind: "field_refine",
          companyName: "Microsoft",
          officeCountry: "United States",
          officeCity: "Redmond",
          fieldPath: "identity.description",
          fieldLabel: "Company description",
        },
      });

      const system = researchWebSearchSystemMessage(
        "Refine one research catalog field using live web search.",
      );
      const result = await callResearchWithRetry(prompt, system);
      expect(result.ok, !result.ok ? result.error : undefined).toBe(true);
      if (!result.ok) {
        return;
      }

      assertPerplexityResearchModel(result.model);

      const parsed = parseResearchFieldRefineProposals(result.content);
      expect(parsed).not.toBeNull();
      expect(parsed?.proposals.length).toBeGreaterThanOrEqual(1);
      const firstValue = parsed?.proposals[0]?.value;
      const valueText =
        typeof firstValue === "string" ? firstValue : JSON.stringify(firstValue ?? "");
      expect(valueText.length).toBeGreaterThan(40);
      expect(parsed?.proposals[0]?.confidence).toBeGreaterThanOrEqual(50);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "returns job research with keywords grounded in search",
    async () => {
      const company = parseOfficeCompanyResearchResponse(
        JSON.stringify({
          company: {
            id: "microsoft_us",
            name: "Microsoft",
            office: { country: "United States", city: "Redmond", label: "Redmond" },
            identity: {
              industry: "Technology",
              website: "https://www.microsoft.com",
              linkedin_company_url: "https://www.linkedin.com/company/microsoft",
            },
            research: {
              sources: ["https://www.linkedin.com/company/microsoft"],
            },
          },
        }),
      );
      expect(company).not.toBeNull();
      if (!company) {
        return;
      }

      const prompt = buildJobPositionResearchPrompt({
        company,
        jobTitle: "Software Engineer",
      });
      const system = researchWebSearchSystemMessage(
        "Research a job position for weighted keywords and ATS alignment.",
      );

      const result = await callResearchWithRetry(prompt, system);
      expect(result.ok, !result.ok ? result.error : undefined).toBe(true);
      if (!result.ok) {
        return;
      }

      assertPerplexityResearchModel(result.model);

      let job = parseJobPositionResearchResponse(result.content, company.id);
      if (!job) {
        const retry = await callOpenRouterResearchChat(prompt, system);
        if (retry.ok) {
          job = parseJobPositionResearchResponse(retry.content, company.id);
        }
      }
      expect(job).not.toBeNull();
      if (!job) {
        return;
      }

      expect(job.title.toLowerCase()).toMatch(/software|engineer|developer/);

      const quality = evaluateJobResearchQuality(job);
      expect(quality.issues, quality.issues.join("; ")).toHaveLength(0);
    },
    LIVE_TIMEOUT_MS,
  );
});