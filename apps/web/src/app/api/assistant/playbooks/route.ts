import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { assistantPlaybookStore } from "@/lib/server/assistantPlaybookStore";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, playbooks: await assistantPlaybookStore.list() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const playbook = await assistantPlaybookStore.create({
      title: body.title,
      description: body.description,
      prompt: body.prompt,
      scopePanels: body.scopePanels,
    });
    return NextResponse.json({ ok: true, playbook }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save playbook." },
      { status: 400 },
    );
  }
}
