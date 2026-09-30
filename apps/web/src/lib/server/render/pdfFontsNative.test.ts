import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { listCvIds } from "../cvStore";
import { buildCvTemplateHtml } from "../renderCvTemplate";
import { listTemplates } from "../templateStore";
import { drawnFonts } from "./pdfDrawnFonts";
import { renderCvPdf } from "./takumiPdf";

/**
 * Font embedding, asserted against the engine that actually produces the CVs.
 *
 * The previous check drove Chromium through `page.pdf()`, the engine this project
 * no longer uses for PDF output. It passed while the native renderer fell back to
 * a system font for every icon, because only the retired engine was ever
 * exercised. A guard on a rendering property has to run on the renderer that
 * ships.
 *
 * Every assertion reads back the font that drew each character rather than the
 * embedded font list, because a PDF can carry a font it never draws with.
 */

/** The family each template is expected to draw its body text with. */
const BODY_FAMILY: Record<string, RegExp> = {
  "stanford-v1": /Lato/i,
  "europass-v1": /Arimo|IBMPlexSansCond/i,
};
const DEFAULT_BODY = /IBMPlexSans|Lato|Arimo/i;

/** Fonts that mean the renderer gave up and used whatever the host had. */
const SYSTEM_FALLBACK = /Arial|TimesNewRoman|Times-Roman|Courier|Helvetica/i;

describe("pdf render fonts (native renderer)", () => {
  it(
    "draws every template with a declared family, never a system fallback",
    async () => {
      const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
      expect(cvId).toBeTruthy();
      const templateIds = (await listTemplates()).map((t) => t.id);
      expect(templateIds.length).toBeGreaterThan(0);

      for (const templateId of templateIds) {
        const { html, margins } = await buildCvTemplateHtml({
          cvId: cvId as string,
          templateId,
        });
        const pdf = Buffer.from(
          await renderCvPdf({ html, margins, removePageCount: true }),
        );
        await writeFile(`./fonts-${templateId}.pdf`, pdf);

        const drawn = drawnFonts(pdf);
        const describe = () =>
          drawn.map((entry) => `${entry.font} (${entry.chars}ch)`).join(", ") || "nothing";

        const fellBack = drawn.filter((entry) => SYSTEM_FALLBACK.test(entry.font));
        expect(
          fellBack.map((entry) => `${entry.font} (${entry.chars}ch)`),
          `${templateId} drew characters in a system font: ${describe()}`,
        ).toEqual([]);

        const expected = BODY_FAMILY[templateId] ?? DEFAULT_BODY;
        const bodyChars = drawn
          .filter((entry) => expected.test(entry.font))
          .reduce((sum, entry) => sum + entry.chars, 0);
        expect(
          bodyChars,
          `${templateId} drew no body text matching ${expected}: ${describe()}`,
        ).toBeGreaterThan(0);
      }
    },
    300_000,
  );

  it(
    "draws icons from the icon font rather than a text font",
    async () => {
      const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
      const { html, margins } = await buildCvTemplateHtml({
        cvId: cvId as string,
        templateId: "harvard-v1",
      });
      const pdf = Buffer.from(
        await renderCvPdf({ html, margins, removePageCount: true }),
      );
      const drawn = drawnFonts(pdf);

      // Font Awesome draws from the Private Use Area. A face registered without
      // that range matches nothing, and the glyph falls through to a text font,
      // which is how every icon used to print as Times or Arial.
      const iconChars = drawn
        .filter((entry) => /FontAwesome/i.test(entry.font))
        .reduce((sum, entry) => sum + entry.chars, 0);
      expect(
        iconChars,
        "no icon glyphs came from the icon font: " +
          drawn.map((entry) => `${entry.font} (${entry.chars}ch)`).join(", "),
      ).toBeGreaterThan(0);
    },
    120_000,
  );

  it(
    "keeps the Cyrillic subsets vendored and covered by a declared range",
    async () => {
      // The repository ships no Bulgarian fixture and translating one needs a
      // translation provider, so this asserts the two things that decide whether
      // a Bulgarian CV renders: the subsets exist on disk, and the face covering
      // them is registered over the code points they contain. The renderer raises
      // "No registered font covers ..." when either is missing, which is what a
      // broken Bulgarian export looks like.
      const manifest = (
        (await import("../../../assets/pdf-fonts/manifest.json", {
          with: { type: "json" },
        })) as {
          default: {
            families: Array<{
              css: string;
              hasCyrillic: boolean;
              faces: Array<{ subset: string; file: string }>;
            }>;
            unicodeRanges: Record<string, string>;
          };
        }
      ).default;

      // А is U+0410, so the declared range has to include that block.
      expect(manifest.unicodeRanges.cyrillic).toContain("U+0400-045F");

      const { readFile } = await import("node:fs/promises");
      const dir = new URL("../../../assets/pdf-fonts/", import.meta.url);
      const cyrillicFamilies = manifest.families.filter((family) => family.hasCyrillic);
      expect(
        cyrillicFamilies.length,
        "no vendored family declares cyrillic support",
      ).toBeGreaterThan(0);

      for (const family of cyrillicFamilies) {
        const faces = family.faces.filter((face) => face.subset === "cyrillic");
        expect(
          faces.length,
          `${family.css} claims cyrillic support but vendors no cyrillic subset`,
        ).toBeGreaterThan(0);
        for (const face of faces) {
          const bytes = await readFile(new URL(face.file, dir));
          expect(bytes.length, `${face.file} is empty`).toBeGreaterThan(0);
          // wOF2 magic, so it is a real font and not a truncated copy.
          expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
        }
      }

      // The @font-face rules the renderer reads must carry the same range, or a
      // Bulgarian face is registered but never selected.
      const { buildPdfFontFaceCss } = await import("./pdfFonts");
      const css = await buildPdfFontFaceCss();
      expect(
        css.includes("U+0400-045F"),
        "the inlined @font-face rules do not cover the cyrillic block",
      ).toBe(true);
    },
    60_000,
  );
});
