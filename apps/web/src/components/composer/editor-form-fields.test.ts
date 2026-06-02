import { describe, expect, it } from "vitest";

import {
  collectVisibleAiFieldPathLabels,
  companyMetadataFieldSupportsAi,
  isExperienceItemPath,
  isUrlFieldKey,
  normalizeEmploymentType,
  primitiveFieldSupportsAiRewrite,
} from "./editor-form-fields";

describe("editor-form-fields", () => {
  it("detects experience item paths", () => {
    expect(isExperienceItemPath("experience[0]")).toBe(true);
    expect(isExperienceItemPath("experience[2].role")).toBe(false);
  });

  it("normalizes employment type with full_time default", () => {
    expect(normalizeEmploymentType("")).toBe("full_time");
    expect(normalizeEmploymentType("part_time")).toBe("part_time");
    expect(normalizeEmploymentType("invalid")).toBe("full_time");
  });

  it("detects URL field keys", () => {
    expect(isUrlFieldKey("website")).toBe(true);
    expect(isUrlFieldKey("linkedin_url")).toBe(true);
    expect(isUrlFieldKey("summary")).toBe(false);
  });

  it("allows company metadata text fields but skips id and priority", () => {
    expect(companyMetadataFieldSupportsAi("companies[0].name", "name", "Acme")).toBe(true);
    expect(companyMetadataFieldSupportsAi("companies[0].company_details.website", "website", "")).toBe(
      true,
    );
    expect(companyMetadataFieldSupportsAi("companies[0].id", "id", "acme")).toBe(false);
    expect(companyMetadataFieldSupportsAi("companies[0].priority", "priority", 1)).toBe(false);
  });

  it("excludes URL and date fields from AI rewrite", () => {
    expect(primitiveFieldSupportsAiRewrite("personal.website", "website", "https://x.test")).toBe(false);
    expect(primitiveFieldSupportsAiRewrite("personal.summary", "summary", "Engineer")).toBe(true);
    expect(primitiveFieldSupportsAiRewrite("personal.start_date", "start_date", "")).toBe(false);
  });

  it("orders visible AI-eligible fields for separator logic", () => {
    const draft = {
      summary: "A",
      website: "https://x.test",
      note: "B",
    };
    expect(collectVisibleAiFieldPathLabels(draft, [], "personal", {})).toEqual([
      "personal.summary",
      "personal.note",
    ]);
  });
});