import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import manifest from "@/assets/pdf-fonts/manifest.json";

type PdfFontFace = {
  weight: string;
  subset: keyof typeof manifest.unicodeRanges;
  file: string;
};

type PdfFontFamily = {
  css: string;
  slug: string;
  hasCyrillic: boolean;
  replaces?: string;
  note?: string;
  faces: PdfFontFace[];
};

const FAMILIES = manifest.families as PdfFontFamily[];

// Resolve against this module's own location so the path is correct whether the
// caller is the Next server, a vitest worker, or a one-off script.
const fontDir = fileURLToPath(new URL("../../../assets/pdf-fonts/", import.meta.url));

/**
 * Build `@font-face` rules with inline data URLs.
 *
 * The renderer receives HTML through `page.setContent()` (Playwright) or
 * `render()` (Takumi), and neither resolves relative URLs. Inlining is the only
 * way to guarantee the declared families are actually used instead of silently
 * falling back to a system font.
 */
export async function buildPdfFontFaceCss(): Promise<string> {
  const rules: string[] = [];
  for (const family of FAMILIES) {
    for (const face of family.faces) {
      const bytes = await readFile(`${fontDir}/${face.file}`);
      const range = manifest.unicodeRanges[face.subset];
      rules.push(
        [
          "@font-face {",
          `  font-family: ${family.css};`,
          "  font-style: normal;",
          `  font-weight: ${face.weight};`,
          "  font-display: block;",
          `  src: url("data:font/woff2;base64,${bytes.toString("base64")}") format("woff2");`,
          `  unicode-range: ${range};`,
          "}",
        ].join("\n"),
      );
    }
  }
  return rules.join("\n\n");
}

export type PdfFontEntry = {
  name: string;
  weight: number;
  data: Uint8Array;
};

/**
 * Font entries for Takumi, which reads no system fonts and fetches no
 * stylesheet.
 *
 * Each vendored file is one script subset, so every subset is registered under
 * its own name and the chain is repeated per family. A missing glyph walks the
 * chain until a subset covers it, which is how Cyrillic resolves for families
 * that ship no Cyrillic file.
 */
export async function loadPdfFontEntries(): Promise<PdfFontEntry[]> {
  const entries: PdfFontEntry[] = [];
  for (const family of FAMILIES) {
    for (const face of family.faces) {
      entries.push({
        name: `${family.slug}-${face.subset}`,
        weight: Number(face.weight),
        data: new Uint8Array(await readFile(`${fontDir}/${face.file}`)),
      });
    }
  }
  return entries;
}

/**
 * Ordered fallback chain: each family's own subsets first, then every
 * Cyrillic-capable family, so a glyph the primary family lacks still renders
 * with a real font.
 */
export function pdfFontFallbackChain(): string[] {
  const cyrillicCapable = FAMILIES.filter((family) => family.hasCyrillic);
  const chain: string[] = [];
  const add = (slug: string, subset: string) => {
    const name = `${slug}-${subset}`;
    if (!chain.includes(name)) chain.push(name);
  };
  for (const family of FAMILIES) {
    for (const face of family.faces) add(family.slug, face.subset);
    if (!family.hasCyrillic) {
      for (const fallback of cyrillicCapable) {
        for (const face of fallback.faces) add(fallback.slug, face.subset);
      }
    }
  }
  return chain;
}
