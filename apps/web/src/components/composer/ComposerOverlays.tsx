"use client";

import { AddCustomFieldModal } from "./add-custom-field-modal";
import { formatDiffValue } from "./form-path-utils";
import type { ComposerController } from "./useComposerController";

export type ComposerOverlaysProps = {
  controller: ComposerController;
};

export function ComposerOverlays({ controller: c }: ComposerOverlaysProps) {
  return (
    <>
          <AddCustomFieldModal
            language={c.selectedLanguage}
            onClose={() => c.setAddCustomFieldTarget(null)}
            onSubmit={c.submitAddCustomObjectField}
            open={c.addCustomFieldTarget !== null}
          />

          {c.photoBoothDeleteConfirmId ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
              <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white shadow-xl">
                <div className="border-b border-[var(--line)] px-4 py-3">
                  <h3 className="text-base font-semibold text-slate-900">Delete Photo</h3>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <p className="text-sm text-slate-700">
                    This image will be permanently deleted from the <code>/photos</code> folder. Continue?
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => c.setPhotoBoothDeleteConfirmId("")}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-md border border-rose-300 bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                      onClick={() => {
                        const id = c.photoBoothDeleteConfirmId;
                        c.setPhotoBoothDeleteConfirmId("");
                        void c.removePhotoBoothItem(id).catch((error) => {
                          c.setPhotoBoothNotice(
                            error instanceof Error ? error.message : "Could not delete photo.",
                          );
                        });
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {c.syncModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-3xl rounded-xl border border-[var(--line)] bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                  <h3 className="text-base font-semibold text-slate-900">Language Sync</h3>
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                    disabled={c.syncing}
                    onClick={() => c.setSyncModalOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <p className="text-xs text-[var(--ink-muted)]">
                    Choose one source of truth and one target language. Missing fields from source are translated into target.
                  </p>
                  <div className="overflow-hidden rounded-md border border-[var(--line)]">
                    <div className="grid grid-cols-[1fr_110px_110px] gap-0 border-b border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      <span>Language / Last Updated</span>
                      <span className="text-center">Source</span>
                      <span className="text-center">Target</span>
                    </div>
                    {(c.syncStatus?.languages ?? []).map((row) => (
                      <label
                        className="grid grid-cols-[1fr_110px_110px] items-center gap-0 border-t border-[var(--line)] px-3 py-2 text-xs text-slate-800 first:border-t-0"
                        key={`sync-language-${row.language}`}
                      >
                        <span className="flex flex-col">
                          <span className="font-semibold">{row.language.toUpperCase()}</span>
                          <span className="text-[11px] text-[var(--ink-muted)]">
                            {row.lastEditedAt ? new Date(row.lastEditedAt).toLocaleString() : "No timestamp"}
                          </span>
                        </span>
                        <span className="flex justify-center">
                          <input
                            checked={c.syncSourceSelection === row.language}
                            onChange={(event) => {
                              if (event.target.checked) {
                                c.setSyncSourceSelection(row.language);
                              } else if (c.syncSourceSelection === row.language) {
                                c.setSyncSourceSelection("");
                              }
                            }}
                            type="checkbox"
                          />
                        </span>
                        <span className="flex justify-center">
                          <input
                            checked={c.syncTargetSelection === row.language}
                            onChange={(event) => {
                              if (event.target.checked) {
                                c.setSyncTargetSelection(row.language);
                              } else if (c.syncTargetSelection === row.language) {
                                c.setSyncTargetSelection("");
                              }
                            }}
                            type="checkbox"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                  {c.syncSourceSelection && c.syncTargetSelection && c.syncSourceSelection === c.syncTargetSelection ? (
                    <p className="text-xs text-rose-600">Source and target must be different languages.</p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    disabled={c.syncing}
                    onClick={() => c.setSyncModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    disabled={
                      c.syncing
                      || !c.syncSourceSelection
                      || !c.syncTargetSelection
                      || c.syncSourceSelection === c.syncTargetSelection
                    }
                    onClick={c.syncLanguagePair}
                    type="button"
                  >
                    {c.syncing ? "Syncing..." : "Run Sync"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {c.languageModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                  <h3 className="text-base font-semibold text-slate-900">Add Language</h3>
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                    disabled={c.creatingLanguage}
                    onClick={() => c.setLanguageModalOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <p className="text-xs text-[var(--ink-muted)]">
                    Select a language variant to create for this CV. Existing variants are skipped automatically.
                  </p>
                  <label className="block text-sm font-medium text-slate-800">
                    Language
                    <select
                      className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                      onChange={(event) => c.setLanguageModalSelection(event.target.value)}
                      value={c.languageModalSelection}
                    >
                      {c.languageOptionChoices.map((option) => (
                        <option
                          disabled={c.availableLanguages.includes(option.code)}
                          key={`language-option-${option.code}`}
                          value={option.code}
                        >
                          {option.label} ({option.code.toUpperCase()}){c.availableLanguages.includes(option.code) ? " - already exists" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    disabled={c.creatingLanguage}
                    onClick={() => c.setLanguageModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    disabled={c.creatingLanguage}
                    onClick={c.createLanguageVariant}
                    type="button"
                  >
                    {c.creatingLanguage ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {c.syncReport?.open ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
              <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">SYNC Report</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {c.syncReport.direction} • {c.syncReport.changed ? `${c.syncReport.changes.length} field updates` : "No updates"}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      Source: {c.syncReport.sourceCvId} • Target: {c.syncReport.targetCvId || "n/a"}
                    </p>
                    <p className="mt-1 text-xs text-slate-700">{c.syncReport.message}</p>
                  </div>
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    onClick={() => c.setSyncReport((current) => (current ? { ...current, open: false } : current))}
                    type="button"
                  >
                    Close
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                  {c.syncReport.changed && c.syncReport.changes.length > 0 ? (
                    <div className="space-y-3">
                      {c.syncReport.changes.map((change, index) => (
                        <article key={`${change.path}-${index}`} className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-xs font-semibold text-slate-900">{change.path}</p>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {change.direction}
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-md border border-[var(--line)] bg-white p-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                                Previous Target Value
                              </p>
                              <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">
                                {formatDiffValue(change.previousTargetValue)}
                              </pre>
                            </div>
                            <div className="rounded-md border border-[var(--line)] bg-white p-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                                New Target Value
                              </p>
                              <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-900">
                                {formatDiffValue(change.nextTargetValue)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-2 rounded-md border border-[var(--line)] bg-white p-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                              Source of Truth ({change.sourceLanguage.toUpperCase()})
                            </p>
                            <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">
                              {formatDiffValue(change.sourceValue)}
                            </pre>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ink-muted)]">No missing fields were detected in the target language variant.</p>
                  )}
                </div>

                <div className="flex justify-end border-t border-[var(--line)] px-5 py-3">
                  <button
                    className="rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                    onClick={() => c.setSyncReport((current) => (current ? { ...current, open: false } : current))}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : null}
    </>
  );
}
