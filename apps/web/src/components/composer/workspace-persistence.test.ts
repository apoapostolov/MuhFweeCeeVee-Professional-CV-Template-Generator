import { describe, expect, it } from "vitest";

import {
  cvPairKeyForItem,
  resolveCvItemFromPersistedPrefs,
  resolveTemplateSelection,
} from "./workspace-persistence";

describe("workspace-persistence", () => {
  const items = [
    {
      id: "cv_en_1_acme",
      language: "en",
      iteration: "1",
      target: "acme",
      displayName: "Acme",
      displayVersion: "v1",
    },
    {
      id: "cv_bg_1_acme",
      language: "bg",
      iteration: "1",
      target: "acme",
      displayName: "Acme",
      displayVersion: "v1",
    },
    {
      id: "cv_en_2_other",
      language: "en",
      iteration: "2",
      target: "other",
      displayName: "Other",
      displayVersion: "v2",
    },
  ];

  it("builds stable pair keys", () => {
    expect(cvPairKeyForItem(items[0])).toBe("iter:1:acme:version:v1");
  });

  it("restores CV variant by pair key and language", () => {
    const selected = resolveCvItemFromPersistedPrefs(items, {
      cvId: "stale-id",
      cvPairKey: "iter:1:acme:version:v1",
      language: "bg",
      templateId: "",
      templateTheme: "default",
    });
    expect(selected?.id).toBe("cv_bg_1_acme");
  });

  it("falls back to the newest English CV when persisted pair has no English variant", () => {
    const selected = resolveCvItemFromPersistedPrefs(
      [
        ...items,
        {
          id: "cv_bg_1_legacy",
          language: "bg",
          iteration: "1",
          target: "legacy",
          displayName: "Legacy",
          displayVersion: "v1",
        },
      ],
      {
        cvId: "cv_bg_1_legacy",
        cvPairKey: "iter:1:legacy:version:v1",
        language: "bg",
        templateId: "",
        templateTheme: "default",
      },
    );
    expect(selected?.id).toBe("cv_en_1_acme");
  });

  it("restores template and theme when valid", () => {
    const { templateId, themeId } = resolveTemplateSelection(
      [{ id: "harvard-v1" }, { id: "edinburgh-v1" }],
      {
        cvId: "",
        cvPairKey: "",
        language: "",
        templateId: "harvard-v1",
        templateTheme: "blue",
      },
    );
    expect(templateId).toBe("harvard-v1");
    expect(themeId).toBe("blue");
  });
});
