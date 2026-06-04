import { NextResponse } from "next/server";

import { readResearchCatalog } from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const catalog = await readResearchCatalog();
  return NextResponse.json({
    ok: true,
    companies: catalog.companies,
    job_positions: catalog.job_positions,
  });
}