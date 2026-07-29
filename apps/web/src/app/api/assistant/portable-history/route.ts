import { NextResponse } from "next/server";
import Ajv from "ajv";

import type {
  AssistantEvent,
  AssistantPlaybook,
  AssistantSession,
} from "@muhfweeceevee/schemas";
import { ASSISTANT_SESSION_JSON_SCHEMA } from "@muhfweeceevee/schemas";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { assistantPlaybookStore } from "@/lib/server/assistantPlaybookStore";
import { assistantSessionStore } from "@/lib/server/assistantStore";

export const runtime = "nodejs";

const validateSession = new Ajv({ allErrors: true }).compile(
  ASSISTANT_SESSION_JSON_SCHEMA,
);

function sanitizeEvent(event: AssistantEvent): AssistantEvent {
  if (event.type === "approval_required") {
    return {
      ...event,
      proposal: { ...event.proposal, arguments: {} },
    };
  }
  if (event.type === "tool_preparing" || event.type === "tool_running") {
    return { ...event, arguments: {} };
  }
  return event;
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const summaries = await assistantSessionStore.list();
  const sessions = (
    await Promise.all(summaries.map((summary) => assistantSessionStore.get(summary.id)))
  )
    .filter((session): session is AssistantSession => Boolean(session))
    .map((session) => ({
      ...session,
      status: "archived" as const,
      events: session.events.map(sanitizeEvent),
    }));
  const playbooks = (await assistantPlaybookStore.list()).filter(
    (playbook) => !playbook.id.startsWith("builtin_"),
  );
  return NextResponse.json({
    ok: true,
    assistantHistory: {
      version: 1,
      exportedAt: new Date().toISOString(),
      restoreMode: "archived-read-only",
      sessions,
      playbooks,
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      version?: unknown;
      sessions?: unknown;
      playbooks?: unknown;
    };
    if (body.version !== 1) throw new Error("Unsupported assistant history version.");
    const sessions = Array.isArray(body.sessions)
      ? body.sessions.filter((session): session is AssistantSession =>
          Boolean(validateSession(session)),
        )
      : [];
    if (Array.isArray(body.sessions) && sessions.length !== body.sessions.length) {
      throw new Error("Assistant history contains an invalid conversation.");
    }
    const playbooks = Array.isArray(body.playbooks)
      ? (body.playbooks as AssistantPlaybook[])
      : [];
    const [sessionCount, playbookCount] = await Promise.all([
      assistantSessionStore.importArchived(sessions),
      assistantPlaybookStore.import(playbooks),
    ]);
    return NextResponse.json({ ok: true, sessions: sessionCount, playbooks: playbookCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not restore assistant history." },
      { status: 400 },
    );
  }
}
