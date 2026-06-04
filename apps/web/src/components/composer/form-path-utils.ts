import { FIELD_META } from "./constants";
import type {
  FieldCopy,
  PathSegment,
  PhotoBoothAnalysis,
} from "./types";

export function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

export function getAtPath(input: unknown, path: PathSegment[]): unknown {
  let cursor = input;
  for (const segment of path) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) {
        return undefined;
      }
      cursor = cursor[segment];
      continue;
    }
    const record = asRecord(cursor);
    if (!record) {
      return undefined;
    }
    cursor = record[segment];
  }
  return cursor;
}

export function getByPath(input: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((cursor, segment) => {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      return cursor[index];
    }
    const record = asRecord(cursor);
    if (!record) {
      return undefined;
    }
    return record[segment];
  }, input);
}

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeMetaPath(path: string): string {
  return path.replace(/\[\d+\]/g, "[]");
}

export function prettyKey(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
}

export function resolveFieldCopy(path: string, key: string, language: string): FieldCopy {
  const normalized = normalizeMetaPath(path);
  const meta = FIELD_META[normalized];
  if (meta) {
    return language === "bg" ? meta.bg : meta.en;
  }
  const label = prettyKey(key);
  return {
    label,
    description:
      language === "bg"
        ? "Редактируемо поле от структурата на CV."
        : "Editable field from the CV structure.",
  };
}

export function isDateLike(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Approximate wrap width in the composer form column (wider than PDF template columns).
 * Used for textarea row growth — not for PDF/ATS layout hints.
 */
const EDITOR_FORM_WRAP_CHARS_PER_LINE_BG = 100;
const EDITOR_FORM_WRAP_CHARS_PER_LINE_EN = 118;

/** Fallback when only language is known (research form, etc.). */
const DEFAULT_WRAP_CHARS_PER_LINE_BG = EDITOR_FORM_WRAP_CHARS_PER_LINE_BG;
const DEFAULT_WRAP_CHARS_PER_LINE_EN = EDITOR_FORM_WRAP_CHARS_PER_LINE_EN;

export function editorFormWrapCharsPerLine(language?: string, hasAiChrome = false): number {
  const base =
    (language ?? "").trim().toLowerCase() === "en"
      ? EDITOR_FORM_WRAP_CHARS_PER_LINE_EN
      : EDITOR_FORM_WRAP_CHARS_PER_LINE_BG;
  return hasAiChrome ? Math.max(48, base - 8) : base;
}

export function defaultWrapCharsPerLine(language?: string): number {
  return editorFormWrapCharsPerLine(language, false);
}

/** Use a wrapping textarea before horizontal scroll would be needed. */
export function shouldUseTextarea(value: string, language?: string, charsPerLine?: number): boolean {
  const wrapAt = charsPerLine ?? defaultWrapCharsPerLine(language);
  const nonEmptyLines = value.split("\n").filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length >= 2) {
    return true;
  }
  const singleLine = nonEmptyLines[0] ?? value.trim();
  if (singleLine.length === 0) {
    return false;
  }
  return singleLine.length > wrapAt;
}

export function estimateTextareaRows(value: string, charsPerLine?: number): number {
  const wrapAt = Math.max(8, charsPerLine ?? DEFAULT_WRAP_CHARS_PER_LINE_EN);
  const lines = value.split("\n");
  let rowEstimate = 0;
  for (const line of lines) {
    rowEstimate += Math.max(1, Math.ceil(Math.max(1, line.length) / wrapAt));
  }
  return Math.max(1, Math.min(24, rowEstimate || 1));
}

/** Shared classes so long lines wrap instead of scrolling horizontally. */
export const WRAPPING_TEXT_CONTROL_CLASS =
  "whitespace-pre-wrap break-words overflow-x-hidden";

export function templateDisplayName(raw: string): string {
  return raw.replace(/\s*\((?:Rebuilt|Prototype)\)\s*/gi, " ").replace(/\s{2,}/g, " ").trim();
}

