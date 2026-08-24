import { NextResponse } from "next/server";

import { pollXaiOAuth } from "@/lib/server/xaiOAuth";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId?.trim()) return NextResponse.json({ error: "Missing OAuth session." }, { status: 400 });
    return NextResponse.json(await pollXaiOAuth(body.sessionId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "xAI OAuth login failed." }, { status: 502 });
  }
}
