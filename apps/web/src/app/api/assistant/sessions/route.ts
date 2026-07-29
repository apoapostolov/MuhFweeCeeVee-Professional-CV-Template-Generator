import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { assistantSessionStore } from "@/lib/server/assistantStore";
import { parseAssistantContext } from "@/lib/server/assistantValidation";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status");
  const panel = url.searchParams.get("panel")?.trim() ?? "";
  const all = await assistantSessionStore.list();
  const sessions = all.filter(
    (session) =>
      (!query || session.title.toLowerCase().includes(query)) &&
      (!status || status === "all" || session.status === status) &&
      (!panel || panel === "all" || session.context.activePanel === panel),
  );
  return NextResponse.json({
    ok: true,
    sessions,
    total: sessions.length,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const context = parseAssistantContext(body.context);
    const title = typeof body.title === "string" ? body.title : undefined;
    const session = await assistantSessionStore.create(context, title);
    return NextResponse.json({ ok: true, session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create session.",
      },
      { status: 400 },
    );
  }
}
