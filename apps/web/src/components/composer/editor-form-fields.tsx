import type { JSX } from "react";

import { isDateLike } from "./form-path-utils";
import type { PathSegment } from "./types";

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", labelEn: "Full time", labelBg: "Пълен работен ден" },
  { value: "part_time", labelEn: "Part time", labelBg: "Непълен работен ден" },
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPE_OPTIONS)[number]["value"];

export function isExperienceItemPath(pathLabel: string): boolean {
  return /^experience\[\d+\]$/i.test(pathLabel.trim());
}

export function isDateFieldKey(keyName: string): boolean {
  const key = keyName.trim().toLowerCase();
  return /date/.test(key) || key === "start" || key === "end" || /_(from|to|since|until)$/.test(key);
}

export function isUrlFieldKey(keyName: string): boolean {
  const key = keyName.trim().toLowerCase();
  if (!key) {
    return false;
  }
  return (
    key === "url" ||
    key === "uri" ||
    key === "href" ||
    key === "link" ||
    key === "website" ||
    key === "homepage" ||
    key.endsWith("_url") ||
    key.endsWith("_uri") ||
    key.endsWith("_link") ||
    key.endsWith("_links") ||
    key.includes("linkedin") ||
    key.includes("github") ||
    key.includes("portfolio") ||
    key.includes("website")
  );
}

export function fieldKeyFromPathLabel(pathLabel: string): string {
  const segments = pathLabel.split(".");
  const last = segments[segments.length - 1] ?? pathLabel;
  return last.replace(/\[\d+\]$/, "").trim().toLowerCase();
}

export function isUrlFieldPath(pathLabel: string, keyName: string): boolean {
  return isUrlFieldKey(keyName) || isUrlFieldKey(fieldKeyFromPathLabel(pathLabel));
}

export function fieldSupportsAiRewrite(options: {
  isBool: boolean;
  isNum: boolean;
  isDate: boolean;
  isEmploymentTypeField: boolean;
  isUrlField: boolean;
}): boolean {
  return (
    !options.isBool &&
    !options.isNum &&
    !options.isDate &&
    !options.isEmploymentTypeField &&
    !options.isUrlField
  );
}

export function formPathKeyFromSegments(targetPath: PathSegment[]): string {
  if (targetPath.length === 0) {
    return "__root__";
  }
  return targetPath
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".");
}

export function isFormPathExpanded(
  targetPath: PathSegment[],
  expandedFormNodes: Record<string, boolean>,
): boolean {
  const key = formPathKeyFromSegments(targetPath);
  if (typeof expandedFormNodes[key] === "boolean") {
    return expandedFormNodes[key];
  }
  return true;
}

const COMPANY_METADATA_AI_SKIP_KEYS = new Set(["id", "priority"]);

export function companyMetadataFieldSupportsAi(
  pathLabel: string,
  keyName: string,
  primitive: unknown,
): boolean {
  const key = keyName.trim().toLowerCase();
  if (COMPANY_METADATA_AI_SKIP_KEYS.has(key)) {
    return false;
  }
  const isBool = typeof primitive === "boolean";
  const isNum = typeof primitive === "number";
  const isDate =
    isDateLike(primitive) ||
    isDateFieldKey(keyName) ||
    isDateFieldKey(fieldKeyFromPathLabel(pathLabel));
  return fieldSupportsAiRewrite({
    isBool,
    isNum,
    isDate,
    isEmploymentTypeField: false,
    isUrlField: false,
  });
}

export function primitiveFieldSupportsAiRewrite(
  pathLabel: string,
  keyName: string,
  primitive: unknown,
): boolean {
  const isBool = typeof primitive === "boolean";
  const isNum = typeof primitive === "number";
  const isDate =
    isDateLike(primitive) ||
    isDateFieldKey(keyName) ||
    isDateFieldKey(fieldKeyFromPathLabel(pathLabel));
  const isEmploymentTypeField =
    (keyName === "employment_type" || fieldKeyFromPathLabel(pathLabel) === "employment_type") &&
    pathLabel.toLowerCase().includes("experience");
  const isUrlField = isUrlFieldPath(pathLabel, keyName);
  return fieldSupportsAiRewrite({ isBool, isNum, isDate, isEmploymentTypeField, isUrlField });
}

export function collectVisibleAiFieldPathLabels(
  node: unknown,
  path: PathSegment[],
  pathLabel: string,
  expandedFormNodes: Record<string, boolean>,
): string[] {
  if (!isFormPathExpanded(path, expandedFormNodes)) {
    return [];
  }

  if (Array.isArray(node)) {
    const labels: string[] = [];
    for (let index = 0; index < node.length; index += 1) {
      const item = node[index];
      const childPath = [...path, index];
      const childLabel = pathLabel ? `${pathLabel}[${index}]` : `[${index}]`;
      const primitive = item === null || ["string", "number", "boolean"].includes(typeof item);
      if (primitive) {
        if (primitiveFieldSupportsAiRewrite(childLabel, childLabel, item)) {
          labels.push(childLabel);
        }
        continue;
      }
      labels.push(...collectVisibleAiFieldPathLabels(item, childPath, childLabel, expandedFormNodes));
    }
    return labels;
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    const experienceItem = isExperienceItemPath(pathLabel);
    const entries = Object.entries(record).filter(
      ([key]) =>
        key !== "template_visibility" &&
        !(experienceItem && (key === "is_current" || key === "current" || key === "present")),
    );
    const labels: string[] = [];
    for (const [key, value] of entries) {
      const childPath = [...path, key];
      const childLabel = pathLabel ? `${pathLabel}.${key}` : key;
      const primitive = value === null || ["string", "number", "boolean"].includes(typeof value);
      if (primitive) {
        if (primitiveFieldSupportsAiRewrite(childLabel, key, value)) {
          labels.push(childLabel);
        }
        continue;
      }
      labels.push(...collectVisibleAiFieldPathLabels(value, childPath, childLabel, expandedFormNodes));
    }
    return labels;
  }

  return [];
}

export function normalizeEmploymentType(value: unknown): EmploymentType {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "part_time" ? "part_time" : "full_time";
}

export function renderEmploymentTypeSelect(options: {
  value: unknown;
  language: string;
  onChange: (next: EmploymentType) => void;
}): JSX.Element {
  const normalized = normalizeEmploymentType(options.value);
  return (
    <select
      className="w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
      onChange={(event) => options.onChange(normalizeEmploymentType(event.target.value))}
      value={normalized}
    >
      {EMPLOYMENT_TYPE_OPTIONS.map((entry) => (
        <option key={entry.value} value={entry.value}>
          {options.language === "bg" ? entry.labelBg : entry.labelEn}
        </option>
      ))}
    </select>
  );
}

export function renderIsCurrentHeaderControl(options: {
  checked: boolean;
  language: string;
  onChange: (next: boolean) => void;
}): JSX.Element {
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[var(--line)] bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <input
        checked={options.checked}
        onChange={(event) => options.onChange(event.target.checked)}
        type="checkbox"
      />
      {options.language === "bg" ? "Текуща позиция" : "Current role"}
    </label>
  );
}