export function formatDiffValue(value: unknown): string {
  if (value === undefined) return "(missing)";
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 0 ? value : "(empty string)";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function defaultFromSample(sample: unknown): unknown {
  if (Array.isArray(sample)) {
    return [];
  }
  if (sample && typeof sample === "object") {
    const record = sample as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "number") out[key] = 0;
      else if (typeof value === "boolean") out[key] = false;
      else if (Array.isArray(value)) out[key] = [];
      else out[key] = "";
    }
    return out;
  }
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  return "";
}

export const ARRAY_ITEM_TEMPLATES: Record<string, unknown> = {
  "experience[]": {
    id: "",
    employer: "",
    role: "",
    employment_type: "full_time",
    start_date: "",
    end_date: "",
    is_current: false,
    responsibilities: [],
    products: [],
  },
  companies: {
    id: "",
    name: "",
    priority: 1,
    company_details: {
      industry: "",
      website: "",
      headquarters: "",
      company_size: "",
      business_model: "",
      products_or_domains: [],
    },
    target_roles: [],
    target_functions: [],
    target_seniority: "",
    tailoring_priorities: [],
    value_proposition: "",
    motivation: "",
    keywords_to_echo: [],
    application_context: "",
    interview_context: "",
  },
};

export function defaultArrayEntry(pathLabel: string, sample: unknown): unknown {
  return cloneValue(ARRAY_ITEM_TEMPLATES[normalizeMetaPath(pathLabel)] ?? defaultFromSample(sample));
}

export function setAtPath(root: unknown, path: PathSegment[], value: unknown): unknown {
  if (path.length === 0) {
    return value;
  }
  const [head, ...tail] = path;
  if (typeof head === "number") {
    const list = Array.isArray(root) ? [...root] : [];
    list[head] = setAtPath(list[head], tail, value);
    return list;
  }
  const record = root && typeof root === "object" && !Array.isArray(root) ? { ...(root as Record<string, unknown>) } : {};
  record[head] = setAtPath(record[head], tail, value);
  return record;
}

export function removeAtPath(root: unknown, path: PathSegment[]): unknown {
  if (path.length === 0) return root;
  const [head, ...tail] = path;
  if (tail.length === 0) {
    if (typeof head === "number") {
      const list = Array.isArray(root) ? [...root] : [];
      list.splice(head, 1);
      return list;
    }
    const record = root && typeof root === "object" && !Array.isArray(root) ? { ...(root as Record<string, unknown>) } : {};
    delete record[head];
    return record;
  }
  if (typeof head === "number") {
    const list = Array.isArray(root) ? [...root] : [];
    list[head] = removeAtPath(list[head], tail);
    return list;
  }
  const record = root && typeof root === "object" && !Array.isArray(root) ? { ...(root as Record<string, unknown>) } : {};
  record[head] = removeAtPath(record[head], tail);
  return record;
}

export function appendToArrayAtPath(root: unknown, path: PathSegment[], value: unknown): unknown {
  const current = path.reduce<unknown>((cursor, segment) => {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof segment === "number") {
      return Array.isArray(cursor) ? cursor[segment] : undefined;
    }
    return asRecord(cursor)?.[segment];
  }, root);
  const list = Array.isArray(current) ? [...current, value] : [value];
  return setAtPath(root, path, list);
}

export function setByPath(input: Record<string, unknown>, dotPath: string, value: unknown): Record<string, unknown> {
  const segments = dotPath.split(".").filter((part) => part.length > 0);
  return setAtPath(input, segments, value) as Record<string, unknown>;
}

export function classifyVerdict(score: number): PhotoBoothAnalysis["verdict"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "usable";
  return "weak";
}

export function photoVerdictPillClass(verdict: PhotoBoothAnalysis["verdict"]): string {
  if (verdict === "excellent") return "border-emerald-300 bg-emerald-100 text-emerald-900";
  if (verdict === "good") return "border-sky-300 bg-sky-100 text-sky-900";
  if (verdict === "usable") return "border-amber-300 bg-amber-100 text-amber-900";
  return "border-rose-300 bg-rose-100 text-rose-900";
}

export async function dataUrlToFile(
  dataUrl: string,
  name: string,
  fallbackMimeType = "image/jpeg",
): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = blob.type || fallbackMimeType;
  return new File([blob], name, { type: mimeType });
}
