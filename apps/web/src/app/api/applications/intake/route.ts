import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { quickIntakeApplication } from "@/lib/server/applicationIntake";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const body = (await request.json()) as Record<string, unknown>;
  const raw = typeof body.raw === "string" ? body.raw : "";
  if (!raw.trim()) {
    return NextResponse.json(
      { error: "raw job URL or description is required." },
      { status: 400 },
    );
  }
  try {
    const result = await quickIntakeApplication({
      raw,
      companyName:
        typeof body.companyName === "string" ? body.companyName : undefined,
      jobTitle: typeof body.jobTitle === "string" ? body.jobTitle : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      source: typeof body.source === "string" ? body.source : undefined,
    });
    return NextResponse.json(
      { ok: true, ...result },
      { status: result.deduplicated ? 200 : 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quick Intake failed." },
      { status: 400 },
    );
  }
}
