import type { PhotoMode } from "./types";
import { normalizePhotoMode } from "./themes";

import {
  clampPrintTextScale,
  PRINT_TEXT_SCALE_DEFAULT,
} from "../../print-text-scale";

export type RenderTweaks = {
  intelligentPagination: boolean;
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
.dated-entry, .timeline-item, .reference-entry, .reference,
.entry, .ref, .subsection, .erow, .lang-block, .ref-item {
  break-inside: avoid;
  page-break-inside: avoid;
}
.dated-entry ul, .timeline-item ul, .entry ul, .subsection ul,
.evalue ul, .content > section > ul, .right > section > ul {
  orphans: 3;
  widows: 3;
}
${sidebarItems}, ${contentItems} {
  orphans: 2;
  widows: 2;
}
`;
}

export function buildAdaptivePaginationCss(): string {
  return `
[data-mfcv-tighten-wrap] {
  letter-spacing: -0.01em;
  word-spacing: -0.025em;
}
[data-mfcv-tighten-line] {
  line-height: 1.3 !important;
}
`;
}

export type AdaptivePaginationMeasurement = {
  marked: number;
  wraps: number;
  spills: number;
};

export function measureAndMarkAdaptivePagination(): AdaptivePaginationMeasurement {
  const pageHeight = (297 / 25.4) * 96;
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

  let marked = 0;
  let wraps = 0;
  let spills = 0;
  for (const element of elements) {
    if (!element.closest(".page, .content, .sidebar, .left, .right")) continue;
    const lines = getLines(element);
    if (lines.length < 2) continue;

    const originalStyle = element.getAttribute("style");
    const styledElement = element as HTMLElement;
    styledElement.style.letterSpacing = "-0.01em";
    styledElement.style.wordSpacing = "-0.025em";
    const tightenedLines = getLines(element);
    if (originalStyle === null) element.removeAttribute("style");
    else element.setAttribute("style", originalStyle);

    const unwrapsLine = tightenedLines.length < lines.length;
    const lastPage = Math.floor((lines[lines.length - 1].top + 1) / pageHeight);
    const previousPage = Math.floor((lines[lines.length - 2].top + 1) / pageHeight);
    const spillsOneLine =
      lastPage > previousPage &&
      lines.filter((line) => Math.floor((line.top + 1) / pageHeight) === lastPage).length === 1;
    if (unwrapsLine) {
      element.setAttribute("data-mfcv-tighten-wrap", "true");
      wraps += 1;
    }
    if (spillsOneLine) {
      element.setAttribute("data-mfcv-tighten-line", "true");
      spills += 1;
    }
    if (unwrapsLine || spillsOneLine) marked += 1;
  }
  return { marked, wraps, spills };
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