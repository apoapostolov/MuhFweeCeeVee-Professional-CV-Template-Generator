import { asRecord, getAtPath } from "./form-path-utils";
import type { PathSegment } from "./types";

export const CUSTOM_FIELD_DEFS_KEY = "__custom_field_defs";

export type CustomFieldType = "text" | "date" | "checklist" | "dropdown";

export type CustomFieldDefinition = {
  type: CustomFieldType;
  options?: string[];
};

export type AddCustomFieldPayload = {
  key: string;
  type: CustomFieldType;
  options: string[];
  value: unknown;
};

export function parseCommaSeparatedOptions(input: string): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const part of input.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push(trimmed);
  }
  return options;
}

export function normalizeCustomFieldKey(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "");
}

export function buildInitialCustomFieldValue(
  type: CustomFieldType,
  options: string[],
  rawText: string,
  rawDate: string,
): unknown {
  if (type === "date") {
    return rawDate.trim();
  }
  if (type === "checklist") {
    return [];
  }
  if (type === "dropdown") {
    const first = options[0] ?? "";
    return rawText.trim() || first;
  }
  return rawText;
}

export function getCustomFieldDefinition(
  draft: unknown,
  fieldPath: PathSegment[],
  fieldKey: string,
): CustomFieldDefinition | null {
  if (fieldPath.length === 0) {
    return null;
  }
  const parentPath = fieldPath.slice(0, -1);
  const parent = asRecord(getAtPath(draft, parentPath));
  const defs = asRecord(parent?.[CUSTOM_FIELD_DEFS_KEY]);
  const def = asRecord(defs?.[fieldKey]);
  if (!def || typeof def.type !== "string") {
    return null;
  }
  const type = def.type as CustomFieldType;
  if (type !== "text" && type !== "date" && type !== "checklist" && type !== "dropdown") {
    return null;
  }
  const options = Array.isArray(def.options)
    ? def.options.map((entry) => String(entry ?? "").trim()).filter((entry) => entry.length > 0)
    : undefined;
  return { type, options };
}

export function isReservedObjectEntryKey(key: string): boolean {
  return key === "template_visibility" || key === CUSTOM_FIELD_DEFS_KEY;
}