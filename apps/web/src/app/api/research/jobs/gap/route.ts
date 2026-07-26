import { NextResponse } from "next/server";

import { computeKeywordGap } from "@/lib/research/keywordGap";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readCv } from "@/lib/server/cvStore";
import {
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
    cvId?: unknown;
    jobId?: unknown;
  };

  const cvId = typeof body.cvId === "string" ? body.cvId.trim() : "";
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!cvId || !jobId) {
    return NextResponse.json({ error: "cvId and jobId are required." }, { status: 400 });
  }

  const cv = await readCv(cvId);
  if (!cv) {
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }

  const catalog = await readResearchCatalog();
  const job = findResearchedJobPosition(catalog, jobId);
  if (!job) {
    return NextResponse.json({ error: "Job position not found." }, { status: 404 });
  }

  const gap = computeKeywordGap(cv, job.weighted_keywords ?? []);
  return NextResponse.json({
    ok: true,
    cvId,
    jobId,
    jobTitle: job.title,
    companyId: job.company_id,
    gap,
  });
}
