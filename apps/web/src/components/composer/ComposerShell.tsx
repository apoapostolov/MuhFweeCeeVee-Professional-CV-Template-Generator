"use client";

import { useRef, useState } from "react";

import type { AssistantRecordReference } from "@muhfweeceevee/schemas";

import type { ComposerController } from "./useComposerController";
import { AssistantLauncher } from "./AssistantLauncher";
import { AssistantPanel } from "./AssistantPanel";
import { buildAssistantComposerContext } from "./assistant-context";
import { ComposerNav } from "./ComposerNav";
import { ComposerOverlays } from "./ComposerOverlays";
import { ThemeModeToggle } from "./composer-ui";
import { EditorPanel } from "./EditorPanel";
import { PhotoBoothPanel } from "./PhotoBoothPanel";
import { SettingsPanel } from "./SettingsPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { ResearchPanel } from "./ResearchPanel";
import { CoverLettersPanel } from "./CoverLettersPanel";
import { ApplicationsPanel } from "./ApplicationsPanel";
import { WorkspacePanel } from "./WorkspacePanel";
import { asRecord } from "./form-path-utils";
import { ComposerToastHost } from "./composer-toast";
import { DuplicateCvDialog } from "./DuplicateCvDialog";

export type ComposerShellProps = {
  controller: ComposerController;
};

