import { NextResponse } from "next/server";

import { disconnectXaiOAuth } from "@/lib/server/xaiOAuth";

export async function POST(): Promise<NextResponse> {
  try {
    await disconnectXaiOAuth();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "xAI disconnect failed." }, { status: 500 });
  }
}
