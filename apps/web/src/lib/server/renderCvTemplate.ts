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
  resolveTemplateLabels,
} from "./render/shared";
import {
  buildIntelligentPaginationCss,
  buildPrintTextScaleCss,
  DEFAULT_RENDER_TWEAKS,
  injectPrintTweakStyles,
  resolveEffectivePhotoMode,
  shouldMoveSkillsLeft,
} from "./render/tweaks";
import type { MappingFile, PdfMetadata, RenderInput, RenderResult, TemplateFile } from "./render/types";
import {
  resolveCambridgeTheme,
  resolveEdinburghTheme,
  resolveHarvardTheme,
  resolveStanfordTheme,
} from "./render/themes";
import { repoPath } from "./repoPaths";

export type { PdfMetadata, RenderInput, RenderResult } from "./render/types";

function buildPdfMetadata(cv: unknown): PdfMetadata {
  const person = cv && typeof cv === "object" && !Array.isArray(cv)
    ? (cv as Record<string, unknown>).person
    : undefined;
  const fullName = person && typeof person === "object" && !Array.isArray(person)
    ? String((person as Record<string, unknown>).full_name ?? "").trim()
    : "";
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const shortName = nameParts.length >= 2
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
    : fullName;
  const displayName = shortName || "MuhFweeCeeVee";
  return {
    author: displayName,
    title: `${displayName} CV`,
    subject: "Curriculum Vitae",
  };
}

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
  const labels = resolveTemplateLabels(template, cv, lang);

  const tweaks = input.tweaks ?? DEFAULT_RENDER_TWEAKS;
  const photoMode = resolveEffectivePhotoMode(input.photoMode, tweaks);

  const slots = bindSlots(cv, mapping);
  if (
    !tweaks.removePhoto &&
    input.profilePhotoId &&
    input.profilePhotoId.trim().length > 0
  ) {
    const dataUrl = await resolvePhotoDataUrl(input.profilePhotoId.trim());
    if (dataUrl) {
      slots["profile.photo"] = dataUrl;
    }
  }
  const edinburghTheme = resolveEdinburghTheme(template, input.theme);
  const harvardTheme = resolveHarvardTheme(input.theme);
  const stanfordTheme = resolveStanfordTheme(input.theme);
  const cambridgeTheme = resolveCambridgeTheme(template, input.theme);
  const moveSkillsLeft = shouldMoveSkillsLeft(input.templateId, tweaks);
  const html =
    input.templateId === "edinburgh-v1"
      ? renderEdinburgh(
          cv,
          template,
          slots,
          labels,
          edinburghTheme,
          photoMode,
          moveSkillsLeft,
        )
      : input.templateId === "harvard-v1"
        ? renderHarvard(
            cv,
            template,
            slots,
            labels,
            harvardTheme,
            photoMode,
            moveSkillsLeft,
          )
        : input.templateId === "stanford-v1"
          ? renderStanford(
              cv,
              template,
              slots,
              labels,
              stanfordTheme,
              photoMode,
              moveSkillsLeft,
            )
          : input.templateId === "cambridge-v1"
            ? renderCambridge(cv, template, slots, labels, cambridgeTheme, moveSkillsLeft)
            : input.templateId === "europass-v1"
              ? renderEuropass(cv, template, slots, labels)
              : renderGeneric(cv, template, slots, labels);

  const tweakCss = [
    buildIntelligentPaginationCss(input.templateId, tweaks),
    buildPrintTextScaleCss(input.templateId, tweaks),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    html: injectPrintTweakStyles(html, tweakCss),
    cvId: input.cvId,
    templateId: input.templateId,
    metadata: buildPdfMetadata(cv),
  };
}