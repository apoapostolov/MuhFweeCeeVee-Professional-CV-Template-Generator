import { describe, expect, it } from "vitest";

import { DEFAULT_UI_LANGUAGE, normalizeUiLanguage, uiIsBg } from "./ui-language";

describe("ui-language", () => {
  it("defaults to English", () => {
    expect(DEFAULT_UI_LANGUAGE).toBe("en");
    expect(normalizeUiLanguage("")).toBe("en");
    expect(normalizeUiLanguage("xx")).toBe("en");
    expect(uiIsBg("bg")).toBe(true);
    expect(uiIsBg("en")).toBe(false);
  });

  it("normalizes supported codes", () => {
    expect(normalizeUiLanguage("en")).toBe("en");
    expect(normalizeUiLanguage("BG")).toBe("bg");
  });
});