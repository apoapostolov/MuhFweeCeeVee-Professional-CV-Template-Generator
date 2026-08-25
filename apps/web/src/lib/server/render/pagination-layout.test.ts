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
        for (let scale = 130; scale >= 60; scale -= 5) {
          for (const templateId of templateIds) {
            const { html } = await buildCvTemplateHtml({
              cvId: cvId as string,
              templateId,
              tweaks: parseRenderTweaks(
                new URLSearchParams(`pagination=smart&contentTextScale=${scale}`),
              ),
            });
            await page.setContent(html, { waitUntil: "networkidle" });
            const measurement = await page.evaluate(measureAndMarkAdaptivePagination);
            await page.addStyleTag({ content: buildAdaptivePaginationCss() });
            expect(measurement.marked).toBeGreaterThanOrEqual(measurement.wraps);
            expect(measurement.marked).toBeGreaterThanOrEqual(measurement.spills);
            cases += 1;
            wraps += measurement.wraps;
            spills += measurement.spills;
          }
        }
      } finally {
        await browser.close();
      }

      expect(cases).toBe(templateIds.length * 15);
      expect(wraps).toBeGreaterThan(0);
      console.info(`adaptive pagination: ${cases} layouts, ${wraps} unwraps, ${spills} page spills`);
    },
    180_000,
  );
});
