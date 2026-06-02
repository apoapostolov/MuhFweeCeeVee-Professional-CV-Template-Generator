import { NextResponse } from "next/server";

import {
  buildCompanyFieldResearchPrompt,
  parseCompanyFieldResearchResponse,
} from "@/lib/company-field-ai";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";

export const runtime = "nodejs";

type CompanyFieldAiRequest = {
  companyName?: unknown;
  fieldPath?: unknown;
  fieldLabel?: unknown;
  fieldKey?: unknown;
  text?: unknown;
  companyContext?: unknown;
};

const DEFAULT_RESEARCH_MODEL = "perplexity/sonar";

function extractTextContent(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
    return withoutFence.trim();
  }
  return trimmed;
}

function researchModelFromSettings(settingsModel: string): string {
  const env = (process.env.OPENROUTER_COMPANY_RESEARCH_MODEL ?? "").trim();
  if (env.length > 0) {
    return env;
  }
  if (settingsModel.toLowerCase().includes("perplexity") || settingsModel.toLowerCase().includes("sonar")) {
    return settingsModel;
  }
  return DEFAULT_RESEARCH_MODEL;
}

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

  const settings = await readOpenRouterSettings();
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key is not configured." },
      { status: 400 },
    );
  }

  const prompt = buildCompanyFieldResearchPrompt({
    companyName,
    fieldPath,
    fieldLabel,
    fieldKey,
    currentText,
    companyContext,
  });

  const model = researchModelFromSettings(settings.model || DEFAULT_RESEARCH_MODEL);

  const response = await fetch(settings.baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You research companies using public web information and return JSON only with three field value proposals.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.25,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    return NextResponse.json(
      { error: "OpenRouter research request failed.", status: response.status, raw },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = extractTextContent(data.choices?.[0]?.message?.content ?? "");
  if (!content) {
    return NextResponse.json({ error: "Empty model response." }, { status: 502 });
  }

  const research = parseCompanyFieldResearchResponse(content);
  if (!research) {
    return NextResponse.json(
      { error: "Could not parse research proposals from model response." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    model,
    proposals: research.proposals,
  });
}