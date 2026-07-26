"use client";

import type { JSX } from "react";

import {
  PHOTO_MODE_OPTIONS,
  PRINT_TWEAK_OPTIONS,
  type PrintTweakId,
  type PrintTweaksState,
  templateSupportsPrintTweaks,
  themeOptionsForTemplate,
} from "./constants";
import { PrintTextScaleRow } from "./print-text-scale-pill";
import { templateDisplayName } from "./form-path-utils";
import type { CvPair, PhotoModeOption, TemplateThemeOption } from "./types";

export type WorkspacePanelProps = {
  availableLanguages: string[];
  selectedLanguage: string;
  onSwitchLanguage: (language: string) => void;
  cvTemplatesForLanguage: CvPair[];
  selectedPairKey: string;
  onSwitchCvPair: (pairKey: string) => void;
  orderedTemplateItems: Array<{ id: string; name: string; version: string }>;
  selectedTemplateId: string;
  onSelectTemplateId: (templateId: string) => void;
  selectedTemplateTheme: string;
  onSelectTemplateTheme: (theme: string) => void;
  selectedPhotoMode: PhotoModeOption["id"];
  onSelectPhotoMode: (mode: PhotoModeOption["id"]) => void;
  printTweaks: PrintTweaksState;
  onPrintTweakChange: (tweakId: PrintTweakId, enabled: boolean) => void;
  onPrintTextScaleEnabledChange: (target: "sidebar" | "content", enabled: boolean) => void;
  onPrintTextScaleValueChange: (target: "sidebar" | "content", value: number) => void;
  onPrintTextScaleStep: (target: "sidebar" | "content", direction: -1 | 1) => void;
  selectedCvId: string;
  loadingWorkspace: boolean;
  pdfUrl: string;
  onRefreshPreview: () => void;
  onOpenPdf: () => void;
  onDownloadPdf: () => void;
};

