import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  APPLICATION_STATUSES,
  deleteApplication,
  readApplicationBoard,
  upsertApplication,
  type ApplicationStatus,
} from "@/lib/server/applicationStore";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const board = await readApplicationBoard();
  return NextResponse.json({
    ok: true,
    applications: board.applications,
    statuses: APPLICATION_STATUSES,
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

  const company_name =
    typeof body.company_name === "string" ? body.company_name.trim() : "";
  const job_title = typeof body.job_title === "string" ? body.job_title.trim() : "";
  if (!company_name || !job_title) {
    return NextResponse.json(
      { error: "company_name and job_title are required." },
      { status: 400 },
    );
  }

  const statusRaw = typeof body.status === "string" ? body.status.trim() : "wishlist";
  const status = (APPLICATION_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as ApplicationStatus)
    : "wishlist";

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
  });

  return NextResponse.json({ ok: true, applications: board.applications });
}
