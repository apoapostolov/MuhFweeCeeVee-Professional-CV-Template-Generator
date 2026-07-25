import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";

import { getPrototypeStatus, setPrototypeState } from "./state";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(getPrototypeStatus());
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as { action?: unknown };
  const action = body.action;
  if (action !== "start" && action !== "stop") {
    return NextResponse.json(
      { error: "action must be 'start' or 'stop'." },
      { status: 400 },
    );
  }

  return NextResponse.json(setPrototypeState(action === "start" ? "running" : "stopped"));
}
