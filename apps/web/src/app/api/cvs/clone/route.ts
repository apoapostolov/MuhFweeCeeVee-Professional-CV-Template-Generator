import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { cloneCvVersion } from "@/lib/server/cvStore";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { sourceCvId?: unknown; name?: unknown };
    if (typeof body.sourceCvId !== "string" || typeof body.name !== "string") {
      return NextResponse.json({ error: "sourceCvId and name are required." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await cloneCvVersion(body.sourceCvId, body.name)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to copy CV version." }, { status: 400 });
  }
}
