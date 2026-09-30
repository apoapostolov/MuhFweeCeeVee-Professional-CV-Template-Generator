import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import manifest from "@/assets/pdf-fonts/manifest.json";

type PdfFontFace = {
  weight: string;
  style: string;
  subset: keyof typeof manifest.unicodeRanges;
  file: string;
};

type PdfFontFamily = {
  css: string;
  slug: string;
  hasCyrillic: boolean;
  symbolFallback?: boolean;
  replaces?: string;
  note?: string;
  faces: PdfFontFace[];
};

const FAMILIES = manifest.families as PdfFontFamily[];

/**
 * The code points a face is allowed to supply.
 *
 * Font Awesome draws its glyphs from the Private Use Area (U+E000-F8FF), which no
 * fontsource subset covers, so the face was registered with the latin range only.
 * The renderer then found no face for an icon code point and fell back to a
 * system font, printing the icon as Times or Arial. Give the icon family its
 * real range alongside the subset it ships with.
 */
const ICON_PRIVATE_USE_RANGE = "U+E000-F8FF";

function unicodeRangeFor(family: PdfFontFamily, face: PdfFontFace): string {
  const range = manifest.unicodeRanges[face.subset];
  return /Awesome/i.test(family.css) ? `${range}, ${ICON_PRIVATE_USE_RANGE}` : range;
}

// Resolve the font directory at runtime. The path is built from
// `process.cwd()` on purpose: webpack statically analyses `new URL("...",
// import.meta.url)` and fails to resolve a bare directory reference, which broke
// the dev server with "Module not found: Can't resolve '../../../assets/pdf-fonts/'".
const fontDirCandidates = [
  // Next.js runs with apps/web as the working directory.
  path.join(process.cwd(), "src", "assets", "pdf-fonts"),
  // Repo-root tooling and vitest workers run from the workspace root.
  path.join(process.cwd(), "apps", "web", "src", "assets", "pdf-fonts"),
];

function resolveFontDir(): string {
  for (const candidate of fontDirCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Could not locate the vendored PDF fonts. Looked in:\n${fontDirCandidates.join("\n")}`,
  );
}

/**
 * Build `@font-face` rules with inline data URLs.
 *
 * The renderer receives HTML through `page.setContent()` (Playwright) or
 * `render()` (Takumi), and neither resolves relative URLs. Inlining is the only
 * way to guarantee the declared families are actually used instead of silently
 * falling back to a system font.
 */
export async function buildPdfFontFaceCss(): Promise<string> {
  const fontDir = resolveFontDir();
  const rules: string[] = [];
  for (const family of FAMILIES) {
    for (const face of family.faces) {
      const bytes = await readFile(`${fontDir}/${face.file}`);
      const range = unicodeRangeFor(family, face);
      rules.push(
        [
          "@font-face {",
          `  font-family: ${family.css};`,
          `  font-style: ${face.style};`,
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
  style: string;
  data: Uint8Array;
};

/**
 * Font entries for Takumi, which reads no system fonts and fetches no
 * stylesheet.
 *
 * Each entry is registered under the exact CSS family name the templates
 * declare, because the engine resolves a `font-family` declaration against the
 * registered names and only then falls back through `fontFamilies`. Registering
 * subset files under a synthetic name such as `ibm-plex-sans-latin` would leave
 * the declared family unresolved and the walk would start at the first
 * registered font instead.
 */
export async function loadPdfFontEntries(): Promise<PdfFontEntry[]> {
  const fontDir = resolveFontDir();
  const entries: PdfFontEntry[] = [];
  for (const family of FAMILIES) {
    const name = family.css.replace(/"/g, "");
    for (const face of family.faces) {
      entries.push({
        name,
        weight: Number(face.weight),
        // Without this the engine synthesises an oblique for `font-style:
        // italic`, and the synthetic slant reads as the wrong angle next to
        // the roman faces.
        style: face.style,
        data: new Uint8Array(await readFile(`${fontDir}/${face.file}`)),
      });
    }
  }
  return entries;
}

/**
 * Ordered fallback chain, in the order the templates declare their families.
 *
 * Takumi walks this list until a registered font covers the character and fails
 * the render when none does, so the symbol fonts must sit at the end. Putting a
 * text family later in the list is fine: it is only reached for glyphs the
 * earlier families lack.
 */
export function pdfFontFallbackChain(): string[] {
  const symbolFamilies = FAMILIES.filter((family) => family.symbolFallback);
  const textFamilies = FAMILIES.filter((family) => !family.symbolFallback);
  const cyrillicCapable = textFamilies.filter((family) => family.hasCyrillic);

  const chain: string[] = [];
  const add = (css: string) => {
    const name = css.replace(/"/g, "");
    if (!chain.includes(name)) chain.push(name);
  };
  for (const family of textFamilies) {
    add(family.css);
    // A family with no Cyrillic subset needs a Cyrillic-capable family behind it.
    if (!family.hasCyrillic) {
      for (const fallback of cyrillicCapable) add(fallback.css);
    }
  }
  for (const family of symbolFamilies) add(family.css);
  return chain;
}
