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
  companyMetadataFieldSupportsAi,
  isExperienceItemPath,
  isDateFieldKey,
  primitiveFieldSupportsAiRewrite,
  renderEmploymentTypeSelect,
  renderIsCurrentHeaderControl,
} from "./editor-form-fields";
import {
  resolveCompanyNameFromMetadataPath,
  resolveCompanyRecordFromMetadataPath,
} from "@/lib/company-field-ai";
import {
  CompanyFieldAiInputChrome,
  CompanyFieldAiPanel,
  CompanyFieldAiProvider,
  CompanyFieldAiTrigger,
} from "./company-field-ai";
import { ConfirmRemoveButton } from "./confirm-remove-button";
import { EditorCompactFieldRow } from "./editor-compact-field-row";
import {
  compactAiPanelWrapClass,
  compactChildrenStackClass,
  compactContainerHeaderClass,
  compactMetadataContainerHeaderClass,
  compactContainerShellClass,
  compactFieldShellClass,
  compactFormPassthroughClass,
  compactLeadingGroupIndentStyle,
  EDITOR_COMPACT_SECTION_LEADING_GROUP_CLASS,
  compactSectionIndentStyle,
  isTabulatedArrayEditorPath,
  isTabulatedRootArraySection,
  EDITOR_COMPACT_FIELD_TRACKS_CLASS,
  EDITOR_STACKED_FIELD_ACTIONS_CLASS,
  EDITOR_STACKED_FIELD_GRID_CLASS,
  EDITOR_STACKED_FIELD_INPUT_CLASS,
  EDITOR_STACKED_FIELD_LABEL_CLASS,
  EDITOR_STACKED_FIELD_TOGGLE_CLASS,
  EDITOR_COMPACT_DATE_INPUT_CLASS,
  EDITOR_COMPACT_DATE_ROW_CLASS,
  EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS,
  EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS,
} from "./editor-compact-form-layout";
import {
  EDITOR_FIELD_AI_INPUT_PAD_CLASS,
  EditorFieldAiInputChrome,
  EditorFieldAiPanel,
  EditorFieldAiProvider,
  EditorFieldAiTrigger,
} from "./editor-field-ai";
import { CustomFieldControl } from "./custom-field-control";
import { KeywordHighlightedField } from "./keyword-highlighted-input";
import {
  getCustomFieldDefinition,
  isReservedObjectEntryKey,
} from "./custom-field-types";
import type { WeightedKeyword } from "@/lib/research/types";
import type { PathSegment } from "./types";
import { VisibilityToggleButton } from "./visibility-toggle";

const SKILL_RATING_OPTIONS = ["", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"] as const;

function isRatedSkillListPath(pathLabel: string): boolean {
  return [
    "skills.technical",
    "skills.social",
    "skills.core_strengths",
    "optional_sections.other_skills",
  ].includes(pathLabel);
}

const EXPERIENCE_SUBSECTION_OPTIONS = [
  { key: "responsibilities", en: "Responsibilities", bg: "Отговорности", value: [] },
  { key: "products", en: "Products", bg: "Продукти", value: [] },
  { key: "publication_links", en: "Links", bg: "Връзки", value: [] },
  { key: "quantified_results", en: "Results", bg: "Резултати", value: [] },
  { key: "tools", en: "Tools", bg: "Инструменти", value: [] },
] as const;

function skillNameValue(item: unknown): string {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    return String(record.name ?? record.skill ?? "");
  }
  return String(item ?? "");
}

function skillRatingValue(item: unknown): string {
  if (!item || typeof item !== "object" || Array.isArray(item)) return "";
  const rating = (item as Record<string, unknown>).rating;
  return typeof rating === "number" && Number.isFinite(rating) ? String(rating) : "";
}

