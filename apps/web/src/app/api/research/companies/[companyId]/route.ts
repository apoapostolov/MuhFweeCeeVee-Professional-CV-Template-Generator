import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { normalizeResearchedCompany } from "@/lib/research/research-normalize";
import {
  deleteResearchedCompany,
  findResearchedCompany,
  readResearchCatalog,
  upsertResearchedCompany,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const { companyId } = await context.params;
  const catalog = await readResearchCatalog();
  const company = findResearchedCompany(catalog, companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    company,
    job_positions: catalog.job_positions.filter((j) => j.company_id === companyId),
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }
  const { companyId } = await context.params;
  const body = (await request.json()) as { company?: unknown };
  const normalized = normalizeResearchedCompany(body.company);
  if (!normalized || normalized.id !== companyId) {
    return NextResponse.json({ error: "Invalid company payload." }, { status: 400 });
  }
  const catalog = await upsertResearchedCompany(normalized);
  return NextResponse.json({
    ok: true,
    company: normalized,
    companies: catalog.companies,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }
  const { companyId } = await context.params;
  const catalog = await deleteResearchedCompany(companyId);
  return NextResponse.json({ ok: true, catalog });
}