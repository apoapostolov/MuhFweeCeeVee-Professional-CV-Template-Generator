import type { PhotoMode } from "./types";
import { normalizePhotoMode } from "./themes";

import {
  clampPrintTextScale,
  PRINT_TEXT_SCALE_DEFAULT,
} from "../../print-text-scale";

export type IntelligentPaginationMode = "normal" | "aggressive";

export type RenderTweaks = {
  intelligentPagination: boolean;
  intelligentPaginationMode?: IntelligentPaginationMode;
  removePhoto: boolean;
  removePageCount: boolean;
  moveSkillsLeft: boolean;
  sidebarTextScale: number;
  sidebarTextScaleActive: boolean;
  contentTextScale: number;
  contentTextScaleActive: boolean;
};

export const DEFAULT_RENDER_TWEAKS: RenderTweaks = {
  intelligentPagination: false,
  intelligentPaginationMode: "normal",
  removePhoto: false,
  removePageCount: false,
  moveSkillsLeft: false,
  sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
  sidebarTextScaleActive: false,
  contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
  contentTextScaleActive: false,
};

export function parsePrintTextScaleParam(
  searchParams: Pick<URLSearchParams, "get">,
  key: "sidebarTextScale" | "contentTextScale",
): number {
  const raw = searchParams.get(key);
  if (!raw) {
    return PRINT_TEXT_SCALE_DEFAULT;
  }
  return clampPrintTextScale(Number(raw));
}

export const TEMPLATES_WITH_LEFT_SIDEBAR = new Set([
  "cambridge-v1",
  "edinburgh-v1",
  "harvard-v1",
  "stanford-v1",
]);

export function templateHasLeftSidebar(templateId: string): boolean {
  return TEMPLATES_WITH_LEFT_SIDEBAR.has(templateId);
}

function readTruthyFlag(
  searchParams: Pick<URLSearchParams, "get">,
  key: string,
): boolean {
  const raw = searchParams.get(key);
  return raw === "1" || raw === "true";
}

export function parseRenderTweaks(
  searchParams: Pick<URLSearchParams, "get">,
): RenderTweaks {
  return {
    intelligentPagination: searchParams.get("pagination") === "smart",
    intelligentPaginationMode:
      searchParams.get("paginationMode") === "aggressive" ? "aggressive" : "normal",
    removePhoto: readTruthyFlag(searchParams, "removePhoto"),
    removePageCount: readTruthyFlag(searchParams, "removePageCount"),
    moveSkillsLeft: readTruthyFlag(searchParams, "moveSkillsLeft"),
    sidebarTextScale: parsePrintTextScaleParam(searchParams, "sidebarTextScale"),
    sidebarTextScaleActive: searchParams.get("sidebarTextScale") !== null,
    contentTextScale: parsePrintTextScaleParam(searchParams, "contentTextScale"),
    contentTextScaleActive: searchParams.get("contentTextScale") !== null,
  };
}

export function buildPrintTextScaleCss(
  templateId: string,
  tweaks: RenderTweaks,
): string {
  const rules: string[] = [];
  if (tweaks.removePageCount) {
    rules.push(".page-footer { display: none !important; }");
  }
  const sidebarZoom = tweaks.sidebarTextScale / 100;
  const contentZoom = tweaks.contentTextScale / 100;

  if (tweaks.sidebarTextScaleActive && templateHasLeftSidebar(templateId)) {
    rules.push(
      `aside.sidebar, .sidebar, aside.left, .left { zoom: ${sidebarZoom}; }`,
    );
  }

  if (tweaks.contentTextScaleActive) {
    if (templateId === "europass-v1") {
      rules.push(`body > .page { zoom: ${contentZoom}; }`);
    } else if (templateHasLeftSidebar(templateId)) {
      rules.push(`main.content, .content, main.right, .right { zoom: ${contentZoom}; }`);
    } else {
      rules.push(`main.right, .right, .page { zoom: ${contentZoom}; }`);
    }
  }

  return rules.join("\n");
}

