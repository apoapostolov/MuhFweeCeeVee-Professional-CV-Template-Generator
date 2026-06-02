"use client";

import type { JSX, ReactNode } from "react";

import {
  EDITOR_COMPACT_FIELD_TRACKS_CLASS,
  EDITOR_COMPACT_FORM_ACTIONS_COL,
} from "./editor-compact-form-layout";

/** Standalone row (no form-level grid parent). */
export const EDITOR_COMPACT_FIELD_GRID_CLASS =
  `grid w-full grid-cols-[1.5rem_8rem_minmax(0,1fr)_${EDITOR_COMPACT_FORM_ACTIONS_COL}] gap-x-2`;

export type EditorCompactFieldRowProps = {
  leading?: ReactNode;
  label: ReactNode;
  control: ReactNode;
  trailing?: ReactNode;
  /** Use parent form grid tracks so inputs align across nesting depth. */
  useFormGrid?: boolean;
  /** When false, control spans the input+actions area (no reserved ✨ slot). */
  includeAiActionSlot?: boolean;
  /** Align label/actions to top when the control is multi-line (e.g. textarea). */
  alignTop?: boolean;
  /** Extra classes on the row grid (e.g. tighter spacing below date fields). */
  rowClassName?: string;
};

export function EditorCompactFieldRow({
  leading,
  label,
  control,
  trailing,
  useFormGrid = false,
  includeAiActionSlot = true,
  alignTop = false,
  rowClassName = "",
}: EditorCompactFieldRowProps): JSX.Element {
  const rowAlign = alignTop ? "items-start" : "items-center";
  const labelAlign = alignTop ? "self-start pt-1" : "self-center";
  const actionsAlign = alignTop ? "self-start pt-0.5" : "self-center";
  const gridClass = useFormGrid ? EDITOR_COMPACT_FIELD_TRACKS_CLASS : EDITOR_COMPACT_FIELD_GRID_CLASS;
  const rowClass = [gridClass, rowAlign, useFormGrid ? "w-full" : "", rowClassName].filter(Boolean).join(" ");
  const leadingCell = (
    <div className={`flex h-6 w-6 items-center justify-center ${alignTop ? "self-start" : "self-center"}`}>
      {leading ?? <span className="sr-only" aria-hidden="true" />}
    </div>
  );
  const labelCell = (
    <div className={`min-w-0 truncate text-xs font-semibold text-slate-900 ${labelAlign}`}>{label}</div>
  );

  if (!includeAiActionSlot) {
    return (
      <div className={rowClass}>
        {leadingCell}
        {labelCell}
        <div
          className={`col-span-2 flex min-w-0 gap-2 ${alignTop ? "items-start" : "items-center"}`}
        >
          <div className="min-w-0 flex-1">{control}</div>
          {trailing ? <div className={`flex shrink-0 items-center gap-2 ${actionsAlign}`}>{trailing}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={rowClass}>
      {leadingCell}
      {labelCell}
      <div className="min-w-0">{control}</div>
      <div className={`flex min-w-0 items-center justify-end gap-1 ${actionsAlign}`}>{trailing}</div>
    </div>
  );
}