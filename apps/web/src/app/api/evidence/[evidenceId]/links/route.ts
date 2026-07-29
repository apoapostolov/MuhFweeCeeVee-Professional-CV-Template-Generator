import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { linkCareerEvidenceToCv } from "@/lib/server/careerEvidenceStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ evidenceId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { evidenceId } = await context.params;
  const body = (await request.json()) as { cvId?: unknown };
  const cvId = typeof body.cvId === "string" ? body.cvId.trim() : "";
  if (!cvId) {
    return NextResponse.json({ error: "cvId is required." }, { status: 400 });
  }
  try {
    const result = await linkCareerEvidenceToCv(evidenceId, cvId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Link failed." },
      { status: 400 },
    );
  }
}
