import { describe, expect, it } from "vitest";

import {
  buildPrintTextScaleCss,
  parseRenderTweaks,
  resolveEffectivePhotoMode,
  shouldMoveSkillsLeft,
  templateHasLeftSidebar,
} from "./tweaks";
import { PRINT_TEXT_SCALE_DEFAULT } from "../../print-text-scale";

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
    expect(parseRenderTweaks(new URLSearchParams()).sidebarTextScale).toBe(
      PRINT_TEXT_SCALE_DEFAULT,
    );
    expect(
      parseRenderTweaks(new URLSearchParams("sidebarTextScale=95&contentTextScale=110"))
        .sidebarTextScale,
    ).toBe(95);
    expect(
      parseRenderTweaks(new URLSearchParams("sidebarTextScale=95&contentTextScale=110"))
        .contentTextScale,
    ).toBe(110);
    const scaled = parseRenderTweaks(
      new URLSearchParams("sidebarTextScale=87&contentTextScale=100"),
    );
    expect(scaled.sidebarTextScaleActive).toBe(true);
    expect(scaled.sidebarTextScale).toBe(87);
    expect(scaled.contentTextScaleActive).toBe(true);
    expect(scaled.contentTextScale).toBe(100);
  });

  it("builds zoom css for sidebar and content regions", () => {
    const tweaks = {
      removePhoto: false,
      moveSkillsLeft: false,
      sidebarTextScale: 90,
      sidebarTextScaleActive: true,
      contentTextScale: 105,
      contentTextScaleActive: true,
    };
    const css = buildPrintTextScaleCss("harvard-v1", tweaks);
    expect(css).toContain("aside.sidebar");
    expect(css).toContain("zoom: 0.9");
    expect(css).toContain("main.content");
    expect(css).toContain("zoom: 1.05");
  });

  it("only moves skills for sidebar templates when enabled", () => {
    const enabled = {
      removePhoto: false,
      moveSkillsLeft: true,
      sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
      sidebarTextScaleActive: false,
      contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
      contentTextScaleActive: false,
    };
    expect(shouldMoveSkillsLeft("harvard-v1", enabled)).toBe(true);
    expect(shouldMoveSkillsLeft("europass-v1", enabled)).toBe(false);
    expect(
      shouldMoveSkillsLeft("harvard-v1", {
        removePhoto: false,
        moveSkillsLeft: false,
        sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
        sidebarTextScaleActive: false,
        contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
        contentTextScaleActive: false,
      }),
    ).toBe(false);
  });

  it("forces photo mode off when removePhoto is enabled", () => {
    const baseTweaks = {
      moveSkillsLeft: false,
      sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
      sidebarTextScaleActive: false,
      contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
      contentTextScaleActive: false,
    };
    expect(
      resolveEffectivePhotoMode("on-circle", { ...baseTweaks, removePhoto: true }),
    ).toBe("off");
    expect(
      resolveEffectivePhotoMode("on-circle", { ...baseTweaks, removePhoto: false }),
    ).toBe("on-circle");
  });
});