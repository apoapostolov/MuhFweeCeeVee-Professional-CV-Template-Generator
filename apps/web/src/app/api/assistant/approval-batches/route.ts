import { NextResponse } from "next/server";

import type { AssistantContextEnvelope, AssistantEvent } from "@muhfweeceevee/schemas";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { resolveAssistantApproval } from "@/lib/server/assistantApprovalExecution";
import { assistantApprovalLedger } from "@/lib/server/assistantApprovalLedger";
import { assistantSessionStore } from "@/lib/server/assistantStore";
import { parseAssistantContext } from "@/lib/server/assistantValidation";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      proposalIds?: unknown;
      decision?: unknown;
      context?: unknown;
    };
    if (body.decision !== "approve" && body.decision !== "reject") {
      throw new Error('decision must be "approve" or "reject".');
    }
    const proposalIds = Array.isArray(body.proposalIds)
      ? [
          ...new Set(
            body.proposalIds.filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            ),
          ),
        ]
      : [];
    if (proposalIds.length < 2 || proposalIds.length > 10) {
      throw new Error("A coherent batch requires 2 to 10 proposals.");
    }
    const records = await Promise.all(proposalIds.map((id) => assistantApprovalLedger.get(id)));
    if (records.some((record) => !record)) throw new Error("One or more approvals were not found.");
    const proposals = records.map((record) => record!.proposal);
    const sessionIds = new Set(proposals.map((proposal) => proposal.sessionId));
    const kinds = new Set(proposals.map((proposal) => proposal.approvalKind));
    if (sessionIds.size !== 1) throw new Error("Batch proposals must belong to one conversation.");
    if (kinds.size !== 1) {
      throw new Error("Write, cost, and destructive approvals cannot be mixed in one batch.");
    }
    if (records.some((record) => record!.status !== "pending")) {
      throw new Error("Every batch proposal must still be pending.");
    }

    const context: AssistantContextEnvelope = parseAssistantContext(body.context);
    const sessionId = proposals[0].sessionId;
    const session = await assistantSessionStore.get(sessionId);
    if (!session || session.status === "archived") {
      throw new Error("The assistant conversation is unavailable or archived.");
    }

    const events: AssistantEvent[] = [];
    const results: Array<{ proposalId: string; status: string }> = [];
    for (const proposalId of proposalIds) {
      const result = await resolveAssistantApproval({
        proposalId,
        decision: body.decision,
        context,
      });
      events.push(...result.events);
      const resolution = result.events.find((event) => event.type === "approval_resolved");
      results.push({
        proposalId,
        status: resolution?.type === "approval_resolved" ? resolution.status : "unknown",
      });
      if (
        body.decision === "approve" &&
        resolution?.type === "approval_resolved" &&
        resolution.status !== "approved"
      ) {
        break;
      }
    }
    await assistantSessionStore.appendEvents(sessionId, events);
    return NextResponse.json({ ok: true, events, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve approval batch." },
      { status: 400 },
    );
  }
}
