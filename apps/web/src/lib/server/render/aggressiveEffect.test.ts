import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { listCvIds } from "../cvStore";
import { buildCvTemplateHtml } from "../renderCvTemplate";
import { listTemplates } from "../templateStore";
import { renderCvPdf } from "./takumiPdf";
import { DEFAULT_RENDER_TWEAKS } from "./tweaks";

/**
 * Does aggressive mode change anything the normal mode does not?
 *
 * The old aggressive CSS was inert. The rebuild leans on top padding, which the
 * renderer honours, but a padding that never triggers changes nothing. Render
 * every template at a range of content scales and require at least one document
 * where the two modes produce a different page break, otherwise the toggle is
 * still decorative.
 */
describe("aggressive pagination is not decorative", () => {
  it(
    "changes at least one page break across templates",
    async () => {
      const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
      expect(cvId).toBeTruthy();
      const templates = (await listTemplates()).map((t) => t.id);

      const changed: string[] = [];
      for (const templateId of templates) {
        for (const scale of [90, 100, 110]) {
          const base = {
            ...DEFAULT_RENDER_TWEAKS,
            intelligentPagination: true,
            contentTextScale: scale,
            contentTextScaleActive: true,
            sidebarTextScale: scale,
            sidebarTextScaleActive: true,
          };
          const normal = await buildCvTemplateHtml({
            cvId: cvId as string,
            templateId,
            tweaks: { ...base, intelligentPaginationMode: "normal" },
          });
          const aggressive = await buildCvTemplateHtml({
            cvId: cvId as string,
            templateId,
            tweaks: { ...base, intelligentPaginationMode: "aggressive" },
          });
          const a = Buffer.from(
            await renderCvPdf({
              html: normal.html,
              margins: normal.margins,
              removePageCount: true,
            }),
          );
          const b = Buffer.from(
            await renderCvPdf({
              html: aggressive.html,
              margins: aggressive.margins,
              removePageCount: true,
            }),
          );
          if (!a.equals(b)) {
            changed.push(`${templateId}@${scale}`);
          }
        }
      }
      console.log(`AGGRESSIVE_DIFFERS: ${changed.join(", ") || "none"}`);
      expect(
        changed.length,
        "aggressive mode rendered identically to normal on every template and scale",
      ).toBeGreaterThan(0);
    },
    300_000,
  );
});
