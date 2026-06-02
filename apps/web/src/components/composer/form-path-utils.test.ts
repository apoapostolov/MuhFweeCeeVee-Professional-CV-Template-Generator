import { describe, expect, it } from "vitest";

import { shouldUseTextarea } from "./form-path-utils";

describe("shouldUseTextarea", () => {
  it("keeps short EN copy on a single-line input", () => {
    const text = "a".repeat(150);
    expect(shouldUseTextarea(text, "en")).toBe(false);
  });

  it("uses textarea for long EN copy on one line", () => {
    const text = "a".repeat(241);
    expect(shouldUseTextarea(text, "en")).toBe(true);
  });

  it("uses textarea for BG above the lower threshold", () => {
    const text = "a".repeat(121);
    expect(shouldUseTextarea(text, "bg")).toBe(true);
  });

  it("uses textarea when there are multiple non-empty lines", () => {
    expect(shouldUseTextarea("Line one\nLine two", "en")).toBe(true);
  });

  it("ignores a trailing newline for single-line content", () => {
    expect(shouldUseTextarea("Short summary.\n", "en")).toBe(false);
  });
});