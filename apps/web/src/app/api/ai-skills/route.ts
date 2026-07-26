import { NextResponse } from "next/server";

import { listEnabledAiSkills } from "@/lib/server/aiSkills/loadAiSkill";

export const runtime = "nodejs";

/** List product AI skills (no instruction bodies — metadata only). */
export async function GET(): Promise<NextResponse> {
  try {
    const skills = await listEnabledAiSkills();
    return NextResponse.json({ ok: true, skills });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list AI skills.",
      },
      { status: 500 },
    );
  }
}
