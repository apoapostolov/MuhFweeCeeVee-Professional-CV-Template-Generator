"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, JSX } from "react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  EDITOR_TABS,
  ROOT_ARRAY_EDITOR_PATHS,
  defaultSectionDraftForEditorPath,
  LANGUAGE_OPTIONS,
  appendPrintTweakParams,
  LEGACY_PHOTO_STORAGE_KEYS,
  clampPrintTextScale,
  PRINT_TEXT_SCALE_DEFAULT,
  STORAGE_KEYS,
  themeOptionsForTemplate,
} from "@/components/composer/constants";
import { stepPrintTextScale } from "@/components/composer/print-text-scale-pill";
import {
  isPrintTweaksScopeReady,
  printTweaksScopeKey,
  readPrintTweaksForScope,
  writePrintTweaksForScope,
} from "@/components/composer/print-tweaks-persistence";
import {
  isTemplatePathVisible,
  readTemplateVisibility,
  writeTemplateVisibility,
} from "@/lib/cvTemplateVisibility";
import { cvVariantGroupKey } from "@/lib/server/cvVariants";
import {
  appendToArrayAtPath,
  asRecord,
  classifyVerdict,
  cloneValue,
  dataUrlToFile,
  defaultArrayEntry,
  formatDiffValue,
  getAtPath,
  getByPath,
  prettyKey,
  removeAtPath,
  setAtPath,
  setByPath,
} from "@/components/composer/form-path-utils";
import { collectEditorAtsTerms } from "@/lib/research/editor-ats-keywords";
import { computeKeywordGap, type KeywordGapReport } from "@/lib/research/keywordGap";
import { readCvTargeting, writeCvTargeting } from "@/lib/research/cvTargeting";
import {
  readEditorFlatSubsectionsPreference,
  writeEditorFlatSubsectionsPreference,
} from "@/components/composer/editor-subsection-indent-prefs";
import {
  coerceSectionDraftForEditorPath,
  resolveSectionDraftForForm,
  sectionDraftNeedsSync,
} from "@/components/composer/section-draft";
import {
  DEFAULT_UI_LANGUAGE,
  normalizeUiLanguage,
  readUiLanguage,
  uiIsBg,
  writeUiLanguage,
  type UiLanguageCode,
} from "@/components/composer/ui-language";
import {
  readPersistedWorkspacePrefs,
  resolveCvItemFromPersistedPrefs,
  resolveTemplateSelection,
  writePersistedWorkspacePrefs,
} from "@/components/composer/workspace-persistence";
import type {
  ActivePanel,
  CompanyListResponse,
  CompanyMetadataDocumentResponse,
  CompanySource,
  CvListResponse,
  CvPair,
  EditorTabKey,
  EditorViewMode,
  FullAnalysis,
  PathSegment,
  PhotoBoothAnalysis,
  PhotoBoothAnalysisResponse,
  PhotoBoothCompareResponse,
  PhotoBoothItem,
  PhotoBoothListResponse,
  PhotoComparisonAnalysis,
  PhotoModeOption,
  SectionAnalysis,
  SyncChangeItem,
  SyncResponse,
  SyncStatusResponse,
  TemplateListResponse,
  EditorAutosaveActivity,
  ThemeMode,
} from "@/components/composer/types";
import {
  buildAnalysisCostEstimate,
  formatUsd,
  resolveResearchModelOption,
  orderTemplateItems,
} from "@/components/composer/openrouter-utils";
import { useOpenRouterSettings } from "@/components/composer/useOpenRouterSettings";
import { useAiProviderSettings } from "@/components/composer/useAiProviderSettings";
import type { AddCustomFieldPayload } from "@/components/composer/custom-field-types";
import { CUSTOM_FIELD_DEFS_KEY } from "@/components/composer/custom-field-types";
import {
  extractYamlLintIssuesFromDocument,
  useEditorFormRenderer,
} from "@/components/composer/useEditorFormRenderer";
import { useComposerToast } from "@/components/composer/composer-toast";
import {
  readStoredResearchSelection,
  resolveStoredResearchCompanyId,
  resolveStoredResearchJobId,
  writeStoredResearchSelection,
} from "@/components/composer/research-selection-storage";
import { serializeFieldPath } from "@/lib/field-path-key";
import type {
  ResearchedCompany,
  ResearchedJobPosition,
  ResearchSidebarTab,
} from "@/lib/research/types";


export type ComposerController = ReturnType<typeof useComposerController>;

const TEXT_FIELD_AUTOSAVE_MS = 2500;

