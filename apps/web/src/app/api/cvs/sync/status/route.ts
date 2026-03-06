import { NextResponse } from "next/server";

import { listCvVariants, readCv } from "@/lib/server/cvStore";
import { parseCvVariantId } from "@/lib/server/cvVariants";

export const runtime = "nodejs";

type StatusRequest = {
  cvId?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveLastEditedAt(cv: unknown): string {
  const meta = asRecord(asRecord(cv)?.metadata);
  const value =
    (typeof meta?.last_edited_at === "string" && meta.last_edited_at) ||
    (typeof meta?.updated_at === "string" && meta.updated_at) ||
    "";
  return value;
}

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as StatusRequest;
  const cvId = typeof payload.cvId === "string" ? payload.cvId.trim() : "";
  if (!cvId) {
    return NextResponse.json({ error: "cvId is required." }, { status: 400 });
  }

  const parsed = parseCvVariantId(cvId);
  if (!parsed) {
    return NextResponse.json(
      { error: "cvId must be a language variant id: cv_<language>_<iter>_<target>." },
      { status: 400 },
    );
  }

  const variants = await listCvVariants();
  const siblings = variants.filter(
    (item) => item.iteration === parsed.iteration && item.target === parsed.target && item.language,
  );
  const languagesRaw = await Promise.all(
    siblings.map(async (item) => {
      const doc = await readCv(item.id);
      return {
        language: String(item.language ?? "").toLowerCase(),
        cvId: item.id,
        lastEditedAt: resolveLastEditedAt(doc),
      };
    }),
  );
  const languages = languagesRaw
    .filter((item) => item.language.length > 0)
    .sort((a, b) => {
      if (a.language === "en") return -1;
      if (b.language === "en") return 1;
      return a.language.localeCompare(b.language);
    });

  return NextResponse.json({
    ok: true,
    iteration: parsed.iteration,
    target: parsed.target,
    currentLanguage: parsed.language,
    languages,
  });
}
