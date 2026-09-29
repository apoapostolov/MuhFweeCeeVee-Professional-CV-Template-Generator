import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { applyTextScale } from "./textScale";

const renderDir = fileURLToPath(new URL("./", import.meta.url));

/**
 * takumi-pdf does not implement `zoom`, so the text-scale tweak silently did
 * nothing after the migration. `transform: scale` is honoured but shrinks the
 * whole container, which is also wrong: the tweak is meant to change the type
 * size while the columns keep their geometry. So the template's declared font
 * sizes are rewritten in place instead.
 */
describe("print text scale under takumi-pdf", () => {
  const html = `<!doctype html><html><head><style>
    body { font-size: 11.2px; }
    .sidebar h3 { font-size: 6.1mm; }
    .content p { font-size: 3.7mm; }
    .content h2 { font-size: 13px; }
    .page { width: 100%; min-height: 297mm; }
    .sidebar { padding: 11mm 5.5mm 9mm; }
  </style></head><body><div class="page"><aside class="sidebar"></aside><main class="content"></main></div></body></html>`;

  it("scales type in the content column without touching its box", () => {
    const out = applyTextScale(html, "harvard-v1", 1, 0.8);
    expect(out).toContain("font-size: 8.96px"); // 11.2 * 0.8
    expect(out).toContain("font-size: 2.96mm"); // 3.7 * 0.8
    expect(out).toContain("font-size: 10.4px"); // 13 * 0.8
    expect(out).toContain("min-height: 297mm");
    expect(out).toContain("padding: 11mm 5.5mm 9mm");
  });

  it("scales the sidebar independently of the content", () => {
    const out = applyTextScale(html, "harvard-v1", 0.5, 1);
    expect(out).toContain("font-size: 3.05mm"); // 6.1 * 0.5
    expect(out).toContain("font-size: 3.7mm");
    expect(out).toContain("font-size: 13px");
  });

  it("leaves the document alone when nothing is active", () => {
    expect(applyTextScale(html, "harvard-v1", 1, 1)).toBe(html);
  });

  it("never emits zoom or a container transform", () => {
    const out = applyTextScale(html, "harvard-v1", 0.8, 1.15);
    expect(out).not.toMatch(/zoom\s*:/);
    expect(out).not.toMatch(/transform\s*:\s*scale/);
  });

  it("uses no zoom property anywhere in the render sources", async () => {
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
  });
});
