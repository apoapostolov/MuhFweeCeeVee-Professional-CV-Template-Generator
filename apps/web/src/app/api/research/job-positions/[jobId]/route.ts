import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { normalizeResearchedJobPosition } from "@/lib/research/research-normalize";
import {
  deleteResearchedJobPosition,
  findResearchedJobPosition,
  readResearchCatalog,
  upsertResearchedJobPosition,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await context.params;
  const catalog = await readResearchCatalog();
  const job = findResearchedJobPosition(catalog, jobId);
  if (!job) {
    return NextResponse.json({ error: "Job position not found." }, { status: 404 });
  }
  const company = catalog.companies.find((c) => c.id === job.company_id) ?? null;
  return NextResponse.json({ ok: true, job_position: job, company });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }
  const { jobId } = await context.params;
  const body = (await request.json()) as { job_position?: unknown };
  const normalized = normalizeResearchedJobPosition(body.job_position);
  if (!normalized || normalized.id !== jobId) {
    return NextResponse.json({ error: "Invalid job position payload." }, { status: 400 });
  }
  const catalog = await upsertResearchedJobPosition(normalized);
  return NextResponse.json({
    ok: true,
    job_position: normalized,
    job_positions: catalog.job_positions,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }
  const { jobId } = await context.params;
  const catalog = await deleteResearchedJobPosition(jobId);
  return NextResponse.json({ ok: true, catalog });
}