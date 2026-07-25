import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { fetchOpenRouterCredit } from "@/lib/server/openRouterCredit";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const settings = await readOpenRouterSettings();
  const credit = await fetchOpenRouterCredit(settings.apiKey);
  return NextResponse.json(credit);
}
