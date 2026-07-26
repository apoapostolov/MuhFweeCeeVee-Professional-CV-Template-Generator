import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { runCompanyEnrich } from "@/lib/server/runCompanyEnrich";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as {
    companyId?: unknown;
    companyName?: unknown;
    officeCountry?: unknown;
    officeCity?: unknown;
    officeLabel?: unknown;
    website?: unknown;
    linkedinCompanyUrl?: unknown;
    aboutText?: unknown;
    stages?: unknown;
    useWebSearch?: unknown;
    forceRefresh?: unknown;
  };

  const result = await runCompanyEnrich({
    companyId: typeof body.companyId === "string" ? body.companyId : undefined,
    companyName: typeof body.companyName === "string" ? body.companyName : "",
    officeCountry: typeof body.officeCountry === "string" ? body.officeCountry : "",
    officeCity: typeof body.officeCity === "string" ? body.officeCity : undefined,
    officeLabel: typeof body.officeLabel === "string" ? body.officeLabel : undefined,
    website: typeof body.website === "string" ? body.website : undefined,
    linkedinCompanyUrl:
      typeof body.linkedinCompanyUrl === "string" ? body.linkedinCompanyUrl : undefined,
    aboutText: typeof body.aboutText === "string" ? body.aboutText : undefined,
    stages: body.stages,
    useWebSearch: body.useWebSearch === true,
    forceRefresh: body.forceRefresh === true,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        stage: result.stage,
        raw: result.raw,
        partialCompany: result.partialCompany,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(result);
}
