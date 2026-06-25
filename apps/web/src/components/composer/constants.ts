import type { EditorTabKey, FieldMeta, PhotoModeOption, TemplateThemeOption } from "./types";

export const EDINBURGH_THEME_OPTIONS: TemplateThemeOption[] = [
  { id: "default", label: "Default Purple", color: "#4E557B" },
  { id: "ocean_teal", label: "Ocean Teal", color: "#068799" },
  { id: "forest_green", label: "Forest Green", color: "#316834" },
  { id: "ruby_red", label: "Ruby Red", color: "#b0292a" },
  { id: "amber_gold", label: "Amber Gold", color: "#ffc209" },
];

export const HARVARD_THEME_OPTIONS: TemplateThemeOption[] = [
  { id: "default", label: "Default Slate", color: "#434a54" },
  { id: "blue", label: "Blue", color: "#416993" },
  { id: "pink", label: "Pink", color: "#cf6fae" },
  { id: "red", label: "Red", color: "#da4453" },
  { id: "amber_gold", label: "Amber Gold", color: "#f0b230" },
];

export const STANFORD_THEME_OPTIONS: TemplateThemeOption[] = [
  { id: "default", label: "Default Slate", color: "#434a54" },
  { id: "blue", label: "Blue", color: "#416993" },
  { id: "pink", label: "Pink", color: "#cf6fae" },
  { id: "red", label: "Red", color: "#da4453" },
  { id: "amber_gold", label: "Amber Gold", color: "#f0b230" },
];

export const CAMBRIDGE_THEME_OPTIONS: TemplateThemeOption[] = [
  { id: "default", label: "Default Blue", color: "#416993" },
  { id: "mustard_gold", label: "Mustard Gold", color: "#8a6e2f" },
  { id: "emerald_green", label: "Emerald Green", color: "#3d9a4e" },
  { id: "steel_blue", label: "Steel Blue", color: "#556f82" },
  { id: "rose_red", label: "Rose Red", color: "#bb3254" },
];

export function themeOptionsForTemplate(templateId: string): TemplateThemeOption[] {
  if (templateId === "edinburgh-v1") return EDINBURGH_THEME_OPTIONS;
  if (templateId === "harvard-v1") return HARVARD_THEME_OPTIONS;
  if (templateId === "stanford-v1") return STANFORD_THEME_OPTIONS;
  if (templateId === "cambridge-v1") return CAMBRIDGE_THEME_OPTIONS;
  return [];
}

export const PHOTO_MODE_OPTIONS: PhotoModeOption[] = [
  { id: "default", label: "Default" },
  { id: "on-circle", label: "On - Circle" },
  { id: "on-square", label: "On - Square" },
  { id: "on-original", label: "On - Original Ratio" },
  { id: "off", label: "Off" },
];

export const TEMPLATES_WITH_LEFT_SIDEBAR = new Set([
  "cambridge-v1",
  "edinburgh-v1",
  "harvard-v1",
  "stanford-v1",
]);

export type PrintTweakId = "removePhoto" | "moveSkillsLeft";

export const PRINT_TWEAK_OPTIONS: Array<{ id: PrintTweakId; label: string }> = [
  { id: "removePhoto", label: "Remove Photo" },
  { id: "moveSkillsLeft", label: "Skills Moved to Sidebar" },
];

export function templateSupportsPrintTweaks(templateId: string): boolean {
  return TEMPLATES_WITH_LEFT_SIDEBAR.has(templateId);
}

import {
  clampPrintTextScale,
  PRINT_TEXT_SCALE_DEFAULT,
} from "@/lib/print-text-scale";

export {
  clampPrintTextScale,
  PRINT_TEXT_SCALE_DEFAULT,
  PRINT_TEXT_SCALE_MAX,
  PRINT_TEXT_SCALE_MIN,
  PRINT_TEXT_SCALE_STEP,
} from "@/lib/print-text-scale";

