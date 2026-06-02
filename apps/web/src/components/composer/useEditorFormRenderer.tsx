"use client";

import type { JSX, KeyboardEvent, RefObject, UIEvent } from "react";
import { parseDocument } from "yaml";

import { isTemplatePathVisible, pathSegmentsToVisibilityKey } from "@/lib/cvTemplateVisibility";
import {
  appendToArrayAtPath,
  defaultArrayEntry,
  defaultFromSample,
  estimateTextareaRows,
  isDateLike,
  removeAtPath,
  resolveFieldCopy,
  shouldUseTextarea,
} from "./form-path-utils";
import {
  collectVisibleAiFieldPathLabels,
  isExperienceItemPath,
  isDateFieldKey,
  primitiveFieldSupportsAiRewrite,
  renderEmploymentTypeSelect,
  renderIsCurrentHeaderControl,
} from "./editor-form-fields";
import { ConfirmRemoveButton } from "./confirm-remove-button";
import { EditorCompactFieldRow } from "./editor-compact-field-row";
import {
  compactAiPanelWrapClass,
  compactChildrenStackClass,
  compactContainerHeaderClass,
  compactContainerShellClass,
  compactFieldShellClass,
  compactFormPassthroughClass,
  compactSectionIndentStyle,
  isTabulatedRootArraySection,
  EDITOR_STACKED_FIELD_ACTIONS_CLASS,
  EDITOR_STACKED_FIELD_GRID_CLASS,
  EDITOR_STACKED_FIELD_INPUT_CLASS,
  EDITOR_STACKED_FIELD_LABEL_CLASS,
  EDITOR_STACKED_FIELD_TOGGLE_CLASS,
  EDITOR_COMPACT_DATE_INPUT_CLASS,
  EDITOR_COMPACT_DATE_ROW_CLASS,
  EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS,
} from "./editor-compact-form-layout";
import {
  EDITOR_FIELD_AI_INPUT_PAD_CLASS,
  EditorFieldAiInputChrome,
  EditorFieldAiPanel,
  EditorFieldAiProvider,
  EditorFieldAiTrigger,
} from "./editor-field-ai";
import { CustomFieldControl } from "./custom-field-control";
import {
  getCustomFieldDefinition,
  isReservedObjectEntryKey,
} from "./custom-field-types";
import type { PathSegment } from "./types";
import { VisibilityToggleButton } from "./visibility-toggle";

export type EditorFormRendererContext = {
  resolvedTheme: "light" | "dark";
  selectedCvId: string;
  selectedLanguage: string;
  editorPath: string;
  selectedTemplateId: string;
  onEditorNotice: (message: string) => void;
  analysisDrawerCollapsed: boolean;
  templateVisibility: Record<string, boolean>;
  onToggleTemplateVisibility: (visibilityKey: string) => void;
  expandedFormNodes: Record<string, boolean>;
  setExpandedFormNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  updateDraftAt: (path: PathSegment[], value: unknown) => void;
  updateTextDraftAt: (path: PathSegment[], value: string, meta: { fieldLabel: string }) => void;
  removeDraftAt: (path: PathSegment[]) => void;
  addArrayEntry: (path: PathSegment[], sample: unknown) => void;
  addCustomObjectField: (path: PathSegment[]) => void;
  addCustomArrayEntry: (path: PathSegment[]) => void;
  updateCompanyMetadataDraftAt: (path: PathSegment[], value: unknown) => void;
  removeCompanyMetadataDraftAt: (path: PathSegment[]) => void;
  addCompanyMetadataArrayEntry: (path: PathSegment[], pathLabel: string, sample: unknown) => void;
  addCompanyMetadataCustomObjectField: (path: PathSegment[]) => void;
  addCompanyMetadataCustomArrayEntry: (path: PathSegment[]) => void;
  yamlHighlightRef: RefObject<HTMLDivElement | null>;
  yamlDraft: string;
  setYamlDraft: React.Dispatch<React.SetStateAction<string>>;
  sectionDraft: unknown;
  companyMetadataDraft: unknown;
};

export function extractYamlLintIssuesFromDocument(text: string): string[] {
  const doc = parseDocument(text, { prettyErrors: false });
  if ((doc.errors ?? []).length === 0) {
    return [];
  }
  const issues = (doc.errors ?? []).map((error) => {
    const linePos = (error as { linePos?: Array<{ line?: number }> }).linePos;
    const line = linePos?.[0]?.line;
    const message = String((error as { message?: string }).message ?? "Invalid YAML")
      .replace(/\s+at line\s+\d+.*$/i, "")
      .trim();
    if (typeof line === "number" && Number.isFinite(line)) {
      return `Line ${line}: ${message}`;
    }
    return message;
  });
  return Array.from(new Set(issues));
}

