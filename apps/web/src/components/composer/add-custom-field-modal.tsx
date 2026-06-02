"use client";

import { useEffect, useMemo, useState, type JSX } from "react";

import {
  buildInitialCustomFieldValue,
  normalizeCustomFieldKey,
  parseCommaSeparatedOptions,
  type AddCustomFieldPayload,
  type CustomFieldType,
} from "./custom-field-types";

export type AddCustomFieldModalProps = {
  open: boolean;
  language: string;
  onClose: () => void;
  onSubmit: (payload: AddCustomFieldPayload) => void;
};

const fieldTypes: CustomFieldType[] = ["text", "date", "checklist", "dropdown"];

function copy(language: string) {
  if (language === "bg") {
    return {
      title: "Ново custom поле",
      name: "Име на поле",
      type: "Тип",
      options: "Опции",
      optionsHint: "Един ред, разделени със запетая. Пример: Junior, Mid, Senior",
      initial: "Начална стойност",
      cancel: "Отказ",
      add: "Добави поле",
      types: {
        text: "Текст",
        date: "Дата",
        checklist: "Чеклист",
        dropdown: "Падащ списък",
      },
      errors: {
        name: "Въведете валидно име на поле (букви, цифри, _)",
        options: "Добавете поне една опция, разделена със запетая",
      },
    };
  }
  return {
    title: "Add custom field",
    name: "Field name",
    type: "Field type",
    options: "Options",
    optionsHint: "Single line, comma-separated. Example: Junior, Mid, Senior",
    initial: "Initial value",
    cancel: "Cancel",
    add: "Add field",
    types: {
      text: "Text",
      date: "Date",
      checklist: "Checklist",
      dropdown: "Dropdown",
    },
    errors: {
      name: "Enter a valid field name (letters, numbers, underscore)",
      options: "Add at least one comma-separated option",
    },
  };
}

export function AddCustomFieldModal({
  open,
  language,
  onClose,
  onSubmit,
}: AddCustomFieldModalProps): JSX.Element | null {
  const labels = useMemo(() => copy(language), [language]);
  const [fieldName, setFieldName] = useState("custom_field");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [optionsLine, setOptionsLine] = useState("");
  const [initialText, setInitialText] = useState("");
  const [initialDate, setInitialDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setFieldName("custom_field");
      setFieldType("text");
      setOptionsLine("");
      setInitialText("");
      setInitialDate("");
      setError("");
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  const parsedOptions = parseCommaSeparatedOptions(optionsLine);
  const needsOptions = fieldType === "checklist" || fieldType === "dropdown";

  function handleSubmit(): void {
    const key = normalizeCustomFieldKey(fieldName);
    if (!key) {
      setError(labels.errors.name);
      return;
    }
    if (needsOptions && parsedOptions.length === 0) {
      setError(labels.errors.options);
      return;
    }
    const value = buildInitialCustomFieldValue(fieldType, parsedOptions, initialText, initialDate);
    onSubmit({
      key,
      type: fieldType,
      options: parsedOptions,
      value,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-white shadow-xl"
        role="dialog"
        aria-labelledby="add-custom-field-title"
        aria-modal="true"
      >
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900" id="add-custom-field-title">
            {labels.title}
          </h3>
        </div>
        <div className="space-y-3 px-4 py-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-800">{labels.name}</span>
            <input
              className="w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800"
              onChange={(event) => setFieldName(event.target.value)}
              value={fieldName}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-800">{labels.type}</span>
            <select
              className="w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800"
              onChange={(event) => setFieldType(event.target.value as CustomFieldType)}
              value={fieldType}
            >
              {fieldTypes.map((type) => (
                <option key={type} value={type}>
                  {labels.types[type]}
                </option>
              ))}
            </select>
          </label>
          {needsOptions ? (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-800">{labels.options}</span>
              <input
                className="w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800"
                onChange={(event) => setOptionsLine(event.target.value)}
                placeholder="Junior, Mid, Senior"
                value={optionsLine}
              />
              <p className="text-[11px] text-[var(--ink-muted)]">{labels.optionsHint}</p>
            </label>
          ) : null}
          {fieldType === "date" ? (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-800">{labels.initial}</span>
              <input
                className="composer-date-input w-full min-h-8 rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800"
                onChange={(event) => setInitialDate(event.target.value)}
                type="date"
                value={initialDate}
              />
            </label>
          ) : fieldType === "text" ? (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-800">{labels.initial}</span>
              <input
                className="w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800"
                onChange={(event) => setInitialText(event.target.value)}
                value={initialText}
              />
            </label>
          ) : fieldType === "dropdown" ? (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-800">{labels.initial}</span>
              <select
                className="w-full rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800"
                disabled={parsedOptions.length === 0}
                onChange={(event) => setInitialText(event.target.value)}
                value={initialText || parsedOptions[0] || ""}
              >
                {parsedOptions.length === 0 ? (
                  <option value="">{language === "bg" ? "Добавете опции" : "Add options first"}</option>
                ) : (
                  parsedOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : null}
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-[var(--surface-2)]"
              onClick={onClose}
              type="button"
            >
              {labels.cancel}
            </button>
            <button
              className="rounded-md border border-[var(--line)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              onClick={handleSubmit}
              type="button"
            >
              {labels.add}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}