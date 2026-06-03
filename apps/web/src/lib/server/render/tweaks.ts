import type { PhotoMode } from "./types";
import { normalizePhotoMode } from "./themes";

export type RenderTweaks = {
  removePhoto: boolean;
  moveSkillsLeft: boolean;
};

export const DEFAULT_RENDER_TWEAKS: RenderTweaks = {
  removePhoto: false,
  moveSkillsLeft: false,
};

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
    removePhoto: readTruthyFlag(searchParams, "removePhoto"),
    moveSkillsLeft: readTruthyFlag(searchParams, "moveSkillsLeft"),
  };
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