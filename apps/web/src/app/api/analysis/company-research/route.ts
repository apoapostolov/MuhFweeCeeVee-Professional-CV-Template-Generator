import { NextResponse } from "next/server";

import {
  buildCompanyResearchPrompt,
  parseCompanyResearchResponse,
} from "@/lib/company-research";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";

export const runtime = "nodejs";

type CompanyResearchRequest = {
  companyName?: unknown;
  existingRecord?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as CompanyResearchRequest;
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const existingRecord =
    body.existingRecord && typeof body.existingRecord === "object" && !Array.isArray(body.existingRecord)
      ? (body.existingRecord as Record<string, unknown>)
      : {};

  if (!companyName) {
    return NextResponse.json({ error: "companyName is required." }, { status: 400 });
  }

  const prompt = buildCompanyResearchPrompt({ companyName, existingRecord });
  const result = await callOpenRouterResearchChat(
    prompt,
    "You research companies using public web information and return JSON only with a company metadata object.",
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status, raw: result.raw },
      { status: result.status === 400 ? 400 : 502 },
    );
  }

  const company = parseCompanyResearchResponse(result.content);
  if (!company) {
    return NextResponse.json(
      { error: "Could not parse company research from model response." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    model: result.model,
    company,
  });
}