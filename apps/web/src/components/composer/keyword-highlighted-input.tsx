"use client";

import { useMemo, type ChangeEvent, type JSX } from "react";

import { EDITOR_COMPACT_INNER_TEXT_CONTROL_CLASS } from "./editor-compact-form-layout";
import { WRAPPING_TEXT_CONTROL_CLASS } from "./form-path-utils";
import {
  atsKeywordTone,
  findEditorKeywordHighlightSpans,
  KEYWORD_WEIGHT_UNDERLINE_CLASS,
  keywordWeightTone,
} from "@/lib/research/keyword-highlight";
import type { WeightedKeyword } from "@/lib/research/types";

export type KeywordHighlightedFieldProps = {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  className?: string;
  weightedKeywords: WeightedKeyword[];
  atsKeywords?: string[];
  resolvedTheme: "light" | "dark";
  placeholder?: string;
  /** Drop outer border when parent row draws a unified control shell. */
  innerControl?: boolean;
  /** Extra classes on single-line input (compact metrics, AI padding). */
  inputClassName?: string;
};

const overlayClass = `pointer-events-none absolute inset-0 ${WRAPPING_TEXT_CONTROL_CLASS} px-2 py-1.5 text-xs leading-5 text-slate-800`;

const textareaOuterClass = `relative z-[1] w-full min-w-0 resize-y rounded border border-[var(--line)] bg-transparent px-2 py-1.5 text-xs leading-5 text-transparent caret-[var(--foreground)] selection:bg-[var(--accent-soft)] ${WRAPPING_TEXT_CONTROL_CLASS}`;

const textareaInnerClass = `relative z-[1] ${EDITOR_COMPACT_INNER_TEXT_CONTROL_CLASS} resize-y text-transparent caret-[var(--foreground)] selection:bg-[var(--accent-soft)]`;

const inputOuterClass =
  "relative z-[1] w-full min-w-0 rounded border border-[var(--line)] bg-transparent px-2 py-1.5 text-xs text-transparent caret-[var(--foreground)] placeholder:text-[var(--ink-muted)] selection:bg-[var(--accent-soft)]";

/** Keep padding/sizing from compact field classes; drop bg/text colors that hide the mirror overlay. */
function singleLineHighlightLayoutClass(inputClassName: string): string {
  return inputClassName
    .split(/\s+/)
    .filter((token) => {
      if (!token) {
        return false;
      }
      if (token.startsWith("bg-")) {
        return false;
      }
      if (token.startsWith("text-")) {
        return false;
      }
      return true;
    })
    .join(" ");
}

export function KeywordHighlightedField({
  value,
  onChange,
  multiline = true,
  rows = 1,
  className = "",
  weightedKeywords,
  atsKeywords = [],
  resolvedTheme,
  placeholder,
  innerControl = false,
  inputClassName = "",
}: KeywordHighlightedFieldProps): JSX.Element {
  const highlightSegments = useMemo(
    () => {
      const text = value.length > 0 ? value : "\u00a0";
      const spans = findEditorKeywordHighlightSpans(text, weightedKeywords, atsKeywords);
      const segments: Array<{ text: string; className?: string }> = [];
      let cursor = 0;

      for (const span of spans) {
        if (span.start < cursor) {
          continue;
        }
        if (span.start > cursor) {
          segments.push({ text: text.slice(cursor, span.start) });
        }
        const tone =
          span.kind === "ats" ? atsKeywordTone(resolvedTheme) : keywordWeightTone(resolvedTheme, span.weight);
        segments.push({
          text: text.slice(span.start, span.end),
          className: `font-bold ${KEYWORD_WEIGHT_UNDERLINE_CLASS} ${tone} bg-transparent`,
        });
        cursor = span.end;
      }

      if (cursor < text.length || segments.length === 0) {
        segments.push({ text: text.slice(cursor) });
      }
      return segments;
    },
    [value, weightedKeywords, atsKeywords, resolvedTheme],
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const singleLineClass = [singleLineHighlightLayoutClass(inputClassName), inputOuterClass]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`relative w-full min-w-0 ${className}`.trim()}>
      <div aria-hidden className={`${overlayClass} z-0`}>
        {highlightSegments.map((segment, index) =>
          segment.className ? (
            <mark key={index} className={segment.className}>
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </div>
      {multiline ? (
        <textarea
          className={innerControl ? textareaInnerClass : textareaOuterClass}
          onChange={handleChange}
          placeholder={placeholder}
          rows={Math.max(1, rows)}
          value={value}
        />
      ) : (
        <input
          className={singleLineClass}
          onChange={handleChange}
          placeholder={placeholder}
          type="text"
          value={value}
        />
      )}
    </div>
  );
}

/** @deprecated Use KeywordHighlightedField */
export const KeywordHighlightedInput = KeywordHighlightedField;
export type KeywordHighlightedInputProps = KeywordHighlightedFieldProps;
