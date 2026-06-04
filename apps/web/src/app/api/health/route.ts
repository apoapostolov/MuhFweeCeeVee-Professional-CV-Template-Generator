import { NextResponse } from "next/server";

import { getApiTokenConfig } from "@/lib/server/apiAuth";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const auth = getApiTokenConfig();
  return NextResponse.json({
    ok: true,
    service: "muhfweeceevee-web",
    version: process.env.npm_package_version ?? "unknown",
    apiAuthRequired: auth.enabled,
    timestamp: new Date().toISOString(),
  });
}