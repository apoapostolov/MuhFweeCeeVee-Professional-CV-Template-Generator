"use client";

import type { JSX } from "react";

import type { EditorAutosaveActivity } from "./types";

export function autosavePillLabel(
  activity: EditorAutosaveActivity,
  language: string,
): string {
  if (activity === "pending" || activity === "saving") {
    return language === "bg" ? "Запазване…" : "Saving…";
  }
  if (activity === "saved") {
    return language === "bg" ? "Запазено" : "Saved";
  }
  return "";
}

export type EditorAutosaveStatusPillProps = {
  activity: EditorAutosaveActivity;
  language: string;
};

export function EditorAutosaveStatusPill({
  activity,
  language,
}: EditorAutosaveStatusPillProps): JSX.Element | null {
  if (activity === "idle") {
    return null;
  }
  const label = autosavePillLabel(activity, language);
  if (!label) {
    return null;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        activity === "saved"
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}

export type EditorAutoSaveToggleProps = {
  enabled: boolean;
  language: string;
  onChange: (enabled: boolean) => void;
};

export function EditorAutoSaveToggle({
  enabled,
  language,
  onChange,
}: EditorAutoSaveToggleProps): JSX.Element {
  const ariaLabel = language === "bg" ? "Автоматичен запис" : "Auto Save";
  const label = language === "bg" ? "Авто запис" : "Auto Save";
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-md border border-[var(--line)] text-xs font-semibold"
      role="group"
    >
      <span className="border-r border-[var(--line)] bg-white px-2.5 py-1.5 text-slate-800">{label}</span>
      <button
        className={`px-2.5 py-1.5 ${
          enabled ? "bg-[var(--accent)] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        }`}
        onClick={() => onChange(true)}
        type="button"
      >
        ON
      </button>
      <button
        className={`border-l border-[var(--line)] px-2.5 py-1.5 ${
          !enabled ? "bg-[var(--accent)] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        }`}
        onClick={() => onChange(false)}
        type="button"
      >
        OFF
      </button>
    </div>
  );
}

export type EditorFlatSubsectionsToggleProps = {
  /** When true, nested CV subsections have no left indent. */
  flat: boolean;
  language: string;
  onChange: (flat: boolean) => void;
};

export function EditorFlatSubsectionsToggle({
  flat,
  language,
  onChange,
}: EditorFlatSubsectionsToggleProps): JSX.Element {
  const ariaLabel =
    language === "bg" ? "Плоски подсекции (без отстъп)" : "Flat subsections (no indent)";
  const label = language === "bg" ? "Плоски секции" : "Flat sections";
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-md border border-[var(--line)] text-xs font-semibold"
      role="group"
    >
      <span className="border-r border-[var(--line)] bg-white px-2.5 py-1.5 text-slate-800">{label}</span>
      <button
        className={`px-2.5 py-1.5 ${
          flat ? "bg-[var(--accent)] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        }`}
        onClick={() => onChange(true)}
        type="button"
      >
        ON
      </button>
      <button
        className={`border-l border-[var(--line)] px-2.5 py-1.5 ${
          !flat ? "bg-[var(--accent)] text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        }`}
        onClick={() => onChange(false)}
        type="button"
      >
        OFF
      </button>
    </div>
  );
}