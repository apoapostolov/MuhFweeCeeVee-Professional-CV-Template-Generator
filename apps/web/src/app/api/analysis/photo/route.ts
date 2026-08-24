import { NextResponse } from "next/server";

import { completeAiVision } from "@/lib/server/aiProviderCompletion";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { appendPhotoAnalysis } from "@/lib/server/photoAnalysisStore";

export const runtime = "nodejs";

type PhotoAnalysisRequest = {
  imageDataUrl?: unknown;
  fileName?: unknown;
  photoId?: unknown;
};

type PhotoAnalysis = {
  score: number;
  verdict: "excellent" | "good" | "usable" | "weak";
  notes: string[];
  clothingProposals?: string[];
  analyzedAt: string;
  model: string;
};

function extractFirstJsonBlock(input: string): unknown {
  const trimmed = input.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // no-op
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // no-op
    }
  }
  return null;
}

function normalizeVerdict(input: unknown): PhotoAnalysis["verdict"] {
  const value = String(input ?? "").trim().toLowerCase();
  if (value === "excellent" || value === "good" || value === "usable" || value === "weak") {
    return value;
  }
  return "usable";
}

function normalizeAnalysis(raw: unknown, model: string): PhotoAnalysis {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const scoreRaw = Number(record.score ?? 60);
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 60;
  const notesRaw = Array.isArray(record.notes) ? record.notes : [];
  const notes = notesRaw
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 8);
  const clothingRaw = Array.isArray(record.clothingProposals) ? record.clothingProposals : [];
  const clothingProposals = clothingRaw
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 8);
  return {
    score,
    verdict: normalizeVerdict(record.verdict),
    notes: notes.length > 0 ? notes : ["Image evaluated with multimodal model."],
    clothingProposals,
    analyzedAt: new Date().toISOString(),
    model,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const payload = (await request.json()) as PhotoAnalysisRequest;
  const imageDataUrl =
    typeof payload.imageDataUrl === "string" ? payload.imageDataUrl.trim() : "";
  const fileName =
    typeof payload.fileName === "string" && payload.fileName.trim().length > 0
      ? payload.fileName.trim()
      : "profile-image";
  const photoId = typeof payload.photoId === "string" ? payload.photoId.trim() : "";

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "imageDataUrl must be a data:image/* URL." }, { status: 400 });
  }

  const prompt = [
    "You are a professional CV/headshot reviewer for corporate and tech hiring contexts.",
    "Evaluate this image only for CV/profile-photo readiness using practical recruiter standards.",
    "Use this rubric:",
    "1) Composition & crop: clear head-and-shoulders framing, eyes visible, no awkward cutoffs, no distortion.",
    "2) Lighting & sharpness: face evenly lit, in focus, no heavy noise, no harsh shadows or blown highlights.",
    "3) Expression & posture: approachable, confident, neutral-to-positive expression, camera angle not extreme.",
    "4) Styling & professionalism: attire/background suitable for broad professional use, minimal distractions.",
    "5) Technical/export fitness: will print/read well in CV/PDF at small sizes.",
    "6) Clothing fit suggestions: propose concrete outfit types and color palettes that suit visible facial structure and body proportions for professional CV use.",
    "Rules:",
    "- Focus on actionable quality feedback only.",
    "- Do not infer or comment on race, age, gender, attractiveness, health, or protected traits.",
    "- If image is unusable for CV, explain concrete fixes.",
    '- Clothing suggestions must include garment types and color guidance (for example: blazer cut, collar style, neckline, contrast level, neutral accent colors).',
    'Return strict JSON only: {"score":0-100,"verdict":"excellent|good|usable|weak","notes":["4-8 concise action items"],"clothingProposals":["4-8 concrete outfit/color suggestions"]}',
  ].join("\n");

  let content = "";
  let model = "configured-vision-provider";
  try {
    const completion = await completeAiVision({
      role: "vision",
      prompt: `${prompt}\nImage name: ${fileName}`,
      images: [imageDataUrl],
      temperature: 0.1,
      maxTokens: 2_000,
    });
    content = completion.text;
    model = completion.modelId;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configured vision provider failed." },
      { status: 502 },
    );
  }
  const parsed = extractFirstJsonBlock(content);
  const analysis = normalizeAnalysis(parsed, model);
  let history: PhotoAnalysis[] | undefined;
  if (photoId) {
    history = await appendPhotoAnalysis(photoId, analysis);
  }
  return NextResponse.json({ ok: true, analysis, history: history ?? [analysis] });
}
