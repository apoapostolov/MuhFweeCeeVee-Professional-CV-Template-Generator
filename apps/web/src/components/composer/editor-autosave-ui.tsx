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
  if (activity === "pending" || activity === "saving") {
    return (
      <span
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center text-amber-700"
        role="status"
        title={label}
      >
        <svg
          aria-hidden="true"
          className={`h-4 w-4 motion-reduce:animate-none ${activity === "saving" ? "animate-pulse" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 3.75h11.69L19.25 6.3V20.25H5V3.75Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <path
            d="M8 3.75v5h7v-5M8.25 20.25v-5.5h7.5v5.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
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
      className="inline-flex w-full overflow-hidden rounded-md border border-[var(--line)] text-xs font-semibold"
      role="group"
    >
      <span className="flex-1 border-r border-[var(--line)] bg-white px-2.5 py-1.5 text-slate-800">{label}</span>
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