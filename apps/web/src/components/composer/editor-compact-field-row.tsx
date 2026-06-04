"use client";

import type { CSSProperties, JSX, ReactNode } from "react";

import {
  EDITOR_COMPACT_FIELD_LEADING_GROUP_CLASS,
  EDITOR_COMPACT_FIELD_TRACKS_CLASS,
  EDITOR_COMPACT_METADATA_FIELD_TRACKS_CLASS,
} from "./editor-compact-form-layout";

/** Standalone row (no form-level grid parent). */
export const EDITOR_COMPACT_FIELD_GRID_CLASS =
  "grid w-full grid-cols-[1.5rem_8rem_minmax(0,1fr)_3.5rem] gap-x-2";

export const EDITOR_COMPACT_METADATA_FIELD_GRID_CLASS =
  "grid w-full grid-cols-[8rem_minmax(0,1fr)] gap-x-2";

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
  /** When false, omit the leading column (e.g. company metadata has no visibility toggles). */
  reserveLeadingColumn?: boolean;
  /** Indents toggle + label together without changing their internal gap (tabulated subsections). */
  leadingGroupIndentStyle?: CSSProperties;
  /** Draw one border around the control + trailing actions (multi-line fields). */
  unifiedControlBorder?: boolean;
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
  reserveLeadingColumn = true,
  leadingGroupIndentStyle,
  unifiedControlBorder = false,
}: EditorCompactFieldRowProps): JSX.Element {
  const rowAlign = alignTop ? "items-start" : "items-center";
  const labelAlign = alignTop ? "self-start pt-1" : "self-center";
  const actionsAlign = alignTop ? "self-start pt-0.5" : "self-center";
  const gridClass = useFormGrid
    ? reserveLeadingColumn
      ? EDITOR_COMPACT_FIELD_TRACKS_CLASS
      : EDITOR_COMPACT_METADATA_FIELD_TRACKS_CLASS
    : reserveLeadingColumn
      ? EDITOR_COMPACT_FIELD_GRID_CLASS
      : EDITOR_COMPACT_METADATA_FIELD_GRID_CLASS;
  const rowClass = [gridClass, rowAlign, useFormGrid ? "w-full" : "", rowClassName].filter(Boolean).join(" ");
  const leadingGroupAlign = alignTop ? "items-start" : "items-center";
  const leadingGroupClass = useFormGrid
    ? `${EDITOR_COMPACT_FIELD_LEADING_GROUP_CLASS} ${leadingGroupAlign}`
    : `col-span-2 flex min-w-0 gap-x-2 ${leadingGroupAlign}`;
  const leadingGroup = reserveLeadingColumn ? (
    <div className={leadingGroupClass} style={leadingGroupIndentStyle}>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center ${alignTop ? "self-start" : "self-center"}`}
      >
        {leading ?? <span className="sr-only" aria-hidden="true" />}
      </div>
      <div className={`min-w-0 flex-1 truncate text-xs font-semibold text-slate-900 ${labelAlign}`}>{label}</div>
    </div>
  ) : null;
  const labelCell = (
    <div className={`min-w-0 truncate text-xs font-semibold text-slate-900 ${labelAlign}`}>{label}</div>
  );

  const unifiedShellClass = unifiedControlBorder
    ? `flex min-w-0 max-w-full gap-2 rounded border border-[var(--line)] bg-white ${
        alignTop ? "items-start" : "items-center"
      }`
    : `flex min-w-0 max-w-full gap-2 ${alignTop ? "items-start" : "items-center"}`;

  const controlArea = (
    <div className={unifiedShellClass}>
      <div className="min-w-0 flex-1">{control}</div>
      {trailing ? (
        <div className={`flex shrink-0 items-center justify-end gap-2 ${actionsAlign}`}>{trailing}</div>
      ) : null}
    </div>
  );

  if (!includeAiActionSlot) {
    if (!reserveLeadingColumn) {
      /** Research / metadata: label + flex row (input grows to single action button). */
      return (
        <div className={rowClass}>
          {labelCell}
          {controlArea}
        </div>
      );
    }

    return (
      <div className={rowClass}>
        {leadingGroup}
        <div className="col-span-2 min-w-0">{controlArea}</div>
      </div>
    );
  }

  if (!reserveLeadingColumn) {
    return (
      <div className={rowClass}>
        {labelCell}
        {controlArea}
      </div>
    );
  }

  return (
    <div className={rowClass}>
      {leadingGroup}
      <div className="min-w-0 w-full">{control}</div>
      <div className={`flex shrink-0 items-center justify-end gap-2 ${actionsAlign}`}>{trailing}</div>
    </div>
  );
}