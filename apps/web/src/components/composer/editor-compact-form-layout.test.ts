import { describe, expect, it } from "vitest";

import {
  compactSectionHeaderIndentPx,
  compactSubsectionVisualDepth,
} from "./editor-compact-form-layout";

describe("editor-compact-form-layout", () => {
  it("indents only array-root editor sections", () => {
    expect(compactSubsectionVisualDepth("experience", 2)).toBe(2);
    expect(compactSubsectionVisualDepth("person", 2)).toBe(0);
    expect(compactSubsectionVisualDepth("positioning", 1)).toBe(0);
    expect(compactSubsectionVisualDepth("optional_sections", 1)).toBe(0);
    expect(compactSubsectionVisualDepth("metadata", 1)).toBe(0);
  });

  it("applies no indent px for flat sections", () => {
    expect(compactSectionHeaderIndentPx(true, "person", 2)).toBe(0);
    expect(compactSectionHeaderIndentPx(true, "experience", 2)).toBe(20);
  });
});