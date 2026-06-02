"use client";

import type { JSX } from "react";

import type { CustomFieldDefinition } from "./custom-field-types";
import { EDITOR_COMPACT_DATE_INPUT_CLASS, EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS } from "./editor-compact-form-layout";

export type CustomFieldControlProps = {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (next: unknown) => void;
  language: string;
  useCompactMetrics?: boolean;
};

export function CustomFieldControl({
  definition,
  value,
  onChange,
  language,
  useCompactMetrics = false,
}: CustomFieldControlProps): JSX.Element {
  const inputClass = useCompactMetrics ? EDITOR_COMPACT_PRIMITIVE_INPUT_CLASS : "w-full rounded border border-[var(--line)] bg-white px-2 py-1 text-xs";

  if (definition.type === "date") {
    return (
      <input
        className={useCompactMetrics ? EDITOR_COMPACT_DATE_INPUT_CLASS : `${inputClass} composer-date-input min-h-8`}
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={String(value ?? "")}
      />
    );
  }

  if (definition.type === "dropdown") {
    const options = definition.options ?? [];
    return (
      <select
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        value={String(value ?? "")}
      >
        {options.length === 0 ? (
          <option value="">{language === "bg" ? "Няма опции" : "No options"}</option>
        ) : (
          options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        )}
      </select>
    );
  }

  if (definition.type === "checklist") {
    const options = definition.options ?? [];
    const selected = Array.isArray(value) ? value.map((entry) => String(entry)) : [];
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 rounded border border-[var(--line)] bg-white px-2 py-1.5">
        {options.length === 0 ? (
          <span className="text-xs text-[var(--ink-muted)]">
            {language === "bg" ? "Няма дефинирани опции" : "No options defined"}
          </span>
        ) : (
          options.map((option) => {
            const checked = selected.includes(option);
            return (
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-800" key={option}>
                <input
                  checked={checked}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, option]
                      : selected.filter((entry) => entry !== option);
                    onChange(next);
                  }}
                  type="checkbox"
                />
                {option}
              </label>
            );
          })
        )}
      </div>
    );
  }

  return (
    <input
      className={inputClass}
      onChange={(event) => onChange(event.target.value)}
      type="text"
      value={String(value ?? "")}
    />
  );
}