import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { AI_ROLES, getAiSettingsResponse, writeAiSettingsDocument } from "@/lib/server/aiSettings";
import type { AiRole } from "@/lib/server/aiProviderTypes";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const searchParams = new URL(request.url).searchParams;
    const forceRefresh = searchParams.get("refresh") === "1";
    const requestedProviderIds = (searchParams.get("providers") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return NextResponse.json(await getAiSettingsResponse(forceRefresh, requestedProviderIds));
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
      clearRoles?: unknown;
      apiKeys?: Record<string, unknown>;
      providerModels?: Record<string, unknown>;
      thinkingModes?: Record<string, unknown>;
      enabledProviders?: unknown;
      providerEndpoints?: Record<string, unknown>;
    };
    const roles = Object.fromEntries(
      Object.entries(body.roles ?? []).flatMap(([role, value]) => {
        if (!value || typeof value !== "object") return [];
        const record = value as { providerId?: unknown; modelId?: unknown };
        if (typeof record.providerId !== "string" || typeof record.modelId !== "string") return [];
        return [[role, { providerId: record.providerId, modelId: record.modelId }]];
      }),
    ) as Partial<Record<AiRole, { providerId: string; modelId: string }>>;
    const clearRoles = Array.isArray(body.clearRoles)
      ? body.clearRoles.filter((role): role is AiRole => typeof role === "string" && AI_ROLES.includes(role as AiRole))
      : [];
    const apiKeys = Object.fromEntries(
      Object.entries(body.apiKeys ?? []).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
    const providerModels = Object.fromEntries(
      Object.entries(body.providerModels ?? []).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
    const thinkingModes = Object.fromEntries(
      Object.entries(body.thinkingModes ?? []).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
    const enabledProviders = Array.isArray(body.enabledProviders)
      ? body.enabledProviders.filter((providerId): providerId is string => typeof providerId === "string")
      : undefined;
    const providerEndpoints = Object.fromEntries(
      Object.entries(body.providerEndpoints ?? []).filter(([, endpoint]) => typeof endpoint === "string"),
    ) as Record<string, string>;
    await writeAiSettingsDocument({ roles, clearRoles, apiKeys, providerModels, thinkingModes, enabledProviders, providerEndpoints });
    return NextResponse.json({ ok: true, ...(await getAiSettingsResponse(true)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save AI settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
