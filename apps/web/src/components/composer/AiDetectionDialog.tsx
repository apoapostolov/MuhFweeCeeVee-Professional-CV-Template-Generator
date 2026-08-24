"use client";

import type { JSX } from "react";

import type { AiDetectionReport, AiDetectionResult } from "@/lib/server/aiDetection";

function scoreColor(value: number | null): string {
  if (value === null) return "text-slate-500";
  if (value < 0.25) return "text-emerald-700";
  if (value < 0.5) return "text-lime-700";
  if (value < 0.7) return "text-amber-700";
  if (value < 0.85) return "text-orange-700";
  return "text-rose-700";
}

function scoreLabel(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function ResultRow({ result }: { result: AiDetectionResult }): JSX.Element {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--line)] py-1.5 text-[11px] last:border-b-0">
      <span className="font-semibold uppercase tracking-wide text-slate-600">{result.provider}</span>
      <span className="min-w-0 truncate text-slate-600">{result.scope} · {result.status}{result.notes ? ` · ${result.notes}` : ""}</span>
      <span className={`font-bold tabular-nums ${scoreColor(result.aiProbability)}`}>{scoreLabel(result.aiProbability)}</span>
    </div>
  );
}

export function AiDetectionDialog({
  open,
  busy,
  error,
  report,
  onClose,
  onRun,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  report: AiDetectionReport | null;
  onClose: () => void;
  onRun: () => void;
}): JSX.Element | null {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div aria-labelledby="ai-detection-title" aria-modal="true" className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-4 shadow-xl" role="dialog">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900" id="ai-detection-title">AI Detection</h2>
          <button aria-label="Close" className="rounded px-2 py-1 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)]" onClick={onClose} type="button">×</button>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          AI detectors look for writing patterns that can resemble AI-generated text. They are not proof of authorship, and even a CV written entirely by you can trigger a false positive. Checking your CV helps catch wording that sounds generic or overly polished before it raises questions in a screening process. We check the visible CV text with several detectors; external services receive a sanitized copy and may use paid quota.
        </p>
        {report ? (
          <>
            <div className="mt-3 rounded-md border border-[var(--line)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">Composite AI-writing risk</span>
                <span className={`text-lg font-black tabular-nums ${scoreColor(report.compositeRisk)}`}>{scoreLabel(report.compositeRisk)}</span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--ink-muted)]">{report.coverage} · weighted by measured word count</p>
            </div>
            <div className="mt-3">{report.results.map((result) => <ResultRow key={`${result.provider}:${result.scope}`} result={result} />)}</div>
          </>
        ) : null}
        {error ? <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-800">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold" onClick={onClose} type="button">Close</button>
          <button className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={busy} onClick={onRun} type="button">{busy ? "Scanning…" : report ? "Scan again" : "Run AI detection"}</button>
        </div>
      </div>
    </div>
  );
}
