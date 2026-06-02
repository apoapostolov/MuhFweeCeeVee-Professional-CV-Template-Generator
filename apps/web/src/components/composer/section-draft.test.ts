import { describe, expect, it } from "vitest";
import { stringify as stringifyYaml } from "yaml";

import {
  coerceSectionDraftForEditorPath,
  resolveSectionDraftForForm,
  sectionDraftNeedsSync,
} from "./section-draft";

describe("coerceSectionDraftForEditorPath", () => {
  it("keeps root arrays for experience", () => {
    const items = [{ employer: "Acme" }, { employer: "Beta" }];
    expect(coerceSectionDraftForEditorPath("experience", items)).toEqual(items);
  });

  it("unwraps object wrappers with items key", () => {
    const items = [{ school: "MIT" }];
    expect(coerceSectionDraftForEditorPath("education", { items })).toEqual(items);
  });

  it("returns empty array for invalid experience shapes", () => {
    expect(coerceSectionDraftForEditorPath("experience", {})).toEqual([]);
    expect(coerceSectionDraftForEditorPath("experience", null)).toEqual([]);
  });
});

describe("resolveSectionDraftForForm", () => {
  it("uses YAML when sectionDraft is an empty array but yaml has entries", () => {
    const items = [{ employer: "Gameloft", role: "Engineer" }];
    const yaml = stringifyYaml(items);
    expect(resolveSectionDraftForForm("experience", [], yaml)).toEqual(items);
  });

  it("prefers non-empty sectionDraft over yaml", () => {
    const draft = [{ employer: "A" }];
    const yaml = stringifyYaml([{ employer: "B" }]);
    expect(resolveSectionDraftForForm("experience", draft, yaml)).toEqual(draft);
  });

  it("parses object sections from yaml when sectionDraft is null", () => {
    const person = { full_name: "Jane Doe", contact: { email: "j@example.com" } };
    const yaml = stringifyYaml(person);
    expect(resolveSectionDraftForForm("person", null, yaml)).toEqual(person);
  });
});

describe("sectionDraftNeedsSync", () => {
  it("detects empty sectionDraft with populated yaml resolution", () => {
    const items = [{ employer: "Acme" }];
    const yaml = stringifyYaml(items);
    const resolved = resolveSectionDraftForForm("experience", [], yaml);
    expect(sectionDraftNeedsSync("experience", [], resolved)).toBe(true);
    expect(sectionDraftNeedsSync("experience", items, resolved)).toBe(false);
  });
});