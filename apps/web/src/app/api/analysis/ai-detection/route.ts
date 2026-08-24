import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { runAiDetection } from "@/lib/server/aiDetection";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { cvId?: unknown; templateId?: unknown };
    const cvId = typeof body.cvId === "string" ? body.cvId.trim() : "";
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    if (!cvId) return NextResponse.json({ error: "cvId is required." }, { status: 400 });
    return NextResponse.json({ ok: true, report: await runAiDetection(cvId, templateId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI detection failed." }, { status: 502 });
  }
}
