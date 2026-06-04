import { NextResponse } from "next/server";

import {
  buildResearchFieldRefinePrompt,
  parseResearchFieldRefineResponse,
} from "@/lib/research/research-field-refine";
import { parseWeightedKeywordsFromProposal } from "@/lib/research/weighted-keywords";
import type { ResearchFieldRefineEntity } from "@/lib/research/types";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

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
  if (entityType === "company") {
    const company = findResearchedCompany(catalog, entityId);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    entityJson = JSON.stringify(company, null, 2);
  } else {
    const job = findResearchedJobPosition(catalog, entityId);
    if (!job) {
      return NextResponse.json({ error: "Job position not found." }, { status: 404 });
    }
    entityJson = JSON.stringify(job, null, 2);
  }

  const prompt = buildResearchFieldRefinePrompt({
    entityType: entityType as ResearchFieldRefineEntity,
    fieldPath,
    fieldLabel,
    currentValue,
    entityJson,
  });

  const result = await callOpenRouterResearchChat(
    prompt,
    "You refine career research fields using public sources. Return JSON only with a single proposal.",
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status, raw: result.raw },
      { status: result.status === 400 ? 400 : 502 },
    );
  }

  const proposal = parseResearchFieldRefineResponse(result.content);
  if (proposal === null) {
    return NextResponse.json(
      { error: "Could not parse field refinement from model response." },
      { status: 502 },
    );
  }

  const normalizedProposal =
    fieldPath === "weighted_keywords"
      ? parseWeightedKeywordsFromProposal(proposal)
      : proposal;

  return NextResponse.json({
    ok: true,
    proposal: normalizedProposal,
    model: result.model,
  });
}