export function ComposerShell({ controller: c }: ComposerShellProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [duplicateCvOpen, setDuplicateCvOpen] = useState(false);
  const [duplicateCvBusy, setDuplicateCvBusy] = useState(false);
  const [duplicateCvError, setDuplicateCvError] = useState("");
  const [assistantApplication, setAssistantApplication] =
    useState<AssistantRecordReference | null>(null);
  const assistantLauncherRef = useRef<HTMLButtonElement>(null);
  const assistantContext = buildAssistantComposerContext(
    c,
    new Date().toISOString(),
    assistantApplication ? [assistantApplication] : [],
  );

  function openDuplicateCv(): void {
    setDuplicateCvError("");
    setDuplicateCvOpen(true);
  }

  async function submitDuplicateCv(name: string): Promise<void> {
    setDuplicateCvBusy(true);
    setDuplicateCvError("");
    try {
      await c.duplicateCurrentCv(name);
      setDuplicateCvOpen(false);
    } catch (error) {
      setDuplicateCvError(error instanceof Error ? error.message : "Failed to create CV version.");
    } finally {
      setDuplicateCvBusy(false);
    }
  }

  function closeAssistant(): void {
    setAssistantOpen(false);
    requestAnimationFrame(() => assistantLauncherRef.current?.focus());
  }

  return (
    <main className="app-shell paper-grid grain-overlay h-screen overflow-hidden px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto flex h-full w-full max-w-[1900px] flex-col">
        <div className="flex min-h-0 flex-1 gap-3">
          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 shadow-[0_10px_40px_rgba(31,41,55,0.12)] md:p-6">
            <ThemeModeToggle
              assistantOpen={assistantOpen}
              themeMode={c.themeMode}
              onThemeModeChange={c.setThemeMode}
            />
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:gap-4">
              <h1 className="text-3xl font-black leading-none text-slate-900 md:text-4xl">MuhFweeCeeVee</h1>
              <p className="max-w-3xl text-sm leading-tight text-[var(--ink-muted)] md:mb-0.5">
                Build, edit, and score multilingual CV with wide variety of PDF templates.
              </p>
            </div>
          </div>

          <ComposerNav
            activePanel={c.activePanel}
            onPanelChange={c.setActivePanel}
            settingsTabState={c.openRouter.settingsTabState}
            providerQuotas={c.aiProviders.aiSettings?.quotas ?? []}
            providerNames={Object.fromEntries(c.aiProviders.providers.map((provider) => [provider.id, provider.name]))}
          />

          {c.activePanel === "workspace" && (
            <WorkspacePanel
              availableLanguages={c.availableLanguages}
              cvTemplatesForLanguage={c.cvTemplatesForLanguage}
              loadingWorkspace={c.loadingWorkspace}
              onDownloadPdf={c.downloadPdf}
              onOpenPdf={c.openPdf}
              onRefreshPreview={c.refreshPreview}
              onSelectPhotoMode={c.setSelectedPhotoMode}
              onPrintTweakChange={c.setPrintTweakEnabled}
              onPrintTextScaleEnabledChange={c.setPrintTextScaleEnabled}
              onPrintTextScaleStep={c.adjustPrintTextScale}
              onPrintTextScaleValueChange={c.setPrintTextScaleValue}
              printTweaks={{
                intelligentPagination: c.printTweakIntelligentPagination,
                removePhoto: c.printTweakRemovePhoto,
                moveSkillsLeft: c.printTweakMoveSkillsLeft,
                sidebarTextScaleEnabled: c.printTweakSidebarTextScaleEnabled,
                sidebarTextScale: c.printTweakSidebarTextScale,
                contentTextScaleEnabled: c.printTweakContentTextScaleEnabled,
                contentTextScale: c.printTweakContentTextScale,
              }}
              onSelectTemplateId={c.setSelectedTemplateId}
              onSelectTemplateTheme={c.setSelectedTemplateTheme}
              onSwitchCvPair={c.switchCvPair}
              onRequestDuplicateCv={openDuplicateCv}
              onSwitchLanguage={c.switchLanguage}
              orderedTemplateItems={c.orderedTemplateItems}
              pdfUrl={c.pdfUrl}
              selectedCvId={c.selectedCvId}
              selectedLanguage={c.selectedLanguage}
              selectedPairKey={c.selectedPairKey}
              selectedPhotoMode={c.selectedPhotoMode}
              selectedTemplateId={c.selectedTemplateId}
              selectedTemplateTheme={c.selectedTemplateTheme}
            />
          )}

          {c.activePanel === "research" && (
            <ResearchPanel
              companies={c.researchCompanies}
              companyDetail={c.selectedResearchCompany}
              jobDetail={c.selectedResearchJob}
              jobPositions={c.researchJobPositions}
              language={c.uiLanguage}
              loadingCatalog={c.researchCatalogLoading}
              notice={c.researchNotice}
              onDeleteCompany={(id) => void c.deleteResearchCompany(id)}
              onDeleteJob={(id) => void c.deleteResearchJob(id)}
              onImportMetadata={() => void c.importCompanyMetadataToResearchCatalog()}
              onNotice={c.setResearchNotice}
              onResearchCompany={(payload) => void c.researchCompanyOffice(payload)}
              onResearchJob={(payload) => void c.researchJobPosition(payload)}
              onSaveCompany={(company) => void c.saveResearchCompany(company)}
              onSaveJob={(job) => void c.saveResearchJob(job)}
              onSelectCompany={c.selectResearchCompany}
              onSelectJob={c.selectResearchJob}
              onSidebarTabChange={c.setResearchSidebarTab}
              researchingCompany={c.researchingCompany}
              researchingJob={c.researchingJob}
              resolvedTheme={c.resolvedTheme}
              savingResearch={c.savingResearch}
              researchAutoSaveEnabled={c.researchAutoSaveEnabled}
              researchAutosaveActivity={c.researchAutosaveActivity}
              onResearchAutoSaveChange={c.setResearchAutoSavePreference}
              onResearchDraftChange={c.handleResearchDraftChange}
              selectedCompanyId={c.selectedResearchCompanyId}
              selectedJobId={c.selectedResearchJobPositionId}
              sidebarTab={c.researchSidebarTab}
            />
          )}

          {c.activePanel === "editor" && (
            <EditorPanel
              companyMetadataNotice={c.companyMetadataNotice}
              editorLoading={c.editorLoading}
              selectedTemplateId={c.selectedTemplateId}
              researchCompanies={c.researchCompanies}
              researchJobsForCompany={c.researchJobsForCompany}
              selectedResearchCompanyId={c.selectedResearchCompanyId}
              selectedResearchJobPositionId={c.selectedResearchJobPositionId}
              selectedResearchJobKeywordCount={c.selectedResearchJob?.weighted_keywords.length ?? 0}
              selectedResearchJobAtsKeywordCount={c.editorAtsKeywords.length}
              keywordGapReport={c.keywordGapReport}
              onSelectResearchCompany={c.selectResearchCompany}
              onSelectResearchJob={c.selectResearchJob}
              analysisData={c.analysisData}
              analysisDrawerCollapsed={c.analysisDrawerCollapsed}
              analysisLoading={c.analysisLoading}
              analysisText={c.analysisText}
              atsCheckLoading={c.atsCheckLoading}
              atsCheckText={c.atsCheckText}
              onRunAtsCheck={() => void c.runAtsCheck()}
              availableLanguages={c.availableLanguages}
              companyMetadataDraft={asRecord(c.companyMetadataDraft)}
              analysisCompanySource={c.analysisCompanySource}
              companyMetadataEditorOpen={c.companyMetadataEditorOpen}
              companyMetadataEditorView={c.companyMetadataEditorView}
              companyMetadataSaving={c.companyMetadataSaving}
              companyMetadataAutoSaveEnabled={c.companyMetadataAutoSaveEnabled}
              companyMetadataAutosaveActivity={c.companyMetadataAutosaveActivity}
              companyMetadataHasUnsavedChanges={c.companyMetadataHasUnsavedChanges}
              companyMetadataYamlDraft={c.companyMetadataYamlDraft}
              companyMetadataYamlLintIssues={c.companyMetadataYamlLintIssues}
              cvTemplatesForLanguage={c.cvTemplatesForLanguage}
              editorNotice={c.editorNotice}
              editorPath={c.editorPath}
              editorSaving={c.editorSaving}
              editorAutoSaveEnabled={c.editorAutoSaveEnabled}
              editorAutosaveActivity={c.editorAutosaveActivity}
              editorHasUnsavedChanges={c.editorHasUnsavedChanges}
              onEditorAutoSaveChange={c.setEditorAutoSavePreference}
              editorFlatSubsections={c.editorFlatSubsections}
              onEditorFlatSubsectionsChange={c.setEditorFlatSubsectionsPreference}
              editorTab={c.editorTab}
              editorView={c.editorView}
              formRenderer={c.formRenderer}
              onCompanyMetadataAutoSaveChange={c.setCompanyMetadataAutoSavePreference}
              onCompanyMetadataEditorViewChange={c.handleCompanyMetadataEditorViewChange}
              onCompanyMetadataYamlDraftChange={c.setCompanyMetadataYamlDraft}
              onEditorTabChange={c.setEditorTab}
              onEditorViewChange={c.setEditorView}
              onOpenLanguageModal={c.openLanguageModal}
              onOpenSyncModal={c.openSyncModal}
              onRunAnalysisFull={() => void c.runAnalysis("full")}
              onRunAnalysisSection={() => void c.runAnalysis("section")}
              onGoToResearch={() => c.setActivePanel("research")}
              onSaveCompanyMetadata={() => void c.saveCompanyMetadataSource()}
              onSaveEditor={() => void c.saveEditorSection()}
              onSwitchCvPair={c.switchCvPair}
              onRequestDuplicateCv={openDuplicateCv}
              onSwitchLanguage={c.switchLanguage}

              onToggleAnalysisDrawer={() => c.setAnalysisDrawerCollapsed((v) => !v)}
              onToggleCompanyMetadataEditor={() => c.setCompanyMetadataEditorOpen((v) => !v)}
              onYamlDraftChange={c.setYamlDraft}
              resolvedTheme={c.resolvedTheme}
              sectionDraft={c.sectionDraft}
              selectedCvId={c.selectedCvId}
              selectedLanguage={c.selectedLanguage}
              uiLanguage={c.uiLanguage}
              selectedPairKey={c.selectedPairKey}
              syncModalLoading={c.syncModalLoading}
              syncing={c.syncing}
              yamlDraft={c.yamlDraft}
              yamlHighlightRef={c.yamlHighlightRef}
              yamlLintIssues={c.yamlLintIssues}
              yamlTextareaRef={c.yamlTextareaRef}
            />
          )}

          {c.activePanel === "templates" && (
            <TemplatesPanel
              approvedPhotoId={c.approvedPhotoId}
              galleryCvId={c.selectedCvId || c.mostRecentCv?.id || ""}
              previewNonce={c.previewNonce}
              templates={c.orderedTemplateItems}
            />
          )}

          {c.activePanel === "cover_letters" && (
            <CoverLettersPanel
              language={c.uiLanguage}
              researchCompanyName={c.selectedResearchCompany?.name}
              researchJobTitle={c.selectedResearchJob?.title}
              selectedCompanyId={c.selectedResearchCompanyId}
              selectedCvId={c.selectedCvId}
              selectedJobId={c.selectedResearchJobPositionId}
            />
          )}

          {c.activePanel === "applications" && (
            <ApplicationsPanel
              defaultCompanyId={c.selectedResearchCompanyId}
              defaultCompanyName={c.selectedResearchCompany?.name}
              defaultCvId={c.selectedCvId}
              defaultJobId={c.selectedResearchJobPositionId}
              defaultJobTitle={c.selectedResearchJob?.title}
              defaultPhotoId={c.approvedPhotoId || undefined}
              defaultTemplateId={c.selectedTemplateId || undefined}
              defaultTemplateTheme={c.selectedTemplateTheme || undefined}
              language={c.uiLanguage}
              onAssistantSelectionChange={(selection) =>
                setAssistantApplication(
                  selection
                    ? {
                        type: "application",
                        id: selection.id,
                        label: selection.label,
                        revision: selection.revision,
                      }
                    : null,
                )
              }
            />
          )}

          {c.activePanel === "photo_booth" && (
            <PhotoBoothPanel
              approvedPhotoId={c.approvedPhotoId}
              onAnalyze={(id) => void c.analyzePhotoBoothItem(id)}
              onApproveItem={c.approvePhotoBoothItem}
              onComparePair={() => void c.comparePhotoBoothPair()}
              onPasteFromClipboard={(data) => void c.addPhotoBoothFromClipboard(data)}
              onPhotoBoothDrop={c.handlePhotoBoothDrop}
              onPhotoBoothInput={(event) => void c.handlePhotoBoothInput(event)}
              onRequestDelete={c.setPhotoBoothDeleteConfirmId}
              onSetAnalysisFocusId={c.setPhotoBoothAnalysisFocusId}
              onToggleCompareSelection={c.togglePhotoCompareSelection}
              photoBoothAnalysisFocusId={c.photoBoothAnalysisFocusId}
              photoBoothCompareIds={c.photoBoothCompareIds}
              photoBoothCompareLoading={c.photoBoothCompareLoading}
              photoBoothComparison={c.photoBoothComparison}
              photoBoothComparisonHistory={c.photoBoothComparisonHistory}
              photoBoothAnalyzingId={c.photoBoothAnalyzingId}
              photoBoothDragging={c.photoBoothDragging}
              photoBoothInputRef={c.photoBoothInputRef}
              photoBoothItems={c.photoBoothItems}
              photoBoothNotice={c.photoBoothNotice}
              resolvedTheme={c.resolvedTheme}
              selectedModelId={c.openRouter.modelInput || c.openRouter.settings?.model || ""}
              setPhotoBoothDragging={c.setPhotoBoothDragging}
            />
          )}
          {c.activePanel === "settings" && (
            <SettingsPanel
              analysisCostEstimate={c.analysisCostEstimate}
              aiProviders={c.aiProviders}
              onUiLanguageChange={c.setUiLanguage}
              uiLanguage={c.uiLanguage}
            />
          )}
          <ComposerOverlays controller={c} />
          </section>
          <AssistantPanel
            context={assistantContext}
            isOpen={assistantOpen}
            onClose={closeAssistant}
            onNavigate={(handoff) => {
              c.setActivePanel(handoff.panel as typeof c.activePanel);
              window.dispatchEvent(
                new CustomEvent("mfcv:assistant-handoff", {
                  detail: handoff,
                }),
              );
            }}
          />
        </div>
      </div>
      {!assistantOpen ? (
        <AssistantLauncher
          onOpen={() => setAssistantOpen(true)}
          ref={assistantLauncherRef}
        />
      ) : null}
      <ComposerToastHost onDismiss={c.dismissComposerToast} toasts={c.composerToasts} />
      <DuplicateCvDialog
        key={`${duplicateCvOpen}:${c.selectedCvId}`}
        busy={duplicateCvBusy}
        error={duplicateCvError}
        initialName={`${c.cvItems.find((item) => item.id === c.selectedCvId)?.displayName ?? "CV"} copy`}
        onClose={() => setDuplicateCvOpen(false)}
        onSubmit={(name) => void submitDuplicateCv(name)}
        open={duplicateCvOpen}
      />
    </main>
  );
}
