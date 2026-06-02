"use client";

import Image from "next/image";
import type { ChangeEvent, DragEvent, JSX, RefObject } from "react";

import { scoreTone } from "./analysis-ui-utils";
import { photoVerdictPillClass } from "./form-path-utils";
import type { PhotoBoothItem, PhotoComparisonAnalysis } from "./types";

export type PhotoBoothPanelProps = {
  resolvedTheme: "light" | "dark";
  photoBoothItems: PhotoBoothItem[];
  photoBoothAnalysisFocusId: string;
  approvedPhotoId: string;
  selectedModelId: string;
  photoBoothDragging: boolean;
  setPhotoBoothDragging: (value: boolean) => void;
  photoBoothInputRef: RefObject<HTMLInputElement | null>;
  photoBoothNotice: string;
  photoBoothCompareIds: string[];
  photoBoothAnalyzingId: string;
  photoBoothCompareLoading: boolean;
  photoBoothComparison: PhotoComparisonAnalysis | null;
  photoBoothComparisonHistory: PhotoComparisonAnalysis[];
  onPhotoBoothDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPhotoBoothInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasteFromClipboard: (clipboardData: DataTransfer | null) => void;
  onSetAnalysisFocusId: (id: string) => void;
  onApproveItem: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onToggleCompareSelection: (id: string) => void;
  onAnalyze: (id: string) => void;
  onComparePair: () => void;
};

