"use client";

import type { ComposerController } from "./useComposerController";
import { ComposerNav } from "./ComposerNav";
import { ComposerOverlays } from "./ComposerOverlays";
import { ThemeModeToggle } from "./composer-ui";
import { EditorPanel } from "./EditorPanel";
import { PhotoBoothPanel } from "./PhotoBoothPanel";
import { SettingsPanel } from "./SettingsPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { WorkspacePanel } from "./WorkspacePanel";
import { asRecord } from "./form-path-utils";
import { ComposerToastHost } from "./composer-toast";

export type ComposerShellProps = {
  controller: ComposerController;
};

export function ComposerShell({ controller: c }: ComposerShellProps) {
  return (
    <main className="app-shell paper-grid grain-overlay h-screen overflow-hidden px-4 py-4 md:px-8 md:py-6">
      <ThemeModeToggle themeMode={c.themeMode} onThemeModeChange={c.setThemeMode} />
      <div className="mx-auto flex h-full w-full max-w-[1900px] flex-col">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] p-4 shadow-[0_10px_40px_rgba(31,41,55,0.12)] md:p-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">MuhFweeCeeVee</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--ink-muted)]">
                Build, edit, and score bilingual CV variants with template-accurate PDF previews.
              </p>
            </div>
          </div>

          <ComposerNav
            activePanel={c.activePanel}
            onPanelChange={c.setActivePanel}
            settingsTabState={c.openRouter.settingsTabState}
            settingsCreditCompact={c.settingsCreditCompact}
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
              onPrintTweakMoveSkillsLeftChange={c.setPrintTweakMoveSkillsLeftEnabled}
              printTweakMoveSkillsLeft={c.printTweakMoveSkillsLeft}
              onSelectTemplateId={c.setSelectedTemplateId}
              onSelectTemplateTheme={c.setSelectedTemplateTheme}
              onSwitchCvPair={c.switchCvPair}
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

          {c.activePanel === "editor" && (
            <EditorPanel
              analysisCompanyIds={c.analysisCompanyIds}
              analysisCompanySource={c.analysisCompanySource}
              companyMetadataNotice={c.companyMetadataNotice}
              editorLoading={c.editorLoading}
              filteredAnalysisCompanies={c.filteredAnalysisCompanies}
              onClearAnalysisCompanyIds={() => c.setAnalysisCompanyIds([])}
              selectedTemplateId={c.selectedTemplateId}
              analysisData={c.analysisData}
              analysisDrawerCollapsed={c.analysisDrawerCollapsed}
              analysisLoading={c.analysisLoading}
              analysisText={c.analysisText}
              availableLanguages={c.availableLanguages}
              companyMetadataDraft={asRecord(c.companyMetadataDraft)}
              companyMetadataEditorOpen={c.companyMetadataEditorOpen}
              companyMetadataEditorView={c.companyMetadataEditorView}
              companyMetadataSaving={c.companyMetadataSaving}
              companyResearchLoading={c.companyResearchLoading}
              companyMetadataAutoSaveEnabled={c.companyMetadataAutoSaveEnabled}

              companyMetadataHasUnsavedChanges={c.companyMetadataHasUnsavedChanges}
              companyMetadataYamlDraft={c.companyMetadataYamlDraft}
              companyMetadataYamlLintIssues={c.companyMetadataYamlLintIssues}
              cvTemplatesForLanguage={c.cvTemplatesForLanguage}
              editorNotice={c.editorNotice}
              editorPath={c.editorPath}
              editorSaving={c.editorSaving}
              editorAutoSaveEnabled={c.editorAutoSaveEnabled}

              editorHasUnsavedChanges={c.editorHasUnsavedChanges}
              onEditorAutoSaveChange={c.setEditorAutoSavePreference}
              editorTab={c.editorTab}
              editorView={c.editorView}
              formRenderer={c.formRenderer}
              onAnalysisCompanySourceChange={c.setAnalysisCompanySource}
              onCompanyMetadataAutoSaveChange={c.setCompanyMetadataAutoSavePreference}
              onCompanyMetadataEditorViewChange={c.handleCompanyMetadataEditorViewChange}
              onCompanyMetadataYamlDraftChange={c.setCompanyMetadataYamlDraft}
              onEditorTabChange={c.setEditorTab}
              onEditorViewChange={c.setEditorView}
              onOpenLanguageModal={c.openLanguageModal}
              onOpenSyncModal={c.openSyncModal}
              onRunAnalysisFull={() => void c.runAnalysis("full")}
              onRunAnalysisSection={() => void c.runAnalysis("section")}
              onResearchCompanies={() => void c.researchCompaniesMetadata()}
              onSaveCompanyMetadata={() => void c.saveCompanyMetadataSource()}
              onSaveEditor={() => void c.saveEditorSection()}
              onSwitchCvPair={c.switchCvPair}
              onSwitchLanguage={c.switchLanguage}
              onToggleAnalysisCompanySelection={c.toggleAnalysisCompanySelection}
              onToggleAnalysisDrawer={() => c.setAnalysisDrawerCollapsed((v) => !v)}
              onToggleCompanyMetadataEditor={() => c.setCompanyMetadataEditorOpen((v) => !v)}
              onYamlDraftChange={c.setYamlDraft}
              resolvedTheme={c.resolvedTheme}
              sectionDraft={c.sectionDraft}
              selectedCvId={c.selectedCvId}
              selectedLanguage={c.selectedLanguage}
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
              apiKeyInput={c.openRouter.apiKeyInput}
              baseUrlInput={c.openRouter.baseUrlInput}
              creditStatus={c.openRouter.creditStatus}
              imageGenerationModelInput={c.openRouter.imageGenerationModelInput}
              imageGenerationModelOptions={c.openRouter.imageGenerationModelOptions}
              modelInput={c.openRouter.modelInput}
              modelOptions={c.openRouter.modelOptions}
              onApiKeyInputChange={c.openRouter.setApiKeyInput}
              onBaseUrlInputChange={c.openRouter.setBaseUrlInput}
              onImageGenerationModelInputChange={c.openRouter.setImageGenerationModelInput}
              onModelInputChange={c.openRouter.setModelInput}
              onSave={() => void c.openRouter.saveAiSettings()}
              onToggleShow={() => c.openRouter.setShowAiSettings((value) => !value)}
              selectedAnalysisModelOption={c.openRouter.selectedAnalysisModelOption}
              selectedImageGenerationModelOption={c.openRouter.selectedImageGenerationModelOption}
              settings={c.openRouter.settings}
              settingsLoading={c.openRouter.settingsLoading}
              settingsNotice={c.openRouter.settingsNotice}
              settingsSaving={c.openRouter.settingsSaving}
              showAiSettings={c.openRouter.showAiSettings}
            />
          )}
          <ComposerOverlays controller={c} />
        </section>
      </div>
      <ComposerToastHost onDismiss={c.dismissComposerToast} toasts={c.composerToasts} />
    </main>
  );
}
