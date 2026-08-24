import { describe, expect, it } from "vitest";

import {
  mergeYamlVisibility,
  parseYamlWithVisibilityMarkers,
  stringifyYamlWithVisibility,
} from "./yaml-visibility";

describe("YAML visibility markers", () => {
  it("parses suffix markers and normalizes the field name", () => {
    const parsed = parseYamlWithVisibilityMarkers("person", "name!: Apo\nlanguage: en\n");

    expect(parsed.value).toEqual({ name: "Apo", language: "en" });
    expect(parsed.hiddenPaths).toEqual(["person.name"]);
    expect(parsed.paths).toEqual(["person.name", "person.language"]);
  });

  it("accepts the prefix marker shorthand", () => {
    const parsed = parseYamlWithVisibilityMarkers("skills", "!technical:\n  - SQL\n");

    expect(parsed.value).toEqual({ technical: ["SQL"] });
    expect(parsed.hiddenPaths).toEqual(["skills.technical"]);
  });

  it("round-trips hidden fields through YAML text", () => {
    const value = { technical: ["SQL"], social: ["Writing"] };
    const yaml = stringifyYamlWithVisibility(value, "skills", { "skills.technical": false });
    const parsed = parseYamlWithVisibilityMarkers("skills", yaml);

    expect(yaml).toContain("technical!:");
    expect(parsed.value).toEqual(value);
    expect(parsed.hiddenPaths).toEqual(["skills.technical"]);
  });

  it("removes stale visibility when a marker is removed", () => {
    const parsed = parseYamlWithVisibilityMarkers("skills", "technical:\n  - SQL\n");

    expect(mergeYamlVisibility({ "skills.technical": false }, parsed)).toEqual({});
  });
});
