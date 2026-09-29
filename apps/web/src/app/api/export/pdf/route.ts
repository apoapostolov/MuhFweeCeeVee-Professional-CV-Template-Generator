import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { applyPdfMetadata } from "@/lib/server/pdfMetadata";
import { buildCvTemplateHtml } from "@/lib/server/renderCvTemplate";
import { renderCvPdf } from "@/lib/server/render/takumiPdf";
import {
  buildAdaptivePaginationCss,
  buildIntelligentPaginationCss,
  parseRenderTweaks,
  type RenderTweaks,
} from "@/lib/server/render/tweaks";
import { withExportSlot } from "@/lib/server/renderConcurrency";

export const runtime = "nodejs";

/**
 * CSS that reproduces the smart-pagination tweak for a native paginator.
 *
 * The normal mode is the break-control stylesheet, which takumi-pdf applies while
 * flowing the document. The aggressive mode adds the tracking and line-height
 * tightening that used to be applied to individual elements by the measurement
 * pass; applying it document-wide is the closest equivalent now that there is no
 * per-element measurement.
 */
function buildNativePaginationCss(templateId: string, tweaks: RenderTweaks): string {
  if (!tweaks.intelligentPagination) {
    return "";
  }
  const parts = [buildIntelligentPaginationCss(templateId, tweaks)];
  if (tweaks.intelligentPaginationMode === "aggressive") {
    parts.push(buildAdaptivePaginationCss("aggressive", { tightenHeadings: true }));
  }
  return parts.filter(Boolean).join("\n");
}

/** Append CSS to the document head so it can override the template's own rules. */
function withExtraCss(html: string, css: string): string {
  if (!css.trim()) {
    return html;
  }
  const tag = `<style id="mfcv-pagination">\n${css}\n</style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${tag}\n</head>`);
  }
  return `${tag}\n${html}`;
}

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
      // takumi-pdf paginates natively with real break control, so smart
      // pagination is plain CSS instead of the in-browser measurement pass
      // Chromium needed. The aggressive mode still tightens tracking and line
      // height to pull a spill back onto the page.
      const paginationCss = buildNativePaginationCss(templateId, tweaks);
      const rawPdf = await renderCvPdf({
        html: paginationCss ? withExtraCss(html, paginationCss) : html,
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
