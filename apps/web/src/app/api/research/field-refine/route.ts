import { NextResponse } from "next/server";

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

function normalizeProposalValue(fieldPath: string, proposal: ResearchFieldProposal): ResearchFieldProposal {
  if (fieldPath !== "weighted_keywords") {
    return proposal;
  }
  const keywords = parseWeightedKeywordsFromProposal(proposal.value);
  return {
    ...proposal,
    value: keywords,
    preview:
      keywords.length > 0
        ? keywords.map((entry) => `${entry.keyword} (${entry.weight})`).join("\n")
        : proposal.preview,
  };
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
  };

  const entityType = body.entityType === "job_position" ? "job_position" : "company";
  const entityId = typeof body.entityId === "string" ? body.entityId.trim() : "";
  const fieldPath = typeof body.fieldPath === "string" ? body.fieldPath.trim() : "";
  const fieldLabel = typeof body.fieldLabel === "string" ? body.fieldLabel.trim() : "Field";
  const currentValue =
    typeof body.currentValue === "string"
      ? body.currentValue
      : body.currentValue !== undefined
        ? JSON.stringify(body.currentValue)
        : "";

  if (!entityId || !fieldPath) {
    return NextResponse.json({ error: "entityId and fieldPath are required." }, { status: 400 });
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
    entityJson = JSON.stringify(company, null, 2);
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
    entityJson = JSON.stringify(job, null, 2);
    jobTitle = job.title;
    linkedinUrl = job.identity?.linkedin_url ?? job.linkedin_url ?? "";
    if (company) {
      companyName = company.name;
      officeCountry = company.office?.country ?? "";
      officeCity = company.office?.city ?? "";
    }
  }

  const prompt = buildResearchFieldRefinePrompt({
    entityType: entityType as ResearchFieldRefineEntity,
    fieldPath,
    fieldLabel,
    currentValue,
    entityJson,
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

  const result = await callOpenRouterResearchChat(
    prompt,
    researchWebSearchSystemMessage(
      "Refine one career research field using live web search (LinkedIn-first). Return JSON only with current_score and 1-3 proposals.",
    ),
  );

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

  const proposals = parsed.proposals.map((entry) => normalizeProposalValue(fieldPath, entry));

  return NextResponse.json({
    ok: true,
    currentScore: parsed.currentScore,
    proposals,
    /** @deprecated Use proposals[0].value */
    proposal: proposals[0]?.value,
    model: result.model,
  });
}