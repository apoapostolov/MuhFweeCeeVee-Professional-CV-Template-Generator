import { ROOT_ARRAY_EDITOR_PATHS } from "./constants";

export function isTabulatedArrayEditorPath(editorPath: string): boolean {
  return ROOT_ARRAY_EDITOR_PATHS.has(editorPath);
}

/** Vertical rhythm between all compact field rows (single source of row spacing). */
export const EDITOR_COMPACT_FORM_ROW_GAP = "gap-y-2";

/** Per visual depth level for tabulated subsections (experience jobs excepted at depth 1). */
export const EDITOR_SUBSECTION_INDENT_PX = 30;

/**
 * Only experience / education / references use tabulated subsections (array items).
 * Person, positioning, optional_sections, metadata keep nested groups flush (contact, residence, …).
 */
export function compactSubsectionVisualDepth(editorPath: string, depth: number): number {
  if (!isTabulatedArrayEditorPath(editorPath)) {
    return 0;
  }
  /** Job cards sit flush under Experiences/Jobs; deeper fields (bullets, etc.) still tabulate. */
  if (editorPath === "experience") {
    if (depth <= 1) {
      return 0;
    }
    return depth - 1;
  }
  return depth;
}

/** Top-level experience / education / references lists (tabulated array items). */
export function isTabulatedRootArraySection(editorPath: string, depth: number): boolean {
  return depth === 0 && isTabulatedArrayEditorPath(editorPath);
}

/** Parent grid on the form column — all compact field rows subgrid to these tracks. */
export const EDITOR_COMPACT_FORM_GRID_CLASS =
  `grid grid-cols-[1.5rem_8rem_minmax(0,1fr)_3.5rem] gap-x-2 ${EDITOR_COMPACT_FORM_ROW_GAP} content-start items-center`;

/**
 * Research / metadata editor: label + input/actions flex row (single ✨ per field).
 * The second track is 1fr; rows use col-span-2 with flex so inputs reach the action button.
 */
export const EDITOR_COMPACT_METADATA_FORM_GRID_CLASS =
  `grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 ${EDITOR_COMPACT_FORM_ROW_GAP} content-start items-center`;

export const EDITOR_COMPACT_FIELD_TRACKS_CLASS =
  "grid grid-cols-subgrid col-span-full col-start-1 col-end-[-1] gap-x-2 w-full";

/** Toggle + label/title in one row; gap-x-2 matches the parent form grid column gap. */
export const EDITOR_COMPACT_FIELD_LEADING_GROUP_CLASS =
  "col-span-2 flex min-w-0 items-center gap-x-2";

export const EDITOR_COMPACT_SECTION_LEADING_GROUP_CLASS =
  "col-span-3 flex min-w-0 items-start gap-x-2";

export const EDITOR_COMPACT_METADATA_FIELD_TRACKS_CLASS =
  "grid grid-cols-subgrid col-span-full col-start-1 col-end-[-1] gap-x-2 w-full";

/** Promotes children to the parent form grid (for subgrid column alignment). */
export function compactFormPassthroughClass(compact: boolean): string {
  return compact ? "contents" : "";
}

export function compactContainerShellClass(
  compact: boolean,
  _editorPath: string,
  _depth = 0,
): string {
  if (!compact) {
    return "rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3";
  }
  /** Join the parent form grid so every input shares the same column-3 left edge. */
  return "contents";
}

export function compactContainerHeaderClass(compact: boolean, depth: number): string {
  const sectionDivider = compact && depth > 0 ? "border-t border-[var(--line)] pt-2" : "";
  return compact ? `${EDITOR_COMPACT_FIELD_TRACKS_CLASS} col-span-full items-start ${sectionDivider}` : "";
}

export function compactMetadataContainerHeaderClass(compact: boolean, depth: number): string {
  const sectionDivider = compact && depth > 0 ? "border-t border-[var(--line)] pt-2" : "";
  return compact ? `${EDITOR_COMPACT_METADATA_FIELD_TRACKS_CLASS} col-span-full items-start ${sectionDivider}` : "";
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

/** Company metadata (3-col grid): AI panel aligns under input + actions (not label). */
export const EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS =
  "col-start-2 col-end-[-1] min-w-0 w-full";

export const EDITOR_METADATA_FIELD_AI_ROW_CLASS =
  "col-start-2 col-end-[-1] min-w-0 w-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2";

export const EDITOR_METADATA_FIELD_AI_PROPOSALS_CLASS =
  "col-start-2 col-end-[-1] min-w-0 w-full space-y-2";

export const EDITOR_METADATA_FIELD_AI_SEPARATOR_CLASS = "col-start-2 col-end-[-1] w-full py-2";

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
  subsectionIndentEnabled = true,
): number {
  if (!subsectionIndentEnabled) {
    return 0;
  }
  const visualDepth = compactSubsectionVisualDepth(editorPath, depth);
  return compact && visualDepth > 0 ? visualDepth * EDITOR_SUBSECTION_INDENT_PX : 0;
}

/** Stacked (non-compact) layout: indent whole subsection blocks. */
export function compactSectionIndentStyle(
  compact: boolean,
  editorPath: string,
  depth: number,
  subsectionIndentEnabled = true,
): { paddingLeft: number } | undefined {
  if (compact) {
    return undefined;
  }
  const px = compactSectionHeaderIndentPx(compact, editorPath, depth, subsectionIndentEnabled);
  return px > 0 ? { paddingLeft: px } : undefined;
}

/**
 * Compact layout: indent the toggle+title group together (single paddingLeft).
 * Internal gap-x-2 stays fixed so icon-to-title spacing matches the root section.
 */
export function compactLeadingGroupIndentStyle(
  compact: boolean,
  editorPath: string,
  depth: number,
  subsectionIndentEnabled = true,
): { paddingLeft: number } | undefined {
  const px = compactSectionHeaderIndentPx(compact, editorPath, depth, subsectionIndentEnabled);
  return px > 0 ? { paddingLeft: px } : undefined;
}

/** Shared compact single-line control metrics (text, number, date). */
export const EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS =
  "w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs whitespace-pre-wrap break-words overflow-x-hidden";

/** Text control inside a row-level bordered shell (input + trailing actions). */
export const EDITOR_COMPACT_INNER_TEXT_CONTROL_CLASS =
  "w-full min-w-0 border-0 bg-transparent px-2 py-1.5 text-xs leading-5 whitespace-pre-wrap break-words overflow-x-hidden shadow-none outline-none focus:ring-0";

/** Date rows match text row height; min-h keeps native pickers from collapsing the grid row. */
export const EDITOR_COMPACT_DATE_INPUT_CLASS =
  `composer-date-input box-border min-h-8 ${EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS}`;

/** Slight extra space below date rows so gap matches taller text fields visually. */
export const EDITOR_COMPACT_DATE_ROW_CLASS = "mb-1.5";