export function useEditorFormRenderer(ctx: EditorFormRendererContext) {
  const {
    resolvedTheme,
    selectedCvId,
    selectedLanguage,
    editorPath,
    selectedTemplateId,
    onEditorNotice,
    analysisDrawerCollapsed,
    templateVisibility,
    onToggleTemplateVisibility,
    expandedFormNodes,
    setExpandedFormNodes,
    updateDraftAt,
    updateTextDraftAt,
    removeDraftAt,
    addArrayEntry,
    addCustomObjectField,
    addCustomArrayEntry,
    updateCompanyMetadataDraftAt,
    removeCompanyMetadataDraftAt,
    addCompanyMetadataArrayEntry,
    addCompanyMetadataCustomObjectField,
    addCompanyMetadataCustomArrayEntry,
    yamlHighlightRef,
    yamlDraft,
    setYamlDraft,
    sectionDraft,
    companyMetadataDraft,
  } = ctx;

  function renderYamlLine(line: string, index: number): JSX.Element {
    const keyValueMatch = /^(\s*)(-\s+)?([A-Za-z0-9_.-]+):(.*)$/.exec(line);
    const lineNumber = String(index + 1).padStart(3, " ");
    const isDark = resolvedTheme === "dark";
    const lineNumberClass = isDark ? "select-none text-[10px] text-slate-500" : "select-none text-[10px] text-slate-400";
    const blankClass = isDark ? "text-xs leading-5 text-slate-500" : "text-xs leading-5 text-slate-500";
    const commentClass = isDark ? "whitespace-pre text-xs italic leading-5 text-slate-400" : "whitespace-pre text-xs italic leading-5 text-slate-500";
    const indentClass = isDark ? "text-slate-500" : "text-slate-500";
    const keyClass = isDark ? "font-semibold text-sky-300" : "font-semibold text-sky-700";
    const listClass = isDark ? "font-semibold text-fuchsia-300" : "font-semibold text-fuchsia-700";
    const colonClass = isDark ? "text-slate-400" : "text-slate-600";
    const fallbackLineClass = isDark ? "whitespace-pre text-xs leading-5 text-slate-300" : "whitespace-pre text-xs leading-5 text-slate-700";

    if (line.trim().length === 0) {
      return (
        <div key={`yaml-line-${index}`} className="grid grid-cols-[36px_1fr] gap-2">
          <span className={lineNumberClass}>{lineNumber}</span>
          <span className={blankClass}>&nbsp;</span>
        </div>
      );
    }

    if (/^\s*#/.test(line)) {
      return (
        <div key={`yaml-line-${index}`} className="grid grid-cols-[36px_1fr] gap-2">
          <span className={lineNumberClass}>{lineNumber}</span>
          <span className={commentClass}>{line}</span>
        </div>
      );
    }

    if (keyValueMatch) {
      const [, leading, listPrefix = "", key, rawValue] = keyValueMatch;
      const value = rawValue ?? "";
      const valueTrim = value.trim();
      let valueClass = isDark ? "text-emerald-300" : "text-emerald-700";
      if (/^(true|false|null)$/i.test(valueTrim)) {
        valueClass = isDark ? "text-violet-300" : "text-violet-700";
      } else if (/^-?\d+(\.\d+)?$/.test(valueTrim)) {
        valueClass = isDark ? "text-amber-300" : "text-amber-700";
      } else if (valueTrim.length === 0) {
        valueClass = isDark ? "text-slate-500" : "text-slate-400";
      }
      return (
        <div key={`yaml-line-${index}`} className="grid grid-cols-[36px_1fr] gap-2">
          <span className={lineNumberClass}>{lineNumber}</span>
          <span className="whitespace-pre text-xs leading-5">
            <span className={indentClass}>{leading}</span>
            {listPrefix ? <span className={listClass}>{listPrefix}</span> : null}
            <span className={keyClass}>{key}</span>
            <span className={colonClass}>:</span>
            <span className={` ${valueClass}`}>{value}</span>
          </span>
        </div>
      );
    }

    if (/^\s*-\s+/.test(line)) {
      const listMatch = /^(\s*)(-\s+)(.*)$/.exec(line);
      if (listMatch) {
        return (
          <div key={`yaml-line-${index}`} className="grid grid-cols-[36px_1fr] gap-2">
            <span className={lineNumberClass}>{lineNumber}</span>
            <span className="whitespace-pre text-xs leading-5">
              <span className={indentClass}>{listMatch[1]}</span>
              <span className={listClass}>{listMatch[2]}</span>
              <span className={isDark ? "text-emerald-300" : "text-emerald-700"}>{listMatch[3]}</span>
            </span>
          </div>
        );
      }
    }

    return (
      <div key={`yaml-line-${index}`} className="grid grid-cols-[36px_1fr] gap-2">
        <span className={lineNumberClass}>{lineNumber}</span>
        <span className={fallbackLineClass}>{line}</span>
      </div>
    );
  }

  function handleYamlEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const before = yamlDraft.slice(0, start);
    const after = yamlDraft.slice(end);
    const next = `${before}  ${after}`;
    setYamlDraft(next);
    requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
    });
  }

  function handleYamlEditorScroll(event: UIEvent<HTMLTextAreaElement>): void {
    if (!yamlHighlightRef.current) return;
    yamlHighlightRef.current.scrollTop = event.currentTarget.scrollTop;
    yamlHighlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }
  function renderFormNode(
    node: unknown,
    path: PathSegment[],
    pathLabel: string,
    keyName: string,
    options?: {
      onRemove?: () => void;
      headingTitle?: string;
      headingSubtitle?: string;
      depth?: number;
      aiFieldOrder?: readonly string[];
    },
  ): JSX.Element {
    const depth = options?.depth ?? 0;
    const childDepth = depth + 1;
    const aiFieldOrder =
      options?.aiFieldOrder ??
      (path.length === 0
        ? collectVisibleAiFieldPathLabels(node, path, pathLabel, expandedFormNodes)
        : []);
    const childRenderOptions = {
      aiFieldOrder,
      depth: childDepth,
    };
    function formPathKey(targetPath: PathSegment[]): string {
      if (targetPath.length === 0) return "__root__";
      return targetPath
        .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
        .join(".");
    }

    function setFormNodeExpanded(targetPath: PathSegment[], value: boolean): void {
      const key = formPathKey(targetPath);
      setExpandedFormNodes((current) => ({ ...current, [key]: value }));
    }

    function isFormNodeExpanded(targetPath: PathSegment[]): boolean {
      const key = formPathKey(targetPath);
      if (typeof expandedFormNodes[key] === "boolean") {
        return expandedFormNodes[key];
      }
      // Default expanded so list sections (experience, education, references) show their fields.
      return true;
    }

    function readStringField(record: Record<string, unknown>, keys: string[]): string {
      for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) {
          return value.trim();
        }
      }
      return "";
    }

    function formatPeriod(record: Record<string, unknown>): string {
      const start = readStringField(record, ["date_start", "start_date", "start", "from", "begin", "started_at"]);
      const end = readStringField(record, ["date_end", "end_date", "end", "to", "ended_at"]);
      const isCurrent = Boolean(record.is_current ?? record.current ?? record.present);
      const endLabel = isCurrent ? "Present" : (end || "");
      if (start && endLabel) return `${start} - ${endLabel}`;
      if (start) return start;
      if (endLabel) return endLabel;
      return "";
    }

    function describeContainerHeading(
      record: Record<string, unknown>,
      fallbackTitle: string,
      hintPath: string,
    ): { title: string; subtitle: string } {
      const hint = hintPath.toLowerCase();
      const period = formatPeriod(record);
      const role = readStringField(record, ["title", "role", "position", "job_title"]);
      const company = readStringField(record, [
        "company",
        "employer",
        "organization",
        "studio",
        "institution",
        "school",
      ]);
      const institution = readStringField(record, ["institution", "school", "university", "academy"]);
      const name = readStringField(record, ["name", "label"]);
      const location = readStringField(record, ["location", "city", "country"]);
      const type = readStringField(record, ["type", "employment_type", "contract_type"]);

      if (hint.includes("experience") || (role && (company || period))) {
        const title = role || company || name || fallbackTitle;
        const subtitle = [period, company].filter(Boolean).join(" • ");
        return { title, subtitle };
      }

      if (hint.includes("education") || institution.length > 0) {
        const educationTitle = readStringField(record, ["degree", "qualification", "program", "field_of_study", "title"]) || institution || name || fallbackTitle;
        const subtitle = [period, institution].filter(Boolean).join(" • ");
        return { title: educationTitle, subtitle };
      }

      const title = role || name || company || institution || readStringField(record, ["title"]) || fallbackTitle;
      const subtitle = [period, company || institution, location || type].filter(Boolean).join(" • ");
      return { title, subtitle };
    }

    const copy = resolveFieldCopy(pathLabel, keyName, selectedLanguage);
    const visibilityKey = pathSegmentsToVisibilityKey(path, editorPath);
    const templateVisible = isTemplatePathVisible(visibilityKey, templateVisibility);
    const visibilityToggle = (
      <VisibilityToggleButton
        label={options?.headingTitle ?? copy.label}
        language={selectedLanguage}
        onToggle={() => onToggleTemplateVisibility(visibilityKey)}
        visible={templateVisible}
      />
    );
    const isContainer = Array.isArray(node) || (node !== null && typeof node === "object");
    const expanded = isContainer ? isFormNodeExpanded(path) : true;
    const headerTitle = options?.headingTitle ?? copy.label;
    const headerSubtitle = options?.headingSubtitle ?? (isContainer ? copy.description : "");
    /** Keep the eye / label / input / actions on one row in the form column. */
    const compactFieldLayout = true;

    function wrapFieldWithAi(
      fieldPath: PathSegment[],
      fieldPathLabel: string,
      fieldLabel: string,
      text: string,
      shell: JSX.Element,
      hasFieldBelow: boolean,
    ): JSX.Element {
      return (
        <EditorFieldAiProvider
          cvId={selectedCvId}
          editorPath={editorPath}
          fieldLabel={fieldLabel}
          fieldLayout={compactFieldLayout ? "compact" : "stacked"}
          language={selectedLanguage}
          onApply={(next) => updateTextDraftAt(fieldPath, next, { fieldLabel })}
          onNotice={onEditorNotice}
          pathLabel={fieldPathLabel}
          resolvedTheme={resolvedTheme}
          showSeparatorBelow={hasFieldBelow}
          templateId={selectedTemplateId}
          value={text}
        >
          {shell}
        </EditorFieldAiProvider>
      );
    }

    const removeButton = options?.onRemove ? (
      <ConfirmRemoveButton kind="field" language={selectedLanguage} onConfirm={options.onRemove} />
    ) : null;

    if (Array.isArray(node)) {
      const arrayNode = node;
      const tabulatedSubsectionIndices: number[] = [];
      for (let index = 0; index < arrayNode.length; index += 1) {
        const item = arrayNode[index];
        if (item !== null && (Array.isArray(item) || typeof item === "object")) {
          tabulatedSubsectionIndices.push(index);
        }
      }
      const showCollapseAllSubsections =
        isTabulatedRootArraySection(editorPath, depth) && tabulatedSubsectionIndices.length > 0;
      const allSubsectionsCollapsed = tabulatedSubsectionIndices.every(
        (index) => !isFormNodeExpanded([...path, index]),
      );
      function toggleAllTabulatedSubsections(): void {
        const nextExpanded = allSubsectionsCollapsed;
        const updates: Record<string, boolean> = {};
        for (const index of tabulatedSubsectionIndices) {
          updates[formPathKey([...path, index])] = nextExpanded;
        }
        setExpandedFormNodes((current) => ({ ...current, ...updates }));
      }
      const arrayHeaderActions = (
        <div className="flex shrink-0 gap-2">
          <button
            aria-expanded={expanded}
            aria-label={expanded ? (selectedLanguage === "bg" ? "Свий секцията" : "Collapse section") : (selectedLanguage === "bg" ? "Разгъни секцията" : "Expand section")}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => setFormNodeExpanded(path, !expanded)}
            title={expanded ? (selectedLanguage === "bg" ? "Свий" : "Collapse") : (selectedLanguage === "bg" ? "Разгъни" : "Expand")}
            type="button"
          >
            {expanded ? "▾" : "▸"}
          </button>
          {showCollapseAllSubsections ? (
            <button
              aria-expanded={!allSubsectionsCollapsed}
              aria-label={
                allSubsectionsCollapsed
                  ? selectedLanguage === "bg"
                    ? "Разгъни всички подсекции"
                    : "Expand all subsections"
                  : selectedLanguage === "bg"
                    ? "Свий всички подсекции"
                    : "Collapse all subsections"
              }
              className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
              onClick={toggleAllTabulatedSubsections}
              title={
                allSubsectionsCollapsed
                  ? selectedLanguage === "bg"
                    ? "Разгъни всички подсекции"
                    : "Expand all subsections"
                  : selectedLanguage === "bg"
                    ? "Свий всички подсекции"
                    : "Collapse all subsections"
              }
              type="button"
            >
              {allSubsectionsCollapsed ? "▾" : "▴"}
            </button>
          ) : null}
          {removeButton}
          <button
            aria-label={selectedLanguage === "bg" ? "Добави елемент" : "Add item"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => addArrayEntry(path, defaultFromSample(node[0]))}
            title={selectedLanguage === "bg" ? "Добави елемент" : "Add item"}
            type="button"
          >
            +
          </button>
          <button
            aria-label={selectedLanguage === "bg" ? "Добави custom елемент" : "Add custom item"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => addCustomArrayEntry(path)}
            title={selectedLanguage === "bg" ? "Добави custom елемент" : "Add custom item"}
            type="button"
          >
            ✎
          </button>
        </div>
      );
      const arrayHeaderTitle = (
        <>
          <p className="text-sm font-semibold text-slate-900">{headerTitle}</p>
          {headerSubtitle ? <p className="text-xs text-[var(--ink-muted)]">{headerSubtitle}</p> : null}
        </>
      );
      const sectionIndentStyle = compactSectionIndentStyle(compactFieldLayout, editorPath, depth);

      return (
        <div
          className={compactContainerShellClass(compactFieldLayout, editorPath, depth)}
          style={sectionIndentStyle}
        >
          {compactFieldLayout ? (
            <div className={compactContainerHeaderClass(compactFieldLayout, depth)}>
              <div className="flex h-6 w-6 items-center justify-center self-start">{visibilityToggle}</div>
              <div className="col-span-2 min-w-0 self-start">{arrayHeaderTitle}</div>
              <div className="flex items-center justify-end gap-2 self-start">{arrayHeaderActions}</div>
            </div>
          ) : (
            <div className="mb-2 flex items-center justify-between gap-2" style={sectionIndentStyle}>
              <div className="flex min-w-0 items-start gap-2">
                {visibilityToggle}
                <div className="min-w-0">{arrayHeaderTitle}</div>
              </div>
              {arrayHeaderActions}
            </div>
          )}

          {expanded ? (
            <div className={compactChildrenStackClass(compactFieldLayout, editorPath, depth)}>
              {node.length === 0 && (
                <p
                  className={
                    compactFieldLayout
                      ? "col-span-full text-xs text-[var(--ink-muted)]"
                      : "text-xs text-[var(--ink-muted)]"
                  }
                >
                  {selectedLanguage === "bg" ? "Празен списък." : "Empty list."}
                </p>
              )}
              {node.map((item, index) => {
                const childPath = [...path, index];
                const childLabel = `${pathLabel}[${index}]`;
                const primitive = item === null || ["string", "number", "boolean"].includes(typeof item);
                if (primitive) {
                  const stringValue = String(item ?? "");
                  const useTextarea = shouldUseTextarea(stringValue);
                  const useTwoRowListLayout = !compactFieldLayout;
                  const childVisibilityKey = pathSegmentsToVisibilityKey(childPath, editorPath);
                  const childVisible = isTemplatePathVisible(childVisibilityKey, templateVisibility);
                  const childToggle = (
                    <VisibilityToggleButton
                      label={`${copy.label} ${index + 1}`}
                      language={selectedLanguage}
                      onToggle={() => onToggleTemplateVisibility(childVisibilityKey)}
                      visible={childVisible}
                    />
                  );
                  const removeItemButton = (
                    <ConfirmRemoveButton
                      kind="item"
                      language={selectedLanguage}
                      onConfirm={() => removeDraftAt(childPath)}
                    />
                  );
                  const listItemLabel = `${copy.label} ${index + 1}`;
                  const listShowFieldAi = primitiveFieldSupportsAiRewrite(childLabel, childLabel, item);
                  const listAiInputPad = listShowFieldAi ? EDITOR_FIELD_AI_INPUT_PAD_CLASS : "";
                  const listAiInputHeight = listShowFieldAi && !useTextarea ? "min-h-8 box-border" : "";
                  const inputControl = useTextarea ? (
                    <textarea
                      className={`w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1 text-xs leading-5 ${listAiInputPad}`}
                      onChange={(event) =>
                        updateTextDraftAt(childPath, event.target.value, { fieldLabel: listItemLabel })
                      }
                      rows={
                        compactFieldLayout
                          ? Math.min(3, estimateTextareaRows(stringValue))
                          : estimateTextareaRows(stringValue)
                      }
                      value={stringValue}
                    />
                  ) : (
                    <input
                      className={`w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1 text-xs ${listAiInputHeight} ${listAiInputPad}`}
                      onChange={(event) =>
                        updateTextDraftAt(childPath, event.target.value, { fieldLabel: listItemLabel })
                      }
                      value={stringValue}
                    />
                  );
                  const listInputControl = listShowFieldAi ? (
                    <EditorFieldAiInputChrome multiline={useTextarea}>{inputControl}</EditorFieldAiInputChrome>
                  ) : (
                    inputControl
                  );
                  const listAiIndex = aiFieldOrder.indexOf(childLabel);
                  const listHasFieldBelow =
                    listShowFieldAi && listAiIndex >= 0 && listAiIndex < aiFieldOrder.length - 1;
                  const listFieldBody = useTwoRowListLayout ? (
                    <>
                      <div
                        className={`${EDITOR_STACKED_FIELD_TOGGLE_CLASS} ${useTextarea ? "self-start" : ""}`}
                      >
                        {childToggle}
                      </div>
                      <span
                        className={`${EDITOR_STACKED_FIELD_LABEL_CLASS} ${useTextarea ? "self-start pt-1" : ""}`}
                      >
                        {listItemLabel}
                      </span>
                      <div
                        className={`${EDITOR_STACKED_FIELD_ACTIONS_CLASS} ${useTextarea ? "self-start pt-0.5" : ""}`}
                      >
                        {listShowFieldAi ? <EditorFieldAiTrigger /> : null}
                        {removeItemButton}
                      </div>
                      <div className={EDITOR_STACKED_FIELD_INPUT_CLASS}>{listInputControl}</div>
                    </>
                  ) : (
                    <EditorCompactFieldRow
                      alignTop={useTextarea}
                      control={listInputControl}
                      includeAiActionSlot={listShowFieldAi}
                      label={listItemLabel}
                      leading={childToggle}
                      trailing={
                        listShowFieldAi ? (
                          <>
                            <EditorFieldAiTrigger />
                            {removeItemButton}
                          </>
                        ) : (
                          removeItemButton
                        )
                      }
                      useFormGrid={compactFieldLayout}
                    />
                  );

                  const listFieldShell = listShowFieldAi ? (
                    compactFieldLayout ? (
                      <div className="contents">
                        {listFieldBody}
                        <div className={compactAiPanelWrapClass(true)}>
                          <EditorFieldAiPanel />
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`${compactFieldShellClass(false, true)} ${EDITOR_STACKED_FIELD_GRID_CLASS}`}
                      >
                        {listFieldBody}
                        <EditorFieldAiPanel />
                      </div>
                    )
                  ) : useTwoRowListLayout ? (
                    <div
                      className={`${compactFieldShellClass(false, true)} ${EDITOR_STACKED_FIELD_GRID_CLASS}`}
                    >
                      {listFieldBody}
                    </div>
                  ) : (
                    <div className={compactFieldShellClass(compactFieldLayout, false)}>{listFieldBody}</div>
                  );

                  return (
                    <div key={childLabel} className={compactFormPassthroughClass(compactFieldLayout)}>
                      {listShowFieldAi
                        ? wrapFieldWithAi(
                            childPath,
                            childLabel,
                            listItemLabel,
                            stringValue,
                            listFieldShell,
                            listHasFieldBelow,
                          )
                        : listFieldShell}
                    </div>
                  );
                }

                return (
                  <div key={childLabel} className={compactFormPassthroughClass(compactFieldLayout)}>
                    {(() => {
                      const fallbackItemTitle = `${copy.label} ${index + 1}`;
                      const heading =
                        item && typeof item === "object" && !Array.isArray(item)
                          ? describeContainerHeading(item as Record<string, unknown>, fallbackItemTitle, childLabel)
                          : { title: fallbackItemTitle, subtitle: "" };
                      return renderFormNode(item, childPath, childLabel, `${keyName} ${index + 1}`, {
                        ...childRenderOptions,
                        onRemove: () => removeDraftAt(childPath),
                        headingTitle: heading.title,
                        headingSubtitle: heading.subtitle,
                      });
                    })()}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    }

    if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      const experienceItem = isExperienceItemPath(pathLabel);
      const isCurrentValue = Boolean(record.is_current ?? record.current ?? record.present);
      const entries = Object.entries(record).filter(
        ([key]) =>
          !isReservedObjectEntryKey(key) &&
          !(experienceItem && (key === "is_current" || key === "current" || key === "present")),
      );
      const objectHeaderActions = (
        <div className="flex shrink-0 gap-2">
          <button
            aria-expanded={expanded}
            aria-label={expanded ? (selectedLanguage === "bg" ? "Свий секцията" : "Collapse section") : (selectedLanguage === "bg" ? "Разгъни секцията" : "Expand section")}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => setFormNodeExpanded(path, !expanded)}
            title={expanded ? (selectedLanguage === "bg" ? "Свий" : "Collapse") : (selectedLanguage === "bg" ? "Разгъни" : "Expand")}
            type="button"
          >
            {expanded ? "▾" : "▸"}
          </button>
          {removeButton}
          <button
            aria-label={selectedLanguage === "bg" ? "Добави custom поле" : "Add custom field"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => addCustomObjectField(path)}
            title={selectedLanguage === "bg" ? "Добави custom поле" : "Add custom field"}
            type="button"
          >
            +
          </button>
        </div>
      );
      const objectHeaderTitle = (
        <>
          <p className="text-sm font-semibold text-slate-900">{headerTitle}</p>
          {headerSubtitle ? <p className="text-xs text-[var(--ink-muted)]">{headerSubtitle}</p> : null}
        </>
      );
      const experienceCurrentRoleControl = experienceItem
        ? renderIsCurrentHeaderControl({
            checked: isCurrentValue,
            language: selectedLanguage,
            onChange: (next) => updateDraftAt([...path, "is_current"], next),
          })
        : null;
      const objectHeaderRightControls = (
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {experienceCurrentRoleControl}
          {objectHeaderActions}
        </div>
      );
      const sectionIndentStyle = compactSectionIndentStyle(compactFieldLayout, editorPath, depth);
      const objectHeaderDivider =
        compactFieldLayout && depth > 0 ? "border-t border-[var(--line)] pt-2" : "";

      return (
        <div
          className={compactContainerShellClass(compactFieldLayout, editorPath, depth)}
          style={sectionIndentStyle}
        >
          {compactFieldLayout ? (
            experienceItem ? (
              <div className={`col-span-full flex items-start gap-2 ${objectHeaderDivider}`}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center self-start">
                  {visibilityToggle}
                </div>
                <div className="min-w-0 flex-1 self-start">{objectHeaderTitle}</div>
                {objectHeaderRightControls}
              </div>
            ) : (
              <div className={compactContainerHeaderClass(compactFieldLayout, depth)}>
                <div className="flex h-6 w-6 items-center justify-center self-start">{visibilityToggle}</div>
                <div className="col-span-2 min-w-0 self-start">{objectHeaderTitle}</div>
                <div className="flex items-center justify-end gap-2 self-start">{objectHeaderActions}</div>
              </div>
            )
          ) : (
            <div
              className={`mb-2 flex items-center justify-between gap-2 ${objectHeaderDivider}`}
              style={sectionIndentStyle}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {visibilityToggle}
                <div className="min-w-0 flex-1">{objectHeaderTitle}</div>
              </div>
              {experienceItem ? objectHeaderRightControls : objectHeaderActions}
            </div>
          )}
          {expanded ? (
            <div className={compactChildrenStackClass(compactFieldLayout, editorPath, depth)}>
              {entries.map(([key, value]) => {
                const childPath = [...path, key];
                const childLabel = pathLabel ? `${pathLabel}.${key}` : key;
                return (
                  <div key={childLabel} className={compactFormPassthroughClass(compactFieldLayout)}>
                    {renderFormNode(value, childPath, childLabel, key, {
                      ...childRenderOptions,
                      onRemove: () => removeDraftAt(childPath),
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    }

    const primitive = node ?? "";
    const isBool = typeof primitive === "boolean";
    const isNum = typeof primitive === "number";
    const isDate = isDateLike(primitive) || isDateFieldKey(keyName);
    const stringValue = String(primitive);
    const useTextarea = shouldUseTextarea(stringValue);
    const useTwoRowFieldLayout = !compactFieldLayout;
    const isEmploymentTypeField =
      keyName === "employment_type" && pathLabel.toLowerCase().includes("experience");

    const customFieldDef = getCustomFieldDefinition(sectionDraft, path, keyName);
    const showFieldAi =
      !customFieldDef && primitiveFieldSupportsAiRewrite(pathLabel, keyName, primitive);
    const aiInputPad = showFieldAi ? EDITOR_FIELD_AI_INPUT_PAD_CLASS : "";
    const aiInputHeight = showFieldAi && !useTextarea ? "min-h-8 box-border" : "";

    const valueControl = customFieldDef ? (
      <CustomFieldControl
        definition={customFieldDef}
        language={selectedLanguage}
        onChange={(next) => {
          if (customFieldDef.type === "text" || customFieldDef.type === undefined) {
            updateTextDraftAt(path, String(next ?? ""), { fieldLabel: copy.label });
            return;
          }
          updateDraftAt(path, next);
        }}
        useCompactMetrics={compactFieldLayout}
        value={primitive}
      />
    ) : isEmploymentTypeField ? (
      renderEmploymentTypeSelect({
        language: selectedLanguage,
        onChange: (next) => updateDraftAt(path, next),
        value: primitive === undefined || primitive === null || primitive === "" ? "full_time" : primitive,
      })
    ) : isBool ? (
      <label className="inline-flex items-center gap-2 text-xs">
        <input
          checked={Boolean(primitive)}
          onChange={(event) => updateDraftAt(path, event.target.checked)}
          type="checkbox"
        />
        {selectedLanguage === "bg" ? "Да/Не" : "True/False"}
      </label>
    ) : isDate ? (
      <input
        className={EDITOR_COMPACT_DATE_INPUT_CLASS}
        onChange={(event) => updateDraftAt(path, event.target.value)}
        type="date"
        value={String(primitive)}
      />
    ) : isNum ? (
      <input
        className={EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS}
        onChange={(event) => updateDraftAt(path, Number(event.target.value))}
        type="number"
        value={Number(primitive)}
      />
    ) : useTextarea ? (
      <textarea
        className={`w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs leading-5 ${aiInputPad}`}
        onChange={(event) => updateTextDraftAt(path, event.target.value, { fieldLabel: copy.label })}
        rows={
          compactFieldLayout
            ? Math.min(3, estimateTextareaRows(stringValue))
            : estimateTextareaRows(stringValue)
        }
        value={stringValue}
      />
    ) : (
      <input
        className={`${EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS} ${aiInputHeight} ${aiInputPad}`}
        onChange={(event) => updateTextDraftAt(path, event.target.value, { fieldLabel: copy.label })}
        type="text"
        value={stringValue}
      />
    );

    const wrappedValueControl = showFieldAi ? (
      <EditorFieldAiInputChrome multiline={useTextarea}>{valueControl}</EditorFieldAiInputChrome>
    ) : (
      valueControl
    );
    const aiFieldIndex = aiFieldOrder.indexOf(pathLabel);
    const hasFieldBelow = aiFieldIndex >= 0 && aiFieldIndex < aiFieldOrder.length - 1;

    const fieldShell = compactFieldLayout ? (
      <div className="contents">
        <EditorCompactFieldRow
          alignTop={useTextarea}
          control={wrappedValueControl}
          includeAiActionSlot={showFieldAi}
          label={copy.label}
          leading={visibilityToggle}
          rowClassName={isDate ? EDITOR_COMPACT_DATE_ROW_CLASS : ""}
          trailing={
            showFieldAi ? (
              <>
                <EditorFieldAiTrigger />
                {removeButton}
              </>
            ) : (
              removeButton
            )
          }
          useFormGrid
        />
        {showFieldAi ? (
          <div className={compactAiPanelWrapClass(true)}>
            <EditorFieldAiPanel />
          </div>
        ) : null}
      </div>
    ) : (
      <div
        className={
          useTwoRowFieldLayout
            ? `${compactFieldShellClass(false, true)} ${EDITOR_STACKED_FIELD_GRID_CLASS}`
            : compactFieldShellClass(false, false)
        }
      >
        {useTwoRowFieldLayout ? (
          <>
            <div
              className={`${EDITOR_STACKED_FIELD_TOGGLE_CLASS} ${useTextarea ? "self-start" : ""}`}
            >
              {visibilityToggle}
            </div>
            <label
              className={`${EDITOR_STACKED_FIELD_LABEL_CLASS} ${useTextarea ? "self-start pt-1" : ""}`}
            >
              {copy.label}
            </label>
            <div
              className={`${EDITOR_STACKED_FIELD_ACTIONS_CLASS} ${useTextarea ? "self-start pt-0.5" : ""}`}
            >
              {showFieldAi ? <EditorFieldAiTrigger /> : null}
              {removeButton}
            </div>
            <div className={EDITOR_STACKED_FIELD_INPUT_CLASS}>{wrappedValueControl}</div>
          </>
        ) : (
          <EditorCompactFieldRow
            alignTop={useTextarea}
            control={wrappedValueControl}
            includeAiActionSlot={showFieldAi}
            label={copy.label}
            leading={visibilityToggle}
            rowClassName={isDate ? EDITOR_COMPACT_DATE_ROW_CLASS : ""}
            trailing={
              showFieldAi ? (
                <>
                  <EditorFieldAiTrigger />
                  {removeButton}
                </>
              ) : (
                removeButton
              )
            }
          />
        )}
        {showFieldAi ? <EditorFieldAiPanel /> : null}
      </div>
    );

    return showFieldAi
      ? wrapFieldWithAi(path, pathLabel, copy.label, stringValue, fieldShell, hasFieldBelow)
      : fieldShell;
  }

  function renderCompanyMetadataFormNode(
    node: unknown,
    path: PathSegment[],
    pathLabel: string,
    keyName: string,
    options?: { onRemove?: () => void },
  ): JSX.Element {
    const copy = resolveFieldCopy(pathLabel, keyName, "en");
    const removeButton = options?.onRemove ? (
      <ConfirmRemoveButton kind="field" language="en" onConfirm={options.onRemove} />
    ) : null;

    if (Array.isArray(node)) {
      return (
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.label}</p>
              <p className="text-xs text-[var(--ink-muted)]">{copy.description}</p>
            </div>
            <div className="flex gap-2">
              {removeButton}
              <button
                aria-label="Add item"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
                onClick={() => addCompanyMetadataArrayEntry(path, pathLabel, node[0])}
                title="Add item"
                type="button"
              >
                +
              </button>
              <button
                aria-label="Add custom item"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
                onClick={() => addCompanyMetadataCustomArrayEntry(path)}
                title="Add custom item"
                type="button"
              >
                ✎
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {node.length === 0 ? <p className="text-xs text-[var(--ink-muted)]">Empty list.</p> : null}
            {node.map((item, index) => {
              const childPath = [...path, index];
              const childLabel = `${pathLabel}[${index}]`;
              const primitive = item === null || ["string", "number", "boolean"].includes(typeof item);
              if (primitive) {
                const stringValue = String(item ?? "");
                const useTextarea = shouldUseTextarea(stringValue);
                return (
                  <div key={childLabel} className="flex items-start gap-2 rounded-md border border-[var(--line)] bg-white p-2">
                    {useTextarea ? (
                      <textarea
                        className="w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs"
                        onChange={(event) => updateCompanyMetadataDraftAt(childPath, event.target.value)}
                        rows={estimateTextareaRows(stringValue)}
                        value={stringValue}
                      />
                    ) : (
                      <input
                        className="w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs"
                        onChange={(event) => updateCompanyMetadataDraftAt(childPath, event.target.value)}
                        value={stringValue}
                      />
                    )}
                    <ConfirmRemoveButton
                      kind="item"
                      language="en"
                      onConfirm={() => removeCompanyMetadataDraftAt(childPath)}
                    />
                  </div>
                );
              }

              return (
                <div key={childLabel}>
                  {renderCompanyMetadataFormNode(item, childPath, childLabel, `${keyName} ${index + 1}`, {
                    onRemove: () => removeCompanyMetadataDraftAt(childPath),
                  })}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (node && typeof node === "object") {
      const entries = Object.entries(node as Record<string, unknown>).filter(
        ([key]) => !isReservedObjectEntryKey(key),
      );
      return (
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.label}</p>
              <p className="text-xs text-[var(--ink-muted)]">{copy.description}</p>
            </div>
            <div className="flex gap-2">
              {removeButton}
              <button
                aria-label="Add custom field"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
                onClick={() => addCompanyMetadataCustomObjectField(path)}
                title="Add custom field"
                type="button"
              >
                +
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {entries.map(([key, value]) => {
              const childPath = [...path, key];
              const childLabel = pathLabel ? `${pathLabel}.${key}` : key;
              return (
                <div key={childLabel}>
                  {renderCompanyMetadataFormNode(value, childPath, childLabel, key, {
                    onRemove: () => removeCompanyMetadataDraftAt(childPath),
                  })}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const primitive = node ?? "";
    const isBool = typeof primitive === "boolean";
    const isNum = typeof primitive === "number";
    const isDate = isDateLike(primitive);
    const customFieldDef = getCustomFieldDefinition(companyMetadataDraft, path, keyName);

    return (
      <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
        <div className="flex items-start justify-between gap-2">
          <label className="block text-sm font-semibold text-slate-900">{copy.label}</label>
          {removeButton}
        </div>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {copy.description}
          {copy.requirement ? ` • ${copy.requirement}` : ""}
        </p>

        {customFieldDef ? (
          <div className="mt-2">
            <CustomFieldControl
              definition={customFieldDef}
              language="en"
              onChange={(next) => updateCompanyMetadataDraftAt(path, next)}
              value={primitive}
            />
          </div>
        ) : isBool ? (
          <label className="mt-2 inline-flex items-center gap-2 text-xs">
            <input
              checked={Boolean(primitive)}
              onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.checked)}
              type="checkbox"
            />
            True/False
          </label>
        ) : isDate ? (
          <input
            className="mt-2 w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
            onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.value)}
            type="date"
            value={String(primitive)}
          />
        ) : isNum ? (
          <input
            className="mt-2 w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
            onChange={(event) => updateCompanyMetadataDraftAt(path, Number(event.target.value))}
            type="number"
            value={Number(primitive)}
          />
        ) : shouldUseTextarea(String(primitive)) ? (
          <textarea
            className="mt-2 w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
            onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.value)}
            rows={estimateTextareaRows(String(primitive))}
            value={String(primitive)}
          />
        ) : (
          <input
            className="mt-2 w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
            onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.value)}
            type="text"
            value={String(primitive)}
          />
        )}
      </div>
    );
  }

  return {
    renderYamlLine,
    handleYamlEditorKeyDown,
    handleYamlEditorScroll,
    renderFormNode,
    renderCompanyMetadataFormNode,
  };
}
