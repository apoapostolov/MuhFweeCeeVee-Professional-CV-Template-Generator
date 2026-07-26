import { NextResponse } from "next/server";

import { runDeterministicAtsChecks } from "@/lib/ats/deterministicChecks";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readCv } from "@/lib/server/cvStore";
import {
  findResearchedJobPosition,
  readResearchCatalog,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;

  const body = (await request.json()) as {
    cvId?: unknown;
    jobId?: unknown;
  };

  const cvId = typeof body.cvId === "string" ? body.cvId.trim() : "";
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!cvId) {
    return NextResponse.json({ error: "cvId is required." }, { status: 400 });
  }

  const cv = await readCv(cvId);
  if (!cv) {
    return NextResponse.json({ error: "CV not found." }, { status: 404 });
  }

  let keywords = undefined;
  if (jobId) {
    const catalog = await readResearchCatalog();
    const job = findResearchedJobPosition(catalog, jobId);
    keywords = job?.weighted_keywords;
  }

  const report = runDeterministicAtsChecks({ cv, keywords });
  return NextResponse.json({
    ok: true,
    cvId,
    jobId: jobId || undefined,
    report,
  });
}
