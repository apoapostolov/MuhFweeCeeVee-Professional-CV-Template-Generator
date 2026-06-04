"use client";

import { useRef, useState, type ChangeEvent, type JSX } from "react";

import {
  buildComposerSessionBackup,
  formatBackupExportSummary,
  formatBackupImportSummary,
  importComposerSessionBackupFromText,
  serializeComposerSessionBackup,
} from "./composer-session-backup";

const IMPORT_CONFIRM_MESSAGE =
  "Replace browser preferences and server-side CVs, company metadata, and research catalog with this backup? The page will reload.";

export function SettingsDataBackupCard(): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportToTextarea(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const backup = await buildComposerSessionBackup();
      setJsonText(JSON.stringify(backup, null, 2));
      setNotice(formatBackupExportSummary(backup));
    } catch (exportError) {
      setNotice("");
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyJsonToClipboard(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const payload = jsonText.trim() || (await serializeComposerSessionBackup(true));
      if (!jsonText.trim()) {
        setJsonText(payload);
      }
      await navigator.clipboard.writeText(payload);
      setNotice("JSON copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard.");
    } finally {
      setBusy(false);
    }
  }

  async function applyImport(raw: string): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const summary = await importComposerSessionBackupFromText(raw);
      setNotice(formatBackupImportSummary(summary));
      window.setTimeout(() => window.location.reload(), 400);
    } catch (importError) {
      setNotice("");
      setError(importError instanceof Error ? importError.message : "Import failed.");
      setBusy(false);
    }
  }

  function onImportClick(): void {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      fileInputRef.current?.click();
      return;
    }
    if (!window.confirm(IMPORT_CONFIRM_MESSAGE)) {
      return;
    }
    void applyImport(trimmed);
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      if (!raw.trim()) {
        setError("Selected file is empty.");
        return;
      }
      setJsonText(raw);
      if (!window.confirm(IMPORT_CONFIRM_MESSAGE)) {
        return;
      }
      void applyImport(raw);
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsText(file);
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <h3 className="shrink-0 text-sm font-semibold text-slate-900">Import / Export Data</h3>
      <p className="mt-1 shrink-0 text-xs text-[var(--ink-muted)]">
        Full session backup: browser preferences (localStorage), researched companies and job
        positions, job-targeting metadata, and CV YAML files stored on this dev server.
      </p>
      <div className="mt-3 grid w-full shrink-0 grid-cols-2 gap-2">
        <button
          className="w-full rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:opacity-60"
          disabled={busy}
          onClick={() => void exportToTextarea()}
          type="button"
        >
          {busy ? "Working…" : "Export JSON"}
        </button>
        <button
          className="w-full rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:opacity-60"
          disabled={busy}
          onClick={() => void copyJsonToClipboard()}
          type="button"
        >
          Copy to Clipboard
        </button>
      </div>
      <label className="mt-3 flex min-h-0 flex-1 flex-col text-xs font-medium text-slate-700">
        Paste to Import Data
        <div className="relative mt-1 flex min-h-0 flex-1 flex-col">
          <textarea
            className="h-full min-h-[12rem] w-full max-w-full flex-1 resize-none rounded-md border border-[var(--line)] bg-white px-2 pb-10 pt-2 font-mono text-[11px] leading-relaxed text-slate-800 lg:min-h-0"
            disabled={busy}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder="Export JSON or paste a full session backup here."
            spellCheck={false}
            value={jsonText}
          />
          <button
            className="absolute bottom-2 right-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            disabled={busy}
            onClick={onImportClick}
            type="button"
          >
            Import JSON
          </button>
        </div>
      </label>
      <input
        accept="application/json,.json,text/plain"
        className="hidden"
        onChange={onFileSelected}
        ref={fileInputRef}
        type="file"
      />
      {notice ? <p className="mt-2 shrink-0 text-xs text-[var(--ink-muted)]">{notice}</p> : null}
      {error ? <p className="mt-2 shrink-0 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}