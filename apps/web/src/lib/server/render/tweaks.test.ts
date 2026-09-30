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
    expect(
      parseRenderTweaks(new URLSearchParams("moveSkillsLeft=1")).moveSkillsLeft,
    ).toBe(true);
    expect(
      parseRenderTweaks(new URLSearchParams("removePhoto=true")).removePhoto,
    ).toBe(true);
    expect(
      parseRenderTweaks(new URLSearchParams("removePageCount=1"))
        .removePageCount,
    ).toBe(true);
    expect(
      parseRenderTweaks(new URLSearchParams("pagination=smart"))
        .intelligentPagination,
    ).toBe(true);
    expect(
      parseRenderTweaks(new URLSearchParams("pagination=smart"))
        .intelligentPaginationMode,
    ).toBe("normal");
    expect(
      parseRenderTweaks(
        new URLSearchParams("pagination=smart&paginationMode=aggressive"),
      ).intelligentPaginationMode,
    ).toBe("aggressive");
    expect(
      parseRenderTweaks(new URLSearchParams("pagination=off"))
        .intelligentPagination,
    ).toBe(false);
    expect(parseRenderTweaks(new URLSearchParams()).moveSkillsLeft).toBe(false);
    expect(parseRenderTweaks(new URLSearchParams()).removePhoto).toBe(false);
    expect(parseRenderTweaks(new URLSearchParams()).sidebarTextScale).toBe(
      PRINT_TEXT_SCALE_DEFAULT,
    );
    expect(
      parseRenderTweaks(
        new URLSearchParams("sidebarTextScale=95&contentTextScale=110"),
      ).sidebarTextScale,
    ).toBe(95);
    expect(
      parseRenderTweaks(
        new URLSearchParams("sidebarTextScale=95&contentTextScale=110"),
      ).contentTextScale,
    ).toBe(110);
    const scaled = parseRenderTweaks(
      new URLSearchParams("sidebarTextScale=87&contentTextScale=100"),
    );
    expect(scaled.sidebarTextScaleActive).toBe(true);
    expect(scaled.sidebarTextScale).toBe(87);
    expect(scaled.contentTextScaleActive).toBe(true);
    expect(scaled.contentTextScale).toBe(100);
  });

  it("hides the page footer and leaves type scaling to applyTextScale", () => {
    const tweaks = {
      intelligentPagination: false,
      removePhoto: false,
      removePageCount: true,
      moveSkillsLeft: false,
      noPageMargins: false,
      sidebarTextScale: 90,
      sidebarTextScaleActive: true,
      contentTextScale: 105,
      contentTextScaleActive: true,
    } as const;
    const css = buildPrintTextScaleCss("harvard-v1", tweaks);
    // The type-size part of the tweak rewrites the template's own font sizes, see
    // textScale.test.ts. `zoom` is not implemented by the renderer and
    // `transform: scale` would shrink the whole column, so neither is emitted.
    expect(css).toContain(".page-footer { display: none !important; }");
    expect(css).not.toMatch(/zoom\s*:/);
    expect(css).not.toMatch(/transform\s*:\s*scale/);
  });

  it("builds conservative pagination css for both regions", () => {
    const css = buildIntelligentPaginationCss("harvard-v1", {
      intelligentPagination: true,
      removePhoto: false,
      removePageCount: false,
      moveSkillsLeft: false,
      noPageMargins: false,
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
    // The native renderer ignores the break declarations, so the tweak also
    // carries the padding that actually moves a heading to the next page.
    expect(css).toContain("padding-top: 1em");
    // No rule may target a marker no template emits.
    expect(css).not.toContain("[data-mfcv-large-section]");
    expect(css).not.toContain("[data-mfcv-clean-break]");
    // The adaptive CSS no longer targets the [data-mfcv-tighten-*] attributes.
    // No template emits them, so those rules could never match. It now leans on
    // top padding, which is the mechanism the renderer honours.
    expect(buildAdaptivePaginationCss()).toBe("");
    const aggressive = buildAdaptivePaginationCss("aggressive", {
      tightenHeadings: true,
    });
    expect(aggressive).toContain("padding-top: 1.5em");
    expect(aggressive).not.toContain("line-height: 1.22");
    // Neither the dead markers nor @page may come back.
    expect(aggressive).not.toContain("[data-mfcv-tighten-wrap]");
    expect(aggressive).not.toContain("[data-mfcv-tighten-line]");
    expect(aggressive).not.toContain("@page");
    expect(
      buildIntelligentPaginationCss("harvard-v1", {
        intelligentPagination: false,
        removePhoto: false,
        removePageCount: false,
        moveSkillsLeft: false,
        noPageMargins: false,
        sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
        sidebarTextScaleActive: false,
        contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
        contentTextScaleActive: false,
      }),
    ).toBe("");
  });

  it("only moves skills for sidebar templates when enabled", () => {
    const enabled = {
      intelligentPagination: false,
      removePhoto: false,
      removePageCount: false,
      moveSkillsLeft: true,
      noPageMargins: false,
      sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
      sidebarTextScaleActive: false,
      contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
      contentTextScaleActive: false,
    } as const;
    expect(shouldMoveSkillsLeft("harvard-v1", enabled)).toBe(true);
    expect(shouldMoveSkillsLeft("europass-v1", enabled)).toBe(false);
    expect(
      shouldMoveSkillsLeft("harvard-v1", {
        intelligentPagination: false,
        removePhoto: false,
        removePageCount: false,
        moveSkillsLeft: false,
        noPageMargins: false,
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
      noPageMargins: false,
      sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
      sidebarTextScaleActive: false,
      contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
      contentTextScaleActive: false,
    } as const;
    expect(
      resolveEffectivePhotoMode("on-circle", {
        ...baseTweaks,
        removePhoto: true,
      }),
    ).toBe("off");
    expect(
      resolveEffectivePhotoMode("on-circle", {
        ...baseTweaks,
        removePhoto: false,
      }),
    ).toBe("on-circle");
  });
});
