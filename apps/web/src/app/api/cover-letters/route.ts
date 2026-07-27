import { NextResponse } from "next/server";

import { applyAiSkillPostprocess } from "@/lib/server/aiSkills/applyAiSkill";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  buildCoverLetterId,
  deleteCoverLetter,
  listCoverLetterVersions,
  listCoverLetters,
  readCoverLetter,
  readCoverLetterVersion,
  writeCoverLetter,
  type CoverLetterDocument,
  type CoverLetterVersionSource,
} from "@/lib/server/coverLetterStore";
import { readCv } from "@/lib/server/cvStore";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "@/lib/server/researchStore";
import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const versions = url.searchParams.get("versions") === "1";
  const versionRaw = url.searchParams.get("version");

  if (id && versionRaw) {
    const version = Number(versionRaw);
    const snap = await readCoverLetterVersion(id, version);
    if (!snap) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, version: snap });
  }

  if (id && versions) {
    const list = await listCoverLetterVersions(id);
    const current = await readCoverLetter(id);
    return NextResponse.json({
      ok: true,
      id,
      current_version: current?.version ?? null,
      versions: list,
    });
  }

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
    humanize?: unknown;
    version?: unknown;
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

  // Load a history snapshot only — does not write a new revision (client may Save later).
  if (action === "restore" || action === "load_version") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const version = Number(body.version);
    if (!id || !Number.isFinite(version)) {
      return NextResponse.json(
        { error: "id and version are required." },
        { status: 400 },
      );
    }
    const existing = await readCoverLetter(id);
    if (!existing) {
      return NextResponse.json({ error: "Cover letter not found." }, { status: 404 });
    }
    const snap = await readCoverLetterVersion(id, version);
    if (!snap) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      id,
      current_version: existing.version,
      version: snap,
      persisted: false,
    });
  }

  if (action === "versions") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    const list = await listCoverLetterVersions(id);
    const current = await readCoverLetter(id);
    return NextResponse.json({
      ok: true,
      id,
      current_version: current?.version ?? null,
      versions: list,
    });
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

  const catalog = await readResearchCatalog();
  const job = jobId ? findResearchedJobPosition(catalog, jobId) : null;
  const company = companyId
    ? findResearchedCompany(catalog, companyId)
    : job
      ? findResearchedCompany(catalog, job.company_id)
      : null;

  let skillMeta:
    | {
        skillId: string;
        skillName: string;
        hook: string;
        model?: string;
        applied: boolean;
        warning?: string;
      }
    | undefined;

  let writeSource: CoverLetterVersionSource = "save";

  const personName = async (): Promise<string | undefined> => {
    const cv = await readCv(cvId);
    if (!cv) return undefined;
    return (cv as { person?: { full_name?: string } }).person?.full_name;
  };

  // AI draft only — no humanizer pass (separate step).
  if (body.draftWithAi === true) {
    writeSource = "ai_draft";
    const cv = await readCv(cvId);
    if (!cv) {
      return NextResponse.json({ error: "CV not found." }, { status: 404 });
    }
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
      "Avoid generic AI openers and empty corporate buzzwords; prefer concrete fit.",
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
  } else if (body.humanize === true) {
    // Humanizer only — separate from AI draft.
    writeSource = "humanize";
    if (!letterBody.trim()) {
      return NextResponse.json(
        { error: "body is required to humanize." },
        { status: 400 },
      );
    }
    const humanized = await applyAiSkillPostprocess({
      hook: "cover_letter_humanize",
      text: letterBody,
      context: {
        applicantName: await personName(),
        companyName: company?.name,
        jobTitle: job?.title,
      },
    });
    if (!humanized.ok) {
      return NextResponse.json(
        { error: humanized.error, skill: humanized.skill },
        { status: 502 },
      );
    }
    letterBody = humanized.text;
    skillMeta = {
      skillId: humanized.skill.skillId,
      skillName: humanized.skill.skillName,
      hook: humanized.skill.hook,
      model: humanized.model,
      applied: true,
    };
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
    version: existing?.version ?? 0,
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const saved = await writeCoverLetter(doc, { source: writeSource });
  const versions = await listCoverLetterVersions(id);
  return NextResponse.json({
    ok: true,
    item: saved,
    skill: skillMeta,
    versions,
  });
}
