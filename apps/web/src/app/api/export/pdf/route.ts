import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { applyPdfMetadata } from "@/lib/server/pdfMetadata";
import { buildCvTemplateHtml } from "@/lib/server/renderCvTemplate";
import {
  buildAdaptivePaginationCss,
  measureAndMarkAdaptivePagination,
  parseRenderTweaks,
} from "@/lib/server/render/tweaks";
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
      let browser: Awaited<
        ReturnType<(typeof import("playwright"))["chromium"]["launch"]>
      > | null = null;
      try {
        const tweaks = parseRenderTweaks(url.searchParams);
        const { html, metadata } = await buildCvTemplateHtml({
          cvId,
          templateId,
          theme,
          photoMode,
          profilePhotoId,
          tweaks,
        });
        const { chromium } = await import("playwright");
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        if (tweaks.intelligentPagination) {
          await page.setViewportSize({ width: 794, height: 1123 });
          await page.emulateMedia({ media: "print" });
        }
        await page.setContent(html, { waitUntil: "networkidle" });
        if (tweaks.intelligentPagination) {
          const paginationMode = tweaks.intelligentPaginationMode ?? "normal";
          await page.evaluate((mode) => {
            document.documentElement.dataset.mfcvPaginationMode = mode;
          }, paginationMode);
          const adaptiveMeasurement = await page.evaluate(measureAndMarkAdaptivePagination);
          const adaptiveCount = adaptiveMeasurement.marked;
          if (adaptiveCount > 0) {
            await page.addStyleTag({
              content: buildAdaptivePaginationCss(paginationMode),
            });
          }
        }
        const rawPdf = await page.pdf({
          format: "A4",
          printBackground: true,
          displayHeaderFooter: !tweaks.removePageCount,
          headerTemplate: "<div></div>",
          footerTemplate:
            '<div style=\"font-size:10px;color:#6b7280;width:100%;padding:0 24px;text-align:right;\"><span class=\"pageNumber\"></span> / <span class=\"totalPages\"></span></div>',
          margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
        });
        await page.close();
        const pdf = await applyPdfMetadata(new Uint8Array(rawPdf), metadata);

        const fileName = `${cvId}__${templateId}.pdf`;
        return new NextResponse(new Uint8Array(pdf), {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
            "cache-control": "no-store",
          },
        });
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF." },
      { status: 500 },
    );
  }
}
