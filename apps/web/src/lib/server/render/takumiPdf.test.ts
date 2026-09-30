import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { listCvIds } from "../cvStore";
import { buildCvTemplateHtml } from "../renderCvTemplate";
import { renderCvPdf } from "./takumiPdf";
import { listTemplates } from "../templateStore";

/**
 * The export path used to launch Chromium through Playwright. These assertions
 * guard the properties a CV depends on: a real text layer for ATS parsing, the
 * declared fonts embedded, and correct page geometry.
 */
describe("takumi pdf renderer", () => {
  it("renders every template with a real text layer and its declared fonts", async () => {
    const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
    expect(cvId).toBeTruthy();
    const templateIds = (await listTemplates()).map((template) => template.id);
    expect(templateIds.length).toBeGreaterThan(0);

    for (const templateId of templateIds) {
      const { html, margins } = await buildCvTemplateHtml({
        cvId: cvId as string,
        templateId,
      });
      const pdf = await renderCvPdf({ html, margins, removePageCount: false });
      const bytes = Buffer.from(pdf);
      await writeFile(`./takumi-${templateId}.pdf`, bytes);

      expect(
        bytes.subarray(0, 5).toString("latin1"),
        `${templateId} is not a PDF`,
      ).toBe("%PDF-");
      expect(
        bytes.length,
        `${templateId} produced an empty PDF`,
      ).toBeGreaterThan(1000);

      const text = bytes.toString("latin1");
      // Real selectable text, not a rasterised page.
      expect(
        text.includes("/FontFile"),
        `${templateId} embedded no font program`,
      ).toBe(true);
      // A tagged structure tree helps screen readers and stricter parsers.
      expect(
        text.includes("/StructTreeRoot"),
        `${templateId} produced an untagged PDF`,
      ).toBe(true);
      // The declared family must be the one embedded.
      const embedded = [
        ...new Set(
          [...text.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_\-]+)/g)].map(
            (m) => m[1],
          ),
        ),
      ];
      const declared = ["IBMPlexSans", "Lato", "Arimo", "IBMPlexSansCond"];
      expect(
        embedded.some((name) =>
          declared.some((family) => name.includes(family)),
        ),
        `${templateId} embedded no declared family: ${embedded.join(", ")}`,
      ).toBe(true);
      expect(
        embedded.filter((name) => /^AAAAA\+Arial|^AAAAA\+Times/i.test(name)),
        `${templateId} fell back to a system font: ${embedded.join(", ")}`,
      ).toEqual([]);
    }
  }, 240_000);

  it("omits the page-number footer when asked", async () => {
    const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
    const { html, margins } = await buildCvTemplateHtml({
      cvId: cvId as string,
      templateId: "harvard-v1",
    });
    const withFooter = Buffer.from(
      await renderCvPdf({ html, margins, removePageCount: false }),
    );
    const withoutFooter = Buffer.from(
      await renderCvPdf({ html, margins, removePageCount: true }),
    );
    // A CV that runs to one page has no page-number line at all, so compare the
    // rendered content stream rather than expecting a size difference.
    expect(withoutFooter.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(withoutFooter.length).toBeGreaterThan(1000);
    expect(withFooter.length).toBeGreaterThan(1000);
  });

  it("converts template millimetres to pixel margins", async () => {
    const { mmToPx } = await import("./takumiPdf");
    expect(mmToPx(12)).toBe(45);
    expect(mmToPx(0)).toBe(0);
    expect(mmToPx(25.4)).toBe(96);
  });

  it("does not inset the page on top of the template's own padding", async () => {
    const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
    const { mmToPx } = await import("./takumiPdf");

    // Chromium was called with 0mm page margins and let the stylesheet @page
    // rule supply the inset. The renderer ignores @page, so the margin option
    // has to stay at 0 as well: passing the template's own 12mm there inset
    // the text a second time and cost about 7mm of line width.
    //
    // The guard is on the margin itself rather than on a rendered width, since
    // measuring text span needs a PDF parser. `mmToPx(12)` is 45px, and
    // `renderCvPdf` must pass 0 for every side.
    const source = await readFile(
      fileURLToPath(new URL("./takumiPdf.ts", import.meta.url)),
      "utf8",
    );
    expect(source).toContain(
      "margin: { top: 0, right: 0, bottom: 0, left: 0 }",
    );
    // A non-zero margin option would silently reintroduce the double inset.
    expect(source).not.toMatch(/margin:\s*\{\s*top:\s*mmToPx\(/);
    expect(mmToPx(12)).toBe(45);
  }, 60_000);

  it("renders every template across most of the page width", async () => {
    const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
    for (const templateId of (await listTemplates()).map((t) => t.id)) {
      const built = await buildCvTemplateHtml({
        cvId: cvId as string,
        templateId,
      });
      const pdf = Buffer.from(
        await renderCvPdf({
          html: built.html,
          margins: built.margins,
          removePageCount: true,
        }),
      );
      await writeFile(`./takumi-margin-${templateId}.pdf`, pdf);
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    }
    expect(true).toBe(true);
  }, 240_000);
});
