"use client";

import type { JSX } from "react";

export type VisibilityToggleButtonProps = {
  visible: boolean;
  onToggle: () => void;
  label: string;
  language: string;
};

export function VisibilityToggleButton({
  visible,
  onToggle,
  label,
  language,
}: VisibilityToggleButtonProps): JSX.Element {
  const title = visible
    ? language === "bg"
      ? `Скрий „${label}“ в PDF шаблона`
      : `Hide “${label}” in CV template`
    : language === "bg"
      ? `Покажи „${label}“ в PDF шаблона`
      : `Show “${label}” in CV template`;

  return (
    <button
      aria-label={title}
      aria-pressed={visible}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--line)] text-xs ${
        visible
          ? "bg-white text-slate-700 hover:bg-[var(--surface-2)]"
          : "bg-slate-100 text-slate-400 hover:bg-[var(--surface-2)]"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={title}
      type="button"
    >
      {visible ? (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.09" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M1 1l22 22M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        </svg>
      )}
    </button>
  );
}