export function WorkspacePanel(props: WorkspacePanelProps): JSX.Element {
  const {
    availableLanguages,
    selectedLanguage,
    onSwitchLanguage,
    cvTemplatesForLanguage,
    selectedPairKey,
    onSwitchCvPair,
    orderedTemplateItems,
    selectedTemplateId,
    onSelectTemplateId,
    selectedTemplateTheme,
    onSelectTemplateTheme,
    selectedPhotoMode,
    onSelectPhotoMode,
    printTweaks,
    onPrintTweakChange,
    onPrintTextScaleEnabledChange,
    onPrintTextScaleValueChange,
    onPrintTextScaleStep,
    selectedCvId,
    loadingWorkspace,
    pdfUrl,
    onRefreshPreview,
    onOpenPdf,
    onDownloadPdf,
  } = props;

  const selectedTemplateThemeOptions: TemplateThemeOption[] = themeOptionsForTemplate(selectedTemplateId);
  const tweaksAvailable = templateSupportsPrintTweaks(selectedTemplateId);

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <article className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto rounded-xl border border-[var(--line)] bg-white p-4 pb-6">
        <h2 className="text-xl font-bold text-slate-900">Print Controls</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Select CV pair and template to render a real PDF preview.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-800">Language</p>
            <div className="flex items-center justify-center">
              <div className="inline-flex w-[90%] overflow-hidden rounded-full border border-[var(--line)]">
                {availableLanguages.map((language, index) => (
                  <button
                    key={`workspace-lang-${language}`}
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
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-800">
            CV Template
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
              onChange={(event) => onSwitchCvPair(event.target.value)}
              value={selectedPairKey}
            >
              {cvTemplatesForLanguage.map((pair) => (
                <option key={pair.key} value={pair.key}>
                  {pair.displayName} {pair.displayVersion}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Template
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
              onChange={(event) => onSelectTemplateId(event.target.value)}
              value={selectedTemplateId}
            >
              {orderedTemplateItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {templateDisplayName(item.name)} {item.version}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Theme
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 disabled:opacity-60"
              disabled={selectedTemplateThemeOptions.length === 0 ? true : undefined}
              onChange={(event) => onSelectTemplateTheme(event.target.value)}
              value={selectedTemplateTheme}
            >
              {(selectedTemplateThemeOptions.length > 0
                ? selectedTemplateThemeOptions
                : [{ id: "default", label: "Default", color: "-" }]
              ).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.color})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Photo
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
              onChange={(event) => onSelectPhotoMode(event.target.value as PhotoModeOption["id"])}
              value={selectedPhotoMode}
            >
              {PHOTO_MODE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
            <p className="text-sm font-medium text-slate-800">Tweaks</p>
            <div className="mt-2 space-y-2 overflow-x-hidden overflow-y-auto pr-1">
              {PRINT_TWEAK_OPTIONS.map((option) => {
                const checked = printTweaks[option.id];
                const disabled =
                  option.id === "moveSkillsLeft" ? !tweaksAvailable : false;
                const disabledTitle =
                  option.id === "moveSkillsLeft" && !tweaksAvailable
                    ? "This template has no left sidebar (for example Europass)."
                    : undefined;
                return (
                  <label
                    key={option.id}
                    className={`flex min-w-0 items-center gap-2 text-sm text-slate-800 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    title={disabledTitle}
                  >
                    <input
                      checked={checked}
                      className="h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--accent)]"
                      disabled={disabled ? true : undefined}
                      onChange={(event) => onPrintTweakChange(option.id, event.target.checked)}
                      type="checkbox"
                    />
                    <span className="min-w-0">{option.label}</span>
                  </label>
                );
              })}
              <PrintTextScaleRow
                disabledTitle={
                  !tweaksAvailable
                    ? "This template has no left sidebar (for example Europass)."
                    : undefined
                }
                enabled={printTweaks.sidebarTextScaleEnabled}
                label="Sidebar Text Size"
                onEnabledChange={(enabled) => onPrintTextScaleEnabledChange("sidebar", enabled)}
                onStep={(direction) => onPrintTextScaleStep("sidebar", direction)}
                onValueChange={(value) => onPrintTextScaleValueChange("sidebar", value)}
                rowDisabled={!tweaksAvailable}
                value={printTweaks.sidebarTextScale}
              />
              <PrintTextScaleRow
                enabled={printTweaks.contentTextScaleEnabled}
                label="Content Text Size"
                onEnabledChange={(enabled) => onPrintTextScaleEnabledChange("content", enabled)}
                onStep={(direction) => onPrintTextScaleStep("content", direction)}
                onValueChange={(value) => onPrintTextScaleValueChange("content", value)}
                value={printTweaks.contentTextScale}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          <button
            className="min-w-0 rounded-md bg-[var(--accent)] px-1.5 py-2 text-center text-xs font-semibold text-white disabled:opacity-60 sm:text-sm"
            disabled={!selectedCvId || !selectedTemplateId || loadingWorkspace}
            onClick={onRefreshPreview}
            type="button"
          >
            Refresh
          </button>
          <button
            className="min-w-0 rounded-md border border-[var(--line)] bg-white px-1.5 py-2 text-center text-xs font-semibold text-slate-800 disabled:opacity-60 sm:text-sm"
            disabled={!pdfUrl}
            onClick={onOpenPdf}
            type="button"
          >
            Open
          </button>
          <button
            className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-2 text-center text-xs font-semibold text-slate-800 disabled:opacity-60 sm:text-sm"
            disabled={!pdfUrl}
            onClick={onDownloadPdf}
            type="button"
          >
            Print
          </button>
        </div>
      </article>

      <article className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        {pdfUrl ? (
          <iframe className="h-full w-full" src={pdfUrl} title="CV PDF Preview" />
        ) : (
          <div className="p-4 text-sm text-[var(--ink-muted)]">
            Select a CV and template to generate preview.
          </div>
        )}
      </article>
    </div>
  );
}