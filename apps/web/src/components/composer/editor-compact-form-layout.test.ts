import { describe, expect, it } from "vitest";

import {
  compactLeadingGroupIndentStyle,
  compactSectionHeaderIndentPx,
  compactSectionIndentStyle,
  compactSubsectionVisualDepth,
} from "./editor-compact-form-layout";

describe("editor-compact-form-layout", () => {
  it("indents only array-root editor sections", () => {
    expect(compactSubsectionVisualDepth("experience", 1)).toBe(0);
    expect(compactSubsectionVisualDepth("experience", 2)).toBe(1);
    expect(compactSubsectionVisualDepth("experience", 3)).toBe(2);
    expect(compactSubsectionVisualDepth("education", 2)).toBe(2);
    expect(compactSubsectionVisualDepth("person", 2)).toBe(0);
    expect(compactSubsectionVisualDepth("positioning", 1)).toBe(0);
    expect(compactSubsectionVisualDepth("optional_sections", 1)).toBe(0);
    expect(compactSubsectionVisualDepth("metadata", 1)).toBe(0);
  });

  it("applies no indent px for flat sections", () => {
    expect(compactSectionHeaderIndentPx(true, "person", 2)).toBe(0);
    expect(compactSectionHeaderIndentPx(true, "experience", 1)).toBe(0);
    expect(compactSectionHeaderIndentPx(true, "experience", 2)).toBe(30);
    expect(compactSectionHeaderIndentPx(true, "education", 2)).toBe(60);
  });

  it("applies no indent when subsection indent is disabled", () => {
    expect(compactSectionHeaderIndentPx(true, "education", 2, false)).toBe(0);
    expect(compactLeadingGroupIndentStyle(true, "experience", 2, false)).toBeUndefined();
  });

  it("does not pad compact subsection shells (inputs share one grid)", () => {
    expect(compactSectionIndentStyle(true, "experience", 2)).toBeUndefined();
    expect(compactLeadingGroupIndentStyle(true, "experience", 2)).toEqual({ paddingLeft: 30 });
  });
});