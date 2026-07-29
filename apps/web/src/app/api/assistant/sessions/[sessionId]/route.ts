import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
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
  const session = await assistantSessionStore.get(sessionId);
  return session
    ? NextResponse.json({ ok: true, session })
    : NextResponse.json({ error: "Assistant session not found." }, { status: 404 });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { sessionId } = await context.params;
  try {
    const body = (await request.json()) as { status?: unknown };
    if (body.status !== "active" && body.status !== "archived") {
      return NextResponse.json(
        { error: 'status must be "active" or "archived".' },
        { status: 400 },
      );
    }
    const session = await assistantSessionStore.setArchived(
      sessionId,
      body.status === "archived",
    );
    return NextResponse.json({ ok: true, session });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update session.",
      },
      { status: 404 },
    );
  }
}
