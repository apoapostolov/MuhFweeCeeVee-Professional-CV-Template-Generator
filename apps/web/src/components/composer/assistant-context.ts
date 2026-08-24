import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
  type AssistantRecordReference,
} from "@muhfweeceevee/schemas";

import type { ComposerController } from "./useComposerController";

function reference(
  type: string,
  id: string | undefined,
  label?: string,
  revision?: string,
): AssistantRecordReference | null {
  const normalizedId = id?.trim() ?? "";
  if (!normalizedId) return null;
  return {
    type,
    id: normalizedId,
    label: label?.trim() || undefined,
    revision: revision?.trim() || undefined,
  };
}

export function buildAssistantComposerContext(
  controller: ComposerController,
  capturedAt = new Date().toISOString(),
  additionalRecords: AssistantRecordReference[] = [],
): AssistantContextEnvelope {
  const selectedCv = controller.cvItems.find(
    (item) => item.id === controller.selectedCvId,
  );
  const selectedTemplate = controller.templateItems.find(
    (item) => item.id === controller.selectedTemplateId,
  );
  const records = [
    reference(
      "cv",
      controller.selectedCvId,
      selectedCv?.displayName,
      selectedCv?.git?.lastCommitAt ?? undefined,
    ),
    reference(
      "template",
      controller.selectedTemplateId,
      selectedTemplate?.name,
      selectedTemplate?.version,
    ),
    reference(
      "company",
      controller.selectedResearchCompanyId,
      controller.selectedResearchCompany?.name,
    ),
    reference(
      "job",
      controller.selectedResearchJobPositionId,
      controller.selectedResearchJob?.title,
    ),
    reference("photo", controller.approvedPhotoId, "Approved profile photo"),
    ...additionalRecords,
  ].filter((item): item is AssistantRecordReference => Boolean(item));

  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    activePanel: controller.activePanel,
    capturedAt,
    records,
    hasUnsavedChanges:
      controller.editorHasUnsavedChanges ||
      controller.companyMetadataHasUnsavedChanges ||
      controller.researchAutosaveActivity === "pending" ||
      controller.researchAutosaveActivity === "saving",
  };
}

export function assistantContextLabel(context: AssistantContextEnvelope): string {
  const cv = context.records.find((record) => record.type === "cv");
  const template = context.records.find((record) => record.type === "template");
  const templateLabel = template ? `${template.label || template.id} Template` : "";
  return [
    cv?.label || cv?.id || "",
    templateLabel,
    context.hasUnsavedChanges ? "unsaved draft" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