export function useComposerController() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("workspace");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const openRouter = useOpenRouterSettings();
  const aiProviders = useAiProviderSettings();
  const refreshAiSettings = aiProviders.refreshSettings;
  const previousActivePanel = useRef<ActivePanel | null>(null);
  useEffect(() => {
    if (activePanel === "settings" && previousActivePanel.current !== "settings") {
      void refreshAiSettings().catch(() => undefined);
    }
    previousActivePanel.current = activePanel;
  }, [activePanel, refreshAiSettings]);
  const {
    toasts: composerToasts,
    showToast: showComposerToast,
    dismissToast: dismissComposerToast,
  } = useComposerToast();

  const [cvItems, setCvItems] = useState<CvListResponse["items"]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateListResponse["items"]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateTheme, setSelectedTemplateTheme] = useState("default");
  const [selectedPhotoMode, setSelectedPhotoMode] = useState<
    PhotoModeOption["id"]
  >("default");
  const [printTweakIntelligentPagination, setPrintTweakIntelligentPagination] =
    useState(false);
  const [printTweakRemovePhoto, setPrintTweakRemovePhoto] = useState(false);
  const [printTweakMoveSkillsLeft, setPrintTweakMoveSkillsLeft] = useState(false);
  const [printTweakSidebarTextScaleEnabled, setPrintTweakSidebarTextScaleEnabled] =
    useState(false);
  const [printTweakSidebarTextScale, setPrintTweakSidebarTextScale] = useState(
    PRINT_TEXT_SCALE_DEFAULT,
  );
  const [printTweakContentTextScaleEnabled, setPrintTweakContentTextScaleEnabled] =
    useState(false);
  const [printTweakContentTextScale, setPrintTweakContentTextScale] = useState(
    PRINT_TEXT_SCALE_DEFAULT,
  );
  const [photoBoothItems, setPhotoBoothItems] = useState<PhotoBoothItem[]>([]);
  const [photoBoothGalleryReady, setPhotoBoothGalleryReady] = useState(false);
  const [approvedPhotoId, setApprovedPhotoId] = useState("");
  const [photoBoothNotice, setPhotoBoothNotice] = useState("");
  const [photoBoothDragging, setPhotoBoothDragging] = useState(false);
  const [photoBoothAnalyzingId, setPhotoBoothAnalyzingId] = useState("");
  const [photoBoothAnalysisFocusId, setPhotoBoothAnalysisFocusId] = useState("");
  const [photoBoothCompareIds, setPhotoBoothCompareIds] = useState<string[]>([]);
  const [photoBoothCompareLoading, setPhotoBoothCompareLoading] = useState(false);
  const [photoBoothComparison, setPhotoBoothComparison] = useState<PhotoComparisonAnalysis | null>(null);
  const [photoBoothComparisonHistory, setPhotoBoothComparisonHistory] = useState<PhotoComparisonAnalysis[]>([]);
  const [photoBoothDeleteConfirmId, setPhotoBoothDeleteConfirmId] = useState("");
  const photoBoothInputRef = useRef<HTMLInputElement | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [uiLanguage, setUiLanguageState] = useState<UiLanguageCode>(() => readUiLanguage());
  const [addCustomFieldTarget, setAddCustomFieldTarget] = useState<
    { scope: "section" | "company-metadata"; path: PathSegment[] } | null
  >(null);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageModalSelection, setLanguageModalSelection] = useState("en");
  const [creatingLanguage, setCreatingLanguage] = useState(false);

  const [editorTab, setEditorTab] = useState<EditorTabKey>("person");
  const [editorView, setEditorView] = useState<EditorViewMode>("form");
  const [editorCv, setEditorCv] = useState<Record<string, unknown> | null>(null);
  const [sectionDraft, setSectionDraft] = useState<unknown>(null);
  const [expandedFormNodes, setExpandedFormNodes] = useState<Record<string, boolean>>({});
  const [yamlDraft, setYamlDraft] = useState("");
  const [yamlLintIssues, setYamlLintIssues] = useState<string[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorNotice, setEditorNotice] = useState("");
  const yamlTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const yamlHighlightRef = useRef<HTMLDivElement | null>(null);
  const sectionDraftRef = useRef<unknown>(null);
  const yamlDraftRef = useRef("");
  const editorCvRef = useRef<Record<string, unknown> | null>(null);
  const selectedCvIdRef = useRef("");
  const selectedLanguageRef = useRef("en");
  const uiLanguageRef = useRef<UiLanguageCode>(DEFAULT_UI_LANGUAGE);
  const editorPathRef = useRef("person");
  const editorViewRef = useRef<EditorViewMode>("form");
  const variantGroupRef = useRef<Record<string, CvListResponse["items"][number]> | null>(null);
  const textFieldAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textFieldAutosaveGenerationRef = useRef(0);
  const pendingTextFieldAutosaveRef = useRef<{
    path: PathSegment[];
    fieldLabel: string;
    value: string;
  } | null>(null);
  const editorAutoSaveEnabledRef = useRef(true);
  const editorAutosaveActivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorAutoSaveEnabled, setEditorAutoSaveEnabled] = useState(true);
  const [editorFlatSubsections, setEditorFlatSubsections] = useState(true);
  const [editorSavedFingerprint, setEditorSavedFingerprint] = useState("");
  const [editorAutosaveActivity, setEditorAutosaveActivity] = useState<EditorAutosaveActivity>("idle");

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisData, setAnalysisData] = useState<SectionAnalysis | FullAnalysis | null>(null);
  const [analysisCompanies, setAnalysisCompanies] = useState<NonNullable<CompanyListResponse["items"]>>([]);
  const [analysisCompanySource, setAnalysisCompanySource] = useState<CompanySource>("example");
  const [analysisCompanyIds, setAnalysisCompanyIds] = useState<string[]>([]);
  const [companyMetadataEditorOpen, setCompanyMetadataEditorOpen] = useState(false);
  const [companyMetadataEditorView, setCompanyMetadataEditorView] = useState<EditorViewMode>("form");
  const [companyMetadataDraft, setCompanyMetadataDraft] = useState<unknown>({ companies: [] });
  const [companyMetadataYamlDraft, setCompanyMetadataYamlDraft] = useState("");
  const [companyMetadataSaving, setCompanyMetadataSaving] = useState(false);
  const [companyMetadataNotice, setCompanyMetadataNotice] = useState("");
  const [companyMetadataYamlLintIssues, setCompanyMetadataYamlLintIssues] = useState<string[]>([]);
  const companyMetadataAutoSaveEnabledRef = useRef(true);
  const companyMetadataAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companyMetadataAutosaveActivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companyMetadataDraftRef = useRef<unknown>({ companies: [] });
  const companyMetadataYamlDraftRef = useRef("");
  const companyMetadataEditorViewRef = useRef<EditorViewMode>("form");
  const analysisCompanySourceRef = useRef<CompanySource>("example");
  const [companyMetadataAutoSaveEnabled, setCompanyMetadataAutoSaveEnabled] = useState(true);
  const [companyMetadataSavedFingerprint, setCompanyMetadataSavedFingerprint] = useState("");
  const [researchCompanies, setResearchCompanies] = useState<ResearchedCompany[]>([]);
  const [researchJobPositions, setResearchJobPositions] = useState<ResearchedJobPosition[]>([]);
  const [keywordGapReport, setKeywordGapReport] = useState<KeywordGapReport | null>(null);
  const [atsCheckLoading, setAtsCheckLoading] = useState(false);
  const [atsCheckText, setAtsCheckText] = useState("");
  const [selectedResearchCompanyId, setSelectedResearchCompanyId] = useState(
    () => readStoredResearchSelection().companyId,
  );
  const [selectedResearchJobPositionId, setSelectedResearchJobPositionId] = useState(
    () => readStoredResearchSelection().jobId,
  );
  const researchSelectionPersistReadyRef = useRef(false);
  const [researchCatalogLoading, setResearchCatalogLoading] = useState(false);
  const [researchingCompany, setResearchingCompany] = useState(false);
  const [researchingJob, setResearchingJob] = useState(false);
  const [researchNotice, setResearchNotice] = useState("");
  const [researchSidebarTab, setResearchSidebarTab] = useState<ResearchSidebarTab>("companies");
  const [savingResearch, setSavingResearch] = useState(false);
  const researchAutoSaveEnabledRef = useRef(true);
  const researchAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const researchAutosaveActivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResearchDraftRef = useRef<{
    entityType: "company" | "job_position";
    draft: ResearchedCompany | ResearchedJobPosition;
  } | null>(null);
  const researchSidebarTabRef = useRef<ResearchSidebarTab>("companies");
  const [researchAutoSaveEnabled, setResearchAutoSaveEnabled] = useState(true);
  const [researchAutosaveActivity, setResearchAutosaveActivity] =
    useState<EditorAutosaveActivity>("idle");
  const [companyMetadataAutosaveActivity, setCompanyMetadataAutosaveActivity] =
    useState<EditorAutosaveActivity>("idle");
  const [analysisDrawerCollapsed, setAnalysisDrawerCollapsed] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncModalLoading, setSyncModalLoading] = useState(false);
  const [syncSourceSelection, setSyncSourceSelection] = useState("");
  const [syncTargetSelection, setSyncTargetSelection] = useState("");
  const [syncReport, setSyncReport] = useState<{
    open: boolean;
    direction: string;
    sourceCvId: string;
    targetCvId: string;
    changed: boolean;
    changes: SyncChangeItem[];
    message: string;
  } | null>(null);

  const resolvedTheme = useMemo<"light" | "dark">(() => {
    if (themeMode === "light" || themeMode === "dark") {
      return themeMode;
    }
    if (typeof window === "undefined") {
      return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, [themeMode]);

  const editorPath = useMemo(
    () => EDITOR_TABS.find((item) => item.key === editorTab)?.path ?? "person",
    [editorTab],
  );

  const mostRecentCv = useMemo(() => {
    if (!cvItems.length) return null;
    return [...cvItems].sort((a, b) => {
      const aTs = a.git?.lastCommitAt ? Date.parse(a.git.lastCommitAt) : 0;
      const bTs = b.git?.lastCommitAt ? Date.parse(b.git.lastCommitAt) : 0;
      if (aTs !== bTs) return bTs - aTs;
      return b.id.localeCompare(a.id);
    })[0] ?? null;
  }, [cvItems]);

  const cvSizeTokenEstimate = useMemo(() => {
    if (!editorCv) return 2200;
    const chars = JSON.stringify(editorCv).length;
    return Math.max(1200, Math.round(chars / 4));
  }, [editorCv]);

  const fullCvOutputTokenEstimate = useMemo(
    () => Math.max(900, Math.min(2600, Math.round(cvSizeTokenEstimate * 0.35))),
    [cvSizeTokenEstimate],
  );

  const orderedTemplateItems = useMemo(
    () => orderTemplateItems(templateItems),
    [templateItems],
  );
  const selectedTemplateThemeOptions = useMemo(
    () => themeOptionsForTemplate(selectedTemplateId),
    [selectedTemplateId],
  );

  const cvPairs = useMemo<CvPair[]>(() => {
    const pairs = new Map<string, CvPair>();
    for (const item of cvItems) {
      const key = cvVariantGroupKey(item) ?? item.id;
      const ts = item.git?.lastCommitAt ? Date.parse(item.git.lastCommitAt) : 0;
      const existing = pairs.get(key);

      if (!existing) {
        const languageKey = (item.language ?? "").toLowerCase() || "unknown";
        pairs.set(key, {
          key,
          displayName: item.displayName,
          displayVersion: item.displayVersion,
          variants: {
            [languageKey]: item,
          },
          preferredCvId: item.id,
          latestTs: ts,
        });
        continue;
      }

      const languageKey = (item.language ?? "").toLowerCase() || "unknown";
      existing.variants[languageKey] = item;
      if (languageKey === "en") {
        existing.preferredCvId = item.id;
      }
      if (!existing.variants.en && languageKey === "bg") {
        existing.preferredCvId = item.id;
      }
      existing.displayName = item.displayName;
      existing.displayVersion = item.displayVersion;
      existing.latestTs = Math.max(existing.latestTs, ts);
    }

    return [...pairs.values()].sort((a, b) => {
      if (a.latestTs !== b.latestTs) return b.latestTs - a.latestTs;
      return a.key.localeCompare(b.key);
    });
  }, [cvItems]);

  const cvTemplatesForLanguage = useMemo(() => {
    const lang = selectedLanguage.toLowerCase();
    return cvPairs.filter((pair) => Boolean(pair.variants[lang]));
  }, [cvPairs, selectedLanguage]);

  const pdfUrl = useMemo(() => {
    if (!selectedCvId || !selectedTemplateId) {
      return "";
    }
    const approvedPhoto = photoBoothItems.find((item) => item.id === approvedPhotoId) ?? null;
    const params = new URLSearchParams({
      cvId: selectedCvId,
      templateId: selectedTemplateId,
      v: String(previewNonce),
    });
    if (selectedTemplateThemeOptions.length > 0) {
      params.set("theme", selectedTemplateTheme);
    }
    params.set("photo", selectedPhotoMode);
    if (approvedPhoto) {
      params.set("photoId", approvedPhoto.id);
    }
    appendPrintTweakParams(
      params,
      {
        intelligentPagination: printTweakIntelligentPagination,
        removePhoto: printTweakRemovePhoto,
        moveSkillsLeft: printTweakMoveSkillsLeft,
        sidebarTextScaleEnabled: printTweakSidebarTextScaleEnabled,
        sidebarTextScale: printTweakSidebarTextScale,
        contentTextScaleEnabled: printTweakContentTextScaleEnabled,
        contentTextScale: printTweakContentTextScale,
      },
      selectedTemplateId,
    );
    return `/api/export/pdf?${params.toString()}`;
  }, [
    previewNonce,
    selectedCvId,
    selectedTemplateId,
    selectedTemplateTheme,
    selectedTemplateThemeOptions.length,
    selectedPhotoMode,
    printTweakIntelligentPagination,
    printTweakRemovePhoto,
    printTweakMoveSkillsLeft,
    printTweakSidebarTextScaleEnabled,
    printTweakSidebarTextScale,
    printTweakContentTextScaleEnabled,
    printTweakContentTextScale,
    approvedPhotoId,
    photoBoothItems,
  ]);

  const filteredAnalysisCompanies = useMemo(
    () => analysisCompanies.filter((company) => (company.source ?? "example") === analysisCompanySource),
    [analysisCompanies, analysisCompanySource],
  );

  const selectedResearchModelOption = useMemo(
    () => resolveResearchModelOption(openRouter.researchModelInput, openRouter.modelOptions),
    [openRouter.researchModelInput, openRouter.modelOptions],
  );

  const analysisCostEstimate = useMemo(
    () =>
      buildAnalysisCostEstimate(
        cvSizeTokenEstimate,
        fullCvOutputTokenEstimate,
        openRouter.selectedAnalysisModelOption,
        selectedResearchModelOption,
      ),
    [
      cvSizeTokenEstimate,
      fullCvOutputTokenEstimate,
      openRouter.selectedAnalysisModelOption,
      selectedResearchModelOption,
    ],
  );

  const loadPhotoBoothGallery = useCallback(async (): Promise<void> => {
    setPhotoBoothGalleryReady(false);
    try {
      const response = await fetch("/api/photos");
      const payload = (await response.json()) as PhotoBoothListResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not load photos.");
      }
      const items = Array.isArray(payload.items) ? payload.items : [];
      setPhotoBoothItems(items);
      setPhotoBoothGalleryReady(true);
    } catch (error) {
      setPhotoBoothNotice(error instanceof Error ? error.message : "Could not load photos.");
      setPhotoBoothItems([]);
    }
  }, []);

  const loadResearchCatalog = useCallback(async (): Promise<void> => {
    setResearchCatalogLoading(true);
    try {
      const response = await fetch("/api/research/catalog");
      const payload = (await response.json()) as {
        ok?: boolean;
        companies?: ResearchedCompany[];
        job_positions?: ResearchedJobPosition[];
      };
      if (!response.ok || !payload.ok) {
        setResearchCompanies([]);
        setResearchJobPositions([]);
        return;
      }
      const companies = Array.isArray(payload.companies) ? payload.companies : [];
      const jobs = Array.isArray(payload.job_positions) ? payload.job_positions : [];
      setResearchCompanies(companies);
      setResearchJobPositions(jobs);
      setSelectedResearchCompanyId((current) => {
        const companyId = resolveStoredResearchCompanyId(companies, current);
        setSelectedResearchJobPositionId((jobCurrent) =>
          resolveStoredResearchJobId(jobs, companyId, jobCurrent),
        );
        return companyId;
      });
    } catch {
      setResearchCompanies([]);
      setResearchJobPositions([]);
    } finally {
      setResearchCatalogLoading(false);
    }
  }, []);

  const selectedResearchCompany = useMemo(
    () => researchCompanies.find((c) => c.id === selectedResearchCompanyId) ?? null,
    [researchCompanies, selectedResearchCompanyId],
  );

  const researchJobsForCompany = useMemo(
    () => researchJobPositions.filter((j) => j.company_id === selectedResearchCompanyId),
    [researchJobPositions, selectedResearchCompanyId],
  );

  const selectedResearchJob = useMemo(
    () => researchJobPositions.find((j) => j.id === selectedResearchJobPositionId) ?? null,
    [researchJobPositions, selectedResearchJobPositionId],
  );

  const editorWeightedKeywords = useMemo(
    () => selectedResearchJob?.weighted_keywords ?? [],
    [selectedResearchJob],
  );

  const editorAtsKeywords = useMemo(
    () => collectEditorAtsTerms(selectedResearchJob?.ats),
    [selectedResearchJob],
  );

  const keywordGap = useMemo((): KeywordGapReport | null => {
    if (!editorCv || !selectedResearchJob) {
      return null;
    }
    return computeKeywordGap(editorCv, selectedResearchJob.weighted_keywords ?? []);
  }, [editorCv, selectedResearchJob]);

  useEffect(() => {
    setKeywordGapReport(keywordGap);
  }, [keywordGap]);

  const loadAnalysisCompanies = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/companies");
      const payload = (await response.json()) as CompanyListResponse;
      if (!response.ok || !payload.ok) {
        setAnalysisCompanies([]);
        setAnalysisCompanyIds([]);
        return;
      }
      const items = payload.items ?? [];
      setAnalysisCompanies(items);
      setAnalysisCompanySource((current) => {
        if (items.some((item) => (item.source ?? "example") === current)) {
          return current;
        }
        return items.some((item) => (item.source ?? "example") === "personal") ? "personal" : "example";
      });
      setAnalysisCompanyIds((current) => current.filter((id) => items.some((item) => item.id === id)));
    } catch {
      setAnalysisCompanies([]);
      setAnalysisCompanyIds([]);
    }
  }, []);

  useEffect(() => {
    void loadResearchCatalog();
  }, [loadResearchCatalog]);

  useEffect(() => {
    researchSelectionPersistReadyRef.current = true;
    try {
      const savedSidebarTab = window.localStorage.getItem(STORAGE_KEYS.researchSidebarTab);
      if (savedSidebarTab === "companies" || savedSidebarTab === "job_positions") {
        setResearchSidebarTab(savedSidebarTab);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!researchSelectionPersistReadyRef.current) {
      return;
    }
    writeStoredResearchSelection(selectedResearchCompanyId, selectedResearchJobPositionId);
  }, [selectedResearchCompanyId, selectedResearchJobPositionId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.researchSidebarTab, researchSidebarTab);
    } catch {
      // no-op
    }
  }, [researchSidebarTab]);

  useEffect(() => {
    if (
      selectedResearchJobPositionId &&
      !researchJobsForCompany.some((job) => job.id === selectedResearchJobPositionId)
    ) {
      setSelectedResearchJobPositionId("");
    }
  }, [researchJobsForCompany, selectedResearchJobPositionId]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.themeMode);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeMode(saved);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const mode = themeMode === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : themeMode;
      root.setAttribute("data-theme", mode);
    };
    applyTheme();
    try {
      window.localStorage.setItem(STORAGE_KEYS.themeMode, themeMode);
    } catch {
      // no-op
    }

    if (themeMode !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.selectedPhotoMode, selectedPhotoMode);
    } catch {
      // no-op
    }
  }, [selectedPhotoMode]);

  // Print tweaks are remembered per CV + template + language (see print-tweaks-persistence).
  const printTweaksScope = useMemo(
    () => ({
      cvId: selectedCvId,
      templateId: selectedTemplateId,
      language: selectedLanguage,
    }),
    [selectedCvId, selectedTemplateId, selectedLanguage],
  );
  const printTweaksScopeKeyRef = useRef("");
  const skipPrintTweaksPersistRef = useRef(false);

  useEffect(() => {
    if (!isPrintTweaksScopeReady(printTweaksScope)) {
      printTweaksScopeKeyRef.current = "";
      return;
    }
    const nextKey = printTweaksScopeKey(printTweaksScope);
    if (printTweaksScopeKeyRef.current === nextKey) {
      return;
    }
    printTweaksScopeKeyRef.current = nextKey;
    skipPrintTweaksPersistRef.current = true;
    const restored = readPrintTweaksForScope(printTweaksScope);
    setPrintTweakIntelligentPagination(restored.intelligentPagination);
    setPrintTweakRemovePhoto(restored.removePhoto);
    setPrintTweakMoveSkillsLeft(restored.moveSkillsLeft);
    setPrintTweakSidebarTextScaleEnabled(restored.sidebarTextScaleEnabled);
    setPrintTweakSidebarTextScale(restored.sidebarTextScale);
    setPrintTweakContentTextScaleEnabled(restored.contentTextScaleEnabled);
    setPrintTweakContentTextScale(restored.contentTextScale);
    setPreviewNonce(Date.now());
  }, [printTweaksScope]);

  useEffect(() => {
    if (!isPrintTweaksScopeReady(printTweaksScope)) {
      return;
    }
    if (skipPrintTweaksPersistRef.current) {
      skipPrintTweaksPersistRef.current = false;
      return;
    }
    writePrintTweaksForScope(printTweaksScope, {
      intelligentPagination: printTweakIntelligentPagination,
      removePhoto: printTweakRemovePhoto,
      moveSkillsLeft: printTweakMoveSkillsLeft,
      sidebarTextScaleEnabled: printTweakSidebarTextScaleEnabled,
      sidebarTextScale: printTweakSidebarTextScale,
      contentTextScaleEnabled: printTweakContentTextScaleEnabled,
      contentTextScale: printTweakContentTextScale,
    });
  }, [
    printTweaksScope,
    printTweakIntelligentPagination,
    printTweakRemovePhoto,
    printTweakMoveSkillsLeft,
    printTweakSidebarTextScaleEnabled,
    printTweakSidebarTextScale,
    printTweakContentTextScaleEnabled,
    printTweakContentTextScale,
  ]);

  useEffect(() => {
    try {
      const storedApprovedId = window.localStorage.getItem(STORAGE_KEYS.approvedPhotoId) ?? "";
      if (storedApprovedId) {
        setApprovedPhotoId(storedApprovedId);
      }
    } catch {
      // no-op
    }
    void loadPhotoBoothGallery();
  }, [loadPhotoBoothGallery]);

  useEffect(() => {
    if (!photoBoothGalleryReady) return;
    try {
      if (approvedPhotoId) {
        window.localStorage.setItem(STORAGE_KEYS.approvedPhotoId, approvedPhotoId);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.approvedPhotoId);
      }
    } catch {
      // no-op
    }
  }, [approvedPhotoId, photoBoothGalleryReady]);

  useEffect(() => {
    if (!photoBoothGalleryReady || !approvedPhotoId) return;
    if (photoBoothItems.some((item) => item.id === approvedPhotoId)) return;
    setApprovedPhotoId("");
  }, [approvedPhotoId, photoBoothGalleryReady, photoBoothItems]);

  useEffect(() => {
    if (!photoBoothAnalysisFocusId) return;
    if (photoBoothItems.some((item) => item.id === photoBoothAnalysisFocusId)) return;
    setPhotoBoothAnalysisFocusId("");
  }, [photoBoothAnalysisFocusId, photoBoothItems]);

  useEffect(() => {
    setPhotoBoothCompareIds((current) => current.filter((id) => photoBoothItems.some((item) => item.id === id)));
  }, [photoBoothItems]);

  useEffect(() => {
    if (photoBoothCompareIds.length < 2) {
      setPhotoBoothComparison(null);
      setPhotoBoothComparisonHistory([]);
      return;
    }
    let cancelled = false;
    async function loadCachedComparison(): Promise<void> {
      try {
        const freshGalleryResponse = await fetch("/api/photos");
        const freshGalleryPayload = (await freshGalleryResponse.json()) as PhotoBoothListResponse;
        if (!freshGalleryResponse.ok || !freshGalleryPayload.ok) {
          return;
        }
        const freshItems = Array.isArray(freshGalleryPayload.items) ? freshGalleryPayload.items : [];
        const selectedItems = photoBoothCompareIds
          .map((id) => freshItems.find((item) => item.id === id) ?? null)
          .filter((entry): entry is PhotoBoothItem => entry !== null);
        if (selectedItems.length < 2 || cancelled) return;
        const response = await fetch("/api/analysis/photo/compare", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lookupOnly: true,
            imageIds: selectedItems.map((item) => item.id),
            images: selectedItems.map((item) => ({
              name: item.name,
              imageDataUrl: item.dataUrl,
            })),
          }),
        });
        const payload = (await response.json()) as PhotoBoothCompareResponse;
        if (!response.ok || !payload.ok || cancelled) return;
        setPhotoBoothComparison(payload.comparison ?? null);
        setPhotoBoothComparisonHistory(Array.isArray(payload.history) ? payload.history : []);
      } catch {
        // no-op
      }
    }
    void loadCachedComparison();
    return () => {
      cancelled = true;
    };
  }, [photoBoothCompareIds]);

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }
    if (selectedTemplateThemeOptions.length === 0) {
      if (selectedTemplateTheme !== "default") {
        setSelectedTemplateTheme("default");
      }
      return;
    }
    if (!selectedTemplateThemeOptions.some((option) => option.id === selectedTemplateTheme)) {
      setSelectedTemplateTheme("default");
    }
  }, [selectedTemplateId, selectedTemplateTheme, selectedTemplateThemeOptions]);

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspaceData() {
      setLoadingWorkspace(true);
      try {
        const [cvsRes, templatesRes] = await Promise.all([fetch("/api/cvs"), fetch("/api/templates")]);
        const cvs = (await cvsRes.json()) as CvListResponse;
        const templates = (await templatesRes.json()) as TemplateListResponse;
        if (cancelled) {
          return;
        }
        setCvItems(cvs.items ?? []);
        setTemplateItems(templates.items ?? []);
        const items = cvs.items ?? [];
        const templateItemsLocal = templates.items ?? [];

        if (items.length > 0) {
          const prefs = readPersistedWorkspacePrefs();
          const selected = resolveCvItemFromPersistedPrefs(items, prefs) ?? items[0];
          setSelectedCvId(selected.id);
          setSelectedLanguage((selected.language ?? (prefs.language || "en")).toLowerCase());
        }

        if (templateItemsLocal.length > 0) {
          const prefs = readPersistedWorkspacePrefs();
          const { templateId, themeId } = resolveTemplateSelection(templateItemsLocal, prefs);
          setSelectedTemplateId(templateId);
          setSelectedTemplateTheme(themeId);

          let persistedPhotoMode: PhotoModeOption["id"] = "default";
          try {
            const savedPhotoMode =
              window.localStorage.getItem(STORAGE_KEYS.selectedPhotoMode) ?? "default";
            if (
              savedPhotoMode === "default" ||
              savedPhotoMode === "on-circle" ||
              savedPhotoMode === "on-square" ||
              savedPhotoMode === "on-original" ||
              savedPhotoMode === "off"
            ) {
              persistedPhotoMode = savedPhotoMode;
            }
          } catch {
            // no-op
          }
          setSelectedPhotoMode(persistedPhotoMode);
          // Print tweaks load via printTweaksScope effect once CV + template + language are set.
        }
      } finally {
        if (!cancelled) {
          setLoadingWorkspace(false);
        }
      }
    }
    void loadWorkspaceData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCvMeta = useMemo(
    () => cvItems.find((item) => item.id === selectedCvId) ?? null,
    [cvItems, selectedCvId],
  );

  const variantGroup = useMemo(() => {
    if (!selectedCvMeta) {
      return null;
    }
    const groupKey = cvVariantGroupKey(selectedCvMeta);
    if (!groupKey) {
      const fallbackLang = (selectedCvMeta.language ?? "").toLowerCase();
      return fallbackLang ? { [fallbackLang]: selectedCvMeta } : null;
    }
    const variants: Record<string, CvListResponse["items"][number]> = {};
    for (const item of cvItems) {
      if (cvVariantGroupKey(item) !== groupKey) {
        continue;
      }
      const language = (item.language ?? "").toLowerCase();
      if (!language) continue;
      variants[language] = item;
    }
    return Object.keys(variants).length > 0 ? variants : null;
  }, [cvItems, selectedCvMeta]);
  const availableLanguages = useMemo<string[]>(() => {
    const languages = Object.keys(variantGroup ?? {});
    if (languages.length === 0) {
      const fallback = (selectedCvMeta?.language ?? "").toLowerCase();
      return fallback ? [fallback] : [];
    }
    return languages.sort((a, b) => {
      if (a === "en") return -1;
      if (b === "en") return 1;
      return a.localeCompare(b);
    });
  }, [selectedCvMeta?.language, variantGroup]);
  const languageOptionChoices = useMemo(() => {
    const base = [...LANGUAGE_OPTIONS];
    for (const code of availableLanguages) {
      if (!base.some((entry) => entry.code === code)) {
        base.push({ code, label: code.toUpperCase() });
      }
    }
    return base;
  }, [availableLanguages]);

  useEffect(() => {
    sectionDraftRef.current = sectionDraft;
  }, [sectionDraft]);
  useEffect(() => {
    yamlDraftRef.current = yamlDraft;
  }, [yamlDraft]);
  useEffect(() => {
    editorCvRef.current = editorCv;
  }, [editorCv]);
  useEffect(() => {
    selectedCvIdRef.current = selectedCvId;
  }, [selectedCvId]);
  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);
  useEffect(() => {
    uiLanguageRef.current = uiLanguage;
  }, [uiLanguage]);

  function setUiLanguage(language: string): void {
    const normalized = normalizeUiLanguage(language);
    setUiLanguageState(normalized);
    writeUiLanguage(normalized);
  }
  useEffect(() => {
    editorPathRef.current = editorPath;
  }, [editorPath]);
  useEffect(() => {
    editorViewRef.current = editorView;
  }, [editorView]);
  useEffect(() => {
    variantGroupRef.current = variantGroup;
  }, [variantGroup]);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.editorAutoSave);
      if (stored === "0") {
        editorAutoSaveEnabledRef.current = false;
        setEditorAutoSaveEnabled(false);
      }
      const metadataStored = window.localStorage.getItem(STORAGE_KEYS.companyMetadataAutoSave);
      if (metadataStored === "0") {
        companyMetadataAutoSaveEnabledRef.current = false;
        setCompanyMetadataAutoSaveEnabled(false);
      }
      const researchStored = window.localStorage.getItem(STORAGE_KEYS.researchAutoSave);
      if (researchStored === "0") {
        researchAutoSaveEnabledRef.current = false;
        setResearchAutoSaveEnabled(false);
      }
      setEditorFlatSubsections(readEditorFlatSubsectionsPreference());
    } catch {
      // ignore private browsing / blocked storage
    }
  }, []);

  useEffect(() => {
    editorAutoSaveEnabledRef.current = editorAutoSaveEnabled;
  }, [editorAutoSaveEnabled]);

  useEffect(() => {
    companyMetadataAutoSaveEnabledRef.current = companyMetadataAutoSaveEnabled;
  }, [companyMetadataAutoSaveEnabled]);

  useEffect(() => {
    researchAutoSaveEnabledRef.current = researchAutoSaveEnabled;
  }, [researchAutoSaveEnabled]);

  useEffect(() => {
    researchSidebarTabRef.current = researchSidebarTab;
  }, [researchSidebarTab]);

  useEffect(() => {
    companyMetadataDraftRef.current = companyMetadataDraft;
  }, [companyMetadataDraft]);
  useEffect(() => {
    companyMetadataYamlDraftRef.current = companyMetadataYamlDraft;
  }, [companyMetadataYamlDraft]);
  useEffect(() => {
    companyMetadataEditorViewRef.current = companyMetadataEditorView;
  }, [companyMetadataEditorView]);
  useEffect(() => {
    analysisCompanySourceRef.current = analysisCompanySource;
  }, [analysisCompanySource]);

  useEffect(() => {
    return () => {
      if (textFieldAutosaveTimerRef.current) {
        clearTimeout(textFieldAutosaveTimerRef.current);
      }
      if (editorAutosaveActivityTimerRef.current) {
        clearTimeout(editorAutosaveActivityTimerRef.current);
      }
      if (companyMetadataAutosaveTimerRef.current) {
        clearTimeout(companyMetadataAutosaveTimerRef.current);
      }
      if (companyMetadataAutosaveActivityTimerRef.current) {
        clearTimeout(companyMetadataAutosaveActivityTimerRef.current);
      }
      if (researchAutosaveTimerRef.current) {
        clearTimeout(researchAutosaveTimerRef.current);
      }
      if (researchAutosaveActivityTimerRef.current) {
        clearTimeout(researchAutosaveActivityTimerRef.current);
      }
    };
  }, []);

  function clearResearchAutosaveTimers(): void {
    if (researchAutosaveTimerRef.current) {
      clearTimeout(researchAutosaveTimerRef.current);
      researchAutosaveTimerRef.current = null;
    }
    if (researchAutosaveActivityTimerRef.current) {
      clearTimeout(researchAutosaveActivityTimerRef.current);
      researchAutosaveActivityTimerRef.current = null;
    }
    pendingResearchDraftRef.current = null;
    setResearchAutosaveActivity("idle");
  }

  const selectedPairKey = useMemo(() => {
    if (!selectedCvMeta) return "";
    return cvVariantGroupKey(selectedCvMeta) ?? selectedCvMeta.id;
  }, [selectedCvMeta]);

  useEffect(() => {
    writePersistedWorkspacePrefs({
      cvId: selectedCvId,
      cvPairKey: selectedPairKey,
      language: selectedLanguage,
      templateId: selectedTemplateId,
      templateTheme: selectedTemplateTheme,
    });
  }, [
    selectedCvId,
    selectedPairKey,
    selectedLanguage,
    selectedTemplateId,
    selectedTemplateTheme,
  ]);

  useEffect(() => {
    const lang = (selectedCvMeta?.language ?? "en").toLowerCase();
    setSelectedLanguage(lang);
  }, [selectedCvMeta?.id, selectedCvMeta?.language]);

  useEffect(() => {
    if (availableLanguages.length === 0) return;
    if (availableLanguages.includes(selectedLanguage)) return;
    const nextLang = availableLanguages[0];
    setSelectedLanguage(nextLang);
    const nextVariant = variantGroup?.[nextLang];
    if (nextVariant?.id && nextVariant.id !== selectedCvId) {
      setSelectedCvId(nextVariant.id);
    }
  }, [availableLanguages, selectedLanguage, selectedCvId, variantGroup]);

  useEffect(() => {
    const lang = selectedLanguage.toLowerCase();
    if (cvTemplatesForLanguage.length === 0) {
      return;
    }
    const activePair = cvTemplatesForLanguage.find((pair) => pair.key === selectedPairKey);
    if (activePair) {
      const variant = activePair.variants[lang];
      if (variant?.id && variant.id !== selectedCvId) {
        setSelectedCvId(variant.id);
        setPreviewNonce(Date.now());
      }
      return;
    }
    const fallback = cvTemplatesForLanguage[0]?.variants[lang];
    if (fallback?.id && fallback.id !== selectedCvId) {
      setSelectedCvId(fallback.id);
      setPreviewNonce(Date.now());
    }
  }, [cvTemplatesForLanguage, selectedLanguage, selectedPairKey, selectedCvId]);

  useEffect(() => {
    let cancelled = false;
    async function loadEditorCv() {
      if (!selectedCvId) {
        setEditorCv(null);
        setSectionDraft(null);
        setYamlDraft("");
        return;
      }
      setEditorLoading(true);
      try {
        const response = await fetch(`/api/cvs/${encodeURIComponent(selectedCvId)}`);
        const payload = (await response.json()) as { cv?: Record<string, unknown> };
        if (cancelled) return;
        const doc = payload.cv ?? null;
        setEditorCv(doc);
        // D1: restore Research targeting from CV metadata when present
        const targeting = readCvTargeting(doc);
        if (targeting?.job_id) {
          setSelectedResearchJobPositionId(targeting.job_id);
          if (targeting.company_id) {
            setSelectedResearchCompanyId(targeting.company_id);
          }
        } else if (targeting?.company_id) {
          setSelectedResearchCompanyId(targeting.company_id);
          setSelectedResearchJobPositionId("");
        }
      } finally {
        if (!cancelled) {
          setEditorLoading(false);
        }
      }
    }
    void loadEditorCv();
    return () => {
      cancelled = true;
    };
  }, [selectedCvId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      try {
        const response = await fetch("/api/companies");
        const payload = (await response.json()) as CompanyListResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setAnalysisCompanies([]);
          setAnalysisCompanyIds([]);
          return;
        }
        const items = payload.items ?? [];
        setAnalysisCompanies(items);
        setAnalysisCompanySource((current) =>
          items.some((item) => (item.source ?? "example") === current)
            ? current
            : items.some((item) => (item.source ?? "example") === "personal")
              ? "personal"
              : "example",
        );
        setAnalysisCompanyIds((current) =>
          current.filter((id) => items.some((item) => item.id === id)),
        );
      } catch {
        if (!cancelled) {
          setAnalysisCompanies([]);
          setAnalysisCompanyIds([]);
        }
      }
    }

    void loadCompanies();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyMetadataDocument() {
      try {
        const response = await fetch(`/api/companies?source=${encodeURIComponent(analysisCompanySource)}`);
        const payload = (await response.json()) as CompanyMetadataDocumentResponse;
        if (cancelled) return;
        if (companyMetadataAutosaveTimerRef.current) {
          clearTimeout(companyMetadataAutosaveTimerRef.current);
          companyMetadataAutosaveTimerRef.current = null;
        }
        setCompanyMetadataAutosaveActivity("idle");

        if (!response.ok || !payload.ok) {
          const emptyYaml = stringifyYaml({ companies: [] });
          setCompanyMetadataDraft({ companies: [] });
          setCompanyMetadataYamlDraft(emptyYaml);
          setCompanyMetadataSavedFingerprint(emptyYaml);
          return;
        }
        const document = payload.document ?? { companies: [] };
        const yaml = stringifyYaml(document);
        setCompanyMetadataDraft(document);
        setCompanyMetadataYamlDraft(yaml);
        setCompanyMetadataSavedFingerprint(yaml);
      } catch {
        if (!cancelled) {
          const emptyYaml = stringifyYaml({ companies: [] });
          setCompanyMetadataDraft({ companies: [] });
          setCompanyMetadataYamlDraft(emptyYaml);
          setCompanyMetadataSavedFingerprint(emptyYaml);
        }
      }
    }

    void loadCompanyMetadataDocument();
    return () => {
      cancelled = true;
    };
  }, [analysisCompanySource]);

  useEffect(() => {
    setAnalysisCompanyIds((current) =>
      current.filter((id) => filteredAnalysisCompanies.some((item) => item.id === id)),
    );
  }, [filteredAnalysisCompanies]);

  useEffect(() => {
    setExpandedFormNodes({});
  }, [editorPath, selectedCvId]);

  useEffect(() => {
    if (!editorCv) {
      setSectionDraft(null);
      setYamlDraft("");
      return;
    }
    if (editorLoading) {
      return;
    }
    const loaded = getByPath(editorCv, editorPath);
    const fallback = defaultSectionDraftForEditorPath(editorPath);
    const section = coerceSectionDraftForEditorPath(
      editorPath,
      cloneValue(loaded ?? fallback),
    );
    if (textFieldAutosaveTimerRef.current) {
      clearTimeout(textFieldAutosaveTimerRef.current);
      textFieldAutosaveTimerRef.current = null;
    }
    pendingTextFieldAutosaveRef.current = null;
    setEditorAutosaveActivity("idle");

    if (editorPath === "metadata" && section && typeof section === "object" && !Array.isArray(section)) {
      const { template_visibility: _ignored, ...rest } = section as Record<string, unknown>;
      const yaml = stringifyYaml(rest);
      setSectionDraft(rest);
      setYamlDraft(yaml);
      setEditorSavedFingerprint(yaml);
    } else {
      const yaml = stringifyYaml(section);
      setSectionDraft(section);
      setYamlDraft(yaml);
      setEditorSavedFingerprint(yaml);
    }
  }, [editorCv, editorPath, editorLoading]);

  const sectionFormDraft = useMemo(
    () => resolveSectionDraftForForm(editorPath, sectionDraft, yamlDraft),
    [editorPath, sectionDraft, yamlDraft],
  );

  const editorSectionFingerprint = useMemo(() => {
    if (editorView === "yaml") {
      return yamlDraft;
    }
    return stringifyYaml(sectionFormDraft ?? {});
  }, [editorView, yamlDraft, sectionFormDraft]);

  const editorHasUnsavedChanges = editorSectionFingerprint !== editorSavedFingerprint;

  const companyMetadataFingerprint = useMemo(() => {
    if (companyMetadataEditorView === "yaml") {
      return companyMetadataYamlDraft;
    }
    return stringifyYaml(companyMetadataDraft ?? {});
  }, [companyMetadataEditorView, companyMetadataYamlDraft, companyMetadataDraft]);

  const companyMetadataHasUnsavedChanges =
    companyMetadataFingerprint !== companyMetadataSavedFingerprint;

  useEffect(() => {
    if (editorView !== "form" || editorLoading || !editorCv) {
      return;
    }
    if (!sectionDraftNeedsSync(editorPath, sectionDraft, sectionFormDraft)) {
      return;
    }
    // Avoid clobbering CV hydrate with an empty object fallback while sectionDraft is still null.
    if (
      (sectionDraft === null || sectionDraft === undefined) &&
      !ROOT_ARRAY_EDITOR_PATHS.has(editorPath)
    ) {
      return;
    }
    setSectionDraft(sectionFormDraft);
  }, [editorView, editorLoading, editorCv, editorPath, sectionDraft, sectionFormDraft]);

  function syncEditorSavedFingerprintFromDraft(): void {
    const fingerprint =
      editorViewRef.current === "yaml"
        ? yamlDraftRef.current
        : stringifyYaml(
            resolveSectionDraftForForm(
              editorPathRef.current,
              sectionDraftRef.current,
              yamlDraftRef.current,
            ) ?? {},
          );
    setEditorSavedFingerprint(fingerprint);
  }

  function setEditorFlatSubsectionsPreference(flat: boolean): void {
    setEditorFlatSubsections(flat);
    writeEditorFlatSubsectionsPreference(flat);
  }

  function setEditorAutoSavePreference(enabled: boolean): void {
    setEditorAutoSaveEnabled(enabled);
    editorAutoSaveEnabledRef.current = enabled;
    try {
      window.localStorage.setItem(STORAGE_KEYS.editorAutoSave, enabled ? "1" : "0");
    } catch {
      // ignore
    }
    if (!enabled && textFieldAutosaveTimerRef.current) {
      clearTimeout(textFieldAutosaveTimerRef.current);
      textFieldAutosaveTimerRef.current = null;
      setEditorAutosaveActivity("idle");
    }
  }

  function editorAutosaveStatusToast(status: EditorAutosaveActivity): string | null {
    if (status !== "saved") {
      return null;
    }
    const lang = selectedLanguageRef.current;
    return lang === "bg" ? "Шаблонът на CV е запазен." : "CV template saved.";
  }

  function setEditorAutosaveActivityVisible(status: EditorAutosaveActivity): void {
    if (editorAutosaveActivityTimerRef.current) {
      clearTimeout(editorAutosaveActivityTimerRef.current);
      editorAutosaveActivityTimerRef.current = null;
    }
    setEditorAutosaveActivity(status);
    const toastMessage = editorAutosaveStatusToast(status);
    if (toastMessage) {
      showComposerToast(toastMessage);
    }
    if (status === "saved") {
      editorAutosaveActivityTimerRef.current = setTimeout(() => {
        setEditorAutosaveActivity("idle");
        editorAutosaveActivityTimerRef.current = null;
      }, 2800);
    }
  }

  function scheduleEditorAutosave(): void {
    if (!editorAutoSaveEnabledRef.current) {
      return;
    }
    if (textFieldAutosaveTimerRef.current) {
      clearTimeout(textFieldAutosaveTimerRef.current);
    }
    setEditorAutosaveActivityVisible("pending");
    textFieldAutosaveTimerRef.current = setTimeout(() => {
      textFieldAutosaveTimerRef.current = null;
      void flushTextFieldAutosave();
    }, TEXT_FIELD_AUTOSAVE_MS);
  }

  const handleYamlDraftChange = useCallback((value: string) => {
    setYamlDraft(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setSectionDraft(defaultSectionDraftForEditorPath(editorPath));
      scheduleEditorAutosave();
      return;
    }
    try {
      const parsed = parseYaml(value);
      setSectionDraft(coerceSectionDraftForEditorPath(editorPath, parsed));
      scheduleEditorAutosave();
    } catch {
      // Keep sectionDraft until YAML parses; form still reads via resolveSectionDraftForForm.
    }
  }, [editorPath]);

  const handleEditorViewChange = useCallback((view: EditorViewMode) => {
    if (view === "form") {
      setSectionDraft((current: unknown) =>
        resolveSectionDraftForForm(editorPath, current, yamlDraft),
      );
    }
    setEditorView(view);
  }, [editorPath, yamlDraft]);

  function syncCompanyMetadataSavedFingerprintFromDraft(): void {
    const fingerprint =
      companyMetadataEditorViewRef.current === "yaml"
        ? companyMetadataYamlDraftRef.current
        : stringifyYaml(companyMetadataDraftRef.current ?? {});
    setCompanyMetadataSavedFingerprint(fingerprint);
  }

  function setCompanyMetadataAutoSavePreference(enabled: boolean): void {
    setCompanyMetadataAutoSaveEnabled(enabled);
    companyMetadataAutoSaveEnabledRef.current = enabled;
    try {
      window.localStorage.setItem(STORAGE_KEYS.companyMetadataAutoSave, enabled ? "1" : "0");
    } catch {
      // ignore
    }
    if (!enabled && companyMetadataAutosaveTimerRef.current) {
      clearTimeout(companyMetadataAutosaveTimerRef.current);
      companyMetadataAutosaveTimerRef.current = null;
      setCompanyMetadataAutosaveActivity("idle");
    }
  }

  function companyMetadataAutosaveStatusToast(status: EditorAutosaveActivity): string | null {
    if (status !== "saved") {
      return null;
    }
    const lang = selectedLanguageRef.current;
    return lang === "bg" ? "Метаданните за компании са запазени." : "Company metadata saved.";
  }

  function researchAutosaveStatusToast(status: EditorAutosaveActivity): string | null {
    if (status !== "saved") {
      return null;
    }
    const lang = selectedLanguageRef.current;
    const tab = researchSidebarTabRef.current;
    if (tab === "companies") {
      return lang === "bg" ? "Компанията е запазена." : "Company saved.";
    }
    return lang === "bg" ? "Позицията е запазена." : "Job position saved.";
  }

  function setResearchAutosaveActivityVisible(status: EditorAutosaveActivity): void {
    if (researchAutosaveActivityTimerRef.current) {
      clearTimeout(researchAutosaveActivityTimerRef.current);
      researchAutosaveActivityTimerRef.current = null;
    }
    setResearchAutosaveActivity(status);
    const toastMessage = researchAutosaveStatusToast(status);
    if (toastMessage) {
      showComposerToast(toastMessage);
    }
    if (status === "saved") {
      researchAutosaveActivityTimerRef.current = setTimeout(() => {
        setResearchAutosaveActivity("idle");
        researchAutosaveActivityTimerRef.current = null;
      }, 2800);
    }
  }

  function setResearchAutoSavePreference(enabled: boolean): void {
    setResearchAutoSaveEnabled(enabled);
    researchAutoSaveEnabledRef.current = enabled;
    try {
      window.localStorage.setItem(STORAGE_KEYS.researchAutoSave, enabled ? "1" : "0");
    } catch {
      // ignore
    }
    if (!enabled) {
      clearResearchAutosaveTimers();
    }
  }

  function scheduleResearchAutosave(): void {
    if (!researchAutoSaveEnabledRef.current || !pendingResearchDraftRef.current) {
      return;
    }
    if (researchAutosaveTimerRef.current) {
      clearTimeout(researchAutosaveTimerRef.current);
    }
    setResearchAutosaveActivityVisible("pending");
    researchAutosaveTimerRef.current = setTimeout(() => {
      researchAutosaveTimerRef.current = null;
      void flushResearchAutosave();
    }, TEXT_FIELD_AUTOSAVE_MS);
  }

  const handleResearchDraftChange = useCallback(
    (draft: ResearchedCompany | ResearchedJobPosition, entityType: "company" | "job_position") => {
      pendingResearchDraftRef.current = { draft, entityType };
      scheduleResearchAutosave();
    },
    [],
  );

  function setCompanyMetadataAutosaveActivityVisible(status: EditorAutosaveActivity): void {
    if (companyMetadataAutosaveActivityTimerRef.current) {
      clearTimeout(companyMetadataAutosaveActivityTimerRef.current);
      companyMetadataAutosaveActivityTimerRef.current = null;
    }
    setCompanyMetadataAutosaveActivity(status);
    const toastMessage = companyMetadataAutosaveStatusToast(status);
    if (toastMessage) {
      showComposerToast(toastMessage);
    }
    if (status === "saved") {
      companyMetadataAutosaveActivityTimerRef.current = setTimeout(() => {
        setCompanyMetadataAutosaveActivity("idle");
        companyMetadataAutosaveActivityTimerRef.current = null;
      }, 2800);
    }
  }

  function scheduleCompanyMetadataAutosave(): void {
    if (!companyMetadataAutoSaveEnabledRef.current) {
      return;
    }
    if (companyMetadataAutosaveTimerRef.current) {
      clearTimeout(companyMetadataAutosaveTimerRef.current);
    }
    setCompanyMetadataAutosaveActivityVisible("pending");
    companyMetadataAutosaveTimerRef.current = setTimeout(() => {
      companyMetadataAutosaveTimerRef.current = null;
      void flushCompanyMetadataAutosave();
    }, TEXT_FIELD_AUTOSAVE_MS);
  }

  const handleCompanyMetadataYamlDraftChange = useCallback((value: string) => {
    setCompanyMetadataYamlDraft(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setCompanyMetadataDraft({ companies: [] });
      scheduleCompanyMetadataAutosave();
      return;
    }
    try {
      setCompanyMetadataDraft(parseYaml(value));
      scheduleCompanyMetadataAutosave();
    } catch {
      // Keep draft until YAML parses.
    }
  }, []);

  const handleCompanyMetadataEditorViewChange = useCallback((view: EditorViewMode) => {
    if (view === "form") {
      const trimmed = companyMetadataYamlDraft.trim();
      if (trimmed) {
        try {
          setCompanyMetadataDraft(parseYaml(companyMetadataYamlDraft));
        } catch {
          // Keep existing draft.
        }
      }
    }
    setCompanyMetadataEditorView(view);
  }, [companyMetadataYamlDraft]);

  const settingsCreditCompact = useMemo<string>(() => {
    const quota = aiProviders.aiSettings?.quotas[0];
    if (quota?.available && quota.remaining !== null) {
      return `${quota.remaining.toFixed(2)} ${quota.unit} left`;
    }
    if (aiProviders.loading) return "checking...";
    return "AI quota n/a";
  }, [aiProviders.aiSettings?.quotas, aiProviders.loading]);

  function switchLanguage(language: string) {
    setSelectedLanguage(language);
    const next = variantGroup?.[language];
    if (next?.id) {
      setSelectedCvId(next.id);
      setPreviewNonce(Date.now());
    }
  }

  function switchCvPair(pairKey: string) {
    const pair = cvPairs.find((entry) => entry.key === pairKey);
    if (!pair) {
      return;
    }
    const next = pair.variants[selectedLanguage]
      ?? pair.variants.en
      ?? cvItems.find((item) => item.id === pair.preferredCvId)
      ?? Object.values(pair.variants)[0]
      ?? null;
    if (next?.id) {
      setSelectedCvId(next.id);
      writePersistedWorkspacePrefs({
        cvId: next.id,
        cvPairKey: pairKey,
        language: (next.language ?? selectedLanguage).toLowerCase(),
      });
      setPreviewNonce(Date.now());
    }
  }

  function openLanguageModal() {
    const firstOption = languageOptionChoices.find((option) => !availableLanguages.includes(option.code))
      ?? languageOptionChoices[0];
    setLanguageModalSelection(firstOption.code);
    setLanguageModalOpen(true);
  }

  async function createLanguageVariant() {
    if (!selectedCvId || !languageModalSelection || creatingLanguage) {
      return;
    }
    if (availableLanguages.includes(languageModalSelection)) {
      setEditorNotice(`Language ${languageModalSelection.toUpperCase()} already exists for this CV.`);
      setLanguageModalOpen(false);
      return;
    }

    const wantsAiTranslation = window.confirm(
      `Create ${languageModalSelection.toUpperCase()} with AI translation (if OpenRouter is configured)?`,
    );

    setCreatingLanguage(true);
    setEditorNotice("");
    try {
      const response = await fetch("/api/cvs/variant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceCvId: selectedCvId,
          targetLanguage: languageModalSelection,
          aiTranslate: wantsAiTranslation,
        }),
      });
      const payload = (await response.json()) as { error?: string; cvId?: string; created?: boolean };
      if (!response.ok || payload.error) {
        setEditorNotice(payload.error ?? "Failed to create language variant.");
        return;
      }

      const cvsRes = await fetch("/api/cvs");
      const cvsPayload = (await cvsRes.json()) as CvListResponse;
      const nextItems = cvsPayload.items ?? [];
      setCvItems(nextItems);

      const nextCvId = payload.cvId ?? "";
      const nextMeta = nextItems.find((item) => item.id === nextCvId);
      if (nextCvId) {
        setSelectedCvId(nextCvId);
      }
      if (nextMeta?.language) {
        setSelectedLanguage(nextMeta.language.toLowerCase());
      } else if (languageModalSelection) {
        setSelectedLanguage(languageModalSelection);
      }
      setPreviewNonce(Date.now());
      setLanguageModalOpen(false);
      setEditorNotice(payload.created ? "Language variant created." : "Language variant already existed.");
    } catch {
      setEditorNotice("Failed to create language variant.");
    } finally {
      setCreatingLanguage(false);
    }
  }

  function updateDraftAt(path: PathSegment[], value: unknown) {
    setSectionDraft((current: unknown) => {
      const next = setAtPath(current, path, value);
      setYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleEditorAutosave();
  }

  async function persistEditorSectionDraft(): Promise<boolean> {
    const cv = editorCvRef.current;
    const cvId = selectedCvIdRef.current;
    const sectionKey = editorPathRef.current;
    if (!cv || !cvId) {
      return false;
    }

    let parsedSection = resolveSectionDraftForForm(
      sectionKey,
      sectionDraftRef.current,
      yamlDraftRef.current,
    );
    if (editorViewRef.current === "yaml") {
      try {
        parsedSection = coerceSectionDraftForEditorPath(sectionKey, parseYaml(yamlDraftRef.current));
      } catch {
        return false;
      }
    }

    let updated = setByPath(cv, sectionKey, parsedSection) as Record<string, unknown>;
    if (sectionKey === "metadata") {
      const visibility = readTemplateVisibility(cv);
      if (Object.keys(visibility).length > 0) {
        updated = writeTemplateVisibility(updated, visibility);
      }
    }

    const response = await fetch(`/api/cvs/${encodeURIComponent(cvId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cv: updated }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setEditorNotice(payload.error ?? (uiIsBg(uiLanguageRef.current) ? "Грешка при запис." : "Save failed."));
      return false;
    }
    setEditorCv(updated);
    setPreviewNonce(Date.now());
    syncEditorSavedFingerprintFromDraft();
    return true;
  }

  async function runPendingEditorFieldTranslations(generation: number): Promise<void> {
    const pending = pendingTextFieldAutosaveRef.current;
    if (!pending || editorViewRef.current !== "form") {
      return;
    }

    const trimmed = pending.value.trim();
    if (!trimmed) {
      return;
    }

    const sourceLanguage = selectedLanguageRef.current;
    const translateTargets = LANGUAGE_OPTIONS.map((entry) => entry.code).filter(
      (code) => code !== sourceLanguage,
    );
    const variantMap = variantGroupRef.current;
    const jobs = translateTargets
      .map((code) => {
        const variantId = variantMap?.[code]?.id;
        if (!variantId) {
          return null;
        }
        return { code, variantId };
      })
      .filter((entry): entry is { code: string; variantId: string } => entry !== null);

    if (jobs.length === 0) {
      return;
    }

    const fieldPath = serializeFieldPath(pending.path);
    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        const response = await fetch("/api/cvs/translate-field", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceCvId: selectedCvIdRef.current,
            targetCvId: job.variantId,
            targetLanguage: job.code,
            sectionPath: editorPathRef.current,
            fieldPath,
            text: trimmed,
            fieldLabel: pending.fieldLabel,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          skipped?: boolean;
          targetLanguageLabel?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Translation failed.");
        }
        return { code: job.code, skipped: Boolean(payload.skipped) };
      }),
    );

    if (generation !== textFieldAutosaveGenerationRef.current) {
      return;
    }

    const completedLabels: string[] = [];
    let failedCount = 0;
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const job = jobs[index];
      if (result.status === "rejected") {
        failedCount += 1;
        console.error(
          `[translate-field] ${job.code} failed:`,
          result.reason instanceof Error ? result.reason.message : result.reason,
        );
        continue;
      }
      if (result.value.skipped) {
        continue;
      }
      const label =
        LANGUAGE_OPTIONS.find((entry) => entry.code === job.code)?.label ?? job.code.toUpperCase();
      completedLabels.push(label);
    }

    if (completedLabels.length > 0) {
      const labelList = completedLabels.join(", ");
      showComposerToast(
        uiIsBg(uiLanguageRef.current)
          ? `Преводът на полето е готов: ${labelList}.`
          : `Field translation complete: ${labelList}.`,
      );
    } else if (failedCount > 0) {
      const firstError = results.find((entry) => entry.status === "rejected");
      const detail =
        firstError && firstError.status === "rejected" && firstError.reason instanceof Error
          ? firstError.reason.message
          : null;
      showComposerToast(
        uiIsBg(uiLanguageRef.current)
          ? detail
            ? `Преводът на полето не успя: ${detail}`
            : "Преводът на полето не успя."
          : detail
            ? `Field translation failed: ${detail}`
            : "Field translation failed.",
      );
    }
  }

  async function flushTextFieldAutosave(): Promise<void> {
    if (!editorAutoSaveEnabledRef.current) {
      return;
    }

    const generation = textFieldAutosaveGenerationRef.current + 1;
    textFieldAutosaveGenerationRef.current = generation;

    setEditorAutosaveActivityVisible("saving");
    setEditorSaving(true);
    try {
      const saved = await persistEditorSectionDraft();
      if (generation !== textFieldAutosaveGenerationRef.current) {
        return;
      }
      if (!saved) {
        setEditorAutosaveActivityVisible("idle");
        return;
      }

      setEditorAutosaveActivityVisible("saved");
      await runPendingEditorFieldTranslations(generation);
    } finally {
      if (generation === textFieldAutosaveGenerationRef.current) {
        setEditorSaving(false);
      }
    }
  }

  function updateTextDraftAt(
    path: PathSegment[],
    value: string,
    meta: { fieldLabel: string },
  ): void {
    setSectionDraft((current: unknown) => {
      const next = setAtPath(current, path, value);
      const yaml = stringifyYaml(next ?? {});
      yamlDraftRef.current = yaml;
      sectionDraftRef.current = next;
      setYamlDraft(yaml);
      return next;
    });
    pendingTextFieldAutosaveRef.current = {
      path,
      fieldLabel: meta.fieldLabel,
      value,
    };
    if (!editorAutoSaveEnabledRef.current) {
      return;
    }
    scheduleEditorAutosave();
  }

  function applyEditorFieldText(
    path: PathSegment[],
    value: string,
    meta: { fieldLabel: string },
  ): void {
    const current = String(getAtPath(sectionDraftRef.current, path) ?? "");
    if (value === current) {
      return;
    }
    updateTextDraftAt(path, value, meta);
  }

  function removeDraftAt(path: PathSegment[]) {
    setSectionDraft((current: unknown) => {
      let next = removeAtPath(current, path);
      const last = path[path.length - 1];
      if (typeof last === "string") {
        const parentPath = path.slice(0, -1);
        const parent = asRecord(getAtPath(next, parentPath));
        const defs = asRecord(parent?.[CUSTOM_FIELD_DEFS_KEY]);
        if (defs && last in defs) {
          const nextDefs = { ...defs };
          delete nextDefs[last];
          next = setAtPath(next, [...parentPath, CUSTOM_FIELD_DEFS_KEY], nextDefs);
        }
      }
      setYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleEditorAutosave();
  }

  function addArrayEntry(path: PathSegment[], sample: unknown) {
    setSectionDraft((current: unknown) => {
      const next = appendToArrayAtPath(current, path, sample);
      setYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleEditorAutosave();
  }

  function addCustomObjectField(path: PathSegment[]) {
    setAddCustomFieldTarget({ scope: "section", path });
  }

  function submitAddCustomObjectField(payload: AddCustomFieldPayload): void {
    const target = addCustomFieldTarget;
    if (!target) {
      return;
    }
    const apply =
      target.scope === "section"
        ? (updater: (current: unknown) => unknown) => {
            setSectionDraft((current: unknown) => {
              const next = updater(current);
              setYamlDraft(stringifyYaml(next ?? {}));
              return next;
            });
            scheduleEditorAutosave();
          }
        : (updater: (current: unknown) => unknown) => {
            setCompanyMetadataDraft((current: unknown) => {
              const next = updater(current);
              setCompanyMetadataYamlDraft(stringifyYaml(next ?? {}));
              return next;
            });
          };

    apply((current: unknown) => {
      let next = setAtPath(current, [...target.path, payload.key], payload.value);
      const parent = asRecord(getAtPath(next, target.path));
      const defs = asRecord(parent?.[CUSTOM_FIELD_DEFS_KEY]) ?? {};
      next = setAtPath(next, [...target.path, CUSTOM_FIELD_DEFS_KEY], {
        ...defs,
        [payload.key]: {
          type: payload.type,
          ...(payload.options.length > 0 ? { options: payload.options } : {}),
        },
      });
      return next;
    });
    setAddCustomFieldTarget(null);
  }

  function addCustomArrayEntry(path: PathSegment[]) {
    const value = window.prompt(uiIsBg(uiLanguage) ? "Стойност за нов запис" : "Value for new entry", "");
    if (value === null) return;
    setSectionDraft((current: unknown) => {
      const next = appendToArrayAtPath(current, path, value);
      setYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleEditorAutosave();
  }

  function toggleAnalysisCompanySelection(companyId: string) {
    setAnalysisCompanyIds((current) =>
      current.includes(companyId)
        ? current.filter((entry) => entry !== companyId)
        : [...current, companyId],
    );
  }

  function updateCompanyMetadataDraftAt(path: PathSegment[], value: unknown) {
    setCompanyMetadataDraft((current: unknown) => {
      const next = setAtPath(current, path, value);
      const yaml = stringifyYaml(next ?? {});
      companyMetadataDraftRef.current = next;
      companyMetadataYamlDraftRef.current = yaml;
      setCompanyMetadataYamlDraft(yaml);
      return next;
    });
    scheduleCompanyMetadataAutosave();
  }

  function applyCompanyMetadataFieldText(path: PathSegment[], value: string): void {
    const current = String(getAtPath(companyMetadataDraftRef.current, path) ?? "");
    if (value === current) {
      return;
    }
    updateCompanyMetadataDraftAt(path, value);
  }

  function removeCompanyMetadataDraftAt(path: PathSegment[]) {
    setCompanyMetadataDraft((current: unknown) => {
      let next = removeAtPath(current, path);
      const last = path[path.length - 1];
      if (typeof last === "string") {
        const parentPath = path.slice(0, -1);
        const parent = asRecord(getAtPath(next, parentPath));
        const defs = asRecord(parent?.[CUSTOM_FIELD_DEFS_KEY]);
        if (defs && last in defs) {
          const nextDefs = { ...defs };
          delete nextDefs[last];
          next = setAtPath(next, [...parentPath, CUSTOM_FIELD_DEFS_KEY], nextDefs);
        }
      }
      setCompanyMetadataYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleCompanyMetadataAutosave();
  }

  function addCompanyMetadataArrayEntry(path: PathSegment[], pathLabel: string, sample: unknown) {
    setCompanyMetadataDraft((current: unknown) => {
      const next = appendToArrayAtPath(current, path, defaultArrayEntry(pathLabel, sample));
      setCompanyMetadataYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleCompanyMetadataAutosave();
  }

  function addCompanyMetadataCustomObjectField(path: PathSegment[]) {
    setAddCustomFieldTarget({ scope: "company-metadata", path });
  }

  function addCompanyMetadataCustomArrayEntry(path: PathSegment[]) {
    const value = window.prompt("Value for new entry", "");
    if (value === null) return;
    setCompanyMetadataDraft((current: unknown) => {
      const next = appendToArrayAtPath(current, path, value);
      setCompanyMetadataYamlDraft(stringifyYaml(next ?? {}));
      return next;
    });
    scheduleCompanyMetadataAutosave();
  }

  const templateVisibility = useMemo(
    () => (editorCv ? readTemplateVisibility(editorCv) : {}),
    [editorCv],
  );

  async function toggleTemplateVisibility(visibilityKey: string): Promise<void> {
    if (!editorCv || !selectedCvId) {
      return;
    }
    const key = visibilityKey.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");
    const currentlyVisible = isTemplatePathVisible(key, templateVisibility);
    const nextMap = { ...templateVisibility };
    if (currentlyVisible) {
      nextMap[key] = false;
    } else {
      delete nextMap[key];
    }
    const updated = writeTemplateVisibility(editorCv, nextMap);
    setEditorCv(updated);
    setEditorNotice("");
    try {
      const response = await fetch(`/api/cvs/${encodeURIComponent(selectedCvId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cv: updated }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setEditorNotice(payload.error ?? (uiIsBg(uiLanguage) ? "Грешка при запис." : "Save failed."));
        return;
      }
      setPreviewNonce(Date.now());
    } catch {
      setEditorNotice(uiIsBg(uiLanguage) ? "Грешка при запис на видимост." : "Failed to save visibility.");
    }
  }

  useEffect(() => {
    if (activePanel === "editor") {
      setAnalysisDrawerCollapsed(true);
    }
  }, [activePanel]);

  const formRenderer = useEditorFormRenderer({
    resolvedTheme,
    selectedCvId,
    selectedLanguage,
    uiLanguage,
    editorPath,
    selectedTemplateId,
    onEditorNotice: setEditorNotice,
    analysisDrawerCollapsed,
    templateVisibility,
    onToggleTemplateVisibility: (pathKey: string) => {
      void toggleTemplateVisibility(pathKey);
    },
    expandedFormNodes,
    setExpandedFormNodes,
    updateDraftAt,
    updateTextDraftAt,
    applyEditorFieldText,
    removeDraftAt,
    addArrayEntry,
    addCustomObjectField,
    addCustomArrayEntry,
    updateCompanyMetadataDraftAt,
    applyCompanyMetadataFieldText,
    removeCompanyMetadataDraftAt,
    addCompanyMetadataArrayEntry,
    addCompanyMetadataCustomObjectField,
    addCompanyMetadataCustomArrayEntry,
    yamlHighlightRef,
    yamlDraft,
    setYamlDraft,
    sectionDraft,
    companyMetadataDraft,
    analysisCompanySource,
    onCompanyMetadataNotice: setCompanyMetadataNotice,
    editorWeightedKeywords,
    editorAtsKeywords,
    editorSubsectionIndentEnabled: !editorFlatSubsections,
    selectedResearchJobPositionId,
  });

  async function persistCompanyMetadataDraft(): Promise<boolean> {
    let parsedDocument = companyMetadataDraftRef.current;
    if (companyMetadataEditorViewRef.current === "yaml") {
      try {
        parsedDocument = parseYaml(companyMetadataYamlDraftRef.current);
      } catch {
        setCompanyMetadataNotice("Invalid YAML.");
        return false;
      }
    }

    try {
      const response = await fetch(
        `/api/companies?source=${encodeURIComponent(analysisCompanySourceRef.current)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ document: parsedDocument }),
        },
      );
      const payload = (await response.json()) as CompanyMetadataDocumentResponse;
      if (!response.ok || !payload.ok) {
        setCompanyMetadataNotice(payload.error ?? "Failed to save company metadata.");
        return false;
      }
      const document = payload.document ?? { companies: [] };
      setCompanyMetadataDraft(document);
      setCompanyMetadataYamlDraft(stringifyYaml(document));
      syncCompanyMetadataSavedFingerprintFromDraft();
      await loadAnalysisCompanies();
      return true;
    } catch {
      setCompanyMetadataNotice("Failed to save company metadata.");
      return false;
    }
  }

  async function flushCompanyMetadataAutosave(): Promise<void> {
    if (!companyMetadataAutoSaveEnabledRef.current) {
      return;
    }

    setCompanyMetadataAutosaveActivityVisible("saving");
    setCompanyMetadataSaving(true);
    setCompanyMetadataNotice("");
    try {
      const saved = await persistCompanyMetadataDraft();
      if (!saved) {
        setCompanyMetadataAutosaveActivityVisible("idle");
        return;
      }
      setCompanyMetadataAutosaveActivityVisible("saved");
    } finally {
      setCompanyMetadataSaving(false);
    }
  }

  async function saveCompanyMetadataSource() {
    setCompanyMetadataSaving(true);
    setCompanyMetadataNotice("");
    try {
      const saved = await persistCompanyMetadataDraft();
      if (saved) {
        setCompanyMetadataNotice("Company metadata saved.");
      }
    } finally {
      setCompanyMetadataSaving(false);
    }
  }

  async function importCompanyMetadataToResearchCatalog(): Promise<void> {
    setResearchCatalogLoading(true);
    setResearchNotice("");
    try {
      const response = await fetch("/api/research/catalog/import-metadata", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "both", skipExisting: true, importJobs: true }),
      });
      const payload = (await response.json()) as {
        error?: string;
        companies_added?: number;
        companies_skipped?: number;
        jobs_added?: number;
        companies?: ResearchedCompany[];
        job_positions?: ResearchedJobPosition[];
      };
      if (!response.ok) {
        setResearchNotice(
          payload.error ??
            (uiIsBg(uiLanguage) ? "Импортът не успя." : "Import failed."),
        );
        return;
      }
      if (payload.companies) setResearchCompanies(payload.companies);
      if (payload.job_positions) setResearchJobPositions(payload.job_positions);
      setResearchNotice(
        uiIsBg(uiLanguage)
          ? `Импорт: +${payload.companies_added ?? 0} компании, +${payload.jobs_added ?? 0} позиции (пропуснати ${payload.companies_skipped ?? 0}).`
          : `Imported +${payload.companies_added ?? 0} companies, +${payload.jobs_added ?? 0} jobs (skipped ${payload.companies_skipped ?? 0} existing).`,
      );
    } catch {
      setResearchNotice(uiIsBg(uiLanguage) ? "Импортът не успя." : "Import failed.");
    } finally {
      setResearchCatalogLoading(false);
    }
  }

  async function saveEditorSection() {
    if (!editorCv || !selectedCvId) {
      return;
    }

    let parsedSection = resolveSectionDraftForForm(editorPath, sectionDraft, yamlDraft);
    if (editorView === "yaml") {
      try {
        parsedSection = coerceSectionDraftForEditorPath(editorPath, parseYaml(yamlDraft));
      } catch {
        setEditorNotice(uiIsBg(uiLanguage) ? "Невалиден YAML." : "Invalid YAML.");
        return;
      }
    }

    setEditorSaving(true);
    setEditorNotice("");
    try {
      let updated = setByPath(editorCv, editorPath, parsedSection) as Record<string, unknown>;
      if (editorPath === "metadata") {
        const visibility = readTemplateVisibility(editorCv);
        if (Object.keys(visibility).length > 0) {
          updated = writeTemplateVisibility(updated, visibility);
        }
      }
      const response = await fetch(`/api/cvs/${encodeURIComponent(selectedCvId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cv: updated }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setEditorNotice(payload.error ?? (uiIsBg(uiLanguage) ? "Грешка при запис." : "Save failed."));
        return;
      }
      setEditorCv(updated);
      setPreviewNonce(Date.now());
      syncEditorSavedFingerprintFromDraft();
      const savedMessage =
        uiIsBg(uiLanguage) ? "Шаблонът на CV е запазен." : "CV template saved.";
      setEditorNotice(uiIsBg(uiLanguage) ? "Секцията е запазена." : "Section saved.");
      showComposerToast(savedMessage);
      const generation = textFieldAutosaveGenerationRef.current + 1;
      textFieldAutosaveGenerationRef.current = generation;
      await runPendingEditorFieldTranslations(generation);
    } finally {
      setEditorSaving(false);
    }
  }

  async function persistCvTargeting(next: {
    company_id?: string;
    job_id?: string;
  } | null): Promise<void> {
    if (!editorCv || !selectedCvId) {
      return;
    }
    const updated = writeCvTargeting(editorCv as Record<string, unknown>, next);
    setEditorCv(updated);
    try {
      await fetch(`/api/cvs/${encodeURIComponent(selectedCvId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cv: updated }),
      });
    } catch {
      // non-fatal; selection still works in session
    }
  }

  function selectResearchCompany(companyId: string) {
    clearResearchAutosaveTimers();
    setSelectedResearchCompanyId(companyId);
    setSelectedResearchJobPositionId("");
    // D1: no longer maps Research catalog ids into legacy metadata multi-select
    void persistCvTargeting(companyId ? { company_id: companyId, job_id: "" } : null);
  }

  function selectResearchJob(jobId: string) {
    clearResearchAutosaveTimers();
    setSelectedResearchJobPositionId(jobId);
    const job = researchJobPositions.find((entry) => entry.id === jobId);
    if (job) {
      setSelectedResearchCompanyId(job.company_id);
      void persistCvTargeting({ company_id: job.company_id, job_id: jobId });
    } else if (!jobId) {
      void persistCvTargeting(
        selectedResearchCompanyId
          ? { company_id: selectedResearchCompanyId, job_id: "" }
          : null,
      );
    }
  }

  function setResearchSidebarTabPersisted(tab: ResearchSidebarTab) {
    clearResearchAutosaveTimers();
    setResearchSidebarTab(tab);
  }

  async function persistResearchCompany(company: ResearchedCompany): Promise<boolean> {
    try {
      const response = await fetch(`/api/research/companies/${encodeURIComponent(company.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company }),
      });
      const body = (await response.json()) as { error?: string; companies?: ResearchedCompany[] };
      if (!response.ok) {
        setResearchNotice(body.error ?? "Could not save company.");
        return false;
      }
      if (body.companies) {
        setResearchCompanies(body.companies);
      } else {
        await loadResearchCatalog();
      }
      return true;
    } catch {
      setResearchNotice("Could not save company.");
      return false;
    }
  }

  async function persistResearchJob(job: ResearchedJobPosition): Promise<boolean> {
    try {
      const response = await fetch(`/api/research/job-positions/${encodeURIComponent(job.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job_position: job }),
      });
      const body = (await response.json()) as {
        error?: string;
        job_positions?: ResearchedJobPosition[];
      };
      if (!response.ok) {
        setResearchNotice(body.error ?? "Could not save job position.");
        return false;
      }
      if (body.job_positions) {
        setResearchJobPositions(body.job_positions);
      } else {
        await loadResearchCatalog();
      }
      return true;
    } catch {
      setResearchNotice("Could not save job position.");
      return false;
    }
  }

  async function flushResearchAutosave(): Promise<void> {
    if (!researchAutoSaveEnabledRef.current) {
      return;
    }
    const pending = pendingResearchDraftRef.current;
    if (!pending) {
      return;
    }

    setResearchAutosaveActivityVisible("saving");
    setSavingResearch(true);
    setResearchNotice("");
    try {
      const saved =
        pending.entityType === "company"
          ? await persistResearchCompany(pending.draft as ResearchedCompany)
          : await persistResearchJob(pending.draft as ResearchedJobPosition);
      if (!saved) {
        setResearchAutosaveActivityVisible("idle");
        return;
      }
      setResearchAutosaveActivityVisible("saved");
    } finally {
      setSavingResearch(false);
    }
  }

  async function saveResearchCompany(company: ResearchedCompany): Promise<void> {
    setSavingResearch(true);
    setResearchNotice("");
    try {
      const saved = await persistResearchCompany(company);
      if (saved) {
        showComposerToast(uiIsBg(uiLanguage) ? "Компанията е запазена." : "Company saved.");
      }
    } finally {
      setSavingResearch(false);
    }
  }

  async function saveResearchJob(job: ResearchedJobPosition): Promise<void> {
    setSavingResearch(true);
    setResearchNotice("");
    try {
      const saved = await persistResearchJob(job);
      if (saved) {
        showComposerToast(uiIsBg(uiLanguage) ? "Позицията е запазена." : "Job position saved.");
      }
    } finally {
      setSavingResearch(false);
    }
  }

  async function researchCompanyOffice(payload: {
    companyId?: string;
    companyName: string;
    officeCountry: string;
    officeCity?: string;
    officeLabel?: string;
    website?: string;
    linkedinCompanyUrl?: string;
    aboutText?: string;
    stages?: string[];
    useWebSearch?: boolean;
  }) {
    setResearchingCompany(true);
    setResearchNotice("");
    try {
      const response = await fetch("/api/research/companies/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId: payload.companyId,
          companyName: payload.companyName,
          officeCountry: payload.officeCountry,
          officeCity: payload.officeCity,
          officeLabel: payload.officeLabel,
          website: payload.website,
          linkedinCompanyUrl: payload.linkedinCompanyUrl,
          aboutText: payload.aboutText,
          stages: payload.stages ?? ["identity"],
          useWebSearch: payload.useWebSearch === true,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        company?: ResearchedCompany;
        companies?: ResearchedCompany[];
        cached?: boolean;
        useWebSearch?: boolean;
        stages?: string[];
      };
      if (!response.ok || !body.company) {
        setResearchNotice(body.error ?? "Company research failed.");
        return;
      }
      await loadResearchCatalog();
      selectResearchCompany(body.company.id);
      setResearchSidebarTab("companies");
      const updatedExisting = Boolean(payload.companyId);
      const viaWeb = body.useWebSearch === true;
      const cachedNote = body.cached
        ? uiIsBg(uiLanguage)
          ? " (кеш)"
          : " (cached)"
        : "";
      setResearchNotice(
        uiIsBg(uiLanguage)
          ? updatedExisting
            ? `Компанията „${body.company.name}“ е обновена${viaWeb ? " с Research" : ""}${cachedNote}.`
            : `Компанията „${body.company.name}“ е попълнена${viaWeb ? " с Research" : ""}${cachedNote}.`
          : updatedExisting
            ? `Updated company “${body.company.name}”${viaWeb ? " via Research" : ""}${cachedNote}.`
            : `Filled company “${body.company.name}”${viaWeb ? " via Research" : ""}${cachedNote}.`,
      );
      showComposerToast(
        uiIsBg(uiLanguage)
          ? updatedExisting
            ? "Компанията е обновена."
            : "Компанията е попълнена."
          : updatedExisting
            ? "Company updated."
            : "Company filled.",
      );
    } catch {
      setResearchNotice("Company research failed.");
    } finally {
      setResearchingCompany(false);
    }
  }

  async function researchJobPosition(payload: {
    companyId: string;
    jobTitle: string;
    jobDescription?: string;
    linkedinUrl?: string;
  }) {
    setResearchingJob(true);
    setResearchNotice("");
    try {
      const response = await fetch("/api/research/job-positions/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        error?: string;
        job_position?: ResearchedJobPosition;
      };
      if (!response.ok || !body.job_position) {
        setResearchNotice(body.error ?? "Job position research failed.");
        return;
      }
      await loadResearchCatalog();
      selectResearchCompany(payload.companyId);
      selectResearchJob(body.job_position.id);
      setResearchSidebarTab("job_positions");
      setResearchNotice(
        uiIsBg(uiLanguage)
          ? `Позицията „${body.job_position.title}“ е добавена.`
          : `Researched job “${body.job_position.title}”.`,
      );
      showComposerToast(
        uiIsBg(uiLanguage) ? "Позицията е проучена." : "Job position researched.",
      );
    } catch {
      setResearchNotice("Job position research failed.");
    } finally {
      setResearchingJob(false);
    }
  }

  async function deleteResearchCompany(companyId: string) {
    if (!companyId) {
      return;
    }
    try {
      await fetch(`/api/research/companies/${encodeURIComponent(companyId)}`, {
        method: "DELETE",
      });
      await loadResearchCatalog();
      if (selectedResearchCompanyId === companyId) {
        selectResearchCompany("");
      }
      showComposerToast(uiIsBg(uiLanguage) ? "Компанията е изтрита." : "Company deleted.");
    } catch {
      setResearchNotice("Could not delete company.");
    }
  }

  async function deleteResearchJob(jobId: string) {
    if (!jobId) {
      return;
    }
    try {
      await fetch(`/api/research/job-positions/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });
      await loadResearchCatalog();
      if (selectedResearchJobPositionId === jobId) {
        setSelectedResearchJobPositionId("");
      }
      showComposerToast(uiIsBg(uiLanguage) ? "Позицията е изтрита." : "Job position deleted.");
    } catch {
      setResearchNotice("Could not delete job position.");
    }
  }

  async function runAtsCheck() {
    if (!selectedCvId) {
      return;
    }
    setAtsCheckLoading(true);
    setAtsCheckText("");
    try {
      const response = await fetch("/api/analysis/ats-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cvId: selectedCvId,
          jobId: selectedResearchJobPositionId || undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        report?: {
          score: number;
          summary: { pass: number; warn: number; fail: number };
          items: Array<{ severity: string; title: string; detail: string }>;
        };
      };
      if (!response.ok || !payload.report) {
        setAtsCheckText(payload.error ?? "ATS check failed.");
        return;
      }
      const lines = [
        `ATS score ${payload.report.score} (pass ${payload.report.summary.pass} · warn ${payload.report.summary.warn} · fail ${payload.report.summary.fail})`,
        ...payload.report.items.map(
          (item) => `[${item.severity.toUpperCase()}] ${item.title}: ${item.detail}`,
        ),
      ];
      setAtsCheckText(lines.join("\n"));
      setAnalysisDrawerCollapsed(false);
    } catch {
      setAtsCheckText("ATS check failed.");
    } finally {
      setAtsCheckLoading(false);
    }
  }

  async function runAnalysis(scope: "section" | "full") {
    if (!selectedCvId || !selectedTemplateId) {
      return;
    }
    setAnalysisLoading(true);
    setAnalysisText("");
    setAnalysisData(null);
    try {
      const response = await fetch("/api/analysis/cv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cvId: selectedCvId,
          templateId: selectedTemplateId,
          scope,
          sectionKey: editorPath,
          jobPositionId: selectedResearchJobPositionId || undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        analysis?: unknown;
        raw?: string;
      };
      if (!response.ok) {
        setAnalysisText(payload.error ?? "AI scoring failed.");
        return;
      }
      if (payload.analysis && typeof payload.analysis === "object") {
        setAnalysisData(payload.analysis as SectionAnalysis | FullAnalysis);
        return;
      }
      setAnalysisText(JSON.stringify(payload.analysis ?? payload.raw ?? {}, null, 2));
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function openSyncModal() {
    if (!selectedCvId || availableLanguages.length < 2) {
      setEditorNotice("At least two language variants are required to sync.");
      return;
    }
    setSyncModalLoading(true);
    setEditorNotice("");
    try {
      const response = await fetch("/api/cvs/sync/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvId: selectedCvId }),
      });
      const payload = (await response.json()) as SyncStatusResponse;
      if (!response.ok || payload.error) {
        setEditorNotice(payload.error ?? "Failed to load sync language status.");
        return;
      }
      const languageRows = payload.languages ?? [];
      if (languageRows.length < 2) {
        setEditorNotice("At least two language variants are required to sync.");
        return;
      }
      setSyncStatus(payload);
      const defaultSource = languageRows.find((item) => item.language === selectedLanguage)?.language
        ?? languageRows[0].language;
      const defaultTarget = languageRows.find((item) => item.language !== defaultSource)?.language
        ?? "";
      setSyncSourceSelection(defaultSource);
      setSyncTargetSelection(defaultTarget);
      setSyncModalOpen(true);
    } catch {
      setEditorNotice("Failed to load sync language status.");
    } finally {
      setSyncModalLoading(false);
    }
  }

  async function syncLanguagePair() {
    if (!selectedCvId || !syncSourceSelection || !syncTargetSelection) {
      setEditorNotice("Select source and target languages to run sync.");
      return;
    }
    if (syncSourceSelection === syncTargetSelection) {
      setEditorNotice("Source and target languages must be different.");
      return;
    }
    setSyncing(true);
    setEditorNotice("");
    try {
      const response = await fetch("/api/cvs/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cvId: selectedCvId,
          sourceLanguage: syncSourceSelection,
          targetLanguage: syncTargetSelection,
        }),
      });
      const payload = (await response.json()) as SyncResponse;
      if (!response.ok) {
        setEditorNotice(payload.error ?? "SYNC failed.");
        return;
      }

      setEditorNotice(payload.message ?? (payload.changed ? "SYNC completed." : "No missing fields to sync."));
      setSyncReport({
        open: true,
        direction: payload.direction ?? `${syncSourceSelection.toUpperCase()} -> ${syncTargetSelection.toUpperCase()}`,
        sourceCvId: payload.sourceCvId ?? selectedCvId,
        targetCvId: payload.targetCvId ?? "",
        changed: Boolean(payload.changed),
        changes: payload.changes ?? [],
        message: payload.message ?? (payload.changed ? "Missing fields synced and translated." : "No missing fields found."),
      });

      if (payload.changed) {
        const targetLang = syncTargetSelection;
        const targetVariant = variantGroup?.[targetLang];
        if (targetVariant) {
          setSelectedCvId(targetVariant.id);
          setSelectedLanguage(targetLang);
        }
      }
      setSyncModalOpen(false);
      setPreviewNonce(Date.now());
    } finally {
      setSyncing(false);
    }
  }



  function refreshPreview() {
    setPreviewNonce(Date.now());
  }

  useEffect(() => {
    if (editorView !== "yaml") {
      setYamlLintIssues([]);
      return;
    }
    const handle = window.setTimeout(() => {
      const trimmed = yamlDraft.trim();
      if (!trimmed) {
        setYamlLintIssues([]);
        return;
      }
      setYamlLintIssues(extractYamlLintIssuesFromDocument(yamlDraft));
    }, 800);
    return () => window.clearTimeout(handle);
  }, [editorView, yamlDraft]);

  useEffect(() => {
    if (companyMetadataEditorView !== "yaml") {
      setCompanyMetadataYamlLintIssues([]);
      return;
    }
    const handle = window.setTimeout(() => {
      const trimmed = companyMetadataYamlDraft.trim();
      if (!trimmed) {
        setCompanyMetadataYamlLintIssues([]);
        return;
      }
      setCompanyMetadataYamlLintIssues(extractYamlLintIssuesFromDocument(companyMetadataYamlDraft));
    }, 800);
    return () => window.clearTimeout(handle);
  }, [companyMetadataEditorView, companyMetadataYamlDraft]);

  function openPdf() {
    if (!pdfUrl) {
      return;
    }
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  function downloadPdf() {
    if (!pdfUrl) {
      return;
    }
    const url = new URL(pdfUrl, window.location.origin);
    url.searchParams.set("download", "1");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  function setPrintTweakEnabled(
    tweakId: "intelligentPagination" | "removePhoto" | "moveSkillsLeft",
    enabled: boolean,
  ): void {
    if (tweakId === "intelligentPagination") {
      setPrintTweakIntelligentPagination(enabled);
    } else if (tweakId === "removePhoto") {
      setPrintTweakRemovePhoto(enabled);
    } else {
      setPrintTweakMoveSkillsLeft(enabled);
    }
    setPreviewNonce(Date.now());
  }

  function setPrintTextScaleEnabled(
    target: "sidebar" | "content",
    enabled: boolean,
  ): void {
    if (target === "sidebar") {
      setPrintTweakSidebarTextScaleEnabled(enabled);
    } else {
      setPrintTweakContentTextScaleEnabled(enabled);
    }
    setPreviewNonce(Date.now());
  }

  function setPrintTextScaleValue(target: "sidebar" | "content", value: number): void {
    const clamped = clampPrintTextScale(value);
    if (target === "sidebar") {
      setPrintTweakSidebarTextScale(clamped);
    } else {
      setPrintTweakContentTextScale(clamped);
    }
    setPreviewNonce(Date.now());
  }

  function adjustPrintTextScale(
    target: "sidebar" | "content",
    direction: -1 | 1,
  ): void {
    if (target === "sidebar") {
      setPrintTweakSidebarTextScale((current) => stepPrintTextScale(current, direction));
    } else {
      setPrintTweakContentTextScale((current) => stepPrintTextScale(current, direction));
    }
    setPreviewNonce(Date.now());
  }

  const addPhotoBoothFiles = useCallback(async (files: FileList | File[]): Promise<void> => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (accepted.length === 0) {
      setPhotoBoothNotice("No image files detected.");
      return;
    }
    const form = new FormData();
    for (const file of accepted) {
      form.append("files", file);
    }
    const response = await fetch("/api/photos", {
      method: "POST",
      body: form,
    });
    const payload = (await response.json()) as PhotoBoothListResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "Could not upload images.");
    }
    await loadPhotoBoothGallery();
    setPhotoBoothNotice(`Added ${accepted.length} image${accepted.length > 1 ? "s" : ""} to Photo Booth.`);
    setPreviewNonce(Date.now());
  }, [loadPhotoBoothGallery]);

  async function handlePhotoBoothInput(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      await addPhotoBoothFiles(files);
    } catch (error) {
      setPhotoBoothNotice(error instanceof Error ? error.message : "Could not import image.");
    } finally {
      event.currentTarget.value = "";
    }
  }

  const addPhotoBoothFromClipboard = useCallback(async (clipboardData: DataTransfer | null): Promise<void> => {
    if (!clipboardData) return;
    const files = Array.from(clipboardData.items ?? [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file instanceof File);
    if (files.length === 0) {
      return;
    }
    try {
      await addPhotoBoothFiles(files);
      setPhotoBoothNotice(`Pasted ${files.length} image${files.length > 1 ? "s" : ""} from clipboard.`);
    } catch (error) {
      setPhotoBoothNotice(error instanceof Error ? error.message : "Could not paste image from clipboard.");
    }
  }, [addPhotoBoothFiles]);

  useEffect(() => {
    let cancelled = false;
    async function migrateLegacyPhotoBoothStorage(): Promise<void> {
      const filesToUpload: File[] = [];
      let migratedCount = 0;
      try {
        for (const key of LEGACY_PHOTO_STORAGE_KEYS) {
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          const parsed: unknown = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            window.localStorage.removeItem(key);
            continue;
          }
          for (const [index, entry] of parsed.entries()) {
            const record = asRecord(entry);
            const dataUrl =
              typeof record?.dataUrl === "string" ? record.dataUrl.trim() : "";
            if (!dataUrl.startsWith("data:image/")) continue;
            const legacyName =
              typeof record?.name === "string" && record.name.trim().length > 0
                ? record.name.trim()
                : `legacy-photo-${Date.now()}-${index}.jpg`;
            filesToUpload.push(await dataUrlToFile(dataUrl, legacyName));
            migratedCount += 1;
          }
          window.localStorage.removeItem(key);
        }
      } catch {
        return;
      }
      if (cancelled || filesToUpload.length === 0) return;
      try {
        await addPhotoBoothFiles(filesToUpload);
        setPhotoBoothNotice(`Migrated ${migratedCount} legacy photo${migratedCount > 1 ? "s" : ""} into /photos.`);
      } catch {
        // keep silent to avoid noisy startup failures
      }
    }
    void migrateLegacyPhotoBoothStorage();
    return () => {
      cancelled = true;
    };
  }, [addPhotoBoothFiles]);

  useEffect(() => {
    if (activePanel !== "photo_booth") {
      return;
    }
    const onPaste = (event: ClipboardEvent) => {
      void addPhotoBoothFromClipboard(event.clipboardData);
    };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, [activePanel, addPhotoBoothFromClipboard]);

  function handlePhotoBoothDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setPhotoBoothDragging(false);
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    void addPhotoBoothFiles(files);
  }

  function approvePhotoBoothItem(id: string): void {
    const nextId = approvedPhotoId === id ? "" : id;
    setApprovedPhotoId(nextId);
    setPhotoBoothNotice(
      nextId
        ? "Approved image will be used in CV preview/export."
        : "Photo approval removed.",
    );
    setPreviewNonce(Date.now());
  }

  async function removePhotoBoothItem(id: string): Promise<void> {
    const response = await fetch(`/api/photos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "Could not delete photo.");
    }
    await loadPhotoBoothGallery();
    if (approvedPhotoId === id) {
      setApprovedPhotoId("");
      setPreviewNonce(Date.now());
    }
    if (photoBoothAnalysisFocusId === id) {
      setPhotoBoothAnalysisFocusId("");
    }
    setPhotoBoothCompareIds((current) => current.filter((entry) => entry !== id));
    setPhotoBoothComparison(null);
    setPhotoBoothComparisonHistory([]);
    setPhotoBoothNotice("Photo deleted from /photos.");
  }

  function togglePhotoCompareSelection(id: string): void {
    setPhotoBoothCompareIds((current) => {
      if (current.includes(id)) {
        return current.filter((entry) => entry !== id);
      }
      return [...current, id];
    });
  }

  async function resolvePhotoDataUrl(id: string): Promise<{ dataUrl: string; name: string }> {
    const response = await fetch(`/api/photos?id=${encodeURIComponent(id)}`);
    const payload = (await response.json()) as PhotoBoothListResponse & {
      item?: PhotoBoothItem;
    };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "Could not load photo.");
    }
    const item =
      payload.item ??
      (Array.isArray(payload.items) ? payload.items.find((entry) => entry.id === id) : undefined);
    if (!item?.dataUrl?.startsWith("data:image/")) {
      throw new Error("Selected photo no longer exists. Please reselect an image.");
    }
    return { dataUrl: item.dataUrl, name: item.name };
  }

  async function analyzePhotoBoothItem(id: string): Promise<void> {
    if (!id) return;
    setPhotoBoothAnalyzingId(id);
    setPhotoBoothAnalysisFocusId(id);
    try {
      const item = await resolvePhotoDataUrl(id);
      const response = await fetch("/api/analysis/photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photoId: id,
          imageDataUrl: item.dataUrl,
          fileName: item.name,
        }),
      });
      const payload = (await response.json()) as PhotoBoothAnalysisResponse;
      if (!response.ok || !payload.ok || !payload.analysis) {
        const message =
          payload.error ??
          (payload.status === 400
            ? "Configure OpenRouter API key before AI image analysis."
            : "AI image analysis failed.");
        throw new Error(message);
      }
      const nextAnalysis: PhotoBoothAnalysis = {
        score: Number.isFinite(Number(payload.analysis.score))
          ? Math.max(0, Math.min(100, Math.round(Number(payload.analysis.score))))
          : 60,
        verdict:
          payload.analysis.verdict ??
          classifyVerdict(Number(payload.analysis.score ?? 0)),
        notes:
          Array.isArray(payload.analysis.notes) && payload.analysis.notes.length > 0
            ? payload.analysis.notes
            : ["Image analyzed with multimodal model."],
        clothingProposals:
          Array.isArray(payload.analysis.clothingProposals) && payload.analysis.clothingProposals.length > 0
            ? payload.analysis.clothingProposals
            : [],
        analyzedAt: payload.analysis.analyzedAt ?? new Date().toISOString(),
        model: payload.analysis.model,
      };
      const nextHistory = Array.isArray(payload.history)
        ? payload.history
            .map((entry) => ({
              score: Number.isFinite(Number(entry.score))
                ? Math.max(0, Math.min(100, Math.round(Number(entry.score))))
                : 60,
              verdict: entry.verdict ?? classifyVerdict(Number(entry.score ?? 0)),
              notes: Array.isArray(entry.notes) ? entry.notes.map((note) => String(note ?? "").trim()).filter(Boolean) : [],
              clothingProposals: Array.isArray(entry.clothingProposals)
                ? entry.clothingProposals.map((note) => String(note ?? "").trim()).filter(Boolean)
                : [],
              analyzedAt: typeof entry.analyzedAt === "string" ? entry.analyzedAt : new Date().toISOString(),
              model: entry.model,
            }))
            .slice(0, 50)
        : [nextAnalysis];
      setPhotoBoothItems((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                analysis: nextAnalysis,
                analysisHistory: nextHistory,
              }
            : entry,
        ),
      );
      setPhotoBoothNotice("AI photo analysis completed.");
    } catch (error) {
      setPhotoBoothNotice(error instanceof Error ? error.message : "Photo analysis failed.");
    } finally {
      setPhotoBoothAnalyzingId("");
    }
  }

  async function comparePhotoBoothPair(): Promise<void> {
    if (photoBoothCompareIds.length < 2) return;
    setPhotoBoothCompareLoading(true);
    try {
      const selectedItems = await Promise.all(
        photoBoothCompareIds.map(async (id) => {
          const resolved = await resolvePhotoDataUrl(id);
          return { id, name: resolved.name, dataUrl: resolved.dataUrl };
        }),
      );
      if (selectedItems.length < 2) {
        throw new Error("At least 2 selected photos are required for comparison.");
      }
      const response = await fetch("/api/analysis/photo/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          forceNew: true,
          imageIds: selectedItems.map((item) => item.id),
          images: selectedItems.map((item) => ({
            name: item.name,
            imageDataUrl: item.dataUrl,
          })),
        }),
      });
      const payload = (await response.json()) as PhotoBoothCompareResponse;
      if (!response.ok || !payload.ok || !payload.comparison) {
        const message =
          payload.error ??
          (payload.status === 400
            ? "Configure OpenRouter API key before AI image comparison."
            : "AI image comparison failed.");
        throw new Error(message);
      }
      setPhotoBoothComparison(payload.comparison);
      setPhotoBoothComparisonHistory(Array.isArray(payload.history) ? payload.history : [payload.comparison]);
      setPhotoBoothNotice("AI comparison completed.");
    } catch (error) {
      setPhotoBoothNotice(error instanceof Error ? error.message : "Photo comparison failed.");
    } finally {
      setPhotoBoothCompareLoading(false);
    }
  }





  return {
    activePanel,
    setActivePanel,
    themeMode,
    setThemeMode,
    openRouter,
    aiProviders,
    resolvedTheme,
    cvItems,
    templateItems,
    selectedCvId,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplateTheme,
    setSelectedTemplateTheme,
    selectedPhotoMode,
    setSelectedPhotoMode,
    printTweakIntelligentPagination,
    printTweakRemovePhoto,
    printTweakMoveSkillsLeft,
    printTweakSidebarTextScaleEnabled,
    printTweakSidebarTextScale,
    printTweakContentTextScaleEnabled,
    printTweakContentTextScale,
    setPrintTweakEnabled,
    setPrintTextScaleEnabled,
    setPrintTextScaleValue,
    adjustPrintTextScale,
    photoBoothItems,
    approvedPhotoId,
    photoBoothNotice,
    setPhotoBoothNotice,
    photoBoothDragging,
    setPhotoBoothDragging,
    photoBoothAnalyzingId,
    photoBoothAnalysisFocusId,
    setPhotoBoothAnalysisFocusId,
    photoBoothCompareIds,
    photoBoothCompareLoading,
    photoBoothComparison,
    photoBoothComparisonHistory,
    photoBoothDeleteConfirmId,
    setPhotoBoothDeleteConfirmId,
    photoBoothInputRef,
    previewNonce,
    loadingWorkspace,
    selectedLanguage,
    uiLanguage,
    setUiLanguage,
    languageModalOpen,
    setLanguageModalOpen,
    languageModalSelection,
    setLanguageModalSelection,
    creatingLanguage,
    editorTab,
    setEditorTab,
    editorView,
    setEditorView: handleEditorViewChange,
    sectionDraft: sectionFormDraft,
    yamlDraft,
    setYamlDraft: handleYamlDraftChange,
    yamlLintIssues,
    editorLoading,
    editorSaving,
    editorNotice,
    yamlTextareaRef,
    yamlHighlightRef,
    analysisLoading,
    analysisText,
    analysisData,
    analysisCompanySource,
    setAnalysisCompanySource,
    analysisCompanyIds,
    companyMetadataEditorOpen,
    setCompanyMetadataEditorOpen,
    companyMetadataEditorView,
    companyMetadataDraft,
    companyMetadataYamlDraft,
    setCompanyMetadataYamlDraft: handleCompanyMetadataYamlDraftChange,
    handleCompanyMetadataEditorViewChange,
    companyMetadataSaving,
    companyMetadataNotice,
    companyMetadataYamlLintIssues,
    analysisDrawerCollapsed,
    setAnalysisDrawerCollapsed,
    syncing,
    syncStatus,
    syncModalOpen,
    setSyncModalOpen,
    syncModalLoading,
    syncSourceSelection,
    setSyncSourceSelection,
    syncTargetSelection,
    setSyncTargetSelection,
    syncReport,
    setSyncReport,
    editorPath,
    mostRecentCv,
    orderedTemplateItems,
    pdfUrl,
    filteredAnalysisCompanies,
    analysisCostEstimate,
    cvPairs,
    cvTemplatesForLanguage,
    availableLanguages,
    selectedPairKey,
    languageOptionChoices,
    formRenderer,
    settingsCreditCompact,
    switchLanguage,
    switchCvPair,
    openLanguageModal,
    openSyncModal,
    refreshPreview,
    openPdf,
    downloadPdf,
    handlePhotoBoothDrop,
    handlePhotoBoothInput,
    addPhotoBoothFromClipboard,
    approvePhotoBoothItem,
    removePhotoBoothItem,
    togglePhotoCompareSelection,
    analyzePhotoBoothItem,
    comparePhotoBoothPair,
    saveCompanyMetadataSource,
    importCompanyMetadataToResearchCatalog,
    saveEditorSection,
    runAnalysis,
    runAtsCheck,
    atsCheckLoading,
    atsCheckText,
    toggleAnalysisCompanySelection,
    syncLanguagePair,
    createLanguageVariant,
    setAnalysisCompanyIds,
    addCustomFieldTarget,
    setAddCustomFieldTarget,
    submitAddCustomObjectField,
    composerToasts,
    dismissComposerToast,
    editorAutoSaveEnabled,
    setEditorAutoSavePreference,
    editorFlatSubsections,
    setEditorFlatSubsectionsPreference,
    editorAutosaveActivity,
    editorHasUnsavedChanges,

    companyMetadataAutoSaveEnabled,
    setCompanyMetadataAutoSavePreference,
    companyMetadataAutosaveActivity,
    companyMetadataHasUnsavedChanges,
    researchCompanies,
    researchJobPositions,
    selectedResearchCompanyId,
    selectedResearchJobPositionId,
    selectedResearchCompany,
    selectedResearchJob,
    researchJobsForCompany,
    editorWeightedKeywords,
    editorAtsKeywords,
    keywordGapReport,
    researchCatalogLoading,
    researchingCompany,
    researchingJob,
    researchNotice,
    setResearchNotice,
    loadResearchCatalog,
    selectResearchCompany,
    selectResearchJob,
    researchCompanyOffice,
    researchJobPosition,
    deleteResearchCompany,
    deleteResearchJob,
    researchSidebarTab,
    setResearchSidebarTab: setResearchSidebarTabPersisted,
    savingResearch,
    saveResearchCompany,
    saveResearchJob,
    researchAutoSaveEnabled,
    setResearchAutoSavePreference,
    researchAutosaveActivity,
    handleResearchDraftChange,
  };
}
