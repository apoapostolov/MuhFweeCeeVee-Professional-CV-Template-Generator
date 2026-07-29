import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  CAREER_EVIDENCE_KINDS,
  readCareerEvidenceLibrary,
  upsertCareerEvidence,
  type CareerEvidenceKind,
} from "@/lib/server/careerEvidenceStore";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const library = await readCareerEvidenceLibrary();
  return NextResponse.json({ ok: true, ...library });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const body = (await request.json()) as Record<string, unknown>;
  const statement =
    typeof body.statement === "string" ? body.statement.trim() : "";
  if (!statement) {
    return NextResponse.json(
      { error: "statement is required." },
      { status: 400 },
    );
  }
  const kind =
    typeof body.kind === "string" &&
    (CAREER_EVIDENCE_KINDS as readonly string[]).includes(body.kind)
      ? (body.kind as CareerEvidenceKind)
      : "achievement";
  try {
    const library = await upsertCareerEvidence({
      id: typeof body.id === "string" ? body.id : undefined,
      kind,
      title: typeof body.title === "string" ? body.title : undefined,
      statement,
      metric: typeof body.metric === "string" ? body.metric : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      role_families: Array.isArray(body.role_families)
        ? body.role_families.map(String)
        : undefined,
      seniority:
        typeof body.seniority === "string" ? body.seniority : undefined,
      industries: Array.isArray(body.industries)
        ? body.industries.map(String)
        : undefined,
      source: typeof body.source === "string" ? body.source : undefined,
      source_cv_ids: Array.isArray(body.source_cv_ids)
        ? body.source_cv_ids.map(String)
        : undefined,
      last_verified_at:
        typeof body.last_verified_at === "string"
          ? body.last_verified_at
          : undefined,
    });
    return NextResponse.json({ ok: true, ...library });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evidence save failed." },
      { status: 400 },
    );
  }
}
