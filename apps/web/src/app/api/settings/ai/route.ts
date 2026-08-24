import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { getAiSettingsResponse, writeAiSettingsDocument } from "@/lib/server/aiSettings";
import type { AiRole } from "@/lib/server/aiProviderTypes";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
    return NextResponse.json(await getAiSettingsResponse(forceRefresh));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load AI settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      roles?: Partial<Record<AiRole, { providerId?: unknown; modelId?: unknown }>>;
      apiKeys?: Record<string, unknown>;
    };
    const roles = Object.fromEntries(
      Object.entries(body.roles ?? []).flatMap(([role, value]) => {
        if (!value || typeof value !== "object") return [];
        const record = value as { providerId?: unknown; modelId?: unknown };
        if (typeof record.providerId !== "string" || typeof record.modelId !== "string") return [];
        return [[role, { providerId: record.providerId, modelId: record.modelId }]];
      }),
    ) as Partial<Record<AiRole, { providerId: string; modelId: string }>>;
    const apiKeys = Object.fromEntries(
      Object.entries(body.apiKeys ?? []).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
    await writeAiSettingsDocument({ roles, apiKeys });
    return NextResponse.json({ ok: true, ...(await getAiSettingsResponse(true)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save AI settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
