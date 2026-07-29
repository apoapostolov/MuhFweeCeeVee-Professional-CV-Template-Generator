import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { assistantPlaybookStore } from "@/lib/server/assistantPlaybookStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ playbookId: string }> };

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const { playbookId } = await context.params;
    const removed = await assistantPlaybookStore.remove(playbookId);
    return removed
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Playbook not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete playbook." },
      { status: 400 },
    );
  }
}
