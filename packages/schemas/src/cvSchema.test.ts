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
const personalCvPath = join(repoRoot, "data/cvs/cv_apoapostolov_en_001.yaml");

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
  it("accepts the personal English CV YAML", () => {
    const raw = readFileSync(personalCvPath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const structural = validateCvV1Structural(doc);
    expect(structural.valid).toBe(true);
    const full = validateCvV1(doc);
    expect(full.valid).toBe(true);
  });

  it("accepts half-step skill ratings while preserving legacy string rows", () => {
    const raw = readFileSync(personalCvPath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const skills = doc.skills as Record<string, unknown>;
    const technical = skills.technical as unknown[];
    technical[0] = { name: "SQL", rating: 4.5 };
    expect(validateCvV1(doc).valid).toBe(true);
  });

  it("rejects skill ratings outside the half-step five-point scale", () => {
    const raw = readFileSync(personalCvPath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const skills = doc.skills as Record<string, unknown>;
    const technical = skills.technical as unknown[];
    technical[0] = { name: "SQL", rating: 4.25 };
    expect(validateCvV1JsonSchema(doc).valid).toBe(false);
  });

  it("accepts free-form ATS and detector scores with section results", () => {
    const raw = readFileSync(personalCvPath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const metadata = doc.metadata as Record<string, unknown>;
    metadata.ats_scores = [{ label: "ApplyCove", score: "81/100" }];
    metadata.detector_scores = [{
      label: "Sapling",
      score: "mixed section results",
      section_score_source: "separate_tests",
      section_scores: [{
        label: "Gameloft — Tracking Data Manager",
        score: "5.1% AI",
        scope: "experience",
        experience_id: "exp_gameloft_data_manager",
      }],
    }];
    expect(validateCvV1(doc).valid).toBe(true);
  });

  it("rejects numeric review scores because provider results are stored verbatim", () => {
    const raw = readFileSync(personalCvPath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const metadata = doc.metadata as Record<string, unknown>;
    metadata.ats_scores = [{ label: "ApplyCove", score: 81 }];
    expect(validateCvV1JsonSchema(doc).valid).toBe(false);
  });

  it("rejects unknown detector section scopes", () => {
    const raw = readFileSync(personalCvPath, "utf8");
    const doc = parse(raw) as Record<string, unknown>;
    const metadata = doc.metadata as Record<string, unknown>;
    metadata.detector_scores = [{
      label: "Sapling",
      score: "No whole-CV score",
      section_score_source: "separate_tests",
      section_scores: [{ label: "Unknown", score: "5.1% AI", scope: "company" }],
    }];
    expect(validateCvV1JsonSchema(doc).valid).toBe(false);
  });

  it("json schema rejects object missing required top-level keys", () => {
    const result = validateCvV1JsonSchema({ schema: { id: "x", version: "1", profile_type: "a", locale: "en" } });
    expect(result.valid).toBe(false);
  });
});
