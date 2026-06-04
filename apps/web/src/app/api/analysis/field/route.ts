import { NextResponse } from "next/server";

import { parseFieldRewriteResponse } from "@/lib/field-ai-rewrite";
import { buildFieldAiJobContext } from "@/lib/research/research-prompts";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

type FieldAiRequest = {
  mode?: unknown;
  text?: unknown;
  fieldPath?: unknown;
  fieldLabel?: unknown;
  templateId?: unknown;
  language?: unknown;
  limit?: unknown;
  unit?: unknown;
  charCap?: unknown;
  jobPositionId?: unknown;
};

const CV_HR_PERSONA_RULES = [
  "You are a senior HR manager and professional CV writer with 15+ years of hiring experience.",
  "Apply evidence-based CV guidance:",
  "- Lead with strong action verbs (past tense for past roles, present for current).",
  "- Prefer quantified outcomes (%, scale, time saved, revenue, users, error reduction) only when supportable from the source text; never invent metrics.",
  "- Remove first-person pronouns and filler (responsible for, worked on).",
  "- One idea per bullet; parallel grammar across bullets in a list.",
  "- Keep ATS-friendly wording: standard job titles, industry keywords, no graphics/emoji.",
  "- Preserve factual meaning, employers, dates, and names from the original.",
  "- Match the requested language and professional tone for the target market.",
].join("\n");

function extractTextContent(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
    return withoutFence.trim();
  }
  return trimmed;
}

function buildPrompt(payload: {
  mode: "professional_rewrite" | "shorten";
  text: string;
  fieldPath: string;
  fieldLabel: string;
  templateId: string;
  language: string;
  charLimit?: number;
  lineLimit?: number;
  unit?: "characters" | "lines";
  jobContext?: string;
}): string {
  const lang = payload.language === "bg" ? "Bulgarian" : "English";
  const context = [
    `Template: ${payload.templateId}`,
    `Field path: ${payload.fieldPath}`,
    `Field label: ${payload.fieldLabel}`,
    `Output language: ${lang}`,
    payload.jobContext ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  if (payload.mode === "shorten") {
    const limit =
      payload.unit === "lines" && payload.lineLimit
        ? `${payload.lineLimit} lines (approx ${payload.charLimit ?? "?"} characters)`
        : `${payload.charLimit ?? 170} characters maximum`;
    return [
      CV_HR_PERSONA_RULES,
      context,
      "Task: Shorten the following CV field text to fit the template layout budget.",
      `Hard limit: ${limit}. Do not exceed it.`,
      "Preserve the strongest facts and impact; remove redundancy and weak phrasing.",
      "Return ONLY the rewritten text (no quotes, markdown, or JSON).",
      "",
      "Original text:",
      payload.text,
    ].join("\n");
  }

  return [
    CV_HR_PERSONA_RULES,
    context,
      "Task: Score the current wording and produce exactly three alternative rewrites for this CV field.",
      "When job targeting context is provided, prefer keywords only when they fit naturally — never force irrelevant terms.",
      "Scoring (0-100, same rubric as CV screening): clarity, impact, evidence, ATS readability, professional tone.",
    "current_score: quality of the ORIGINAL text only (do not score your proposals).",
    "proposals: three distinct rewrites; confidence = how strongly you recommend that option vs the other two (0-100).",
    "Use different angles (e.g. impact-led, concise, keyword-rich) while preserving facts from the original.",
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    '{"current_score":number,"proposals":[{"text":string,"confidence":number},...]}',
    "Exactly three proposals required.",
    "",
    "Original text:",
    payload.text,
  ].join("\n");
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as FieldAiRequest;
  const mode = body.mode === "shorten" ? "shorten" : "professional_rewrite";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const fieldPath = typeof body.fieldPath === "string" ? body.fieldPath.trim() : "";
  const fieldLabel = typeof body.fieldLabel === "string" ? body.fieldLabel.trim() : "Field";
  const templateId =
    typeof body.templateId === "string" && body.templateId.trim().length > 0
      ? body.templateId.trim()
      : "europass-v1";
  const language = typeof body.language === "string" ? body.language.trim().toLowerCase() : "en";
  const unit = body.unit === "lines" ? "lines" : "characters";
  const limitRaw = typeof body.limit === "number" ? body.limit : Number(body.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.round(limitRaw) : undefined;
  const charCapRaw = typeof body.charCap === "number" ? body.charCap : Number(body.charCap);
  const charCap =
    Number.isFinite(charCapRaw) && charCapRaw > 0 ? Math.round(charCapRaw) : limit;

  if (!text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  const jobPositionId =
    typeof body.jobPositionId === "string" ? body.jobPositionId.trim() : "";
  let jobContext = "";
  if (jobPositionId) {
    const catalog = await readResearchCatalog();
    const job = findResearchedJobPosition(catalog, jobPositionId);
    const company = job ? findResearchedCompany(catalog, job.company_id) : null;
    if (job && company) {
      jobContext = buildFieldAiJobContext({ job, company });
    }
  }

  const settings = await readOpenRouterSettings();
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key is not configured." },
      { status: 400 },
    );
  }

  const prompt = buildPrompt({
    mode,
    text,
    fieldPath,
    fieldLabel,
    templateId,
    language,
    charLimit: unit === "characters" ? (charCap ?? limit) : charCap,
    lineLimit: unit === "lines" ? limit : undefined,
    unit,
    jobContext,
  });

  const systemContent =
    mode === "professional_rewrite"
      ? "You score and rewrite CV field copy. Output valid JSON only."
      : "You rewrite CV field copy. Output plain text only.";

  const response = await fetch(settings.baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    return NextResponse.json(
      { error: "OpenRouter request failed.", status: response.status, raw },
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

  if (mode === "professional_rewrite") {
    const rewrite = parseFieldRewriteResponse(content);
    if (!rewrite) {
      return NextResponse.json(
        { error: "Could not parse rewrite proposals from model response." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      mode,
      currentScore: rewrite.currentScore,
      proposals: rewrite.proposals,
    });
  }

  return NextResponse.json({
    ok: true,
    mode,
    text: content,
  });
}