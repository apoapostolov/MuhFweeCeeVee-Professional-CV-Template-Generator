import { render as renderPdfDocument } from "takumi-pdf";

import { loadPdfFontEntries, pdfFontFallbackChain } from "./pdfFonts";
import type { PageMarginMode } from "./tweaks";

/** A4 at 96 dpi. Takumi takes CSS pixels, the templates work in millimetres. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const MM_TO_PX = 96 / 25.4;

export type PdfMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX);
}

export type RenderPdfOptions = {
  html: string;
  /** Page margins in millimetres, taken from the template's own resolveMargins. */
  margins: PdfMargins;
  /** Omit the page-number footer, matching the removePageCount tweak. */
  removePageCount: boolean;
  /** "a4" keeps the template's own margins; "none" renders edge to edge. */
  pageMargins?: PageMarginMode;
};

/**
 * Render template HTML to PDF bytes with takumi-pdf instead of Chromium.
 *
 * Three constraints from the engine shape this wrapper:
 *
 * - `@page` rules are not parsed, so all page geometry has to travel through the
 *   `margin` option, in pixels, and only as numbers. A string margin such as
 *   `"12mm"` fails deep inside the WASM boundary with an opaque
 *   `MarginInput` error.
 * - The engine reads no system fonts and fetches no stylesheet, so the vendored
 *   font files are registered on every call and the CSS chain is passed
 *   explicitly.
 * - The `margin` option *replaces* the stylesheet `@page` rule rather than
 *   adding to it. Measured on the Harvard template: Chromium with 0mm page
 *   margins and a 12mm `@page` rule produced a 177.4mm text span, and this
 *   engine with a 12mm margin produced 179.5mm. The template's own padding sits
 *   inside that span, so passing the template margins here is what keeps the
 *   layout close to the Chromium output. Passing 0 instead spreads the text to
 *   203.3mm, which is the wider "no margins" look.
 */
export async function renderCvPdf({
  html,
  margins,
  removePageCount,
  pageMargins = "a4",
}: RenderPdfOptions) {
  const fonts = await loadPdfFontEntries();
  const applied =
    pageMargins === "none" ? { top: 0, right: 0, bottom: 0, left: 0 } : margins;
  return renderPdfDocument(html, {
    size: "a4",
    margin: {
      top: mmToPx(applied.top),
      right: mmToPx(applied.right),
      bottom: mmToPx(applied.bottom),
      left: mmToPx(applied.left),
    },
    fonts,
    fontFamilies: pdfFontFallbackChain(),
    ...(removePageCount ? {} : { footer: pageNumberFooter() }),
  });
}

/**
 * Page-number footer.
 *
 * Takumi's `PageNumber` and `TotalPages` primitives cannot be expressed in an
 * HTML string, but the engine fills any node carrying the `pageNumber` or
 * `totalPages` class, so the same markup Chromium's print templates use works
 * unchanged.
 */
function pageNumberFooter(): string {
  return [
    '<div style="width:100%;text-align:right;font-size:10px;color:#6b7280;padding:0 24px;">',
    '<span class="pageNumber"></span> / <span class="totalPages"></span>',
    "</div>",
  ].join("");
}
