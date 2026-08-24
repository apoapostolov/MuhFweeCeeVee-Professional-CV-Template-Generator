import { describe, expect, it } from "vitest";

import {
  defaultArrayEntry,
  defaultWrapCharsPerLine,
  editorFormWrapCharsPerLine,
  estimateTextareaRows,
  shouldUseTextarea,
} from "./form-path-utils";

describe("review score array defaults", () => {
  it("creates editable provider and score rows", () => {
    expect(defaultArrayEntry("metadata.ats_scores", null)).toEqual({ label: "", score: "" });
    expect(defaultArrayEntry("metadata.detector_scores", null)).toEqual({
      label: "",
      score: "",
      section_scores: [],
    });
    expect(defaultArrayEntry("metadata.detector_scores[0].section_scores", null)).toEqual({
      label: "",
      score: "",
    });
    expect(defaultArrayEntry("experience[0].publication_links", null)).toEqual({
      url: "",
      title: "",
    });
    expect(defaultArrayEntry("experience[0].quantified_results", null)).toEqual({
      metric: "",
      value: "",
      note: "",
    });
  });
});

describe("shouldUseTextarea", () => {
  it("keeps short EN copy on a single-line input when under wrap width", () => {
    const text = "a".repeat(50);
    expect(shouldUseTextarea(text, "en")).toBe(false);
  });

  it("uses textarea for EN copy that exceeds default wrap width", () => {
    const text = "a".repeat(defaultWrapCharsPerLine("en") + 1);
    expect(shouldUseTextarea(text, "en")).toBe(true);
  });

  it("uses textarea for BG above the lower wrap threshold", () => {
    const text = "a".repeat(defaultWrapCharsPerLine("bg") + 1);
    expect(shouldUseTextarea(text, "bg")).toBe(true);
  });

  it("respects an explicit chars-per-line budget", () => {
    expect(shouldUseTextarea("abcdefghij", "en", 8)).toBe(true);
    expect(shouldUseTextarea("abcdefg", "en", 8)).toBe(false);
  });

  it("uses textarea when there are multiple non-empty lines", () => {
    expect(shouldUseTextarea("Line one\nLine two", "en")).toBe(true);
  });

  it("ignores a trailing newline for single-line content", () => {
    expect(shouldUseTextarea("Short summary.\n", "en")).toBe(false);
  });
});

describe("estimateTextareaRows", () => {
  it("grows with wrapped line count", () => {
    const wrapAt = 10;
    const rows = estimateTextareaRows("12345678901", wrapAt);
    expect(rows).toBe(2);
  });

  it("fits long EN summary copy in about two rows at form width", () => {
    const sample =
      "Architecture and implementation of end-to-end technical solutions for collecting and tracking behavioral and business analytics from mobile games, including introducing server-side technologies for modern titles.";
    const rows = estimateTextareaRows(sample, editorFormWrapCharsPerLine("en"));
    expect(rows).toBeLessThanOrEqual(2);
  });
});
