"use client";

import type { ChangeEvent, JSX, KeyboardEvent, RefObject, UIEvent } from "react";

import { defaultSectionDraftForEditorPath, EDITOR_TABS } from "./constants";
import { EDITOR_COMPACT_FORM_GRID_CLASS } from "./editor-compact-form-layout";
import { scoreTone } from "./analysis-ui-utils";
import type { useEditorFormRenderer } from "./useEditorFormRenderer";
import type {
  CompanyListResponse,
  CompanySource,
  CvPair,
  EditorTabKey,
  EditorViewMode,
  FullAnalysis,
  SectionAnalysis,
} from "./types";

type FormRenderer = ReturnType<typeof useEditorFormRenderer>;

export type EditorPanelProps = {
  resolvedTheme: "light" | "dark";
  formRenderer: FormRenderer;
  availableLanguages: string[];
  selectedLanguage: string;
  onSwitchLanguage: (language: string) => void;
  onOpenLanguageModal: () => void;
  syncing: boolean;
  syncModalLoading: boolean;
  selectedCvId: string;
  onOpenSyncModal: () => void;
  cvPairs: CvPair[];
  selectedPairKey: string;
  onSwitchCvPair: (pairKey: string) => void;
  editorTab: EditorTabKey;
  onEditorTabChange: (tab: EditorTabKey) => void;
  companyMetadataEditorOpen: boolean;
  onToggleCompanyMetadataEditor: () => void;
  analysisCompanySource: CompanySource;
  onAnalysisCompanySourceChange: (source: CompanySource) => void;
  analysisCompanyIds: string[];
  filteredAnalysisCompanies: NonNullable<CompanyListResponse["items"]>;
  onClearAnalysisCompanyIds: () => void;
  onToggleAnalysisCompanySelection: (companyId: string) => void;
  selectedTemplateId: string;
  editorLoading: boolean;
  companyMetadataNotice: string;
  companyMetadataEditorView: EditorViewMode;
  onCompanyMetadataEditorViewChange: (view: EditorViewMode) => void;
  companyMetadataDraft: Record<string, unknown> | null;
  companyMetadataYamlDraft: string;
  onCompanyMetadataYamlDraftChange: (value: string) => void;
  companyMetadataYamlLintIssues: string[];
  companyMetadataSaving: boolean;
  onSaveCompanyMetadata: () => void;
  editorView: EditorViewMode;
  onEditorViewChange: (view: EditorViewMode) => void;
  yamlDraft: string;
  onYamlDraftChange: (value: string) => void;
  yamlLintIssues: string[];
  yamlTextareaRef: RefObject<HTMLTextAreaElement | null>;
  yamlHighlightRef: RefObject<HTMLDivElement | null>;
  sectionDraft: unknown;
  editorPath: string;
  editorSaving: boolean;
  onSaveEditor: () => void;
  analysisDrawerCollapsed: boolean;
  onToggleAnalysisDrawer: () => void;
  analysisLoading: boolean;
  analysisData: SectionAnalysis | FullAnalysis | null;
  analysisText: string;
  onRunAnalysisSection: () => void;
  onRunAnalysisFull: () => void;
  editorNotice: string;
};

