import { NextResponse } from "next/server";

import { startCodexOAuth } from "@/lib/server/openaiCodexOAuth";

export async function POST(): Promise<NextResponse> {
  try {
    return NextResponse.json(await startCodexOAuth());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OpenAI Codex login could not start." }, { status: 502 });
  }
}
