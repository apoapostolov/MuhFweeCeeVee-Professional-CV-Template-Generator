import { describe, expect, it } from "vitest";

import {
  buildInitialCustomFieldValue,
  getCustomFieldDefinition,
  normalizeCustomFieldKey,
  parseCommaSeparatedOptions,
} from "./custom-field-types";

describe("custom-field-types", () => {
  it("parses comma-separated options", () => {
    expect(parseCommaSeparatedOptions("Junior, Mid,  Senior, Mid")).toEqual([
      "Junior",
      "Mid",
      "Senior",
    ]);
  });

  it("normalizes field keys", () => {
    expect(normalizeCustomFieldKey("  My Field! ")).toBe("My_Field");
  });

  it("reads custom field definitions from parent object", () => {
    const draft = {
      experience: {
        __custom_field_defs: {
          seniority: { type: "dropdown", options: ["Junior", "Senior"] },
        },
        seniority: "Junior",
      },
    };
    expect(getCustomFieldDefinition(draft, ["experience", "seniority"], "seniority")).toEqual({
      type: "dropdown",
      options: ["Junior", "Senior"],
    });
  });

  it("builds initial values by type", () => {
    expect(buildInitialCustomFieldValue("checklist", ["A", "B"], "", "")).toEqual([]);
    expect(buildInitialCustomFieldValue("dropdown", ["A", "B"], "", "")).toBe("A");
  });
});