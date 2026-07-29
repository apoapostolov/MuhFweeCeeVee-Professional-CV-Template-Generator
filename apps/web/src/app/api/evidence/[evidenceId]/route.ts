import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { deleteCareerEvidence } from "@/lib/server/careerEvidenceStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ evidenceId: string }> };

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { evidenceId } = await context.params;
  const library = await deleteCareerEvidence(evidenceId);
  return NextResponse.json({ ok: true, ...library });
}
