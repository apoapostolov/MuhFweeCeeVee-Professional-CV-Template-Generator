import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  buildCoverLetterId,
  deleteCoverLetter,
  listCoverLetters,
  readCoverLetter,
  writeCoverLetter,
  type CoverLetterDocument,
} from "@/lib/server/coverLetterStore";
import { readCv } from "@/lib/server/cvStore";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "@/lib/server/researchStore";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const items = await listCoverLetters();
  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;

  const body = (await request.json()) as {
    action?: unknown;
    id?: unknown;
    cvId?: unknown;
    companyId?: unknown;
    jobId?: unknown;
    title?: unknown;
    body?: unknown;
    language?: unknown;
    draftWithAi?: unknown;
  };

  const action = typeof body.action === "string" ? body.action : "save";

  if (action === "delete") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    const ok = await deleteCoverLetter(id);
    return NextResponse.json({ ok, id });
  }

  const cvId = typeof body.cvId === "string" ? body.cvId.trim() : "";
  if (!cvId) {
    return NextResponse.json({ error: "cvId is required." }, { status: 400 });
  }

  const companyId =
    typeof body.companyId === "string" ? body.companyId.trim() || undefined : undefined;
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() || undefined : undefined;
  let letterBody = typeof body.body === "string" ? body.body : "";
  let title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Cover letter";

  if (body.draftWithAi === true) {
    const cv = await readCv(cvId);
    if (!cv) {
      return NextResponse.json({ error: "CV not found." }, { status: 404 });
    }
    const catalog = await readResearchCatalog();
    const job = jobId ? findResearchedJobPosition(catalog, jobId) : null;
    const company = companyId
      ? findResearchedCompany(catalog, companyId)
      : job
        ? findResearchedCompany(catalog, job.company_id)
        : null;
    const keywords = (job?.weighted_keywords ?? [])
      .slice(0, 20)
      .map((k) => k.keyword)
      .join(", ");
    const person = (cv as { person?: { full_name?: string; contact?: { email?: string } } })
      .person;
    const prompt = [
      "Write a concise professional cover letter body (3 short paragraphs).",
      "No web search. Use only the CV and job context below.",
      "Do not invent employers or degrees not in the CV.",
      "",
      `Applicant: ${person?.full_name ?? "Candidate"}`,
      person?.contact?.email ? `Email: ${person.contact.email}` : "",
      company ? `Company: ${company.name}` : "",
      job ? `Role: ${job.title}` : "",
      keywords ? `Prefer natural use of: ${keywords}` : "",
      "",
      "CV JSON (truncated):",
      JSON.stringify(cv).slice(0, 6000),
      "",
      "Return plain text letter body only (no markdown fences).",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await callOpenRouterResearchChat(
      prompt,
      "You write concise cover letters. Return plain text only.",
      { useWebSearch: false },
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    letterBody = result.content.trim();
    if (company || job) {
      title = `Cover letter — ${job?.title ?? "Role"} @ ${company?.name ?? "Company"}`;
    }
  }

  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim()
      : buildCoverLetterId({ cvId, companyId, jobId });

  const existing = await readCoverLetter(id);
  const doc: CoverLetterDocument = {
    id,
    cv_id: cvId,
    company_id: companyId,
    job_id: jobId,
    title,
    body: letterBody,
    language: typeof body.language === "string" ? body.language : undefined,
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const saved = await writeCoverLetter(doc);
  return NextResponse.json({ ok: true, item: saved });
}
