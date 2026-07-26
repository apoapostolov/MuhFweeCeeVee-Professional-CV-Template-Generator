import { NextResponse } from "next/server";

import {
  buildJobPositionResearchPrompt,
  parseJobPositionResearchResponse,
} from "@/lib/research/research-prompts";
import { researchWebSearchSystemMessage } from "@/lib/research/research-web-search";
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

  const useWebSearch = !jobDescription || jobDescription.length < 80;
  const prompt = buildJobPositionResearchPrompt({
    company,
    jobTitle,
    jobDescription,
    linkedinUrl,
    useWebSearch,
  });
  const result = await callOpenRouterResearchChat(
    prompt,
    useWebSearch
      ? researchWebSearchSystemMessage(
          "Research a job position from live web sources (LinkedIn first). Return JSON only. Prefer grounded keywords (15–40), not speculative lists.",
        )
      : "Structure the job from the provided description only. No web search. Return JSON only. Prefer grounded keywords (15–40).",
    { useWebSearch },
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
  if (jobDescription) {
    job.role = {
      ...job.role,
      raw_jd_text: jobDescription.slice(0, 50_000),
      description_summary: job.role?.description_summary,
    };
  }

  const updated = await upsertResearchedJobPosition(job);

  return NextResponse.json({
    ok: true,
    model: result.model,
    job_position: job,
    job_positions: updated.job_positions.filter((entry) => entry.company_id === companyId),
  });
}