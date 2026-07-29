import { NextResponse } from "next/server";

import { assistantMcpClient } from "@/lib/server/assistantMcpClient";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { decideAssistantToolPolicy } from "@/lib/server/assistantToolPolicy";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    await assistantMcpClient.reconnect();
    const tools = await assistantMcpClient.listTools();
    const guardedTools = tools.filter(
      (tool) =>
        decideAssistantToolPolicy(tool.name).action === "require_approval",
    ).length;
    return NextResponse.json({
      ok: true,
      tools: tools.length,
      readOnlyTools: tools.length - guardedTools,
      guardedTools,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The local MCP wrapper could not reconnect. Confirm the web server is running and retry.",
      },
      { status: 503 },
    );
  }
}
