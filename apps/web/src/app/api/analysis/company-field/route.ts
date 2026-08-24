import { NextResponse } from "next/server";

import {
  buildCompanyFieldResearchPrompt,
  parseCompanyFieldResearchResponse,
} from "@/lib/company-field-ai";
import { researchWebSearchSystemMessage } from "@/lib/research/research-web-search";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";

export const runtime = "nodejs";

type CompanyFieldAiRequest = {
  companyName?: unknown;
  fieldPath?: unknown;
  fieldLabel?: unknown;
  fieldKey?: unknown;
  text?: unknown;
  companyContext?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as CompanyFieldAiRequest;
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const fieldPath = typeof body.fieldPath === "string" ? body.fieldPath.trim() : "";
  const fieldLabel = typeof body.fieldLabel === "string" ? body.fieldLabel.trim() : "Field";
  const fieldKey = typeof body.fieldKey === "string" ? body.fieldKey.trim() : fieldLabel;
  const currentText = typeof body.text === "string" ? body.text : "";
  const companyContext =
    body.companyContext && typeof body.companyContext === "object" && !Array.isArray(body.companyContext)
      ? (body.companyContext as Record<string, unknown>)
      : {};

  if (!companyName) {
    return NextResponse.json({ error: "companyName is required." }, { status: 400 });
  }

  const prompt = buildCompanyFieldResearchPrompt({
    companyName,
    fieldPath,
    fieldLabel,
    fieldKey,
    currentText,
    companyContext,
  });

  const result = await callOpenRouterResearchChat(
    prompt,
    researchWebSearchSystemMessage(
      "Research a company metadata field from live web sources (LinkedIn-first) and return JSON only with three field value proposals.",
    ),
    { useWebSearch: false },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status, raw: result.raw },
      { status: result.status === 400 ? 400 : 502 },
    );
  }

  const research = parseCompanyFieldResearchResponse(result.content);
  if (!research) {
    return NextResponse.json(
      { error: "Could not parse research proposals from model response." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    model: result.model,
    proposals: research.proposals,
  });
}