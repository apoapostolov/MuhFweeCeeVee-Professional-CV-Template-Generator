import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { buildCvTemplateHtml } from "@/lib/server/renderCvTemplate";
import { parseRenderTweaks } from "@/lib/server/render/tweaks";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const url = new URL(request.url);
  const cvId = url.searchParams.get("cvId");
  const templateId = url.searchParams.get("templateId");
  const theme = url.searchParams.get("theme") ?? undefined;
  const photoMode = url.searchParams.get("photo") ?? undefined;
  const profilePhotoId = url.searchParams.get("photoId") ?? undefined;

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
      profilePhotoId,
      tweaks: parseRenderTweaks(url.searchParams),
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
