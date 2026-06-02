import { applyTemplateVisibility, readTemplateVisibility } from "@/lib/cvTemplateVisibility";
import { readCv } from "./cvStore";
import { renderCambridge } from "./render/cambridge-v1";
import { renderEdinburgh } from "./render/edinburgh-v1";
import { renderEuropass } from "./render/europass-v1";
import { renderGeneric } from "./render/generic";
import { renderHarvard } from "./render/harvard-v1";
import { renderStanford } from "./render/stanford-v1";
import {
  bindSlots,
  readYamlFile,
  resolveMappingPath,
  resolvePhotoDataUrl,
  resolveRenderLanguage,
} from "./render/shared";
import { shouldMoveSkillsLeft } from "./render/tweaks";
import type { MappingFile, RenderInput, RenderResult, TemplateFile } from "./render/types";
import {
  resolveCambridgeTheme,
  resolveEdinburghTheme,
  resolveHarvardTheme,
  resolveStanfordTheme,
} from "./render/themes";
import { repoPath } from "./repoPaths";

export type { RenderInput, RenderResult } from "./render/types";

export async function buildCvTemplateHtml(
  input: RenderInput,
): Promise<RenderResult> {
  const cvRaw = await readCv(input.cvId);
  if (!cvRaw) {
    throw new Error(`CV '${input.cvId}' was not found.`);
  }
  const visibility = readTemplateVisibility(cvRaw as Record<string, unknown>);
  const cv = applyTemplateVisibility(cvRaw, visibility) as typeof cvRaw;

  const templatePath = repoPath("templates", input.templateId, "template.yaml");
  const mappingPath = await resolveMappingPath(input.cvId, input.templateId);
  const [template, mapping] = await Promise.all([
    readYamlFile<TemplateFile>(templatePath),
    readYamlFile<MappingFile>(mappingPath),
  ]);

  const lang = resolveRenderLanguage(cv, input.cvId);
  const labels = template.labels?.[lang] ?? template.labels?.en ?? {};

  const slots = bindSlots(cv, mapping);
  if (input.profilePhotoId && input.profilePhotoId.trim().length > 0) {
    const dataUrl = await resolvePhotoDataUrl(input.profilePhotoId.trim());
    if (dataUrl) {
      slots["profile.photo"] = dataUrl;
    }
  }
  const edinburghTheme = resolveEdinburghTheme(template, input.theme);
  const harvardTheme = resolveHarvardTheme(input.theme);
  const stanfordTheme = resolveStanfordTheme(input.theme);
  const cambridgeTheme = resolveCambridgeTheme(template, input.theme);
  const moveSkillsLeft = shouldMoveSkillsLeft(
    input.templateId,
    input.tweaks ?? { moveSkillsLeft: false },
  );
  const html =
    input.templateId === "edinburgh-v1"
      ? renderEdinburgh(
          cv,
          template,
          slots,
          labels,
          edinburghTheme,
          input.photoMode,
          moveSkillsLeft,
        )
      : input.templateId === "harvard-v1"
        ? renderHarvard(
            cv,
            template,
            slots,
            labels,
            harvardTheme,
            input.photoMode,
            moveSkillsLeft,
          )
        : input.templateId === "stanford-v1"
          ? renderStanford(
              cv,
              template,
              slots,
              labels,
              stanfordTheme,
              input.photoMode,
              moveSkillsLeft,
            )
          : input.templateId === "cambridge-v1"
            ? renderCambridge(cv, template, slots, labels, cambridgeTheme, moveSkillsLeft)
            : input.templateId === "europass-v1"
              ? renderEuropass(cv, template, slots, labels)
              : renderGeneric(cv, template, slots, labels);

  return {
    html,
    cvId: input.cvId,
    templateId: input.templateId,
  };
}