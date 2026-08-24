import { NextResponse } from "next/server";

import { disconnectCodexOAuth } from "@/lib/server/openaiCodexOAuth";

export async function POST(): Promise<NextResponse> {
  try {
    await disconnectCodexOAuth();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OpenAI Codex disconnect failed." }, { status: 500 });
  }
}