export function EditorPanel(props: EditorPanelProps): JSX.Element {

  const {
    resolvedTheme,
    formRenderer,
    availableLanguages,
    selectedLanguage,
    onSwitchLanguage,
    onOpenLanguageModal,
    syncing,
    syncModalLoading,
    selectedCvId,
    onOpenSyncModal,
    cvPairs,
    selectedPairKey,
    onSwitchCvPair,
    editorTab,
    onEditorTabChange,
    companyMetadataEditorOpen,
    onToggleCompanyMetadataEditor,
    analysisCompanySource,
    onAnalysisCompanySourceChange,
    analysisCompanyIds,
    filteredAnalysisCompanies = [],
    onClearAnalysisCompanyIds,
    onToggleAnalysisCompanySelection,
    selectedTemplateId,
    editorLoading,
    companyMetadataNotice,
    companyMetadataEditorView,
    onCompanyMetadataEditorViewChange,
    companyMetadataDraft,
    companyMetadataYamlDraft,
    onCompanyMetadataYamlDraftChange,
    companyMetadataYamlLintIssues,
    companyMetadataSaving,
    onSaveCompanyMetadata,
    editorView,
    onEditorViewChange,
    yamlDraft,
    onYamlDraftChange,
    yamlLintIssues,
    yamlTextareaRef,
    yamlHighlightRef,
    sectionDraft,
    editorPath,
    editorSaving,
    onSaveEditor,
    analysisDrawerCollapsed,
    onToggleAnalysisDrawer,
    analysisLoading,
    analysisData,
    analysisText,
    onRunAnalysisSection,
    onRunAnalysisFull,
    editorNotice,
  } = props;

  return (
            <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
              <article className="min-h-0 overflow-auto rounded-xl border border-[var(--line)] bg-white p-4 pb-6">
                <h2 className="text-xl font-bold text-slate-900">Editor Controls</h2>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  Choose CV pair/language and section sub-tab, then edit in Form View or YAML View.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-800">Language</p>
                    <div className="flex w-full items-center justify-center gap-2">
                      <div className="inline-flex w-[90%] overflow-hidden rounded-full border border-[var(--line)]">
                        {availableLanguages.map((language, index) => (
                          <button
                            key={`editor-lang-${language}`}
                            className={`flex-1 px-4 py-2 text-sm font-semibold ${
                              index > 0 ? "border-l border-[var(--line)] " : ""
                            }${selectedLanguage === language ? "bg-[var(--accent)] text-white" : "bg-white text-slate-800"}`}
                            onClick={() => onSwitchLanguage(language)}
                            type="button"
                          >
                            {language.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-white text-slate-700 hover:bg-slate-50"
                        onClick={onOpenLanguageModal}
                        title="Add language"
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                          <path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                        </svg>
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={syncing || syncModalLoading || !selectedCvId || availableLanguages.length < 2}
                        onClick={onOpenSyncModal}
                        title="Open language sync"
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M7 7h9l-2.5-2.5M17 17H8l2.5 2.5M17 7l-3 3M7 17l3-3"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </button>
                    </div>
                    {availableLanguages.length < 2 ? (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        Sync requires at least two language variants.
                      </p>
                    ) : null}
                  </div>

                  <label className="block text-sm font-medium text-slate-800">
                    CV Variant
                    <select
                      className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                      onChange={(event) => onSwitchCvPair(event.target.value)}
                      value={selectedPairKey}
                    >
                      {cvPairs.map((pair) => (
                        <option key={pair.key} value={pair.key}>
                          {pair.displayName} {pair.displayVersion}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-800">Section Sub-tabs</p>
                    <div className="grid grid-cols-2 gap-2">
                      {EDITOR_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          className={`rounded-md px-3 py-2 text-xs font-semibold ${
                            editorTab === tab.key ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
                          }`}
                          onClick={() => onEditorTabChange(tab.key)}
                          type="button"
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">Target Companies</p>
                      <button
                        className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                        onClick={() => onToggleCompanyMetadataEditor()}
                        type="button"
                      >
                        {companyMetadataEditorOpen ? "Hide Editor" : "Edit"}
                      </button>
                    </div>

                    <label className="mt-3 block text-xs font-medium text-slate-700">
                      Metadata Source
                      <select
                        className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
                        onChange={(event) => onAnalysisCompanySourceChange(event.target.value as CompanySource)}
                        value={analysisCompanySource}
                      >
                        <option value="example">Example</option>
                        <option value="personal">Personal</option>
                      </select>
                    </label>

                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-700">Companies</p>
                      <label className="mt-1 flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-700">
                        <input
                          checked={analysisCompanyIds.length === 0}
                          onChange={onClearAnalysisCompanyIds}
                          type="checkbox"
                        />
                        <span>None</span>
                      </label>
                      <div className="mt-2 space-y-2">
                        {filteredAnalysisCompanies.length === 0 ? (
                          <p className="text-xs text-[var(--ink-muted)]">No companies in this metadata source.</p>
                        ) : (
                          filteredAnalysisCompanies.map((company) => (
                            <label
                              key={company.id}
                              className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-700"
                            >
                              <input
                                checked={analysisCompanyIds.includes(company.id)}
                                onChange={() => onToggleAnalysisCompanySelection(company.id)}
                                type="checkbox"
                              />
                              <span>{company.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white p-4 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {companyMetadataEditorOpen
                      ? `Companies Metadata Editor: ${analysisCompanySource === "personal" ? "Personal" : "Example"}`
                      : `Section Editor: ${EDITOR_TABS.find((tab) => tab.key === editorTab)?.label}`}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {companyMetadataEditorOpen ? (
                      <>
                        <div className="inline-flex overflow-hidden rounded-md border border-[var(--line)]">
                          <button
                            className={`px-3 py-1.5 text-xs font-semibold ${
                              companyMetadataEditorView === "form" ? "bg-[var(--accent)] text-white" : "bg-white text-slate-800"
                            }`}
                            onClick={() => onCompanyMetadataEditorViewChange("form")}
                            type="button"
                          >
                            Form
                          </button>
                          <button
                            className={`border-l border-[var(--line)] px-3 py-1.5 text-xs font-semibold ${
                              companyMetadataEditorView === "yaml" ? "bg-[var(--accent)] text-white" : "bg-white text-slate-800"
                            }`}
                            onClick={() => onCompanyMetadataEditorViewChange("yaml")}
                            type="button"
                          >
                            YAML
                          </button>
                        </div>
                        <button
                          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          disabled={companyMetadataSaving}
                          onClick={onSaveCompanyMetadata}
                          type="button"
                        >
                          Save Metadata
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="inline-flex overflow-hidden rounded-md border border-[var(--line)]">
                          <button
                            className={`px-3 py-1.5 text-xs font-semibold ${
                              editorView === "form" ? "bg-[var(--accent)] text-white" : "bg-white text-slate-800"
                            }`}
                            onClick={() => onEditorViewChange("form")}
                            type="button"
                          >
                            Form View
                          </button>
                          <button
                            className={`border-l border-[var(--line)] px-3 py-1.5 text-xs font-semibold ${
                              editorView === "yaml" ? "bg-[var(--accent)] text-white" : "bg-white text-slate-800"
                            }`}
                            onClick={() => onEditorViewChange("yaml")}
                            type="button"
                          >
                            YAML View
                          </button>
                        </div>
                        <button
                          className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-60"
                          disabled={analysisLoading || !selectedCvId || !selectedTemplateId}
                          onClick={onRunAnalysisSection}
                          type="button"
                        >
                          Score Section
                        </button>
                        <button
                          className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-60"
                          disabled={analysisLoading || !selectedCvId || !selectedTemplateId}
                          onClick={onRunAnalysisFull}
                          type="button"
                        >
                          Score Whole CV
                        </button>
                        <button
                          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          disabled={editorSaving || editorLoading || !selectedCvId}
                          onClick={onSaveEditor}
                          type="button"
                        >
                          Save Section
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {companyMetadataEditorOpen ? (
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">
                    Edit the selected metadata source in Form or YAML mode. Saving updates the source JSON used by AI analysis targeting.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-[var(--ink-muted)]">
                      {selectedLanguage === "bg"
                        ? "Редактирайте секцията във форма или YAML. Записът обновява YAML варианта и snapshot историята."
                        : "Edit the section in form or YAML mode. Save updates the YAML variant and snapshot history."}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {analysisCompanyIds.length > 0
                        ? `AI analysis targets: ${filteredAnalysisCompanies
                            .filter((item) => analysisCompanyIds.includes(item.id))
                            .map((item) => item.name)
                            .join(", ")}`
                        : "AI analysis targets: None"}
                    </p>
                  </>
                )}
                {companyMetadataEditorOpen && companyMetadataNotice ? (
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">{companyMetadataNotice}</p>
                ) : null}

                <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
                  <div
                    className={`min-h-0 flex-1 overflow-auto rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3 md:min-w-0 ${
                      !companyMetadataEditorOpen && editorView === "form" && !editorLoading
                        ? EDITOR_COMPACT_FORM_GRID_CLASS
                        : ""
                    }`}
                  >
                    {companyMetadataEditorOpen ? (
                      companyMetadataEditorView === "yaml" ? (
                        <div className="flex h-full min-h-[400px] flex-col rounded-md border border-[var(--line)] bg-white p-2">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">YAML Editor</p>
                          <textarea
                            className="min-h-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-2 font-mono text-xs"
                            onChange={(event) => onCompanyMetadataYamlDraftChange(event.target.value.replace(/\t/g, "  "))}
                            value={companyMetadataYamlDraft}
                          />
                          <div
                            className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
                              companyMetadataYamlLintIssues.length === 0
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                          >
                            {companyMetadataYamlLintIssues.length === 0 ? (
                              <p>YAML lint: ok</p>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="font-semibold">YAML lint errors ({companyMetadataYamlLintIssues.length})</p>
                                {companyMetadataYamlLintIssues.map((issue) => (
                                  <p key={issue}>• {issue}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        formRenderer.renderCompanyMetadataFormNode(companyMetadataDraft ?? { companies: [] }, [], "", "Companies Metadata")
                      )
                    ) : editorLoading ? (
                      <p className="text-xs text-[var(--ink-muted)]">Loading CV...</p>
                    ) : editorView === "yaml" ? (
                      <div className="flex h-full min-h-[400px] flex-col rounded-md border border-[var(--line)] bg-white p-2">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">YAML Editor</p>
                        <div
                          className={`relative min-h-0 flex-1 overflow-hidden rounded-md border ${
                            resolvedTheme === "dark"
                              ? "border-slate-700 bg-slate-900/85"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div ref={yamlHighlightRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-auto p-2 font-mono">
                            {yamlDraft.split("\n").map((line, index) => formRenderer.renderYamlLine(line, index))}
                          </div>
                          <textarea
                            ref={yamlTextareaRef}
                            className={`absolute inset-0 z-10 h-full w-full resize-none overflow-auto bg-transparent p-2 pl-[52px] font-mono text-xs leading-5 text-transparent outline-none ${
                              resolvedTheme === "dark"
                                ? "caret-slate-100 selection:bg-slate-500/50"
                                : "caret-slate-900 selection:bg-sky-200/70"
                            }`}
                            onChange={(event) => onYamlDraftChange(event.target.value.replace(/\t/g, "  "))}
                            onKeyDown={formRenderer.handleYamlEditorKeyDown}
                            onScroll={formRenderer.handleYamlEditorScroll}
                            spellCheck={false}
                            style={{ tabSize: 2 }}
                            value={yamlDraft}
                            wrap="off"
                          />
                        </div>
                        <div
                          className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
                            yamlLintIssues.length === 0
                              ? (resolvedTheme === "dark"
                                ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800")
                              : (resolvedTheme === "dark"
                                ? "border-rose-700 bg-rose-950/30 text-rose-200"
                                : "border-rose-200 bg-rose-50 text-rose-800")
                          }`}
                        >
                          {yamlLintIssues.length === 0 ? (
                            <p>YAML lint: ok</p>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="font-semibold">YAML lint errors ({yamlLintIssues.length})</p>
                              {yamlLintIssues.map((issue) => (
                                <p key={issue}>• {issue}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      formRenderer.renderFormNode(
                        sectionDraft ?? defaultSectionDraftForEditorPath(editorPath),
                        [],
                        editorPath,
                        EDITOR_TABS.find((tab) => tab.key === editorTab)?.label ?? editorTab,
                      )
                    )}
                  </div>

                  <div
                    className={`min-h-0 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-1)] transition-all duration-200 ${
                      analysisDrawerCollapsed ? "md:w-12" : "md:w-[360px]"
                    }`}
                  >
                    <div className={`flex items-center justify-between gap-2 border-b border-[var(--line)] px-2 py-2 ${analysisDrawerCollapsed ? "md:justify-center" : ""}`}>
                      <p className={`text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)] ${analysisDrawerCollapsed ? "md:hidden" : ""}`}>
                        AI Scoring Analysis
                      </p>
                      <button
                        aria-label={analysisDrawerCollapsed ? "Expand AI Scoring Analysis drawer" : "Collapse AI Scoring Analysis drawer"}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-white text-slate-700 hover:bg-slate-50"
                        onClick={() => onToggleAnalysisDrawer()}
                        title={analysisDrawerCollapsed ? "Expand analysis" : "Minimize analysis"}
                        type="button"
                      >
                        {analysisDrawerCollapsed ? "◀" : "▶"}
                      </button>
                    </div>

                    {analysisDrawerCollapsed ? (
                      <div className="hidden h-full items-center justify-center px-1 py-3 md:flex">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                          AI
                        </span>
                      </div>
                    ) : (
                      <div className="h-full overflow-auto p-3">
                        {analysisLoading ? (
                          <p className="mt-2 text-xs text-[var(--ink-muted)]">Running analysis...</p>
                        ) : analysisData?.scope === "section" ? (
                          <div className="mt-2 space-y-3">
                            <div className="rounded-md border border-[var(--line)] bg-white p-2">
                              <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                                Section: {analysisData.section ?? editorPath}
                              </p>
                              <p className={`mt-1 text-lg font-bold ${scoreTone(resolvedTheme, Number(analysisData.score ?? 0))}`}>
                                Score {Number(analysisData.score ?? 0)}/100
                              </p>
                              {analysisData.summary ? (
                                <p className="mt-1 text-xs text-slate-700">{analysisData.summary}</p>
                              ) : null}
                            </div>

                            {(analysisData.field_feedback ?? []).map((item, index) => (
                              <div key={`${item.field ?? "field"}-${index}`} className="rounded-md border border-[var(--line)] bg-white p-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold text-slate-900">{item.field ?? `Field ${index + 1}`}</p>
                                  <p className={`text-xs font-bold ${scoreTone(resolvedTheme, Number(item.score ?? 0))}`}>
                                    {Number(item.score ?? 0)}/100
                                  </p>
                                </div>
                                {item.analysis ? <p className="mt-1 text-xs text-slate-700">{item.analysis}</p> : null}
                                {item.proposal ? (
                                  <div className="mt-1 rounded bg-[var(--surface-2)] px-2 py-1 text-xs text-slate-800">
                                    <span className="font-semibold">Proposal:</span> {item.proposal}
                                  </div>
                                ) : null}
                              </div>
                            ))}

                            {(analysisData.top_actions ?? []).length > 0 ? (
                              <div className="rounded-md border border-[var(--line)] bg-white p-2">
                                <p className="text-xs font-semibold text-slate-900">Top Actions</p>
                                <ul className="mt-1 list-disc pl-4 text-xs text-slate-700">
                                  {(analysisData.top_actions ?? []).map((action, index) => (
                                    <li key={`${action}-${index}`}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : analysisData?.scope === "full" ? (
                          <div className="mt-2 space-y-3">
                            <div className="rounded-md border border-[var(--line)] bg-white p-2">
                              <p className={`text-lg font-bold ${scoreTone(resolvedTheme, Number(analysisData.overall_score ?? 0))}`}>
                                Overall Score {Number(analysisData.overall_score ?? 0)}/100
                              </p>
                              {analysisData.summary ? (
                                <p className="mt-1 text-xs text-slate-700">{analysisData.summary}</p>
                              ) : null}
                            </div>
                            {(analysisData.section_scores ?? []).map((section, index) => (
                              <div key={`${section.section ?? "section"}-${index}`} className="rounded-md border border-[var(--line)] bg-white p-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold text-slate-900">{section.section ?? `Section ${index + 1}`}</p>
                                  <p className={`text-xs font-bold ${scoreTone(resolvedTheme, Number(section.score ?? 0))}`}>
                                    {Number(section.score ?? 0)}/100
                                  </p>
                                </div>
                                {(section.issues ?? []).length > 0 ? (
                                  <p className={`mt-1 text-xs ${resolvedTheme === "dark" ? "text-rose-300" : "text-rose-700"}`}>
                                    Issues: {(section.issues ?? []).join("; ")}
                                  </p>
                                ) : null}
                                {(section.improvements ?? []).length > 0 ? (
                                  <p className="mt-1 text-xs text-slate-700">
                                    Improvements: {(section.improvements ?? []).join("; ")}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                            {(analysisData.top_actions ?? []).length > 0 ? (
                              <div className="rounded-md border border-[var(--line)] bg-white p-2">
                                <p className="text-xs font-semibold text-slate-900">Top Actions</p>
                                <ul className="mt-1 list-disc pl-4 text-xs text-slate-700">
                                  {(analysisData.top_actions ?? []).map((action, index) => (
                                    <li key={`${action}-${index}`}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : analysisText ? (
                          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-800">
                            {analysisText}
                          </pre>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--ink-muted)]">
                            Run section or full CV scoring to receive score, field-level analysis, and rewrite proposals.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {editorNotice && <p className="mt-2 text-xs text-[var(--ink-muted)]">{editorNotice}</p>}
              </article>
            </div>

  );
}
