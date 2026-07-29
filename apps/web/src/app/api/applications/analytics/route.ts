import { NextResponse } from "next/server";

import { computeApplicationAnalytics } from "@/lib/server/applicationAnalytics";
import { readApplicationBoard } from "@/lib/server/applicationStore";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const board = await readApplicationBoard();
  return NextResponse.json({
    ok: true,
    analytics: computeApplicationAnalytics(board.applications),
  });
}
