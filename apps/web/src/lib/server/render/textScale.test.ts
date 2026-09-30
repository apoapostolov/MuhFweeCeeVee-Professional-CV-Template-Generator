import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { applyTextScale } from "./textScale";

const renderDir = fileURLToPath(new URL("./", import.meta.url));

/**
 * takumi-pdf does not implement `zoom`, so the text-scale tweak silently did
 * nothing after the migration. `transform: scale` is honoured but shrinks the
 * whole container, which is also wrong: the tweak is meant to change the type
 * size while the columns keep their geometry.
 *
 * A first attempt matched a fixed list of column selectors and so scaled only
 * the rules whose selector text mentioned the column. Rules like
 * `.timeline-body p` and `.subsection h3` live inside the content column but do
 * not name it, so they were skipped and only some headings changed size. Every
 * font-size declaration is now scaled, with the column decided by the classes
 * the rule mentions.
 */
describe("print text scale under takumi-pdf", () => {
  it(
    "scales every content rule, including ones that do not name the column",
    () => {
      const html = `<style>
        body { font-size: 11.2px; }
        .content h2 { font-size: 5.8mm; }
        .timeline-body p { font-size: 3.7mm; }
        .timeline-body h3 { font-size: 4.35mm; }
        .subsection h3 { font-size: 4.1mm; }
        .publication-links-title { font-size: 3.6mm; }
      </style>`;
      const out = applyTextScale(html, "harvard-v1", 1, 1.1);
      expect(out).toContain("font-size: 12.32px"); // body 11.2 * 1.1
      expect(out).toContain("font-size: 6.38mm"); // .content h2 5.8 * 1.1
      expect(out).toContain("font-size: 4.07mm"); // .timeline-body p 3.7 * 1.1
      expect(out).toContain("font-size: 4.785mm"); // .timeline-body h3 4.35 * 1.1
      expect(out).toContain("font-size: 4.51mm"); // .subsection h3 4.1 * 1.1
      expect(out).toContain("font-size: 3.96mm"); // publication-links-title 3.6 * 1.1
    },
  );

  it(
    "keeps sidebar-only rules on the sidebar scale",
    () => {
      const html = `<style>
        .sidebar h3 { font-size: 6.1mm; }
        .personal-list .kv span { font-size: 3.35mm; }
        .star-list .label { font-size: 3.5mm; }
        .timeline-body p { font-size: 3.7mm; }
      </style>`;
      const out = applyTextScale(html, "harvard-v1", 0.5, 1.2);
      expect(out).toContain("font-size: 3.05mm"); // 6.1 * 0.5
      expect(out).toContain("font-size: 1.675mm"); // 3.35 * 0.5
      expect(out).toContain("font-size: 1.75mm"); // 3.5 * 0.5
      expect(out).toContain("font-size: 4.44mm"); // 3.7 * 1.2, content scale
    },
  );

  it(
    "leaves page geometry alone",
    () => {
      const html = `<style>
        .page { min-height: 297mm; }
        .sidebar { padding: 11mm 5.5mm 9mm; }
        .avatar-wrap { width: 40mm; height: 40mm; }
        .timeline-body p { font-size: 3.7mm; }
      </style>`;
      const out = applyTextScale(html, "harvard-v1", 0.8, 1.1);
      expect(out).toContain("min-height: 297mm");
      expect(out).toContain("padding: 11mm 5.5mm 9mm");
      expect(out).toContain("width: 40mm");
      expect(out).toContain("height: 40mm");
      expect(out).toContain("font-size: 4.07mm");
    },
  );

  it("returns the document untouched when no scale is active", () => {
    const html = `<style>.timeline-body p { font-size: 3.7mm; }</style>`;
    expect(applyTextScale(html, "harvard-v1", 1, 1)).toBe(html);
  });

  it("never emits zoom or a container transform", () => {
    const html = `<style>.timeline-body p { font-size: 3.7mm; }</style>`;
    const out = applyTextScale(html, "harvard-v1", 0.8, 1.15);
    expect(out).not.toMatch(/zoom\s*:/);
    expect(out).not.toMatch(/transform\s*:\s*scale/);
  });

  it(
    "uses no zoom property anywhere in the render sources",
    async () => {
      const files = (await readdir(renderDir)).filter(
        (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
      );
      const offenders: string[] = [];
      for (const name of files) {
        const source = await readFile(`${renderDir}/${name}`, "utf8");
        source.split("\n").forEach((line, index) => {
          if (line.trim().startsWith("*") || line.trim().startsWith("//")) return;
          if (/[^-a-z]zoom\s*:/.test(line)) {
            offenders.push(`${name}:${index + 1} ${line.trim().slice(0, 80)}`);
          }
        });
      }
      expect(
        offenders,
        `zoom is not supported by the renderer:\n${offenders.join("\n")}`,
      ).toEqual([]);
    },
    30_000,
  );
});
