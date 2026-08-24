import { NextResponse } from "next/server";

import { startXaiOAuth } from "@/lib/server/xaiOAuth";

export async function POST(): Promise<NextResponse> {
  try {
    return NextResponse.json(await startXaiOAuth());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "xAI OAuth login could not start." }, { status: 502 });
  }
}