export type EditorFormRendererContext = {
  resolvedTheme: "light" | "dark";
  selectedCvId: string;
  selectedLanguage: string;
  uiLanguage: string;
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
  applyEditorFieldText: (path: PathSegment[], value: string, meta: { fieldLabel: string }) => void;
  removeDraftAt: (path: PathSegment[]) => void;
  addArrayEntry: (path: PathSegment[], sample: unknown) => void;
  addCustomObjectField: (path: PathSegment[]) => void;
  addCustomArrayEntry: (path: PathSegment[]) => void;
  updateCompanyMetadataDraftAt: (path: PathSegment[], value: unknown) => void;
  applyCompanyMetadataFieldText: (path: PathSegment[], value: string) => void;
  removeCompanyMetadataDraftAt: (path: PathSegment[]) => void;
  addCompanyMetadataArrayEntry: (path: PathSegment[], pathLabel: string, sample: unknown) => void;
  addCompanyMetadataCustomObjectField: (path: PathSegment[]) => void;
  addCompanyMetadataCustomArrayEntry: (path: PathSegment[]) => void;
  yamlHighlightRef: RefObject<HTMLDivElement | null>;
  yamlDraft: string;
  setYamlDraft: React.Dispatch<React.SetStateAction<string>>;
  sectionDraft: unknown;
  companyMetadataDraft: unknown;
  analysisCompanySource: string;
  onCompanyMetadataNotice: (message: string) => void;
  editorWeightedKeywords: WeightedKeyword[];
  editorAtsKeywords: string[];
  /** When false, all CV subsections render flush (no hierarchical left indent). */
  editorSubsectionIndentEnabled: boolean;
  selectedResearchJobPositionId: string;
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
    uiLanguage,
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
    applyEditorFieldText,
    removeDraftAt,
    addArrayEntry,
    addCustomObjectField,
    addCustomArrayEntry,
    updateCompanyMetadataDraftAt,
    applyCompanyMetadataFieldText,
    removeCompanyMetadataDraftAt,
    addCompanyMetadataArrayEntry,
    addCompanyMetadataCustomObjectField,
    addCompanyMetadataCustomArrayEntry,
    yamlHighlightRef,
    yamlDraft,
    setYamlDraft,
    sectionDraft,
    companyMetadataDraft,
    analysisCompanySource,
    onCompanyMetadataNotice,
    editorWeightedKeywords,
    editorAtsKeywords,
    editorSubsectionIndentEnabled,
    selectedResearchJobPositionId: _selectedResearchJobPositionId,
  } = ctx;

  const editorKeywordHighlightActive =
    editorWeightedKeywords.length > 0 || editorAtsKeywords.length > 0;

  function renderKeywordAwareTextControl(options: {
    value: string;
    onChange: (value: string) => void;
    useTextarea: boolean;
    rows?: number;
    innerControl?: boolean;
    singleLineClassName?: string;
    textareaClassName?: string;
  }): JSX.Element {
    const {
      value,
      onChange,
      useTextarea,
      rows,
      innerControl,
      singleLineClassName = "",
      textareaClassName = "",
    } = options;

    if (!editorKeywordHighlightActive) {
      if (useTextarea) {
        return (
          <textarea
            className={textareaClassName}
            onChange={(event) => onChange(event.target.value)}
            rows={rows ?? Math.max(1, estimateTextareaRows(value))}
            value={value}
          />
        );
      }
      return (
        <input
          className={singleLineClassName}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
      );
    }

    return (
      <KeywordHighlightedField
        atsKeywords={editorAtsKeywords}
        innerControl={innerControl}
        inputClassName={singleLineClassName}
        multiline={useTextarea}
        onChange={onChange}
        resolvedTheme={resolvedTheme}
        rows={rows ?? Math.max(1, estimateTextareaRows(value))}
        value={value}
        weightedKeywords={editorWeightedKeywords}
      />
    );
  }

  function renderYamlLine(line: string, index: number): JSX.Element {
    const keyValueMatch = /^(\s*)(-\s+)?([A-Za-z0-9_.-]+):(.*)$/.exec(line);
    const lineNumber = String(index + 1).padStart(3, " ");
    const lineNumberClass = "select-none text-[10px] text-[var(--yaml-empty)]";
    const blankClass = "text-xs leading-5 text-[var(--yaml-empty)]";
    const commentClass = "whitespace-pre text-xs italic leading-5 text-[var(--yaml-comment)]";
    const indentClass = "text-[var(--yaml-empty)]";
    const keyClass = "font-semibold text-[var(--yaml-key)]";
    const listClass = "font-semibold text-[var(--yaml-list)]";
    const colonClass = "text-[var(--yaml-punctuation)]";
    const fallbackLineClass = "whitespace-pre text-xs leading-5 text-[var(--yaml-text)]";

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
      let valueClass = "text-[var(--yaml-string)]";
      if (/^(true|false|null)$/i.test(valueTrim)) {
        valueClass = "text-[var(--yaml-boolean)]";
      } else if (/^-?\d+(\.\d+)?$/.test(valueTrim)) {
        valueClass = "text-[var(--yaml-number)]";
      } else if (valueTrim.length === 0) {
        valueClass = "text-[var(--yaml-empty)]";
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
              <span className="text-[var(--yaml-string)]">{listMatch[3]}</span>
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
        language={uiLanguage}
        onToggle={() => onToggleTemplateVisibility(visibilityKey)}
        visible={templateVisible}
      />
    );
    const isContainer = Array.isArray(node) || (node !== null && typeof node === "object");
    const expanded = isContainer ? isFormNodeExpanded(path) : true;
    const headerTitle = options?.headingTitle ?? copy.label;
    const headerSubtitle = options?.headingSubtitle ?? (isContainer ? copy.description : "");
    /** Experimental: compact grid while AI scoring drawer is open. Revert to `analysisDrawerCollapsed`. */
    const compactFieldLayout =
      true || analysisDrawerCollapsed;
    const leadingGroupIndentStyle = compactLeadingGroupIndentStyle(
      compactFieldLayout,
      editorPath,
      depth,
      editorSubsectionIndentEnabled,
    );
    const sectionIndentStyle = compactSectionIndentStyle(
      compactFieldLayout,
      editorPath,
      depth,
      editorSubsectionIndentEnabled,
    );

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
          language={uiLanguage}
          onApply={(next) => applyEditorFieldText(fieldPath, next, { fieldLabel })}
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
      <ConfirmRemoveButton kind="field" language={uiLanguage} onConfirm={options.onRemove} />
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
            aria-label={expanded ? (uiLanguage === "bg" ? "Свий секцията" : "Collapse section") : (uiLanguage === "bg" ? "Разгъни секцията" : "Expand section")}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => setFormNodeExpanded(path, !expanded)}
            title={expanded ? (uiLanguage === "bg" ? "Свий" : "Collapse") : (uiLanguage === "bg" ? "Разгъни" : "Expand")}
            type="button"
          >
            {expanded ? "▾" : "▸"}
          </button>
          {showCollapseAllSubsections ? (
            <button
              aria-expanded={!allSubsectionsCollapsed}
              aria-label={
                allSubsectionsCollapsed
                  ? uiLanguage === "bg"
                    ? "Разгъни всички подсекции"
                    : "Expand all subsections"
                  : uiLanguage === "bg"
                    ? "Свий всички подсекции"
                    : "Collapse all subsections"
              }
              className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
              onClick={toggleAllTabulatedSubsections}
              title={
                allSubsectionsCollapsed
                  ? uiLanguage === "bg"
                    ? "Разгъни всички подсекции"
                    : "Expand all subsections"
                  : uiLanguage === "bg"
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
            aria-label={uiLanguage === "bg" ? "Добави елемент" : "Add item"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => addArrayEntry(path, defaultArrayEntry(pathLabel, node[0]))}
            title={uiLanguage === "bg" ? "Добави елемент" : "Add item"}
            type="button"
          >
            +
          </button>
          <button
            aria-label={uiLanguage === "bg" ? "Добави custom елемент" : "Add custom item"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => addCustomArrayEntry(path)}
            title={uiLanguage === "bg" ? "Добави custom елемент" : "Add custom item"}
            type="button"
          >
            ✎
          </button>
        </div>
      );
      const arrayHeaderTitle = (
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-sm font-semibold text-slate-900">{headerTitle}</p>
          {headerSubtitle ? (
            <>
              <span aria-hidden="true" className="shrink-0 text-xs text-[var(--ink-muted)]">•</span>
              <p className="min-w-0 truncate text-xs text-[var(--ink-muted)]">{headerSubtitle}</p>
            </>
          ) : null}
        </div>
      );
      const showArrayChildren = expanded;
      const arrayChildrenClass = compactFieldLayout && isRatedSkillListPath(pathLabel)
        ? "col-span-full grid grid-cols-1 gap-y-2"
        : compactChildrenStackClass(compactFieldLayout, editorPath, depth);

      return (
        <div className={compactContainerShellClass(compactFieldLayout, editorPath, depth)}>
          {compactFieldLayout ? (
            <div className={compactContainerHeaderClass(compactFieldLayout, depth)}>
              <div className={EDITOR_COMPACT_SECTION_LEADING_GROUP_CLASS} style={leadingGroupIndentStyle}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center self-start">
                  {visibilityToggle}
                </div>
                <div className="min-w-0 flex-1 self-start">{arrayHeaderTitle}</div>
              </div>
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

          {showArrayChildren ? (
            <div className={arrayChildrenClass}>
              {node.length === 0 && (
                <p
                  className={
                    compactFieldLayout
                      ? "col-span-full text-xs text-[var(--ink-muted)]"
                      : "text-xs text-[var(--ink-muted)]"
                  }
                >
                  {uiLanguage === "bg" ? "Празен списък." : "Empty list."}
                </p>
              )}
              {node.map((item, index) => {
                const childPath = [...path, index];
                const childLabel = `${pathLabel}[${index}]`;
                const primitive = item === null || ["string", "number", "boolean"].includes(typeof item);
                if (isRatedSkillListPath(pathLabel)) {
                  const skillName = skillNameValue(item);
                  const skillRating = skillRatingValue(item);
                  const listItemLabel = `${copy.label} ${index + 1}`;
                  const childVisibilityKey = pathSegmentsToVisibilityKey(childPath, editorPath);
                  const childVisible = isTemplatePathVisible(childVisibilityKey, templateVisibility);
                  const updateSkillName = (next: string): void => {
                    if (item && typeof item === "object" && !Array.isArray(item)) {
                      updateTextDraftAt([...childPath, "name"], next, { fieldLabel: listItemLabel });
                    } else {
                      updateTextDraftAt(childPath, next, { fieldLabel: listItemLabel });
                    }
                  };
                  const updateSkillRating = (next: string): void => {
                    if (!next && (item === null || primitive)) return;
                    const record: Record<string, unknown> = item && typeof item === "object" && !Array.isArray(item)
                      ? { ...(item as Record<string, unknown>) }
                      : { name: skillName };
                    if (next) record.rating = Number(next);
                    else delete record.rating;
                    updateDraftAt(childPath, record);
                  };
                  const useTextarea = shouldUseTextarea(skillName, selectedLanguage);
                  const skillInput = renderKeywordAwareTextControl({
                    onChange: updateSkillName,
                    rows: Math.min(3, estimateTextareaRows(skillName)),
                    singleLineClassName: "w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1 text-xs",
                    textareaClassName: "w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1 text-xs leading-5",
                    useTextarea,
                    value: skillName,
                  });
                  return (
                    <div key={childLabel} className={`${compactFieldLayout ? "col-span-full" : ""} flex min-w-0 items-center gap-2 rounded-md border border-transparent px-1 py-0.5 hover:border-[var(--line)]`}>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <VisibilityToggleButton
                          label={listItemLabel}
                          language={uiLanguage}
                          onToggle={() => onToggleTemplateVisibility(childVisibilityKey)}
                          visible={childVisible}
                        />
                      </div>
                      <div className="min-w-0 flex-1">{skillInput}</div>
                      <select
                        aria-label={uiLanguage === "bg" ? `Рейтинг: ${listItemLabel}` : `Rating for ${listItemLabel}`}
                        className="shrink-0 rounded border border-[var(--line)] bg-white px-1.5 py-1 text-xs text-slate-800"
                        onChange={(event) => updateSkillRating(event.target.value)}
                        value={skillRating}
                      >
                        <option value="">{uiLanguage === "bg" ? "Рейтинг" : "Rating"}</option>
                        {SKILL_RATING_OPTIONS.slice(1).map((rating) => (
                          <option key={rating} value={rating}>{rating} / 5</option>
                        ))}
                      </select>
                      <ConfirmRemoveButton
                        kind="item"
                        language={uiLanguage}
                        onConfirm={() => removeDraftAt(childPath)}
                      />
                    </div>
                  );
                }
                if (primitive) {
                  const stringValue = String(item ?? "");
                  const useTextarea = shouldUseTextarea(stringValue, selectedLanguage);
                  const useTwoRowListLayout = !compactFieldLayout;
                  const childVisibilityKey = pathSegmentsToVisibilityKey(childPath, editorPath);
                  const childVisible = isTemplatePathVisible(childVisibilityKey, templateVisibility);
                  const childToggle = (
                    <VisibilityToggleButton
                      label={`${copy.label} ${index + 1}`}
                      language={uiLanguage}
                      onToggle={() => onToggleTemplateVisibility(childVisibilityKey)}
                      visible={childVisible}
                    />
                  );
                  const removeItemButton = (
                    <ConfirmRemoveButton
                      kind="item"
                      language={uiLanguage}
                      onConfirm={() => removeDraftAt(childPath)}
                    />
                  );
                  const listItemLabel = `${copy.label} ${index + 1}`;
                  const listShowFieldAi = primitiveFieldSupportsAiRewrite(childLabel, childLabel, item);
                  const listAiInputPad = listShowFieldAi ? EDITOR_FIELD_AI_INPUT_PAD_CLASS : "";
                  const listAiInputHeight = listShowFieldAi && !useTextarea ? "min-h-8 box-border" : "";
                  const listRows = compactFieldLayout
                    ? Math.min(3, estimateTextareaRows(stringValue))
                    : estimateTextareaRows(stringValue);
                  const inputControl = renderKeywordAwareTextControl({
                    onChange: (next) =>
                      updateTextDraftAt(childPath, next, { fieldLabel: listItemLabel }),
                    rows: listRows,
                    singleLineClassName: `w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1 text-xs ${listAiInputHeight} ${listAiInputPad}`,
                    textareaClassName: `w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1 text-xs leading-5 ${listAiInputPad}`,
                    useTextarea,
                    value: stringValue,
                  });
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
                      leadingGroupIndentStyle={leadingGroupIndentStyle}
                      useFormGrid={compactFieldLayout}
                    />
                  );

                  const listFieldShell = listShowFieldAi ? (
                    compactFieldLayout ? (
                      <>
                        {listFieldBody}
                        <div className={compactAiPanelWrapClass(true)}>
                          <EditorFieldAiPanel />
                        </div>
                      </>
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
            aria-label={expanded ? (uiLanguage === "bg" ? "Свий секцията" : "Collapse section") : (uiLanguage === "bg" ? "Разгъни секцията" : "Expand section")}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => setFormNodeExpanded(path, !expanded)}
            title={expanded ? (uiLanguage === "bg" ? "Свий" : "Collapse") : (uiLanguage === "bg" ? "Разгъни" : "Expand")}
            type="button"
          >
            {expanded ? "▾" : "▸"}
          </button>
          {removeButton}
          <button
            aria-label={uiLanguage === "bg" ? "Добави custom поле" : "Add custom field"}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] bg-white text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => addCustomObjectField(path)}
            title={uiLanguage === "bg" ? "Добави custom поле" : "Add custom field"}
            type="button"
          >
            +
          </button>
        </div>
      );
      const objectHeaderTitle = (
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-sm font-semibold text-slate-900">{headerTitle}</p>
          {headerSubtitle ? (
            <>
              <span aria-hidden="true" className="shrink-0 text-xs text-[var(--ink-muted)]">•</span>
              <p className="min-w-0 truncate text-xs text-[var(--ink-muted)]">{headerSubtitle}</p>
            </>
          ) : null}
        </div>
      );
      const experienceCurrentRoleControl = experienceItem
        ? renderIsCurrentHeaderControl({
            checked: isCurrentValue,
            language: uiLanguage,
            onChange: (next) => updateDraftAt([...path, "is_current"], next),
          })
        : null;
      const objectHeaderRightControls = (
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          {experienceCurrentRoleControl}
          {objectHeaderActions}
        </div>
      );
      const missingExperienceSubsections = experienceItem
        ? EXPERIENCE_SUBSECTION_OPTIONS.filter(({ key }) => !Object.hasOwn(record, key))
        : [];
      const objectHeaderDivider =
        compactFieldLayout && depth > 0 ? "border-t border-[var(--line)] pt-2" : "";
      const objectArrayIndex = path[path.length - 1];
      const isTopLevelStructure = compactFieldLayout && depth === 1 && isTabulatedArrayEditorPath(editorPath);
      const alternatingStructureClass = isTopLevelStructure && typeof objectArrayIndex === "number"
        ? `col-span-full grid grid-cols-subgrid gap-y-2 rounded-md -mx-3 px-5 py-2 ${objectArrayIndex % 2 === 0 ? "bg-[var(--surface-1)]" : "bg-[var(--surface-2)]"}`
        : compactContainerShellClass(compactFieldLayout, editorPath, depth);

      return (
        <div className={alternatingStructureClass}>
          {compactFieldLayout ? (
            experienceItem ? (
              <div
                className={`col-span-full flex items-start gap-x-2 ${objectHeaderDivider}`}
                style={leadingGroupIndentStyle}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center self-start">
                  {visibilityToggle}
                </div>
                <div className="min-w-0 flex-1 self-start">{objectHeaderTitle}</div>
                <div className="ml-auto flex shrink-0 items-center justify-end gap-2 self-start">
                  {objectHeaderRightControls}
                </div>
              </div>
            ) : (
              <div className={compactContainerHeaderClass(compactFieldLayout, depth)}>
                <div className={EDITOR_COMPACT_SECTION_LEADING_GROUP_CLASS} style={leadingGroupIndentStyle}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center self-start">
                    {visibilityToggle}
                  </div>
                  <div className="min-w-0 flex-1 self-start">{objectHeaderTitle}</div>
                </div>
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
          {missingExperienceSubsections.length > 0 ? (
            <div
              className={`${compactFieldLayout ? `${EDITOR_COMPACT_FIELD_TRACKS_CLASS} col-span-full` : ""} mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ink-muted)]`}
              style={compactFieldLayout ? leadingGroupIndentStyle : sectionIndentStyle}
            >
              <span>{uiLanguage === "bg" ? "Добави подраздел:" : "Add subsection:"}</span>
              {missingExperienceSubsections.map((subsection) => (
                <button
                  className="rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  key={subsection.key}
                  onClick={() => updateDraftAt([...path, subsection.key], [...subsection.value])}
                  type="button"
                >
                  {uiLanguage === "bg" ? subsection.bg : subsection.en}
                </button>
              ))}
            </div>
          ) : null}
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
    const useTextarea = shouldUseTextarea(stringValue, selectedLanguage);
    const useTwoRowFieldLayout = !compactFieldLayout;
    const isEmploymentTypeField =
      keyName === "employment_type" && pathLabel.toLowerCase().includes("experience");

    const customFieldDef = getCustomFieldDefinition(sectionDraft, path, keyName);
    const showFieldAi =
      !customFieldDef && primitiveFieldSupportsAiRewrite(pathLabel, keyName, primitive);
    const aiInputPad = showFieldAi ? EDITOR_FIELD_AI_INPUT_PAD_CLASS : "";
    const aiInputHeight = showFieldAi && !useTextarea ? "min-h-8 box-border" : "";

    const fieldRows = compactFieldLayout
      ? Math.min(3, estimateTextareaRows(stringValue))
      : estimateTextareaRows(stringValue);
    const valueControl = customFieldDef ? (
      customFieldDef.type === "text" || customFieldDef.type === undefined ? (
        renderKeywordAwareTextControl({
          onChange: (next) => updateTextDraftAt(path, next, { fieldLabel: copy.label }),
          rows: fieldRows,
          singleLineClassName: `${EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS} ${aiInputHeight} ${aiInputPad}`,
          textareaClassName: `w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs leading-5 ${aiInputPad}`,
          useTextarea,
          value: stringValue,
        })
      ) : (
        <CustomFieldControl
          definition={customFieldDef}
          language={uiLanguage}
          onChange={(next) => updateDraftAt(path, next)}
          useCompactMetrics={compactFieldLayout}
          value={primitive}
        />
      )
    ) : isEmploymentTypeField ? (
      renderEmploymentTypeSelect({
        language: uiLanguage,
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
        {uiLanguage === "bg" ? "Да/Не" : "True/False"}
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
    ) : (
      renderKeywordAwareTextControl({
        onChange: (next) => updateTextDraftAt(path, next, { fieldLabel: copy.label }),
        rows: fieldRows,
        singleLineClassName: `${EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS} ${aiInputHeight} ${aiInputPad}`,
        textareaClassName: `w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs leading-5 ${aiInputPad}`,
        useTextarea,
        value: stringValue,
      })
    );

    const wrappedValueControl = showFieldAi ? (
      <EditorFieldAiInputChrome multiline={useTextarea}>{valueControl}</EditorFieldAiInputChrome>
    ) : (
      valueControl
    );
    const aiFieldIndex = aiFieldOrder.indexOf(pathLabel);
    const hasFieldBelow = aiFieldIndex >= 0 && aiFieldIndex < aiFieldOrder.length - 1;

    const fieldShell = compactFieldLayout ? (
      <>
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
          leadingGroupIndentStyle={leadingGroupIndentStyle}
          useFormGrid
        />
        {showFieldAi ? (
          <div className={compactAiPanelWrapClass(true)}>
            <EditorFieldAiPanel />
          </div>
        ) : null}
      </>
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

  const metadataCompactEditorPath = "companies";

  function metadataFormPathKey(targetPath: PathSegment[]): string {
    if (targetPath.length === 0) return "meta:__root__";
    return `meta:${targetPath
      .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
      .join(".")}`;
  }

  function setMetadataFormNodeExpanded(targetPath: PathSegment[], value: boolean): void {
    setExpandedFormNodes((current) => ({ ...current, [metadataFormPathKey(targetPath)]: value }));
  }

  function isMetadataFormNodeExpanded(targetPath: PathSegment[]): boolean {
    const key = metadataFormPathKey(targetPath);
    if (typeof expandedFormNodes[key] === "boolean") {
      return expandedFormNodes[key];
    }
    return true;
  }

  function readMetadataStringField(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    return "";
  }

  function describeMetadataContainerHeading(
    record: Record<string, unknown>,
    fallbackTitle: string,
  ): { title: string; subtitle: string } {
    const name = readMetadataStringField(record, ["name", "title"]);
    const id = readMetadataStringField(record, ["id"]);
    const priority =
      typeof record.priority === "number" && Number.isFinite(record.priority)
        ? `Priority ${record.priority}`
        : "";
    const title = name || id || fallbackTitle;
    const subtitle = [priority, id && name ? id : ""].filter(Boolean).join(" • ");
    return { title, subtitle };
  }

  function wrapCompanyFieldWithAi(
    fieldPath: PathSegment[],
    fieldPathLabel: string,
    fieldLabel: string,
    fieldKey: string,
    text: string,
    shell: JSX.Element,
    hasFieldBelow: boolean,
  ): JSX.Element {
    const companyName = resolveCompanyNameFromMetadataPath(companyMetadataDraft, fieldPath);
    const companyContext = resolveCompanyRecordFromMetadataPath(companyMetadataDraft, fieldPath) ?? {};

    return (
      <CompanyFieldAiProvider
        companyContext={companyContext}
        companyName={companyName}
        fieldKey={fieldKey}
        fieldLabel={fieldLabel}
        metadataSource={analysisCompanySource}
        onApply={(next) => applyCompanyMetadataFieldText(fieldPath, next)}
        onNotice={onCompanyMetadataNotice}
        pathLabel={fieldPathLabel}
        resolvedTheme={resolvedTheme}
        showSeparatorBelow={hasFieldBelow}
        value={text}
      >
        {shell}
      </CompanyFieldAiProvider>
    );
  }

  function renderCompanyMetadataFormNode(
    node: unknown,
    path: PathSegment[],
    pathLabel: string,
    keyName: string,
    options?: {
      onRemove?: () => void;
      headingTitle?: string;
      headingSubtitle?: string;
      depth?: number;
    },
  ): JSX.Element {
    const depth = options?.depth ?? 0;
    const childDepth = depth + 1;
    const compactFieldLayout = true;
    const copy = resolveFieldCopy(pathLabel, keyName, selectedLanguage);
    const removeButton = options?.onRemove ? (
      <ConfirmRemoveButton kind="field" language={uiLanguage} onConfirm={options.onRemove} />
    ) : null;
    const isContainer = Array.isArray(node) || (node !== null && typeof node === "object");
    const expanded = isContainer ? isMetadataFormNodeExpanded(path) : true;
    const headerTitle = options?.headingTitle ?? copy.label;
    const headerSubtitle = options?.headingSubtitle ?? (isContainer ? copy.description : "");

    if (Array.isArray(node)) {
      const arrayHeaderActions = (
        <div className="flex shrink-0 gap-2">
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse section" : "Expand section"}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => setMetadataFormNodeExpanded(path, !expanded)}
            title={expanded ? "Collapse" : "Expand"}
            type="button"
          >
            {expanded ? "▾" : "▸"}
          </button>
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
      );
      const arrayHeaderTitle = (
        <>
          <p className="text-sm font-semibold text-slate-900">{headerTitle}</p>
          {headerSubtitle ? <p className="text-xs text-[var(--ink-muted)]">{headerSubtitle}</p> : null}
        </>
      );
      const sectionIndentStyle = compactSectionIndentStyle(compactFieldLayout, metadataCompactEditorPath, depth);

      return (
        <div
          className={compactContainerShellClass(compactFieldLayout, metadataCompactEditorPath, depth)}
          style={sectionIndentStyle}
        >
          <div className={compactMetadataContainerHeaderClass(compactFieldLayout, depth)}>
            <div className="col-span-2 min-w-0 self-start">{arrayHeaderTitle}</div>
            <div className="flex items-center justify-end gap-2 self-start">{arrayHeaderActions}</div>
          </div>

          {expanded ? (
            <div className={compactChildrenStackClass(compactFieldLayout, metadataCompactEditorPath, depth)}>
              {node.length === 0 ? (
                <p className="col-span-full text-xs text-[var(--ink-muted)]">Empty list.</p>
              ) : null}
              {node.map((item, index) => {
                const childPath = [...path, index];
                const childLabel = `${pathLabel}[${index}]`;
                const primitive = item === null || ["string", "number", "boolean"].includes(typeof item);
                if (primitive) {
                  const stringValue = String(item ?? "");
                  const useTextarea = shouldUseTextarea(stringValue, selectedLanguage);
                  const listItemLabel = `${copy.label} ${index + 1}`;
                  const listShowFieldAi = companyMetadataFieldSupportsAi(childLabel, childLabel, item);
                  const inputControl = useTextarea ? (
                    <textarea
                      className="w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1 text-xs leading-5"
                      onChange={(event) => updateCompanyMetadataDraftAt(childPath, event.target.value)}
                      rows={Math.min(3, estimateTextareaRows(stringValue))}
                      value={stringValue}
                    />
                  ) : (
                    <input
                      className={`w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1 text-xs min-h-8 box-border`}
                      onChange={(event) => updateCompanyMetadataDraftAt(childPath, event.target.value)}
                      value={stringValue}
                    />
                  );
                  const wrappedInputControl = listShowFieldAi ? (
                    <CompanyFieldAiInputChrome multiline={useTextarea}>{inputControl}</CompanyFieldAiInputChrome>
                  ) : (
                    inputControl
                  );
                  const removeItemButton = (
                    <ConfirmRemoveButton
                      kind="item"
                      language={uiLanguage}
                      onConfirm={() => removeCompanyMetadataDraftAt(childPath)}
                    />
                  );
                  const listFieldBody = (
                    <EditorCompactFieldRow
                      alignTop={useTextarea}
                      control={wrappedInputControl}
                      includeAiActionSlot={false}
                      label={listItemLabel}
                      reserveLeadingColumn={false}
                      trailing={
                        listShowFieldAi ? (
                          <>
                            <CompanyFieldAiTrigger />
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
                    <>
                      {listFieldBody}
                      <div className={EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS}>
                        <CompanyFieldAiPanel />
                      </div>
                    </>
                  ) : (
                    listFieldBody
                  );

                  return (
                    <div key={childLabel} className={compactFormPassthroughClass(compactFieldLayout)}>
                      {listShowFieldAi
                        ? wrapCompanyFieldWithAi(
                            childPath,
                            childLabel,
                            listItemLabel,
                            childLabel,
                            stringValue,
                            listFieldShell,
                            false,
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
                          ? describeMetadataContainerHeading(
                              item as Record<string, unknown>,
                              fallbackItemTitle,
                            )
                          : { title: fallbackItemTitle, subtitle: "" };
                      return renderCompanyMetadataFormNode(item, childPath, childLabel, `${keyName} ${index + 1}`, {
                        depth: childDepth,
                        onRemove: () => removeCompanyMetadataDraftAt(childPath),
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
      const entries = Object.entries(node as Record<string, unknown>).filter(
        ([key]) => !isReservedObjectEntryKey(key),
      );
      const objectHeaderActions = (
        <div className="flex shrink-0 gap-2">
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse section" : "Expand section"}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-[var(--line)] bg-white px-1 text-xs font-bold text-slate-700 hover:bg-[var(--surface-2)]"
            onClick={() => setMetadataFormNodeExpanded(path, !expanded)}
            title={expanded ? "Collapse" : "Expand"}
            type="button"
          >
            {expanded ? "▾" : "▸"}
          </button>
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
      );
      const objectHeaderTitle = (
        <>
          <p className="text-sm font-semibold text-slate-900">{headerTitle}</p>
          {headerSubtitle ? <p className="text-xs text-[var(--ink-muted)]">{headerSubtitle}</p> : null}
        </>
      );
      const sectionIndentStyle = compactSectionIndentStyle(compactFieldLayout, metadataCompactEditorPath, depth);

      return (
        <div
          className={compactContainerShellClass(compactFieldLayout, metadataCompactEditorPath, depth)}
          style={sectionIndentStyle}
        >
          <div className={compactMetadataContainerHeaderClass(compactFieldLayout, depth)}>
            <div className="col-span-2 min-w-0 self-start">{objectHeaderTitle}</div>
            <div className="flex items-center justify-end gap-2 self-start">{objectHeaderActions}</div>
          </div>
          {expanded ? (
            <div className={compactChildrenStackClass(compactFieldLayout, metadataCompactEditorPath, depth)}>
              {entries.map(([key, value]) => {
                const childPath = [...path, key];
                const childLabel = pathLabel ? `${pathLabel}.${key}` : key;
                return (
                  <div key={childLabel} className={compactFormPassthroughClass(compactFieldLayout)}>
                    {renderCompanyMetadataFormNode(value, childPath, childLabel, key, {
                      depth: childDepth,
                      onRemove: () => removeCompanyMetadataDraftAt(childPath),
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
    const useTextarea = shouldUseTextarea(stringValue, selectedLanguage);
    const customFieldDef = getCustomFieldDefinition(companyMetadataDraft, path, keyName);

    const showFieldAi =
      !customFieldDef && companyMetadataFieldSupportsAi(pathLabel, keyName, primitive);

    const valueControl = customFieldDef ? (
      <CustomFieldControl
        definition={customFieldDef}
        language={uiLanguage}
        onChange={(next) => updateCompanyMetadataDraftAt(path, next)}
        useCompactMetrics={compactFieldLayout}
        value={primitive}
      />
    ) : isBool ? (
      <label className="inline-flex items-center gap-2 text-xs">
        <input
          checked={Boolean(primitive)}
          onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.checked)}
          type="checkbox"
        />
        True/False
      </label>
    ) : isDate ? (
      <input
        className={EDITOR_COMPACT_DATE_INPUT_CLASS}
        onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.value)}
        type="date"
        value={String(primitive)}
      />
    ) : isNum ? (
      <input
        className={EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS}
        onChange={(event) => updateCompanyMetadataDraftAt(path, Number(event.target.value))}
        type="number"
        value={Number(primitive)}
      />
    ) : useTextarea ? (
      <textarea
        className="w-full min-w-0 resize-y rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs leading-5"
        onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.value)}
        rows={Math.min(3, estimateTextareaRows(stringValue))}
        value={stringValue}
      />
    ) : (
      <input
        className={EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS}
        onChange={(event) => updateCompanyMetadataDraftAt(path, event.target.value)}
        type="text"
        value={stringValue}
      />
    );

    const wrappedValueControl = showFieldAi ? (
      <CompanyFieldAiInputChrome multiline={useTextarea}>{valueControl}</CompanyFieldAiInputChrome>
    ) : (
      valueControl
    );

    const fieldShell = (
      <>
        <EditorCompactFieldRow
          alignTop={useTextarea}
          control={wrappedValueControl}
          includeAiActionSlot={false}
          label={copy.label}
          reserveLeadingColumn={false}
          rowClassName={isDate ? EDITOR_COMPACT_DATE_ROW_CLASS : ""}
          trailing={
            showFieldAi ? (
              <>
                <CompanyFieldAiTrigger />
                {removeButton}
              </>
            ) : (
              removeButton
            )
          }
          useFormGrid={compactFieldLayout}
        />
        {showFieldAi ? (
          <div className={EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS}>
            <CompanyFieldAiPanel />
          </div>
        ) : null}
      </>
    );

    return (
      <div className={compactFormPassthroughClass(compactFieldLayout)}>
        {showFieldAi
          ? wrapCompanyFieldWithAi(path, pathLabel, copy.label, keyName, stringValue, fieldShell, false)
          : fieldShell}
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
