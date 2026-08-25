import { chromium } from "playwright";
import { describe, expect, it } from "vitest";

import { listCvIds } from "../cvStore";
import { buildCvTemplateHtml } from "../renderCvTemplate";
import { listTemplates } from "../templateStore";
import {
  buildAdaptivePaginationCss,
  measureAndMarkAdaptivePagination,
  parseRenderTweaks,
} from "./tweaks";

describe("adaptive pagination layout", () => {
  it(
    "repeats the real-font unwrap measurement at every main-area scale",
    async () => {
      const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
      expect(cvId).toBeTruthy();
      const templateIds = (await listTemplates()).map((template) => template.id);
      expect(templateIds.length).toBeGreaterThan(0);

      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
      await page.emulateMedia({ media: "print" });

      let cases = 0;
      let wraps = 0;
      let spills = 0;
      try {
        for (const mode of ["normal", "aggressive"] as const) {
          const scales = mode === "normal" ? Array.from({ length: 15 }, (_, index) => 130 - index * 5) : [130];
          const templatesForMode = mode === "normal" ? [templateIds[0]] : templateIds;
          for (const scale of scales) {
            for (const templateId of templatesForMode) {
            const { html } = await buildCvTemplateHtml({
              cvId: cvId as string,
              templateId,
              tweaks: parseRenderTweaks(
                new URLSearchParams(`pagination=smart&paginationMode=${mode}&contentTextScale=${scale}`),
              ),
            });
            await page.setContent(html, { waitUntil: "networkidle" });
            await page.evaluate((paginationMode) => {
              document.documentElement.dataset.mfcvPaginationMode = paginationMode;
            }, mode);
            const measurement = await page.evaluate(measureAndMarkAdaptivePagination);
            await page.addStyleTag({ content: buildAdaptivePaginationCss(mode) });
            expect(measurement.marked).toBeGreaterThanOrEqual(0);
            expect(measurement.wraps).toBeGreaterThanOrEqual(0);
            cases += 1;
            wraps += measurement.wraps;
            spills += measurement.spills;
            }
          }
        }
      } finally {
        await browser.close();
      }

      expect(cases).toBe(15 + templateIds.length);

      const fixtureBrowser = await chromium.launch({ headless: true });
      const fixturePage = await fixtureBrowser.newPage({ viewport: { width: 794, height: 1123 } });
      await fixturePage.emulateMedia({ media: "print" });
      await fixturePage.setContent(`<!doctype html><style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; }
        .page { width: 794px; min-height: calc(297mm - 24mm); padding: 0 40px; }
        .spacer { height: 939px; }
        h2 { font-size: 24px; line-height: 24px; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #888; }
        hr { height: 1px; border: 0; background: #888; margin: 16px 0; }
        p { width: 650px; margin: 0; font-size: 16px; line-height: 24px; }
      </style><div class="page"><div class="spacer"></div><h2>Experience</h2><hr><p>Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega. Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega. Alpha beta gamma delta epsilon zeta eta theta iota kappa.</p></div>`, { waitUntil: "networkidle" });
      await fixturePage.evaluate(() => {
        document.documentElement.dataset.mfcvPaginationMode = "aggressive";
      });
      const fixtureMeasurement = await fixturePage.evaluate(measureAndMarkAdaptivePagination);
      await fixtureBrowser.close();
      expect(fixtureMeasurement.marked).toBeGreaterThan(0);
      expect(fixtureMeasurement.spills).toBe(0);
      console.info(`adaptive pagination: ${cases} layouts, ${wraps} unwraps, ${spills} page spills; fixture ${JSON.stringify(fixtureMeasurement)}`);
    },
    180_000,
  );
});
