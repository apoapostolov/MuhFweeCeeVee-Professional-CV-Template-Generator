import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { resolveAssistantApproval } from "@/lib/server/assistantApprovalExecution";
import { assistantApprovalLedger } from "@/lib/server/assistantApprovalLedger";
import { assistantSessionStore } from "@/lib/server/assistantStore";
import { parseAssistantContext } from "@/lib/server/assistantValidation";

export const runtime = "nodejs";
export const maxDuration = 65;

type RouteContext = { params: Promise<{ proposalId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { proposalId } = await context.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.decision !== "approve" && body.decision !== "reject") {
      return NextResponse.json(
        { error: 'decision must be "approve" or "reject".' },
        { status: 400 },
      );
    }
    const currentContext = parseAssistantContext(body.context);
    const approval = await assistantApprovalLedger.get(proposalId);
    if (!approval) {
      return NextResponse.json(
        { error: "Assistant approval not found." },
        { status: 404 },
      );
    }
    const session = await assistantSessionStore.get(
      approval.proposal.sessionId,
    );
    if (!session) {
      return NextResponse.json(
        { error: "Assistant session not found." },
        { status: 404 },
      );
    }
    if (session.status === "archived") {
      return NextResponse.json(
        { error: "Archived conversations cannot execute approvals." },
        { status: 409 },
      );
    }

    const result = await resolveAssistantApproval({
      proposalId,
      decision: body.decision,
      context: currentContext,
    });
    if (!result.replayed) {
      await assistantSessionStore.appendEvents(session.id, result.events);
    }
    return NextResponse.json({
      ok: true,
      replayed: result.replayed,
      events: result.events,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not resolve approval.";
    return NextResponse.json(
      { error: message },
      { status: /not found/i.test(message) ? 404 : 409 },
    );
  }
}