export type PrintTweaksState = {
  removePhoto: boolean;
  moveSkillsLeft: boolean;
  sidebarTextScaleEnabled: boolean;
  sidebarTextScale: number;
  contentTextScaleEnabled: boolean;
  contentTextScale: number;
};

export function appendPrintTweakParams(
  params: URLSearchParams,
  tweaks: PrintTweaksState,
  templateId: string,
): void {
  if (tweaks.removePhoto) {
    params.set("removePhoto", "1");
  }
  if (tweaks.moveSkillsLeft && templateSupportsPrintTweaks(templateId)) {
    params.set("moveSkillsLeft", "1");
  }
  if (
    tweaks.sidebarTextScaleEnabled &&
    templateSupportsPrintTweaks(templateId)
  ) {
    params.set("sidebarTextScale", String(tweaks.sidebarTextScale));
  }
  if (tweaks.contentTextScaleEnabled) {
    params.set("contentTextScale", String(tweaks.contentTextScale));
  }
}

export const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "bg", label: "Bulgarian" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" },
  { code: "no", label: "Norwegian" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "pl", label: "Polish" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "el", label: "Greek" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
];

export const STORAGE_KEYS = {
  themeMode: "mfcv_theme_mode",
  selectedCvId: "mfcv_selected_cv_id",
  selectedCvPairKey: "mfcv_selected_cv_pair_key",
  selectedLanguage: "mfcv_selected_language",
  uiLanguage: "mfcv_ui_language",
  selectedTemplateId: "mfcv_selected_template_id",
  selectedTemplateTheme: "mfcv_selected_template_theme",
  selectedPhotoMode: "mfcv_selected_photo_mode",
  printTweakRemovePhoto: "mfcv_print_tweak_remove_photo",
  printTweakMoveSkillsLeft: "mfcv_print_tweak_move_skills_left",
  printTweakSidebarTextScale: "mfcv_print_tweak_sidebar_text_scale",
  printTweakSidebarTextScaleEnabled: "mfcv_print_tweak_sidebar_text_scale_enabled",
  printTweakContentTextScale: "mfcv_print_tweak_content_text_scale",
  printTweakContentTextScaleEnabled: "mfcv_print_tweak_content_text_scale_enabled",
  approvedPhotoId: "mfcv_photo_booth_approved_id",
  imageGenerationModel: "mfcv_image_generation_model",
  fieldRewriteProposals: "mfcv_field_rewrite_proposals_v1",
  editorAutoSave: "mfcv_editor_auto_save_v1",
  /** "1" = flat subsections (no indent); "0" = tabulated indent. Missing key defaults to flat. */
  editorFlatSubsections: "mfcv_editor_flat_subsections_v1",
  companyMetadataAutoSave: "mfcv_company_metadata_auto_save_v1",
  researchAutoSave: "mfcv_research_auto_save_v1",
  companyFieldResearchProposals: "mfcv_company_field_research_proposals_v1",
  selectedResearchCompanyId: "mfcv_selected_research_company_id",
  selectedResearchJobPositionId: "mfcv_selected_research_job_position_id",
  researchSidebarTab: "mfcv_research_sidebar_tab_v1",
  researchFieldProposals: "mfcv_research_field_proposals_v1",
} as const;
export const LEGACY_PHOTO_STORAGE_KEYS = [
  "mfcv_photo_booth_gallery_v1",
  "mfcv_photo_booth_items_v1",
  "mfcv_photo_booth_items",
] as const;

export const EDITOR_TABS: Array<{ key: EditorTabKey; label: string; path: string }> = [
  { key: "person", label: "Person", path: "person" },
  { key: "positioning", label: "Positioning", path: "positioning" },
  { key: "experience", label: "Experiences/Jobs", path: "experience" },
  { key: "education", label: "Education", path: "education" },
  { key: "skills", label: "Skills", path: "skills" },
  { key: "references", label: "References", path: "references" },
  { key: "optional", label: "Optional", path: "optional_sections" },
  { key: "metadata", label: "Metadata", path: "metadata" },
];

