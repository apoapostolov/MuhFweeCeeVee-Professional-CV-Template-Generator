import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  APPLICATION_ACTIVITY_TYPES,
  appendApplicationActivity,
  type ApplicationActivityType,
} from "@/lib/server/applicationStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { applicationId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const type =
    typeof body.type === "string" &&
    (APPLICATION_ACTIVITY_TYPES as readonly string[]).includes(body.type)
      ? (body.type as ApplicationActivityType)
      : null;
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!type || !summary) {
    return NextResponse.json(
      { error: "type and summary are required." },
      { status: 400 },
    );
  }
  try {
    const result = await appendApplicationActivity(applicationId, {
      type,
      summary,
      occurred_at:
        typeof body.occurred_at === "string" && body.occurred_at.trim()
          ? body.occurred_at
          : new Date().toISOString(),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      contact_id:
        typeof body.contact_id === "string" ? body.contact_id : undefined,
      meeting_url:
        typeof body.meeting_url === "string" ? body.meeting_url : undefined,
      round: typeof body.round === "string" ? body.round : undefined,
      outcome: typeof body.outcome === "string" ? body.outcome : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activity failed." },
      { status: 404 },
    );
  }
}