export function PhotoBoothPanel(props: PhotoBoothPanelProps): JSX.Element {
  const {
    resolvedTheme,
    photoBoothItems,
    photoBoothAnalysisFocusId,
    approvedPhotoId,
    selectedModelId,
    photoBoothDragging,
    setPhotoBoothDragging,
    photoBoothInputRef,
    photoBoothNotice,
    photoBoothCompareIds,
    photoBoothAnalyzingId,
    photoBoothCompareLoading,
    photoBoothComparison,
    photoBoothComparisonHistory,
    onPhotoBoothDrop,
    onPhotoBoothInput,
    onPasteFromClipboard,
    onSetAnalysisFocusId,
    onApproveItem,
    onRequestDelete,
    onToggleCompareSelection,
    onAnalyze,
    onComparePair,
  } = props;

  const analysisFocus = photoBoothItems.find((item) => item.id === photoBoothAnalysisFocusId) ?? null;
  const analyzeTargetId = analysisFocus?.id || approvedPhotoId || "";

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
        <article className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white p-4">
          <h2 className="text-xl font-bold text-slate-900">Photo Booth</h2>
          <div
            className={`mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-5 py-4 text-center transition ${
              photoBoothDragging
                ? "border-[var(--accent)] bg-sky-50"
                : "border-slate-300 bg-[var(--surface-1)] hover:border-[var(--accent)]"
            }`}
            onClick={() => photoBoothInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setPhotoBoothDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setPhotoBoothDragging(false);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setPhotoBoothDragging(true);
            }}
            onDrop={onPhotoBoothDrop}
            onPaste={(event) => {
              event.preventDefault();
              onPasteFromClipboard(event.clipboardData);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                photoBoothInputRef.current?.click();
              }
            }}
          >
            <div>
              <p className="text-lg font-semibold text-slate-800">DROP IMAGE HERE or COPY/PASTE FROM CLIPBOARD</p>
              <p className="mt-1 text-xs text-slate-600">PNG, JPG, WEBP, AVIF supported</p>
              <p className="mt-1 text-xs text-slate-500">or click to browse files</p>
            </div>
          </div>
          <input
            ref={photoBoothInputRef}
            accept="image/*"
            className="hidden"
            multiple
            onChange={(event) => {
              onPhotoBoothInput(event);
            }}
            type="file"
          />
          {photoBoothNotice ? <p className="mt-3 text-xs text-[var(--ink-muted)]">{photoBoothNotice}</p> : null}

          <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
            {photoBoothItems.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">No images uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {photoBoothItems.map((item) => {
                  const isApproved = item.id === approvedPhotoId;
                  const isFocused = analysisFocus?.id === item.id;
                  const isCompareSelected = photoBoothCompareIds.includes(item.id);
                  return (
                    <article
                      key={item.id}
                      className={`rounded-lg border bg-white p-1.5 shadow-sm ${
                        isApproved
                          ? "border-emerald-400 ring-2 ring-emerald-200"
                          : isCompareSelected
                            ? "border-amber-400 ring-2 ring-amber-200"
                          : isFocused
                            ? "border-sky-400 ring-2 ring-sky-200"
                            : "border-slate-200"
                      }`}
                      onClick={() => onSetAnalysisFocusId(item.id)}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-slate-100">
                        <Image alt={item.name} className="h-full w-full object-cover" fill src={item.dataUrl} unoptimized />
                        {item.analysis?.verdict ? (
                          <span
                            className={`absolute right-1 top-1 z-10 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] ${photoVerdictPillClass(item.analysis.verdict)}`}
                          >
                            {item.analysis.verdict}
                          </span>
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <button
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border shadow-sm ${
                              isApproved
                                ? "border-emerald-400/80 bg-emerald-600/90 text-white"
                                : "border-white/50 bg-black/55 text-white hover:bg-black/70"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onApproveItem(item.id);
                            }}
                            title={isApproved ? "Unapprove" : "Approve for CV rendering"}
                            type="button"
                          >
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                              <path d="M5 12.5 9.3 17 19 7.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </button>
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-300/80 bg-rose-700/90 text-white shadow-sm hover:bg-rose-800/90"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRequestDelete(item.id);
                            }}
                            title="Remove image"
                            type="button"
                          >
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                              <path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M8 7l.8 11.2a1 1 0 0 0 1 .8h4.4a1 1 0 0 0 1-.8L16 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                            </svg>
                          </button>
                          <button
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border shadow-sm ${
                              isCompareSelected
                                ? "border-amber-400/80 bg-amber-600/90 text-white"
                                : "border-white/50 bg-black/55 text-white hover:bg-black/70"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleCompareSelection(item.id);
                            }}
                            title={isCompareSelected ? "Remove from compare" : "Select for compare"}
                            type="button"
                          >
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                              <path d="M4 7h8v10H4zM12 7h8v10h-8z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 truncate text-[10px] font-semibold text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {item.width}x{item.height}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        <article className="min-h-0 overflow-auto rounded-xl border border-[var(--line)] bg-white p-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">AI Analysis</h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Multimodal photo assessment using your configured OpenRouter model.
            </p>
            <button
              className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              disabled={!analyzeTargetId || photoBoothAnalyzingId.length > 0}
              onClick={() => {
                if (!analyzeTargetId) return;
                if (!analysisFocus) {
                  onSetAnalysisFocusId(analyzeTargetId);
                }
                onAnalyze(analyzeTargetId);
              }}
              type="button"
            >
              {photoBoothAnalyzingId ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              ) : (
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M12 3 14.4 8.1 20 10l-5.6 1.9L12 17l-2.4-5.1L4 10l5.6-1.9Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
              )}
              Analyze Photo
            </button>
            <button
              className="ml-2 mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              disabled={photoBoothCompareIds.length < 2 || photoBoothCompareLoading}
              onClick={() => {
                onComparePair();
              }}
              type="button"
            >
              {photoBoothCompareLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              ) : (
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M4 7h8v10H4zM12 7h8v10h-8z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
              )}
              Compare Selected Photos
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3">
            {!analysisFocus ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Choose an image from the gallery and run <span className="font-semibold">Analyze Photo</span>.
              </p>
            ) : analysisFocus.analysis ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    Result • {analysisFocus.analysis.model || selectedModelId}
                  </p>
                  <p className={`text-sm font-bold ${scoreTone(resolvedTheme, Number(analysisFocus.analysis.score ?? 0))}`}>
                    {analysisFocus.analysis.score}/100 ({analysisFocus.analysis.verdict})
                  </p>
                </div>
                <ul className="list-disc space-y-1 pl-4 text-sm text-slate-800">
                  {analysisFocus.analysis.notes.map((note, index) => (
                    <li key={`${analysisFocus.id}-analysis-${index}`}>{note}</li>
                  ))}
                </ul>
                {(analysisFocus.analysis.clothingProposals ?? []).length > 0 ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      Clothing Proposals
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-slate-800">
                      {(analysisFocus.analysis.clothingProposals ?? []).map((entry, index) => (
                        <li key={`${analysisFocus.id}-clothing-${index}`}>{entry}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Last analyzed: {new Date(analysisFocus.analysis.analyzedAt).toLocaleString()}
                </p>
                {(analysisFocus.analysisHistory ?? []).length > 1 ? (
                  <div className="mt-2 border-t border-[var(--line)] pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      Analysis History
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700">
                      {(analysisFocus.analysisHistory ?? []).slice(0, 8).map((entry, index) => (
                        <li key={`${analysisFocus.id}-history-${index}`} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1">
                          <span>{new Date(entry.analyzedAt).toLocaleString()}</span>
                          <span className={`font-semibold ${scoreTone(resolvedTheme, Number(entry.score ?? 0))}`}>{entry.score}/100</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                No AI result yet for <span className="font-semibold">{analysisFocus.name}</span>.
              </p>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3">
            {photoBoothCompareIds.length < 2 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Select at least 2 photos in the gallery and run <span className="font-semibold">Compare Selected Photos</span>.
              </p>
            ) : photoBoothComparison ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    Comparison • {photoBoothComparison.model || selectedModelId}
                  </p>
                  <p className="text-xs font-semibold text-slate-900">
                    Winner: {photoBoothComparison.winnerName || "N/A"}
                  </p>
                </div>
                {photoBoothComparison.ranked.length > 0 ? (
                  <div className="space-y-2">
                    {photoBoothComparison.ranked.map((item, index) => (
                      <div key={`ranked-${index}-${item.name}`} className="rounded-md bg-white p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">
                            #{index + 1} {item.name}
                          </p>
                          <p className={`text-xs font-bold ${scoreTone(resolvedTheme, item.score)}`}>{item.score}/100 ({item.verdict})</p>
                        </div>
                        {item.strengths.length > 0 ? (
                          <div className="mt-1">
                            <p className="text-[11px] font-semibold text-slate-700">Strengths</p>
                            <ul className="list-disc pl-4 text-[11px] text-slate-700">
                              {item.strengths.map((entry, itemIndex) => (
                                <li key={`ranked-strength-${index}-${itemIndex}`}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {item.risks.length > 0 ? (
                          <div className="mt-1">
                            <p className="text-[11px] font-semibold text-slate-700">Risks</p>
                            <ul className="list-disc pl-4 text-[11px] text-slate-700">
                              {item.risks.map((entry, itemIndex) => (
                                <li key={`ranked-risk-${index}-${itemIndex}`}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {item.improvements.length > 0 ? (
                          <div className="mt-1">
                            <p className="text-[11px] font-semibold text-slate-700">Improvements</p>
                            <ul className="list-disc pl-4 text-[11px] text-slate-700">
                              {item.improvements.map((entry, itemIndex) => (
                                <li key={`ranked-improve-${index}-${itemIndex}`}>{entry}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {photoBoothComparison.criteria.length > 0 ? (
                  <div className="rounded-md bg-white p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      Criterion Comparison
                    </p>
                    <div className="mt-1 space-y-2">
                      {photoBoothComparison.criteria.map((criterion, index) => (
                        <div key={`criterion-${index}`} className="rounded-md border border-[var(--line)] p-2">
                          <p className="text-xs font-semibold text-slate-900">{criterion.name}</p>
                          <p className="mt-1 text-[11px] text-slate-700">{criterion.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="text-[11px] text-slate-700">{photoBoothComparison.recommendation}</p>
                {photoBoothComparison.recommendationDetails.length > 0 ? (
                  <ul className="list-disc pl-4 text-[11px] text-slate-700">
                    {photoBoothComparison.recommendationDetails.map((entry, index) => (
                      <li key={`compare-recommend-${index}`}>{entry}</li>
                    ))}
                  </ul>
                ) : null}
                {photoBoothComparisonHistory.length > 1 ? (
                  <div className="rounded-md bg-white p-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                      Comparison History
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-slate-700">
                      {photoBoothComparisonHistory.slice(0, 6).map((entry, index) => (
                        <li key={`compare-history-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] px-2 py-1">
                          <span>{new Date(entry.analyzedAt).toLocaleString()}</span>
                          <span className="font-semibold">{entry.winnerName || "N/A"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                Ready to compare <span className="font-semibold">{photoBoothCompareIds.length}</span> selected images.
              </p>
            )}
          </div>
        </article>
      </div>
    );
}
