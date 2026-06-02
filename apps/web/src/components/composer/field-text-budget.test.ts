import { describe, expect, it } from "vitest";

import {
  DEFAULT_TWO_LINE_MAIN_CHARS,
  classifyFieldLayout,
  getFieldTextBudget,
  limitToCharacters,
} from "./field-text-budget";

describe("field-text-budget", () => {
  it("classifies sidebar contact fields", () => {
    expect(classifyFieldLayout("person.contact.email")).toBe("sidebar");
  });

  it("classifies main experience bullets", () => {
    expect(classifyFieldLayout("experience[0].responsibilities[1]")).toBe("main");
  });

  it("uses two-line main default across templates", () => {
    const harvard = getFieldTextBudget("positioning.profile_summary", "harvard-v1");
    const europass = getFieldTextBudget("experience[0].responsibilities[0]", "europass-v1");
    expect(harvard.defaultCharLimit).toBe(DEFAULT_TWO_LINE_MAIN_CHARS);
    expect(europass.defaultCharLimit).toBe(DEFAULT_TWO_LINE_MAIN_CHARS);
  });

  it("converts line limits to character caps", () => {
    const budget = getFieldTextBudget("positioning.profile_summary", "harvard-v1");
    expect(limitToCharacters(budget, 2, "lines")).toBeGreaterThan(100);
  });
});