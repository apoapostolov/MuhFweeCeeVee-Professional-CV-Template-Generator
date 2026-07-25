import { NextResponse } from "next/server";

import { getApiTokenConfig } from "@/lib/server/apiAuth";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const auth = getApiTokenConfig();
  const production = process.env.NODE_ENV === "production";
  const forceAuth =
    process.env.MFCV_REQUIRE_API_TOKEN === "1" ||
    process.env.MFCV_REQUIRE_API_TOKEN === "true";
  return NextResponse.json({
    ok: true,
    service: "muhfweeceevee-web",
    version: process.env.npm_package_version ?? "unknown",
    apiAuthRequired: auth.enabled,
    apiAuth: {
      tokenConfigured: auth.enabled,
      production,
      requireTokenEnv: forceAuth,
      policy:
        "Loopback hosts are trusted for the browser UI. Non-loopback mutations require MFCV_API_TOKEN when set; production non-loopback without a token is denied.",
    },
    timestamp: new Date().toISOString(),
  });
}