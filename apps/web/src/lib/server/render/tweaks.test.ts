import { describe, expect, it } from "vitest";

import {
  parseRenderTweaks,
  resolveEffectivePhotoMode,
  shouldMoveSkillsLeft,
  templateHasLeftSidebar,
} from "./tweaks";

describe("render tweaks", () => {
  it("detects templates with a left sidebar", () => {
    expect(templateHasLeftSidebar("stanford-v1")).toBe(true);
    expect(templateHasLeftSidebar("europass-v1")).toBe(false);
  });

  it("parses tweak flags from query params", () => {
    expect(parseRenderTweaks(new URLSearchParams("moveSkillsLeft=1")).moveSkillsLeft).toBe(
      true,
    );
    expect(parseRenderTweaks(new URLSearchParams("removePhoto=true")).removePhoto).toBe(true);
    expect(parseRenderTweaks(new URLSearchParams()).moveSkillsLeft).toBe(false);
    expect(parseRenderTweaks(new URLSearchParams()).removePhoto).toBe(false);
  });

  it("only moves skills for sidebar templates when enabled", () => {
    const enabled = { removePhoto: false, moveSkillsLeft: true };
    expect(shouldMoveSkillsLeft("harvard-v1", enabled)).toBe(true);
    expect(shouldMoveSkillsLeft("europass-v1", enabled)).toBe(false);
    expect(
      shouldMoveSkillsLeft("harvard-v1", { removePhoto: false, moveSkillsLeft: false }),
    ).toBe(false);
  });

  it("forces photo mode off when removePhoto is enabled", () => {
    expect(
      resolveEffectivePhotoMode("on-circle", { removePhoto: true, moveSkillsLeft: false }),
    ).toBe("off");
    expect(
      resolveEffectivePhotoMode("on-circle", { removePhoto: false, moveSkillsLeft: false }),
    ).toBe("on-circle");
  });
});