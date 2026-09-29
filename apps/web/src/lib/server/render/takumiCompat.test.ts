import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const renderDir = fileURLToPath(new URL("./", import.meta.url));

/**
 * takumi-pdf does not render generated content, so a `::before` or `::after`
 * rule draws nothing at all. The templates used pseudo-elements for every
 * decorative rule: the harvard timeline rail, the cambridge dated rail and
 * ticks, the stanford and cambridge heading rules, the edinburgh sidebar arc and
 * product bullets, and the europass list bullets. All of them now use real
 * elements, and this test keeps them from creeping back.
 */
describe("template css compatibility with takumi-pdf", () => {
  it(
    "uses no content-generating pseudo-elements",
    async () => {
      const files = (await readdir(renderDir)).filter(
        (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
      );
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const name of files) {
        const source = await readFile(`${renderDir}/${name}`, "utf8");
        source.split("\n").forEach((line, index) => {
          // Ignore comments, which legitimately name the old selectors.
          if (line.trim().startsWith("*") || line.trim().startsWith("//")) {
            return;
          }
          const match = line.match(/([.#][\w-]+)::(before|after)\s*\{([^}]*)\}/);
          if (!match) return;
          const body = match[3];
          // `content: none` draws nothing anyway, so it is harmless.
          if (/content\s*:\s*none/.test(body)) return;
          offenders.push(`${name}:${index + 1}  ${line.trim().slice(0, 90)}`);
        });
      }

      expect(
        offenders,
        `Pseudo-elements that draw content will not render:\n${offenders.join("\n")}`,
      ).toEqual([]);
    },
    30_000,
  );

  it(
    "keeps the real elements those rules replaced",
    async () => {
      // Each of these is a decorative rule that used to be generated content.
      const required: Array<[string, string]> = [
        ["harvard-v1.ts", "timeline-rail"],
        ["cambridge-v1.ts", "dated-rail"],
        ["cambridge-v1.ts", "dated-tick"],
        ["cambridge-v1.ts", "h2-rule"],
        ["stanford-v1.ts", "h2-rule"],
        ["edinburgh-v1.ts", "left-header-arc"],
        ["edinburgh-v1.ts", "product-bullet"],
        ["shared.ts", "product-bullet"],
      ];
      const missing: string[] = [];
      for (const [file, token] of required) {
        const source = await readFile(`${renderDir}/${file}`, "utf8");
        if (!source.includes(token)) {
          missing.push(`${file} no longer emits ${token}`);
        }
      }
      expect(missing, missing.join("\n")).toEqual([]);
    },
    30_000,
  );
});
