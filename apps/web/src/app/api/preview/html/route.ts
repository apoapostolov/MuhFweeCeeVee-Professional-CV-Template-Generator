import { NextResponse } from "next/server";

import { buildCvTemplateHtml } from "@/lib/server/renderCvTemplate";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const cvId = url.searchParams.get("cvId");
  const templateId = url.searchParams.get("templateId");
  const theme = url.searchParams.get("theme") ?? undefined;
  const photoMode = url.searchParams.get("photo") ?? undefined;

  if (!cvId || !templateId) {
    return NextResponse.json(
      { error: "Missing required query params: cvId and templateId." },
      { status: 400 },
    );
  }

  try {
    const { html } = await buildCvTemplateHtml({
      cvId,
      templateId,
      theme,
      photoMode,
    });
    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build HTML preview." },
      { status: 500 },
    );
  }
}
