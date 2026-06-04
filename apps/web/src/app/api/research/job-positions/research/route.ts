import { NextResponse } from "next/server";

import {
  buildJobPositionResearchPrompt,
  parseJobPositionResearchResponse,
} from "@/lib/research/research-prompts";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";
import { allocateResearchedJobPositionId } from "@/lib/research/research-ids";
import {
  findResearchedCompany,
  readResearchCatalog,
  upsertResearchedJobPosition,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as {
    companyId?: unknown;
    jobTitle?: unknown;
    jobDescription?: unknown;
    linkedinUrl?: unknown;
  };

  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
  const jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : undefined;
  const linkedinUrl = typeof body.linkedinUrl === "string" ? body.linkedinUrl.trim() : undefined;

  if (!companyId || !jobTitle) {
    return NextResponse.json({ error: "companyId and jobTitle are required." }, { status: 400 });
  }

  const catalog = await readResearchCatalog();
  const company = findResearchedCompany(catalog, companyId);
  if (!company) {
    return NextResponse.json({ error: `Company '${companyId}' not found.` }, { status: 404 });
  }

  const prompt = buildJobPositionResearchPrompt({
    company,
    jobTitle,
    jobDescription,
    linkedinUrl,
  });
  const result = await callOpenRouterResearchChat(
    prompt,
    "You research job positions and return JSON only. weighted_keywords must be a large, deduplicated, canonical list per the prompt (45–90 concepts).",
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status, raw: result.raw },
      { status: result.status === 400 ? 400 : 502 },
    );
  }

  const job = parseJobPositionResearchResponse(result.content, companyId);
  if (!job) {
    return NextResponse.json(
      { error: "Could not parse job position research from model response." },
      { status: 502 },
    );
  }

  job.id = allocateResearchedJobPositionId(catalog, companyId, job.title);

  job.research_model = result.model;
  if (linkedinUrl) {
    job.linkedin_url = linkedinUrl;
  }

  const updated = await upsertResearchedJobPosition(job);

  return NextResponse.json({
    ok: true,
    model: result.model,
    job_position: job,
    job_positions: updated.job_positions.filter((entry) => entry.company_id === companyId),
  });
}