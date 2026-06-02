import { ROOT_ARRAY_EDITOR_PATHS } from "./constants";

/** Vertical rhythm between all compact field rows (single source of row spacing). */
export const EDITOR_COMPACT_FORM_ROW_GAP = "gap-y-2";

/**
 * Only experience / education / references use tabulated subsections (array items).
 * Person, positioning, optional_sections, metadata keep nested groups flush (contact, residence, …).
 */
export function compactSubsectionVisualDepth(editorPath: string, depth: number): number {
  return ROOT_ARRAY_EDITOR_PATHS.has(editorPath) ? depth : 0;
}

/** Top-level experience / education / references lists (tabulated array items). */
export function isTabulatedRootArraySection(editorPath: string, depth: number): boolean {
  return depth === 0 && ROOT_ARRAY_EDITOR_PATHS.has(editorPath);
}

/** Actions column fits AI ✨ trigger + remove control side by side (no `.` — breaks Tailwind arbitrary grid-cols). */
export const EDITOR_COMPACT_FORM_ACTIONS_COL = "5rem";

/** Parent grid on the form column — all compact field rows subgrid to these tracks. */
export const EDITOR_COMPACT_FORM_GRID_CLASS =
  `grid grid-cols-[1.5rem_8rem_minmax(0,1fr)_${EDITOR_COMPACT_FORM_ACTIONS_COL}] gap-x-2 ${EDITOR_COMPACT_FORM_ROW_GAP} content-start items-center`;

export const EDITOR_COMPACT_FIELD_TRACKS_CLASS =
  "grid grid-cols-subgrid col-span-full col-start-1 col-end-[-1] gap-x-2 w-full";

/** Promotes children to the parent form grid (for subgrid column alignment). */
export function compactFormPassthroughClass(compact: boolean): string {
  return compact ? "contents" : "";
}

/** Nested subsection shell: real grid so padding indents header title and all child rows. */
export const EDITOR_COMPACT_NESTED_SECTION_CLASS = `col-span-full col-start-1 col-end-[-1] grid grid-cols-[1.5rem_8rem_minmax(0,1fr)_${EDITOR_COMPACT_FORM_ACTIONS_COL}] gap-x-2 ${EDITOR_COMPACT_FORM_ROW_GAP} content-start items-center`;

export function compactContainerShellClass(
  compact: boolean,
  editorPath: string,
  depth = 0,
): string {
  if (!compact) {
    return "rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3";
  }
  const visualDepth = compactSubsectionVisualDepth(editorPath, depth);
  return visualDepth > 0 ? EDITOR_COMPACT_NESTED_SECTION_CLASS : "contents";
}

export function compactContainerHeaderClass(compact: boolean, depth: number): string {
  const sectionDivider = compact && depth > 0 ? "border-t border-[var(--line)] pt-2" : "";
  return compact ? `${EDITOR_COMPACT_FIELD_TRACKS_CLASS} col-span-full items-start ${sectionDivider}` : "";
}

export function compactFieldShellClass(compact: boolean, twoRow: boolean): string {
  if (!compact) {
    return `rounded-md border border-[var(--line)] bg-[var(--surface-1)] ${twoRow ? "p-3" : "px-2 py-1.5"}`;
  }
  return "";
}

export function compactChildrenStackClass(
  compact: boolean,
  editorPath: string,
  depth = 0,
): string {
  if (!compact) {
    return "space-y-2";
  }
  const visualDepth = compactSubsectionVisualDepth(editorPath, depth);
  return visualDepth > 0 ? "contents" : "contents";
}

/** Input / AI controls align to the same grid column as compact field inputs. */
export const EDITOR_FIELD_INPUT_COLUMN_CLASS = "col-start-3 col-end-4 min-w-0";

/** AI toolbar row: input column through actions column, controls + hint on one line. */
export const EDITOR_FIELD_AI_ROW_CLASS =
  "col-start-3 col-end-[-1] grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2";

/** Wrapper: equal padding above and below the separator line. */
export const EDITOR_FIELD_AI_SEPARATOR_CLASS = "col-start-3 col-end-[-1] py-2";

export const EDITOR_FIELD_AI_SEPARATOR_LINE_CLASS = "border-b border-[var(--line)]";

/** Three rewrite proposals under the AI toolbar. */
export const EDITOR_FIELD_AI_PROPOSALS_CLASS = "col-start-3 col-end-[-1] min-w-0 space-y-2";

export const EDITOR_STACKED_FIELD_AI_PROPOSALS_CLASS = "col-start-2 col-end-[-1] min-w-0 space-y-2";

/** Two-row shells (analysis drawer open): toggle | title + input | actions. */
export const EDITOR_STACKED_FIELD_GRID_CLASS =
  "grid w-full grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] gap-x-2";

export const EDITOR_STACKED_FIELD_TOGGLE_CLASS = "col-start-1 flex h-6 w-6 items-center justify-center self-center";

export const EDITOR_STACKED_FIELD_LABEL_CLASS =
  "col-start-2 min-w-0 self-center truncate text-xs font-semibold text-slate-900";

export const EDITOR_STACKED_FIELD_ACTIONS_CLASS =
  "col-start-3 flex shrink-0 items-center justify-end gap-2 self-center";

/** Row 2: full width from title through container right (buttons are on row 1 only). */
export const EDITOR_STACKED_FIELD_INPUT_CLASS = "col-start-2 col-end-[-1] mt-2 min-w-0";

/** Drawer-open AI row: aligns with field title (col 2) through actions (col 3). */
export const EDITOR_STACKED_FIELD_AI_ROW_CLASS =
  "col-start-2 col-end-[-1] grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2";

export const EDITOR_STACKED_FIELD_AI_SEPARATOR_CLASS = "col-start-2 col-end-[-1] py-2";

export const EDITOR_STACKED_FIELD_AI_SEPARATOR_LINE_CLASS = "border-b border-[var(--line)]";

export function compactAiPanelWrapClass(compact: boolean): string {
  return compact ? `${EDITOR_COMPACT_FIELD_TRACKS_CLASS} col-span-full items-start` : "";
}

export function compactSectionHeaderIndentPx(
  compact: boolean,
  editorPath: string,
  depth: number,
): number {
  const visualDepth = compactSubsectionVisualDepth(editorPath, depth);
  return compact && visualDepth > 0 ? visualDepth * 10 : 0;
}

/** Indent subsection shell so title, eye, actions, and child fields shift together. */
export function compactSectionIndentStyle(
  compact: boolean,
  editorPath: string,
  depth: number,
): { paddingLeft: number } | undefined {
  const px = compactSectionHeaderIndentPx(compact, editorPath, depth);
  return px > 0 ? { paddingLeft: px } : undefined;
}

/** Shared compact single-line control metrics (text, number, date). */
export const EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS =
  "w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs";

/** Date rows match text row height; min-h keeps native pickers from collapsing the grid row. */
export const EDITOR_COMPACT_DATE_INPUT_CLASS =
  `composer-date-input box-border min-h-8 ${EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS}`;

/** Slight extra space below date rows so gap matches taller text fields visually. */
export const EDITOR_COMPACT_DATE_ROW_CLASS = "mb-1.5";