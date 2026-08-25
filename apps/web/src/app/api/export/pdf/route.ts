import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { applyPdfMetadata } from "@/lib/server/pdfMetadata";
import { buildCvTemplateHtml } from "@/lib/server/renderCvTemplate";
import {
  buildAdaptivePaginationCss,
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
          const adaptiveCount = await page.evaluate(() => {
            const pageHeight = (297 / 25.4) * 96;
            const elements = Array.from(document.querySelectorAll("p, li"));
            let marked = 0;
            for (const element of elements) {
              if (!element.closest(".page, .content, .sidebar, .left, .right")) continue;
              const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
              const lines: Array<{ top: number; text: string }> = [];
              let node: Node | null = walker.nextNode();
              while (node) {
                const textNode = node as Text;
                for (let index = 0; index < textNode.data.length; index += 1) {
                  const range = document.createRange();
                  range.setStart(textNode, index);
                  range.setEnd(textNode, index + 1);
                  const rect = range.getClientRects()[0];
                  if (!rect || rect.width === 0 || rect.height === 0) continue;
                  const previous = lines[lines.length - 1];
                  if (!previous || Math.abs(previous.top - rect.top) > 1.5) {
                    lines.push({ top: rect.top, text: textNode.data[index] });
                  } else {
                    previous.text += textNode.data[index];
                  }
                }
                node = walker.nextNode();
              }
              if (lines.length < 2) continue;
              const normalizedLines = lines.map((line) => line.text.replace(/\\s+/g, " ").trim());
              const lastLine = normalizedLines[normalizedLines.length - 1] ?? "";
              const lastWords = lastLine.split(" ").filter(Boolean);
              const lastPage = Math.floor((lines[lines.length - 1].top + 1) / pageHeight);
              const previousPage = Math.floor((lines[lines.length - 2].top + 1) / pageHeight);
              const spillsOneLine = lastPage > previousPage && lines.filter((line) => Math.floor((line.top + 1) / pageHeight) === lastPage).length === 1;
              const hasShortWrap = lastWords.length > 0 && lastWords.length <= 2 && lastLine.length <= 20 && lastWords.every((word) => word.length <= 12);
              if (hasShortWrap) element.setAttribute("data-mfcv-tighten-wrap", "true");
              if (spillsOneLine) element.setAttribute("data-mfcv-tighten-line", "true");
              if (hasShortWrap || spillsOneLine) marked += 1;
            }
            return marked;
          });
          if (adaptiveCount > 0) {
            await page.addStyleTag({ content: buildAdaptivePaginationCss() });
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
