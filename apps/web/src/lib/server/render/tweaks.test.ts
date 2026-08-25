import { describe, expect, it } from "vitest";

import {
  buildAdaptivePaginationCss,
  buildIntelligentPaginationCss,
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
    expect(parseRenderTweaks(new URLSearchParams("removePageCount=1")).removePageCount).toBe(true);
    expect(parseRenderTweaks(new URLSearchParams("pagination=smart")).intelligentPagination).toBe(true);
    expect(parseRenderTweaks(new URLSearchParams("pagination=smart")).intelligentPaginationMode).toBe("normal");
    expect(parseRenderTweaks(new URLSearchParams("pagination=smart&paginationMode=aggressive")).intelligentPaginationMode).toBe("aggressive");
    expect(parseRenderTweaks(new URLSearchParams("pagination=off")).intelligentPagination).toBe(false);
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
      intelligentPagination: false,
      removePhoto: false,
      removePageCount: true,
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
    expect(css).toContain(".page-footer { display: none !important; }");
  });

  it("builds conservative pagination css for both regions", () => {
    const css = buildIntelligentPaginationCss("harvard-v1", {
      intelligentPagination: true,
      removePhoto: false,
      removePageCount: false,
      moveSkillsLeft: false,
      sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
      sidebarTextScaleActive: false,
      contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
      contentTextScaleActive: false,
    });
    expect(css).toContain(".sidebar > section, .left > section");
    expect(css).toContain(".content > section, .right > section");
    expect(css).toContain("break-after: avoid");
    expect(css).not.toContain("letter-spacing");
    expect(css).not.toContain("word-spacing");
    expect(css).not.toContain("line-height: 1.3");
    expect(css).toContain("orphans: 5");
    expect(css).toContain("[data-mfcv-large-section]");
    expect(css).toContain("[data-mfcv-clean-break]");
    expect(buildAdaptivePaginationCss()).toContain("[data-mfcv-tighten-wrap]");
    expect(buildAdaptivePaginationCss()).toContain("[data-mfcv-tighten-line]");
    expect(buildAdaptivePaginationCss("normal")).toContain("letter-spacing: -0.01em");
    expect(buildAdaptivePaginationCss("aggressive", { extendPage: true, tightenHeadings: true })).toContain("letter-spacing: -0.0125em");
    expect(buildAdaptivePaginationCss("aggressive", { extendPage: true, tightenHeadings: true })).toContain("1.22");
    expect(buildIntelligentPaginationCss("harvard-v1", {
      intelligentPagination: false,
      removePhoto: false,
      removePageCount: false,
      moveSkillsLeft: false,
      sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
      sidebarTextScaleActive: false,
      contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
      contentTextScaleActive: false,
    })).toBe("");
  });

  it("only moves skills for sidebar templates when enabled", () => {
    const enabled = {
      intelligentPagination: false,
      removePhoto: false,
      removePageCount: false,
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
        intelligentPagination: false,
        removePhoto: false,
        removePageCount: false,
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
      intelligentPagination: false,
      removePageCount: false,
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