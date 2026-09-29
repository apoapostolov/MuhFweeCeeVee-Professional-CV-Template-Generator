import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { applyPdfMetadata } from "@/lib/server/pdfMetadata";
import { buildCvTemplateHtml } from "@/lib/server/renderCvTemplate";
import { renderCvPdf } from "@/lib/server/render/takumiPdf";
import { parseRenderTweaks } from "@/lib/server/render/tweaks";
import { withExportSlot } from "@/lib/server/renderConcurrency";

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
  const download = url.searchParams.get("download") === "1";

  if (!cvId || !templateId) {
    return NextResponse.json(
      { error: "Missing required query params: cvId and templateId." },
      { status: 400 },
    );
  }

  try {
    return await withExportSlot(async () => {
      const tweaks = parseRenderTweaks(url.searchParams);
      const { html, metadata, margins } = await buildCvTemplateHtml({
        cvId,
        templateId,
        theme,
        photoMode,
        profilePhotoId,
        tweaks,
      });
      // takumi-pdf paginates natively, so smart pagination is plain CSS now
      // instead of the in-browser measurement pass Chromium needed.
      const rawPdf = await renderCvPdf({
        html,
        margins,
        removePageCount: tweaks.removePageCount,
      });
      const pdf = await applyPdfMetadata(rawPdf, metadata);

      const fileName = `${cvId}__${templateId}.pdf`;
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
          "cache-control": "no-store",
        },
      });
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF." },
      { status: 500 },
    );
  }
}
