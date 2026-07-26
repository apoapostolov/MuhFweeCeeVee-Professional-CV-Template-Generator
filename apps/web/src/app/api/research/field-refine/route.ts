import { NextResponse } from "next/server";

import {
  getResearchFieldContract,
  validateFieldValue,
} from "@/lib/research/contracts";
import {
  buildResearchFieldRefinePrompt,
  parseResearchFieldRefineProposals,
  type ResearchFieldProposal,
} from "@/lib/research/research-field-refine";
import { parseWeightedKeywordsFromProposal } from "@/lib/research/weighted-keywords";
import type { ResearchFieldRefineEntity } from "@/lib/research/types";
import { researchWebSearchSystemMessage } from "@/lib/research/research-web-search";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

function normalizeProposalValue(
  fieldPath: string,
  proposal: ResearchFieldProposal,
  entityType: ResearchFieldRefineEntity,
): { proposal: ResearchFieldProposal | null; error?: string } {
  const contract = getResearchFieldContract(entityType, fieldPath);
  if (!contract) {
    return { proposal: null, error: "Unknown field path." };
  }

  let value = proposal.value;
  if (fieldPath === "weighted_keywords") {
    value = parseWeightedKeywordsFromProposal(proposal.value);
  }

  const validated = validateFieldValue(contract, value, {
    sources: proposal.sources,
    status: proposal.status ?? "found",
  });
  if (!validated.ok) {
    return { proposal: null, error: validated.error };
  }

  const next: ResearchFieldProposal = {
    ...proposal,
    value: validated.value,
    preview:
      fieldPath === "weighted_keywords" && Array.isArray(validated.value)
        ? (validated.value as Array<{ keyword: string; weight: number }>)
            .map((entry) => `${entry.keyword} (${entry.weight})`)
            .join("\n") || proposal.preview
        : proposal.preview,
  };
  return { proposal: next };
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as {
    entityType?: unknown;
    entityId?: unknown;
    fieldPath?: unknown;
    fieldLabel?: unknown;
    currentValue?: unknown;
    useWebSearch?: unknown;
  };

  const entityType: ResearchFieldRefineEntity =
    body.entityType === "job_position" ? "job_position" : "company";
  const entityId = typeof body.entityId === "string" ? body.entityId.trim() : "";
  const fieldPath = typeof body.fieldPath === "string" ? body.fieldPath.trim() : "";
  const fieldLabel = typeof body.fieldLabel === "string" ? body.fieldLabel.trim() : "Field";
  const currentValue =
    typeof body.currentValue === "string"
      ? body.currentValue
      : body.currentValue !== undefined
        ? JSON.stringify(body.currentValue)
        : "";
  const useWebSearch = body.useWebSearch === true;

  if (!entityId || !fieldPath) {
    return NextResponse.json({ error: "entityId and fieldPath are required." }, { status: 400 });
  }

  const contract = getResearchFieldContract(entityType, fieldPath);
  if (!contract) {
    return NextResponse.json(
      { error: `Unknown field path "${fieldPath}" for ${entityType}.` },
      { status: 400 },
    );
  }

  const catalog = await readResearchCatalog();
  let entityJson = "";
  let companyName = "";
  let officeCountry = "";
  let officeCity = "";
  let jobTitle = "";
  let linkedinUrl = "";

  if (entityType === "company") {
    const company = findResearchedCompany(catalog, entityId);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    entityJson = JSON.stringify(
      {
        id: company.id,
        name: company.name,
        identity: company.identity,
        office: company.office,
        contacts: {
          careers_page_url: company.contacts?.careers_page_url,
          website: company.contacts?.website,
        },
        hiring: company.hiring,
        research: { notes: company.research?.notes, sources: company.research?.sources },
      },
      null,
      2,
    );
    companyName = company.name;
    officeCountry = company.office?.country ?? "";
    officeCity = company.office?.city ?? "";
    linkedinUrl = company.identity?.linkedin_company_url ?? company.linkedin?.company_page_url ?? "";
  } else {
    const job = findResearchedJobPosition(catalog, entityId);
    if (!job) {
      return NextResponse.json({ error: "Job position not found." }, { status: 404 });
    }
    const company = findResearchedCompany(catalog, job.company_id);
    entityJson = JSON.stringify(
      {
        id: job.id,
        company_id: job.company_id,
        title: job.title,
        identity: job.identity,
        location: job.location,
        role: {
          description_summary: job.role?.description_summary,
          raw_jd_text: job.role?.raw_jd_text?.slice(0, 4000),
        },
        skills: job.skills,
        weighted_keywords: job.weighted_keywords?.slice(0, 30),
        research: { notes: job.research?.notes, sources: job.research?.sources },
      },
      null,
      2,
    );
    jobTitle = job.title;
    linkedinUrl = job.identity?.linkedin_url ?? job.linkedin_url ?? "";
    if (company) {
      companyName = company.name;
      officeCountry = company.office?.country ?? "";
      officeCity = company.office?.city ?? "";
    }
  }

  const prompt = buildResearchFieldRefinePrompt({
    entityType,
    fieldPath,
    fieldLabel,
    currentValue,
    entityJson,
    contract,
    useWebSearch,
    searchHints: {
      kind: "field_refine",
      companyName,
      officeCountry,
      officeCity,
      jobTitle,
      linkedinUrl,
      fieldPath,
      fieldLabel,
    },
  });

  const system = useWebSearch
    ? researchWebSearchSystemMessage(
        "Refine one career research field. Prefer LinkedIn/public sources. Return JSON only.",
      )
    : "You refine one career research field from provided context only. No web search. Return JSON only. Prefer not_found over inventing contacts.";

  const result = await callOpenRouterResearchChat(prompt, system, { useWebSearch });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status, raw: result.raw },
      { status: result.status === 400 ? 400 : 502 },
    );
  }

  const parsed = parseResearchFieldRefineProposals(result.content);
  if (!parsed || parsed.proposals.length === 0) {
    return NextResponse.json(
      { error: "Could not parse field refinement from model response." },
      { status: 502 },
    );
  }

  const maxProposals =
    contract.kind === "string" && (contract.maxLength ?? 0) >= 500 ? 3 : 1;
  const validated: ResearchFieldProposal[] = [];
  const rejected: string[] = [];
  for (const entry of parsed.proposals.slice(0, maxProposals)) {
    const next = normalizeProposalValue(fieldPath, entry, entityType);
    if (next.proposal) {
      validated.push(next.proposal);
    } else if (next.error) {
      rejected.push(next.error);
    }
  }

  if (validated.length === 0) {
    return NextResponse.json(
      {
        error: "Model proposals failed field contract validation.",
        rejected,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    currentScore: parsed.currentScore,
    proposals: validated,
    rejected: rejected.length > 0 ? rejected : undefined,
    useWebSearch: result.useWebSearch,
    /** @deprecated Use proposals[0].value */
    proposal: validated[0]?.value,
    model: result.model,
  });
}