/** CV sections stored as a YAML array at the document root (not an object wrapper). */
export const ROOT_ARRAY_EDITOR_PATHS = new Set(
  EDITOR_TABS.filter((tab) => tab.key === "experience" || tab.key === "education" || tab.key === "references").map(
    (tab) => tab.path,
  ),
);

export function defaultSectionDraftForEditorPath(editorPath: string): unknown {
  return ROOT_ARRAY_EDITOR_PATHS.has(editorPath) ? [] : {};
}

export const FIELD_META: Record<string, FieldMeta> = {
  "person.full_name": {
    en: { label: "Full Name", description: "Official full name for CV header.", requirement: "Required" },
    bg: { label: "Пълно име", description: "Официално пълно име за заглавие на CV.", requirement: "Задължително" },
  },
  "person.birth_date": {
    en: { label: "Birth Date", description: "Use calendar selector in YYYY-MM-DD format." },
    bg: { label: "Дата на раждане", description: "Използвайте календар в формат YYYY-MM-DD." },
  },
  "person.nationality": {
    en: { label: "Nationality", description: "Citizenship or nationality wording." },
    bg: { label: "Националност", description: "Гражданство или националност." },
  },
  "person.residence": {
    en: { label: "Residence", description: "Current residence and postal details." },
    bg: { label: "Местоживеене", description: "Текущ адрес и пощенски детайли." },
  },
  "person.contact": {
    en: { label: "Contact", description: "Public contact channels used in CV." },
    bg: { label: "Контакти", description: "Публични канали за контакт в CV." },
  },
  positioning: {
    en: { label: "Positioning", description: "Headline and strategic profile text." },
    bg: { label: "Позициониране", description: "Заглавие и стратегически профил." },
  },
  "positioning.profile_summary": {
    en: { label: "Profile Summary", description: "Core 1-2 sentence professional summary." },
    bg: { label: "Профил", description: "Кратко професионално резюме в 1-2 изречения." },
  },
  experience: {
    en: { label: "Experiences/Jobs", description: "Professional roles with responsibilities and outputs." },
    bg: { label: "Опит/Позиции", description: "Професионални позиции с отговорности и резултати." },
  },
  "experience[].employment_type": {
    en: { label: "Employment Type", description: "Full-time or part-time employment." },
    bg: { label: "Тип заетост", description: "Пълен или непълен работен ден." },
  },
  "experience[].is_current": {
    en: { label: "Current Role", description: "Role is ongoing." },
    bg: { label: "Текуща позиция", description: "Позицията е активна в момента." },
  },
  "experience[].start_date": {
    en: { label: "Start Date", description: "Role start date." },
    bg: { label: "Начална дата", description: "Начална дата на позицията." },
  },
  "experience[].end_date": {
    en: { label: "End Date", description: "Role end date, leave empty if current." },
    bg: { label: "Крайна дата", description: "Крайна дата; оставете празно ако е текуща." },
  },
  "experience[].responsibilities": {
    en: { label: "Responsibilities", description: "Action-oriented bullet list." },
    bg: { label: "Отговорности", description: "Списък с действия и принос." },
  },
  education: {
    en: { label: "Education", description: "Degrees, institutions, and subjects." },
    bg: { label: "Образование", description: "Степени, институции и предмети." },
  },
  skills: {
    en: { label: "Skills", description: "Language, technical, social and core strengths." },
    bg: { label: "Умения", description: "Езици, технически, социални и ключови силни страни." },
  },
  references: {
    en: { label: "References", description: "Referees and contact details." },
    bg: { label: "Препоръки", description: "Лица за препоръка и контакти." },
  },
  optional_sections: {
    en: { label: "Optional Sections", description: "Projects, publications, interests, and extras." },
    bg: { label: "Допълнителни секции", description: "Проекти, публикации, интереси и допълнения." },
  },
  metadata: {
    en: { label: "Metadata", description: "Internal CV naming, versioning, and variant tags." },
    bg: { label: "Метаданни", description: "Вътрешно име, версия и варианти на CV." },
  },
};
