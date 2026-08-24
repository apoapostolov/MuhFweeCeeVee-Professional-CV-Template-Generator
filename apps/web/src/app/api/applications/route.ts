import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  buildApplicationPacketFile,
  restorePacketEmbeds,
} from "@/lib/server/applicationPacket";
import {
  APPLICATION_STATUSES,
  deleteApplication,
  duplicateApplication,
  findApplicationDuplicates,
  importApplicationPacket,
  isApplicationPacketFile,
  packetCompleteness,
  readApplicationBoard,
  upsertApplication,
  type ApplicationStatus,
} from "@/lib/server/applicationStore";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const exportId = url.searchParams.get("export")?.trim() ?? "";
  if (exportId) {
    try {
      const packet = await buildApplicationPacketFile(exportId);
      return NextResponse.json({ ok: true, packet });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Export failed." },
        { status: 404 },
      );
    }
  }

  const board = await readApplicationBoard();
  return NextResponse.json({
    ok: true,
    applications: board.applications,
    statuses: APPLICATION_STATUSES,
    completeness: Object.fromEntries(
      board.applications.map((app) => [app.id, packetCompleteness(app)]),
    ),
    duplicates: findApplicationDuplicates(board.applications),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;

  const body = (await request.json()) as {
    action?: unknown;
    id?: unknown;
    company_id?: unknown;
    job_id?: unknown;
    company_name?: unknown;
    job_title?: unknown;
    status?: unknown;
    url?: unknown;
    applied_at?: unknown;
    notes?: unknown;
    cv_id?: unknown;
    photo_id?: unknown;
    cover_letter_id?: unknown;
    packet_title?: unknown;
    status_since?: unknown;
    priority?: unknown;
    source?: unknown;
    location?: unknown;
    role_family?: unknown;
    cv_family?: unknown;
    archived_at?: unknown;
    raw_job_input?: unknown;
    deadline_at?: unknown;
    salary_text?: unknown;
    employment_type?: unknown;
    next_action?: unknown;
    contacts?: unknown;
    activities?: unknown;
    submission_snapshots?: unknown;
    packet?: unknown;
    restoreCv?: unknown;
    restoreLetter?: unknown;
    overrides?: unknown;
  };

  const action = typeof body.action === "string" ? body.action : "upsert";

  if (action === "delete") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    const board = await deleteApplication(id);
    return NextResponse.json({ ok: true, applications: board.applications });
  }

  if (action === "export") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    try {
      const packet = await buildApplicationPacketFile(id);
      return NextResponse.json({ ok: true, packet });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Export failed." },
        { status: 404 },
      );
    }
  }

  if (action === "duplicate") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    try {
      const overrides =
        body.overrides && typeof body.overrides === "object"
          ? (body.overrides as Record<string, unknown>)
          : {};
      const { board, application } = await duplicateApplication(id, {
        company_name:
          typeof overrides.company_name === "string"
            ? overrides.company_name
            : undefined,
        job_title:
          typeof overrides.job_title === "string" ? overrides.job_title : undefined,
        company_id:
          typeof overrides.company_id === "string" ? overrides.company_id : undefined,
        job_id: typeof overrides.job_id === "string" ? overrides.job_id : undefined,
        cv_id: typeof overrides.cv_id === "string" ? overrides.cv_id : undefined,
        photo_id:
          typeof overrides.photo_id === "string" ? overrides.photo_id : undefined,
        cover_letter_id:
          typeof overrides.cover_letter_id === "string"
            ? overrides.cover_letter_id
            : undefined,
        packet_title:
          typeof overrides.packet_title === "string"
            ? overrides.packet_title
            : undefined,
        status:
          typeof overrides.status === "string" &&
          (APPLICATION_STATUSES as readonly string[]).includes(overrides.status)
            ? (overrides.status as ApplicationStatus)
            : undefined,
      });
      return NextResponse.json({
        ok: true,
        applications: board.applications,
        application,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Duplicate failed." },
        { status: 400 },
      );
    }
  }

  if (action === "import") {
    if (!isApplicationPacketFile(body.packet)) {
      return NextResponse.json(
        {
          error:
            'packet must be a muhfweeceevee.application_packet v1 file (or wrap as { packet: ... }).',
        },
        { status: 400 },
      );
    }
    try {
      const resolved = await restorePacketEmbeds(body.packet, {
        restoreCv: body.restoreCv !== false,
        restoreLetter: body.restoreLetter !== false,
      });
      const { board, application } = await importApplicationPacket(body.packet, resolved);
      return NextResponse.json({
        ok: true,
        applications: board.applications,
        application,
        restored: resolved.restored,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Import failed." },
        { status: 400 },
      );
    }
  }

  const company_name =
    typeof body.company_name === "string" ? body.company_name.trim() : "";
  const job_title = typeof body.job_title === "string" ? body.job_title.trim() : "";
  if (!company_name || !job_title) {
    return NextResponse.json(
      { error: "company_name and job_title are required." },
      { status: 400 },
    );
  }

  const statusRaw = typeof body.status === "string" ? body.status.trim() : "applied";
  const status = (APPLICATION_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as ApplicationStatus)
    : "applied";

  const board = await upsertApplication({
    id: typeof body.id === "string" ? body.id : undefined,
    company_id: typeof body.company_id === "string" ? body.company_id : undefined,
    job_id: typeof body.job_id === "string" ? body.job_id : undefined,
    company_name,
    job_title,
    status,
    url: typeof body.url === "string" ? body.url : undefined,
    applied_at: typeof body.applied_at === "string" ? body.applied_at : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    cv_id: typeof body.cv_id === "string" ? body.cv_id : undefined,
    photo_id: typeof body.photo_id === "string" ? body.photo_id : undefined,
    cover_letter_id:
      typeof body.cover_letter_id === "string" ? body.cover_letter_id : undefined,
    packet_title: typeof body.packet_title === "string" ? body.packet_title : undefined,
    status_since:
      typeof body.status_since === "string" && body.status_since.trim()
        ? body.status_since.trim()
        : undefined,
    priority:
      body.priority === "low" ||
      body.priority === "normal" ||
      body.priority === "high"
        ? body.priority
        : undefined,
    source: typeof body.source === "string" ? body.source : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    role_family:
      typeof body.role_family === "string" ? body.role_family : undefined,
    cv_family:
      typeof body.cv_family === "string" ? body.cv_family : undefined,
    archived_at:
      typeof body.archived_at === "string" ? body.archived_at : undefined,
    raw_job_input:
      typeof body.raw_job_input === "string" ? body.raw_job_input : undefined,
    deadline_at:
      typeof body.deadline_at === "string" ? body.deadline_at : undefined,
    salary_text:
      typeof body.salary_text === "string" ? body.salary_text : undefined,
    employment_type:
      typeof body.employment_type === "string"
        ? body.employment_type
        : undefined,
    next_action:
      body.next_action && typeof body.next_action === "object"
        ? (body.next_action as never)
        : undefined,
    contacts: Array.isArray(body.contacts) ? (body.contacts as never) : undefined,
    activities: Array.isArray(body.activities)
      ? (body.activities as never)
      : undefined,
    submission_snapshots: Array.isArray(body.submission_snapshots)
      ? (body.submission_snapshots as never)
      : undefined,
  });

  return NextResponse.json({ ok: true, applications: board.applications });
}
