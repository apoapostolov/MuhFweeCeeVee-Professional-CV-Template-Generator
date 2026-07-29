"use client";

import { useRef, useState, type ChangeEvent, type JSX } from "react";

import {
  buildComposerSessionBackup,
  formatBackupExportSummary,
  formatBackupImportSummary,
  importComposerSessionBackupFromText,
} from "./composer-session-backup";
import {
  buildComposerSessionArchive,
  formatArchiveExportSummary,
  formatArchiveImportSummary,
  importComposerSessionArchive,
} from "./composer-session-archive";

const IMPORT_CONFIRM_MESSAGE =
  "Merge this backup into the current session? Matching CV, application, cover-letter, and photo IDs will be updated. Included assistant conversations restore archived and cannot run old approvals. Records not present in the backup will remain. Included browser preferences will be overwritten, then the page will reload.";

export function SettingsDataBackupCard(): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeGeneratedPdfs, setIncludeGeneratedPdfs] = useState(true);
  const [includeAssistantHistory, setIncludeAssistantHistory] = useState(false);

  async function exportToTextarea(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const backup = await buildComposerSessionBackup({ includeAssistantHistory });
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
      const payload =
        jsonText.trim() ||
        JSON.stringify(
          await buildComposerSessionBackup({ includeAssistantHistory }),
          null,
          2,
        );
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

  async function downloadBackupFile(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const archive = await buildComposerSessionArchive({
        includeGeneratedPdfs,
        includeAssistantHistory,
      });
      const url = URL.createObjectURL(archive.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = archive.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(formatArchiveExportSummary(archive));
    } catch (exportError) {
      setNotice("");
      setError(
        exportError instanceof Error ? exportError.message : "Download failed.",
      );
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

  async function applyZipImport(file: File): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const summary = await importComposerSessionArchive(file);
      setNotice(formatArchiveImportSummary(summary));
      window.setTimeout(() => window.location.reload(), 400);
    } catch (importError) {
      setNotice("");
      setError(
        importError instanceof Error ? importError.message : "ZIP import failed.",
      );
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
    if (
      file.name.toLowerCase().endsWith(".zip") ||
      file.type === "application/zip"
    ) {
      if (!window.confirm(IMPORT_CONFIRM_MESSAGE)) {
        return;
      }
      void applyZipImport(file);
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
      <h2 className="shrink-0 text-xl font-bold text-slate-900">Import / Export Data</h2>
      <p className="mt-2 shrink-0 text-sm text-[var(--ink-muted)]">
        Portable ZIP backups include browser preferences, research, CV sources, applications,
        cover letters and history, plus photos actually used by applications or approved in
        Photo Booth.
      </p>
      <label className="mt-3 flex shrink-0 items-center gap-2 text-xs font-medium text-slate-700">
        <input
          checked={includeGeneratedPdfs}
          disabled={busy}
          onChange={(event) => setIncludeGeneratedPdfs(event.target.checked)}
          type="checkbox"
        />
        Generate application PDFs with the currently selected template
      </label>
      <label className="mt-2 flex shrink-0 items-start gap-2 text-xs font-medium text-slate-700">
        <input
          checked={includeAssistantHistory}
          disabled={busy}
          onChange={(event) => setIncludeAssistantHistory(event.target.checked)}
          type="checkbox"
        />
        <span>
          Include private MuhFwee AI conversations and saved playbooks
          <span className="mt-0.5 block font-normal text-[var(--ink-muted)]">
            Off by default. Approval arguments are redacted, and restored
            conversations are archived so old operations cannot be applied.
          </span>
        </span>
      </label>
      <div className="mt-4 grid w-full shrink-0 grid-cols-3 gap-2">
        <button
          className="w-full rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-60"
          disabled={busy}
          onClick={() => void downloadBackupFile()}
          type="button"
        >
          {busy ? "Working…" : "Download ZIP"}
        </button>
        <button
          className="w-full rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:opacity-60"
          disabled={busy}
          onClick={() => void exportToTextarea()}
          type="button"
        >
          Show JSON
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
      <label className="mt-4 flex min-h-0 flex-1 flex-col text-xs font-medium text-slate-700">
        Paste to Import Data
        <div className="relative mt-1 flex min-h-0 flex-1 flex-col">
          <textarea
            className="h-full min-h-[12rem] w-full max-w-full flex-1 resize-none rounded-md border border-[var(--line)] bg-white px-2 pb-10 pt-2 font-mono text-[11px] leading-relaxed text-slate-800 lg:min-h-0"
            disabled={busy}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder="Show JSON or paste a session backup here."
            spellCheck={false}
            value={jsonText}
          />
          <button
            className="absolute bottom-2 right-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            disabled={busy}
            onClick={onImportClick}
            type="button"
          >
            Import JSON / ZIP
          </button>
        </div>
      </label>
      <input
        accept="application/json,application/zip,.json,.zip,text/plain"
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
