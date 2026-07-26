export type CvListResponse = {
  items: Array<{
    id: string;
    language: string | null;
    iteration: string | null;
    target: string | null;
    displayName: string;
    displayVersion: string;
    git?: {
      lastCommitAt: string | null;
    };
  }>;
};

export type TemplateListResponse = {
  items: Array<{
    id: string;
    name: string;
    status: string;
    version: string;
  }>;
};

export type OpenRouterSettingsResponse = {
  hasApiKey: boolean;
  apiKeyMasked: string;
  model: string;
  researchModel: string;
  imageModel: string;
  baseUrl: string;
  updatedAt: string;
  models?: Array<{
    id: string;
    name: string;
    contextLength: number | null;
    promptPricePer1M: number | null;
    completionPricePer1M: number | null;
    mixedPricePer1M: number | null;
    isFree: boolean;
    supportsImageGeneration: boolean;
  }>;
  modelsFetchedAt?: string;
  modelsFromCache?: boolean;
};

export type OpenRouterCreditResponse = {
  available: boolean;
  remainingUsd: number | null;
  usageUsd: number | null;
  limitUsd: number | null;
  isFreeTier: boolean;
  label: string;
  checkedAt: string;
};

export type SyncChangeItem = {
  path: string;
  direction: "BG > EN" | "BG < EN";
  sourceLanguage: string;
  targetLanguage: string;
  sourceValue: unknown;
  previousTargetValue: unknown;
  nextTargetValue: unknown;
};

export type SyncResponse = {
  error?: string;
  changed?: boolean;
  message?: string;
  sourceCvId?: string;
  targetCvId?: string;
  direction?: string;
  changes?: SyncChangeItem[];
  changedFields?: number;
};

export type SyncStatusResponse = {
  ok?: boolean;
  error?: string;
  iteration?: string;
  target?: string;
  currentLanguage?: string;
  languages?: Array<{
    language: string;
    cvId: string;
    lastEditedAt: string;
  }>;
};

export type ActivePanel =
  | "workspace"
  | "photo_booth"
  | "research"
  | "editor"
  | "templates"
  | "cover_letters"
  | "applications"
  | "settings";
export type EditorViewMode = "form" | "yaml";
export type ThemeMode = "light" | "dark" | "system";
export type CompanySource = "example" | "personal";

export type EditorTabKey =
  | "person"
  | "positioning"
  | "experience"
  | "education"
  | "skills"
  | "references"
  | "optional"
  | "metadata";

export type PathSegment = string | number;

export type CvPair = {
  key: string;
  displayName: string;
  displayVersion: string;
  variants: Record<string, CvListResponse["items"][number]>;
  preferredCvId: string;
  latestTs: number;
};

export type CompanyListResponse = {
  ok?: boolean;
  items?: Array<{
    id: string;
    name: string;
    priority?: number | null;
    source?: CompanySource | null;
  }>;
};

export type CompanyMetadataDocumentResponse = {
  ok?: boolean;
  error?: string;
  source?: CompanySource;
  document?: unknown;
};

export type FieldCopy = {
  label: string;
  description: string;
  requirement?: string;
};

export type FieldMeta = {
  en: FieldCopy;
  bg: FieldCopy;
};

export type SectionFieldFeedback = {
  field?: string;
  score?: number;
  analysis?: string;
  proposal?: string;
};

export type SectionAnalysis = {
  scope?: "section";
  section?: string;
  score?: number;
  summary?: string;
  field_feedback?: SectionFieldFeedback[];
  top_actions?: string[];
};

export type FullSectionScore = {
  section?: string;
  score?: number;
  strengths?: string[];
  issues?: string[];
  improvements?: string[];
};

export type FullAnalysis = {
  scope?: "full";
  overall_score?: number;
  summary?: string;
  section_scores?: FullSectionScore[];
  top_actions?: string[];
};

export type TemplateThemeOption = {
  id: string;
  label: string;
  color: string;
};

export type PhotoModeOption = {
  id: "default" | "on-circle" | "on-square" | "on-original" | "off";
  label: string;
};

export type PhotoBoothAnalysis = {
  score: number;
  verdict: "excellent" | "good" | "usable" | "weak";
  notes: string[];
  clothingProposals?: string[];
  analyzedAt: string;
  model?: string;
};

export type PhotoComparisonAnalysis = {
  criteria: Array<{
    name: string;
    summary: string;
  }>;
  ranked: Array<{
    name: string;
    score: number;
    verdict: "excellent" | "good" | "usable" | "weak";
    strengths: string[];
    risks: string[];
    improvements: string[];
  }>;
  winnerName: string;
  recommendation: string;
  recommendationDetails: string[];
  analyzedAt: string;
  model: string;
};

export type PhotoBoothItem = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
  width: number;
  height: number;
  sizeBytes: number;
  analysis?: PhotoBoothAnalysis;
  analysisHistory?: PhotoBoothAnalysis[];
};

export type PhotoBoothAnalysisResponse = {
  ok?: boolean;
  error?: string;
  status?: number;
  raw?: string;
  analysis?: PhotoBoothAnalysis;
  history?: PhotoBoothAnalysis[];
};

export type PhotoBoothCompareResponse = {
  ok?: boolean;
  error?: string;
  status?: number;
  raw?: string;
  comparison?: PhotoComparisonAnalysis;
  history?: PhotoComparisonAnalysis[];
  cached?: boolean;
};

export type PhotoBoothListResponse = {
  ok?: boolean;
  error?: string;
  items?: PhotoBoothItem[];
};

/** Editor toolbar autosave feedback (pending → saving → saved). */
export type EditorAutosaveActivity = "idle" | "pending" | "saving" | "saved";

