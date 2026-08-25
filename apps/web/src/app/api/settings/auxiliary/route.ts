import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { getAuxiliaryServices, saveAuxiliaryApiKeys } from "@/lib/server/auxiliaryServices";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ services: await getAuxiliaryServices() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load auxiliary service settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { apiKeys?: unknown };
    const apiKeys = body.apiKeys && typeof body.apiKeys === "object" && !Array.isArray(body.apiKeys)
      ? Object.fromEntries(Object.entries(body.apiKeys).filter(([, value]) => typeof value === "string")) as Record<string, string>
      : {};
    await saveAuxiliaryApiKeys(apiKeys);
    return NextResponse.json({ ok: true, services: await getAuxiliaryServices() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save auxiliary service settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
