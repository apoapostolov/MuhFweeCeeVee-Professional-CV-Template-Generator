import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { assistantApprovalLedger } from "@/lib/server/assistantApprovalLedger";
import { assistantSessionStore } from "@/lib/server/assistantStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { sessionId } = await context.params;
  if (!(await assistantSessionStore.get(sessionId))) {
    return NextResponse.json(
      { error: "Assistant session not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    ok: true,
    audit: await assistantApprovalLedger.listAudit(sessionId),
  });
}
