import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

const CODEX_ISSUER = "https://auth.openai.com";
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const pendingDeviceCodes = new Map<string, { deviceAuthId: string; userCode: string; interval: number; createdAt: number }>();

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
    const sessionId = randomUUID();
    pendingDeviceCodes.set(sessionId, {
      deviceAuthId: payload.device_auth_id,
      userCode: payload.user_code || payload.usercode || "",
      interval: Math.max(5, payload.interval ?? 5),
      createdAt: Date.now(),
    });
    return NextResponse.json({
      sessionId,
      verificationUri: `${CODEX_ISSUER}/codex/device`,
      userCode: payload.user_code || payload.usercode,
      interval: Math.max(5, payload.interval ?? 5),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OpenAI Codex login could not start." }, { status: 502 });
  }
}

export function getPendingDeviceCode(sessionId: string) {
  const entry = pendingDeviceCodes.get(sessionId);
  if (!entry || Date.now() - entry.createdAt > 15 * 60 * 1000) {
    pendingDeviceCodes.delete(sessionId);
    return null;
  }
  return entry;
}

export function deletePendingDeviceCode(sessionId: string): void {
  pendingDeviceCodes.delete(sessionId);
}

export { CODEX_CLIENT_ID, CODEX_ISSUER };
