import { NextResponse } from "next/server";

import {
  buildOfficeCompanyResearchPrompt,
  parseOfficeCompanyResearchResponse,
} from "@/lib/research/research-prompts";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";
import { upsertResearchedCompany } from "@/lib/server/researchStore";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as {
    companyName?: unknown;
    officeCountry?: unknown;
    officeCity?: unknown;
    officeLabel?: unknown;
  };

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const officeCountry = typeof body.officeCountry === "string" ? body.officeCountry.trim() : "";
  const officeCity = typeof body.officeCity === "string" ? body.officeCity.trim() : undefined;
  const officeLabel = typeof body.officeLabel === "string" ? body.officeLabel.trim() : undefined;

  if (!companyName || !officeCountry) {
    return NextResponse.json(
      { error: "companyName and officeCountry are required." },
      { status: 400 },
    );
  }

  const prompt = buildOfficeCompanyResearchPrompt({
    companyName,
    officeCountry,
    officeCity,
    officeLabel,
  });
  const result = await callOpenRouterResearchChat(
    prompt,
    "You research companies using public web information and return JSON only.",
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status, raw: result.raw },
      { status: result.status === 400 ? 400 : 502 },
    );
  }

  const company = parseOfficeCompanyResearchResponse(result.content);
  if (!company) {
    return NextResponse.json(
      { error: "Could not parse company research from model response." },
      { status: 502 },
    );
  }

  company.research_model = result.model;
  const catalog = await upsertResearchedCompany(company);

  return NextResponse.json({
    ok: true,
    model: result.model,
    company,
    companies: catalog.companies,
  });
}