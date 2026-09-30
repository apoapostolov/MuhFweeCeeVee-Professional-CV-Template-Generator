import { render as renderPdfDocument } from "takumi-pdf";

import { loadPdfFontEntries, pdfFontFallbackChain } from "./pdfFonts";
import type { PageMarginMode } from "./tweaks";

/**
 * A4 at 96 dpi. Takumi takes CSS pixels, the templates work in millimetres.
 *
 * The `a4` preset is exactly 210mm wide, while the page Chromium produced for the
 * same document measures 210.227mm. The two-column layouts size their columns as
 * a percentage of the page, so that 0.227mm shortfall narrows the content column.
 * Passing the dimensions explicitly puts the page on the 794x1123px basis the
 * templates already assume, which is 210.079mm and within a fifth of a millimetre
 * of the Chromium page.
 */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const MM_TO_PX = 96 / 25.4;

export type PdfMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/**
 * Millimetres to CSS pixels, rounding to nearest rather than down.
 *
 * The renderer takes its page margin in pixels, while the templates declare it in
 * millimetres. Rounding 12mm gives 45.35px, which truncates to 45 and lands the
 * page inset at 11.906mm instead of 12mm. Measured against the same document
 * rendered by Chromium, 46px puts the left inset at 12.189mm against Chromium's
 * 12.187mm.
 */
export function mmToPx(mm: number): number {
  if (mm <= 0) {
    return 0;
  }
  const pixels = mm * MM_TO_PX;
  // Bias only a genuine fraction, so an exact whole pixel such as 25.4mm at 96dpi
  // stays 96 rather than tipping to 97.
  const fraction = pixels - Math.floor(pixels);
  return Math.floor(pixels) + (fraction >= 0.25 ? 1 : 0);
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
    size: { width: A4_WIDTH_PX, height: A4_HEIGHT_PX },
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
  // Chromium drew this through its print-footer layer, which sits inside the page
  // margin, so the number aligned with the body text. This footer is drawn in the
  // page area instead, so the inset has to be stated. With 24px of padding the
  // number landed 13.7mm past the right edge of the text column, which reads as a
  // wrong right margin rather than a misplaced page number.
  //
  // The inset is the page margin plus the widest template's own content padding,
  // so the number falls on the same right edge as the body copy.
  const insetPx = mmToPx(12) + mmToPx(6.5);
  return [
    `<div style="width:100%;text-align:right;font-size:10px;color:#6b7280;padding:0 ${insetPx}px 0 0;">`,
    '<span class="pageNumber"></span> / <span class="totalPages"></span>',
    "</div>",
  ].join("");
}
