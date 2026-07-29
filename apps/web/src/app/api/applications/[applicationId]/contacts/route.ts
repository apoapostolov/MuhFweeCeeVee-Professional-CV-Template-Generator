import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { addApplicationContact } from "@/lib/server/applicationStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { applicationId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  try {
    const result = await addApplicationContact(applicationId, {
      name,
      role: typeof body.role === "string" ? body.role : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      linkedin_url:
        typeof body.linkedin_url === "string" ? body.linkedin_url : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Contact failed." },
      { status: 404 },
    );
  }
}
