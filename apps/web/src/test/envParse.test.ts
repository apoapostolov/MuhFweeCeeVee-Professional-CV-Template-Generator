import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ENV_TEST_FILE, loadEnvTestIntoProcess, parseEnvValue } from "./envParse";

describe("envParse (test env)", () => {
  it("parses quoted and plain env values", () => {
    const raw = ["# comment", "OPENROUTER_API_KEY=sk-test-plain"].join("\n");
    expect(parseEnvValue(raw, "OPENROUTER_API_KEY")).toBe("sk-test-plain");
    expect(parseEnvValue('OPENROUTER_API_KEY="sk-quoted"\n', "OPENROUTER_API_KEY")).toBe(
      "sk-quoted",
    );
  });

  it("points ENV_TEST_FILE at repo .env.test", () => {
    expect(ENV_TEST_FILE.endsWith(`${path.sep}.env.test`)).toBe(true);
  });

  it("loadEnvTestIntoProcess reads repo .env.test when present", () => {
    if (!fs.existsSync(ENV_TEST_FILE)) {
      return;
    }
    const previousKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      loadEnvTestIntoProcess();
      expect((process.env.OPENROUTER_API_KEY ?? "").length).toBeGreaterThan(10);
    } finally {
      if (previousKey === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = previousKey;
      }
    }
  });
});