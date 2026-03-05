import { NextResponse } from "next/server";

import { fetchOpenRouterCredit } from "@/lib/server/openRouterCredit";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const settings = await readOpenRouterSettings();
  const credit = await fetchOpenRouterCredit(settings.apiKey);
  return NextResponse.json(credit);
}
