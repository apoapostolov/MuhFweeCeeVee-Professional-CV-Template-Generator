import { NextResponse } from "next/server";

const CODEX_ISSUER = "https://auth.openai.com";
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export async function POST(): Promise<NextResponse> {
  try {
    const response = await fetch(`${CODEX_ISSUER}/api/accounts/deviceauth/usercode`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = (await response.json()) as { device_auth_id?: string; user_code?: string; usercode?: string; interval?: number };
    if (!response.ok || !payload.device_auth_id || !(payload.user_code || payload.usercode)) {
      throw new Error(`OpenAI Codex login could not start (${response.status}).`);
    }
    return NextResponse.json({
      verificationUri: `${CODEX_ISSUER}/codex/device`,
      userCode: payload.user_code || payload.usercode,
      interval: Math.max(5, payload.interval ?? 5),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OpenAI Codex login could not start." }, { status: 502 });
  }
}
