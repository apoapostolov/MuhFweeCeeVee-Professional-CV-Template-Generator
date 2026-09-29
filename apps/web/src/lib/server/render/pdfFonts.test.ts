import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";

import { listCvIds } from "../cvStore";
import { buildCvTemplateHtml } from "../renderCvTemplate";
import { listTemplates } from "../templateStore";

const CHROMIUM_PATH =
  process.env.MFCV_CHROMIUM_PATH ??
  "C:/Users/theap/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";

/**
 * The templates declare families such as "IBM Plex Sans" and "Lato" but used to
 * ship no `@font-face` at all, so Chromium silently rendered every CV in a
 * system fallback while the stylesheet claimed otherwise. These assertions fail
 * if the vendored fonts stop being embedded.
 */
describe("pdf render fonts", () => {
  it(
    "embeds the declared families instead of a system fallback",
    async () => {
      const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
      expect(cvId).toBeTruthy();
      const templateIds = (await listTemplates()).map((template) => template.id);
      expect(templateIds.length).toBeGreaterThan(0);

      const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
      try {
        for (const templateId of templateIds) {
          const { html } = await buildCvTemplateHtml({
            cvId: cvId as string,
            templateId,
          });
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: "networkidle" });
          // The fonts are inlined as data URLs. Subsets the page never uses stay
          // unloaded by design, so assert the ones the text needs are present.
          const usedFaces = await page.evaluate(async () => {
            await document.fonts.ready;
            return [...document.fonts]
              .filter((font) => font.status === "loaded")
              .map((font) => `${font.family} ${font.weight}`);
          });
          expect(usedFaces.length, `${templateId} loaded no font faces`).toBeGreaterThan(0);
          // Every template declares a vendored family, so at least one of the
          // declared names must be the face that actually loaded. stanford-v1
          // uses Lato, the others IBM Plex Sans, and europass uses Liberation Sans.
          const declared = ["IBM Plex Sans", "Lato", "Liberation Sans"];
          expect(
            usedFaces.some((face) => declared.some((name) => face.includes(name))),
            `${templateId} loaded no declared family: ${usedFaces.join(" | ")}`,
          ).toBe(true);

          const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
          });
          await page.close();

          const text = Buffer.from(pdf).toString("latin1");
          const embedded = [
            ...new Set(
              [...text.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_\-]+)/g)].map((match) => match[1]),
            ),
          ];
          expect(embedded.length, `${templateId} embedded no fonts`).toBeGreaterThan(0);
          // Arial or Times means the declared family still fell back to a system font.
          const fellBack = embedded.filter((name) => /Arial|TimesNewRoman|Times-Roman/i.test(name));
          expect(
            fellBack,
            `${templateId} fell back to system fonts: ${fellBack.join(", ")}`,
          ).toEqual([]);
        }
      } finally {
        await browser.close();
      }
    },
    180_000,
  );

  it("resolves Cyrillic text through the vendored subsets", async () => {
    const cvId = (await listCvIds()).find((id) => /_en_/.test(id));
    expect(cvId).toBeTruthy();
    const { html } = await buildCvTemplateHtml({
      cvId: cvId as string,
      templateId: "harvard-v1",
    });
    const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Every vendored face must be reachable, including the Cyrillic subsets,
      // otherwise Bulgarian CVs lose their glyphs.
      const cyrillicFaces = await page.evaluate(async () => {
        await document.fonts.load('11px "IBM Plex Sans"', "АБВГДЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгд");
        return [...document.fonts]
          .filter((font) => font.status === "loaded")
          .map((font) => `${font.family} ${font.weight}`);
      });
      expect(cyrillicFaces.length).toBeGreaterThan(0);
      const manifest = JSON.parse(
        await readFile(
          fileURLToPath(new URL("../../../assets/pdf-fonts/manifest.json", import.meta.url)),
          "utf8",
        ),
      ) as {
        families: Array<{ hasCyrillic: boolean; faces: Array<{ file: string }> }>;
      };
      const fontDir = fileURLToPath(new URL("../../../assets/pdf-fonts/", import.meta.url));
      const cyrillicFiles = manifest.families
        .filter((family) => family.hasCyrillic)
        .flatMap((family) => family.faces.map((face) => face.file));
      expect(cyrillicFiles.length).toBeGreaterThan(0);
      for (const file of cyrillicFiles) {
        const bytes = await readFile(`${fontDir}/${file}`);
        expect(bytes.length, `${file} is empty`).toBeGreaterThan(0);
        // wOF2 magic
        expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
      }
    } finally {
      await browser.close();
    }
  });
});
