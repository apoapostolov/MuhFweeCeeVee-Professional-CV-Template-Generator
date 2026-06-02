import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import {
  validateCvV1,
  validateCvV1JsonSchema,
  validateCvV1Structural,
} from "./cvSchema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const johnDoePath = join(repoRoot, "data/cvs/cv_en_john_doe.yaml");

describe("validateCvV1Structural", () => {
  it("rejects non-objects", () => {
    const result = validateCvV1Structural(null);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.path).toBe("$");
  });

  it("flags missing required paths", () => {
    const result = validateCvV1Structural({ schema: { version: "1" } });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "person.full_name")).toBe(true);
  });
});

describe("validateCvV1", () => {
  it("accepts public John Doe sample YAML", () => {
    const raw = readFileSync(johnDoePath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const structural = validateCvV1Structural(doc);
    expect(structural.valid).toBe(true);
    const full = validateCvV1(doc);
    expect(full.valid).toBe(true);
  });

  it("json schema rejects object missing required top-level keys", () => {
    const result = validateCvV1JsonSchema({ schema: { id: "x", version: "1", profile_type: "a", locale: "en" } });
    expect(result.valid).toBe(false);
  });
});