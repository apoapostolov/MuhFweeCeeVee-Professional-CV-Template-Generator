import { NextResponse } from "next/server";

import { normalizeResearchCatalog } from "@/lib/research/research-normalize";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readResearchCatalog, writeResearchCatalog } from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const catalog = await readResearchCatalog();
  return NextResponse.json({
    ok: true,
    version: catalog.version,
    companies: catalog.companies,
    job_positions: catalog.job_positions,
  });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as {
    version?: unknown;
    companies?: unknown;
    job_positions?: unknown;
  };

  const catalog = normalizeResearchCatalog({
    version: body.version,
    companies: body.companies,
    job_positions: body.job_positions,
  });

  const written = await writeResearchCatalog(catalog);
  return NextResponse.json({
    ok: true,
    version: written.version,
    companies: written.companies,
    job_positions: written.job_positions,
  });
}