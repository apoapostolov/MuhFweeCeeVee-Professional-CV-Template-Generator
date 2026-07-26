import { NextResponse } from "next/server";

import { extractKeywordsFromJd } from "@/lib/research/keywordExtract";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  findResearchedJobPosition,
  upsertResearchedJobPosition,
} from "@/lib/server/researchStore";
import { readResearchCatalog } from "@/lib/server/researchStore";

export const runtime = "nodejs";

/**
 * Local JD keyword extract (no web). Optional future: useAiClassify with analysis model.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const body = (await request.json()) as {
    jobId?: unknown;
    rawJdText?: unknown;
    replace?: unknown;
    useAiClassify?: unknown;
  };

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const catalog = await readResearchCatalog();
  const job = findResearchedJobPosition(catalog, jobId);
  if (!job) {
    return NextResponse.json({ error: "Job position not found." }, { status: 404 });
  }

  const pasted =
    typeof body.rawJdText === "string" && body.rawJdText.trim().length > 0
      ? body.rawJdText.trim()
      : "";
  const rawJdText = pasted || job.role?.raw_jd_text?.trim() || "";
  if (!rawJdText && !job.title?.trim()) {
    return NextResponse.json(
      {
        error:
          "Paste a job description into role.raw_jd_text (or pass rawJdText) before extracting keywords.",
      },
      { status: 400 },
    );
  }

  const replace = body.replace === true;
  // useAiClassify reserved for later cheap classify; ignored for now (local-only path)
  void body.useAiClassify;

  const extracted = extractKeywordsFromJd({
    rawJdText: rawJdText || job.title,
    jobTitle: job.title,
    existing: replace ? [] : job.weighted_keywords,
  });

  const nextJob = {
    ...job,
    role: {
      ...job.role,
      raw_jd_text: rawJdText || job.role?.raw_jd_text,
    },
    weighted_keywords: extracted.keywords,
    ats: {
      ...job.ats,
      keywords: extracted.keywords
        .filter((k) => (k.role === "must" || (k.weight ?? 0) >= 70) && k.keyword)
        .map((k) => k.keyword)
        .slice(0, 40),
    },
    research: {
      ...job.research,
      last_operation: "keyword_extract",
      researched_at: new Date().toISOString(),
    },
  };

  const updated = await upsertResearchedJobPosition(nextJob);
  const saved = updated.job_positions.find((j) => j.id === jobId) ?? nextJob;

  return NextResponse.json({
    ok: true,
    job_position: saved,
    keywords: saved.weighted_keywords,
    stats: extracted.stats,
    mode: "local_extract",
  });
}
