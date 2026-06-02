export type RenderTweaks = {
  moveSkillsLeft: boolean;
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

export function parseRenderTweaks(
  searchParams: Pick<URLSearchParams, "get">,
): RenderTweaks {
  const raw = searchParams.get("moveSkillsLeft");
  return {
    moveSkillsLeft: raw === "1" || raw === "true",
  };
}

export function shouldMoveSkillsLeft(
  templateId: string,
  tweaks: RenderTweaks,
): boolean {
  return tweaks.moveSkillsLeft && templateHasLeftSidebar(templateId);
}