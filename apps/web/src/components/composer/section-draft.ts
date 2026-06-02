import { parse as parseYaml } from "yaml";

import {
  ROOT_ARRAY_EDITOR_PATHS,
  defaultSectionDraftForEditorPath,
} from "./constants";

const ARRAY_WRAPPER_KEYS = ["items", "entries", "records", "list"] as const;

/** Normalize API/editor payloads for array-root sections (experience, education, references). */
export function coerceSectionDraftForEditorPath(editorPath: string, parsed: unknown): unknown {
  if (!ROOT_ARRAY_EDITOR_PATHS.has(editorPath)) {
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return defaultSectionDraftForEditorPath(editorPath);
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of [...ARRAY_WRAPPER_KEYS, editorPath]) {
      const nested = record[key];
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }

  return defaultSectionDraftForEditorPath(editorPath);
}

function parseSectionYaml(editorPath: string, yamlDraft: string): unknown | undefined {
  const trimmed = yamlDraft.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return coerceSectionDraftForEditorPath(editorPath, parseYaml(trimmed));
  } catch {
    return undefined;
  }
}

/**
 * Single source for the Form tab: prefer non-empty sectionDraft, else parse YAML
 * (YAML tab edits only update yamlDraft until this runs).
 */
export function resolveSectionDraftForForm(
  editorPath: string,
  sectionDraft: unknown,
  yamlDraft: string,
): unknown {
  const fallback = defaultSectionDraftForEditorPath(editorPath);
  const isArraySection = ROOT_ARRAY_EDITOR_PATHS.has(editorPath);

  if (isArraySection) {
    const draftArray = Array.isArray(sectionDraft) ? sectionDraft : undefined;
    if (draftArray && draftArray.length > 0) {
      return draftArray;
    }

    const fromYaml = parseSectionYaml(editorPath, yamlDraft);
    if (Array.isArray(fromYaml) && fromYaml.length > 0) {
      return fromYaml;
    }
    if (draftArray) {
      return draftArray;
    }
    if (Array.isArray(fromYaml)) {
      return fromYaml;
    }
    return fallback;
  }

  if (sectionDraft !== null && sectionDraft !== undefined) {
    return sectionDraft;
  }

  const fromYaml = parseSectionYaml(editorPath, yamlDraft);
  if (fromYaml !== undefined) {
    return fromYaml;
  }

  return fallback;
}

export function sectionDraftNeedsSync(
  editorPath: string,
  sectionDraft: unknown,
  resolved: unknown,
): boolean {
  if (ROOT_ARRAY_EDITOR_PATHS.has(editorPath)) {
    const draftLen = Array.isArray(sectionDraft) ? sectionDraft.length : -1;
    const resolvedLen = Array.isArray(resolved) ? resolved.length : -1;
    return resolvedLen > 0 && draftLen !== resolvedLen;
  }
  return (
    (sectionDraft === null || sectionDraft === undefined) &&
    resolved !== null &&
    resolved !== undefined
  );
}