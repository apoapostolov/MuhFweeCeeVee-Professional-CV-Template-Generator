import { describe, expect, it } from "vitest";

import {
  parseRenderTweaks,
  shouldMoveSkillsLeft,
  templateHasLeftSidebar,
} from "./tweaks";

describe("render tweaks", () => {
  it("detects templates with a left sidebar", () => {
    expect(templateHasLeftSidebar("stanford-v1")).toBe(true);
    expect(templateHasLeftSidebar("europass-v1")).toBe(false);
  });

  it("parses moveSkillsLeft from query params", () => {
    expect(parseRenderTweaks(new URLSearchParams("moveSkillsLeft=1")).moveSkillsLeft).toBe(
      true,
    );
    expect(parseRenderTweaks(new URLSearchParams("moveSkillsLeft=true")).moveSkillsLeft).toBe(
      true,
    );
    expect(parseRenderTweaks(new URLSearchParams()).moveSkillsLeft).toBe(false);
  });

  it("only moves skills for sidebar templates when enabled", () => {
    const enabled = { moveSkillsLeft: true };
    expect(shouldMoveSkillsLeft("harvard-v1", enabled)).toBe(true);
    expect(shouldMoveSkillsLeft("europass-v1", enabled)).toBe(false);
    expect(shouldMoveSkillsLeft("harvard-v1", { moveSkillsLeft: false })).toBe(false);
  });
});