export function buildIntelligentPaginationCss(
  templateId: string,
  tweaks: RenderTweaks,
): string {
  if (!tweaks.intelligentPagination) {
    return "";
  }

  const sidebarSections = templateHasLeftSidebar(templateId)
    ? ".sidebar > section, .left > section"
    : ".page > section";
  const contentSections = templateHasLeftSidebar(templateId)
    ? ".content > section, .right > section"
    : ".page > section";
  const sidebarItems = templateHasLeftSidebar(templateId)
    ? ".sidebar li, .left li"
    : ".page li";
  const contentItems = templateHasLeftSidebar(templateId)
    ? ".content li, .right li"
    : ".page li";
  // Conservative order: keep headings with their content, keep short semantic
  // units together, and let large entries split rather than create blank pages.
  return `
${sidebarSections}, ${contentSections} {
  break-inside: auto;
  page-break-inside: auto;
}
${sidebarSections} > h2, ${sidebarSections} > h3,
${contentSections} > h2, ${contentSections} > h3,
.page > .block > .section-title {
  break-after: avoid;
  page-break-after: avoid;
}
${sidebarSections} p, ${sidebarSections} li,
${contentSections} p, ${contentSections} li {
  orphans: 5;
  widows: 5;
}
.dated-entry, .timeline-item, .reference-entry, .reference,
.entry, .ref, .subsection, .erow, .lang-block, .ref-item {
  break-inside: avoid;
  page-break-inside: avoid;
}
[data-mfcv-large-section] {
  break-inside: auto !important;
  page-break-inside: auto !important;
}
[data-mfcv-clean-break] {
  break-before: page !important;
  page-break-before: always !important;
}
.dated-entry ul, .timeline-item ul, .entry ul, .subsection ul,
.evalue ul, .content > section > ul, .right > section > ul {
  orphans: 5;
  widows: 5;
}
${sidebarItems}, ${contentItems} {
  orphans: 2;
  widows: 2;
}
`;
}

export function buildAdaptivePaginationCss(mode: IntelligentPaginationMode = "normal", options?: { extendPage?: boolean; tightenHeadings?: boolean }): string {
  const aggressive = mode === "aggressive";
  const letterSpacing = aggressive ? "-0.0125em" : "-0.01em";
  const wordSpacing = aggressive ? "-0.035em" : "-0.025em";
  const lineHeight = aggressive ? "1.22" : "1.3";
  const pageExtension = aggressive ? "2.5mm" : "0.75mm";
  return `
${options?.tightenHeadings ? `h2, h3, .section-title, hr, .name-divider {
  margin-block-start: 0 !important;
  margin-block-end: ${aggressive ? "0.35em" : "0.55em"} !important;
  padding-block-end: ${aggressive ? "0.2em" : "0.35em"} !important;
}
` : ""}
[data-mfcv-tighten-wrap] {
  letter-spacing: ${letterSpacing};
  word-spacing: ${wordSpacing};
}
[data-mfcv-tighten-line] {
  line-height: ${lineHeight} !important;
}
${options?.extendPage ? `@page {
  margin-top: calc(12mm - ${pageExtension});
  margin-bottom: calc(12mm - ${pageExtension});
}
.page {
  min-height: calc(297mm - 24mm + ${pageExtension} + ${pageExtension});
}
` : ""}
`;
}

export type AdaptivePaginationMeasurement = {
  marked: number;
  wraps: number;
  spills: number;
  largeSections?: number;
  cleanBreaks?: number;
};

