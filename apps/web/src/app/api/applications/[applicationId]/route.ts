import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  getApplication,
  mutateApplication,
  type ApplicationNextAction,
  type ApplicationPriority,
} from "@/lib/server/applicationStore";
import { compareLatestApplicationSubmission } from "@/lib/server/applicationSubmissionStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { applicationId } = await context.params;
  const application = await getApplication(applicationId);
  return application
    ? NextResponse.json({
        ok: true,
        application,
        submissionComparison:
          await compareLatestApplicationSubmission(applicationId),
      })
    : NextResponse.json({ error: "Application not found." }, { status: 404 });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { applicationId } = await context.params;
  const body = (await request.json()) as {
    priority?: unknown;
    source?: unknown;
    location?: unknown;
    role_family?: unknown;
    cv_family?: unknown;
    archived?: unknown;
    next_action?: unknown;
  };
  const priority: ApplicationPriority | undefined =
    body.priority === "low" ||
    body.priority === "normal" ||
    body.priority === "high"
      ? body.priority
      : undefined;
  let nextAction: ApplicationNextAction | undefined | null;
  if (body.next_action === null) {
    nextAction = null;
  } else if (body.next_action && typeof body.next_action === "object") {
    const raw = body.next_action as Record<string, unknown>;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const dueAt = typeof raw.due_at === "string" ? raw.due_at.trim() : "";
    if (!title || !dueAt) {
      return NextResponse.json(
        { error: "next_action requires title and due_at." },
        { status: 400 },
      );
    }
    nextAction = {
      title,
      due_at: dueAt,
      priority:
        raw.priority === "low" ||
        raw.priority === "normal" ||
        raw.priority === "high"
          ? raw.priority
          : "normal",
      contact_id:
        typeof raw.contact_id === "string" ? raw.contact_id : undefined,
      meeting_url:
        typeof raw.meeting_url === "string" ? raw.meeting_url : undefined,
      reminder_state:
        raw.reminder_state === "scheduled" ||
        raw.reminder_state === "dismissed"
          ? raw.reminder_state
          : "none",
      completed_at:
        typeof raw.completed_at === "string" ? raw.completed_at : undefined,
    };
  }
  try {
    const result = await mutateApplication(applicationId, (application) => ({
      ...application,
      priority: priority ?? application.priority,
      source:
        typeof body.source === "string" ? body.source : application.source,
      location:
        typeof body.location === "string" ? body.location : application.location,
      role_family:
        typeof body.role_family === "string"
          ? body.role_family
          : application.role_family,
      cv_family:
        typeof body.cv_family === "string"
          ? body.cv_family
          : application.cv_family,
      archived_at:
        typeof body.archived === "boolean"
          ? body.archived
            ? application.archived_at ?? new Date().toISOString()
            : undefined
          : application.archived_at,
      next_action:
        nextAction === null
          ? undefined
          : nextAction ?? application.next_action,
    }));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 404 },
    );
  }
}