export function measureAndMarkAdaptivePagination(): AdaptivePaginationMeasurement {
  const mode: IntelligentPaginationMode =
    document.documentElement.dataset.mfcvPaginationMode === "aggressive" ? "aggressive" : "normal";
  const maxRecoveredLines = mode === "aggressive" ? 3 : 1;
  const pageHeightFallback = (297 / 25.4) * 96;
  const elements = Array.from(document.querySelectorAll("p, li"));
  const getLines = (element: Element): Array<{ top: number; text: string }> => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const lines: Array<{ top: number; text: string }> = [];
    let node: Node | null = walker.nextNode();
    while (node) {
      const textNode = node as Text;
      for (let index = 0; index < textNode.data.length; index += 1) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + 1);
        const rect = range.getClientRects()[0];
        if (!rect || rect.width === 0 || rect.height === 0) continue;
        const previous = lines[lines.length - 1];
        if (!previous || Math.abs(previous.top - rect.top) > 1.5) {
          lines.push({ top: rect.top, text: textNode.data[index] });
        } else {
          previous.text += textNode.data[index];
        }
      }
      node = walker.nextNode();
    }
    return lines;
  };
  const getPageHeight = (): number => {
    const page = document.querySelector(".page");
    const minHeight = page ? Number.parseFloat(getComputedStyle(page).minHeight) : Number.NaN;
    return Number.isFinite(minHeight) && minHeight > 0 ? minHeight : pageHeightFallback;
  };
  const spillCount = (lines: Array<{ top: number; text: string }>, pageHeight: number): number => {
    if (lines.length < 2) return 0;
    const firstPage = Math.floor((lines[0].top + 1) / pageHeight);
    const lastPage = Math.floor((lines[lines.length - 1].top + 1) / pageHeight);
    if (lastPage <= firstPage) return 0;
    return lines.filter((line) => Math.floor((line.top + 1) / pageHeight) === lastPage).length;
  };
  const snapshot = (): { totalSpill: number; spillingElements: number } => {
    const pageHeight = getPageHeight();
    let totalSpill = 0;
    let spillingElements = 0;
    for (const element of elements) {
      if (!element.closest(".page, .content, .sidebar, .left, .right")) continue;
      const spill = spillCount(getLines(element), pageHeight);
      if (spill > 0) {
        totalSpill += spill;
        spillingElements += 1;
      }
    }
    return { totalSpill, spillingElements };
  };
  const appendTrialStyle = (css: string): HTMLStyleElement => {
    const style = document.createElement("style");
    style.dataset.mfcvPaginationTrial = "true";
    style.textContent = css;
    document.head.appendChild(style);
    return style;
  };
  const trialCss = (options?: { extendPage?: boolean; tightenHeadings?: boolean }): string => {
    const aggressive = mode === "aggressive";
    const letterSpacing = aggressive ? "-0.0125em" : "-0.01em";
    const wordSpacing = aggressive ? "-0.035em" : "-0.025em";
    const lineHeight = aggressive ? "1.22" : "1.3";
    const pageExtension = aggressive ? "2.5mm" : "0.75mm";
    return `${options?.tightenHeadings ? `h2, h3, .section-title, hr, .name-divider { margin-block-start: 0 !important; margin-block-end: ${aggressive ? "0.35em" : "0.55em"} !important; padding-block-end: ${aggressive ? "0.2em" : "0.35em"} !important; }` : ""}
[data-mfcv-tighten-wrap] { letter-spacing: ${letterSpacing}; word-spacing: ${wordSpacing}; }
[data-mfcv-tighten-line] { line-height: ${lineHeight} !important; }
${options?.extendPage ? `@page { margin-top: calc(12mm - ${pageExtension}); margin-bottom: calc(12mm - ${pageExtension}); } .page { min-height: calc(297mm - 24mm + ${pageExtension} + ${pageExtension}); }` : ""}`;
  };
  const sectionElements = Array.from(document.querySelectorAll(
    "section, article.dated-entry, .timeline-item, .reference-entry, .reference, .entry, .ref, .subsection, .erow, .lang-block, .ref-item",
  ));
  let largeSections = 0;
  for (const section of sectionElements) {
    const lines = getLines(section);
    if (lines.length >= 10) {
      section.setAttribute("data-mfcv-large-section", "true");
      largeSections += 1;
    }
  }
  let cleanBreaks = 0;
  const pageFragments = (lines: Array<{ top: number; text: string }>, pageHeight: number) => {
    if (lines.length === 0) return { first: 0, last: 0, split: false };
    const firstPage = Math.floor((lines[0].top + 1) / pageHeight);
    const lastPage = Math.floor((lines[lines.length - 1].top + 1) / pageHeight);
    return {
      first: lines.filter((line) => Math.floor((line.top + 1) / pageHeight) === firstPage).length,
      last: lines.filter((line) => Math.floor((line.top + 1) / pageHeight) === lastPage).length,
      split: lastPage > firstPage,
    };
  };
  for (const section of sectionElements) {
    if (!section.hasAttribute("data-mfcv-large-section")) continue;
    const lines = getLines(section);
    const fragments = pageFragments(lines, getPageHeight());
    const height = section.getBoundingClientRect().height;
    if (fragments.split && height <= getPageHeight() + 2 && (fragments.first < 5 || fragments.last < 5)) {
      section.setAttribute("data-mfcv-clean-break", "true");
      cleanBreaks += 1;
    }
  }

  const baseline = snapshot();
  if (mode === "normal") {
    let wraps = 0;
    let lineTightens = 0;
    for (const element of elements) {
      if (!element.closest(".page, .content, .sidebar, .left, .right")) continue;
      const lines = getLines(element);
      if (lines.length < 2) continue;
      const currentSpill = spillCount(lines, getPageHeight());
      const originalStyle = element.getAttribute("style");
      const styledElement = element as HTMLElement;
      styledElement.style.letterSpacing = "-0.01em";
      styledElement.style.wordSpacing = "-0.025em";
      const tightenedLines = getLines(element);
      if (originalStyle === null) element.removeAttribute("style");
      else element.setAttribute("style", originalStyle);
      if (tightenedLines.length < lines.length) {
        element.setAttribute("data-mfcv-tighten-wrap", "true");
        wraps += 1;
      }
      if (currentSpill === 1) {
        const lineStyle = element.getAttribute("style");
        styledElement.style.lineHeight = "1.3";
        const lineTightenedLines = getLines(element);
        if (lineStyle === null) element.removeAttribute("style");
        else element.setAttribute("style", lineStyle);
        if (spillCount(lineTightenedLines, getPageHeight()) < currentSpill) {
          element.setAttribute("data-mfcv-tighten-line", "true");
          lineTightens += 1;
        }
      }
    }
    const finalTrial = appendTrialStyle(trialCss());
    const finalSpills = snapshot().spillingElements;
    finalTrial.remove();
    return {
      marked: wraps + lineTightens + largeSections + cleanBreaks,
      wraps,
      spills: finalSpills,
      largeSections,
      cleanBreaks,
    };
  }
  if (baseline.totalSpill === 0) return { marked: 0, wraps: 0, spills: 0 };
  let tightenHeadings = false;
  let extendPage = false;
  const headingBefore = baseline.totalSpill;
  const headingTrial = appendTrialStyle(trialCss({ tightenHeadings: true }));
  if (snapshot().totalSpill < headingBefore) tightenHeadings = true;
  else headingTrial.remove();
  const extensionBefore = snapshot().totalSpill;
  const extensionTrial = appendTrialStyle(trialCss({ extendPage: true }));
  if (snapshot().totalSpill < extensionBefore) extendPage = true;
  else extensionTrial.remove();
  let wraps = 0;
  for (const element of elements) {
    if (!element.closest(".page, .content, .sidebar, .left, .right")) continue;
    const lines = getLines(element);
    const currentSpill = spillCount(lines, getPageHeight());
    if (lines.length < 2 || currentSpill === 0 || currentSpill > maxRecoveredLines) continue;
    const originalStyle = element.getAttribute("style");
    const styledElement = element as HTMLElement;
    styledElement.style.letterSpacing = mode === "aggressive" ? "-0.0125em" : "-0.01em";
    styledElement.style.wordSpacing = mode === "aggressive" ? "-0.035em" : "-0.025em";
    const tightenedLines = getLines(element);
    if (originalStyle === null) element.removeAttribute("style");
    else element.setAttribute("style", originalStyle);
    if (spillCount(tightenedLines, getPageHeight()) < currentSpill) {
      element.setAttribute("data-mfcv-tighten-wrap", "true");
      wraps += 1;
    }
  }
  const adaptiveTrial = appendTrialStyle(trialCss({ tightenHeadings, extendPage }));
  let lineTightens = 0;
  for (const element of elements) {
    if (!element.closest(".page, .content, .sidebar, .left, .right")) continue;
    const lines = getLines(element);
    const currentSpill = spillCount(lines, getPageHeight());
    if (lines.length < 2 || currentSpill === 0 || currentSpill > maxRecoveredLines) continue;
    const originalStyle = element.getAttribute("style");
    const styledElement = element as HTMLElement;
    styledElement.style.lineHeight = mode === "aggressive" ? "1.22" : "1.3";
    const tightenedLines = getLines(element);
    if (originalStyle === null) element.removeAttribute("style");
    else element.setAttribute("style", originalStyle);
    if (spillCount(tightenedLines, getPageHeight()) < currentSpill) {
      element.setAttribute("data-mfcv-tighten-line", "true");
      lineTightens += 1;
    }
  }
  adaptiveTrial.remove();
  const finalTrial = appendTrialStyle(trialCss({ tightenHeadings, extendPage }));
  const finalSnapshot = snapshot();
  finalTrial.remove();
  return {
    marked: wraps + lineTightens + largeSections + cleanBreaks + (tightenHeadings || extendPage ? 1 : 0),
    wraps,
    spills: finalSnapshot.spillingElements,
    largeSections,
    cleanBreaks,
  };
}

export function injectPrintTweakStyles(html: string, tweakCss: string): string {
  if (!tweakCss.trim()) {
    return html;
  }
  const styleTag = `<style id="mfcv-print-tweaks">\n${tweakCss}\n</style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleTag}\n</head>`);
  }
  return `${styleTag}\n${html}`;
}

export function resolveEffectivePhotoMode(
  photoModeInput: string | undefined,
  tweaks: RenderTweaks,
): PhotoMode | undefined {
  if (tweaks.removePhoto) {
    return "off";
  }
  if (photoModeInput === undefined) {
    return undefined;
  }
  return normalizePhotoMode(photoModeInput);
}

export function shouldMoveSkillsLeft(
  templateId: string,
  tweaks: RenderTweaks,
): boolean {
  return tweaks.moveSkillsLeft && templateHasLeftSidebar(templateId);
}