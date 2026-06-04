import { STORAGE_KEYS } from "./constants";

/** When true, nested CV subsections render flush (no left indent). Default: flat. */
export function readEditorFlatSubsectionsPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.editorFlatSubsections);
    if (stored === null) {
      return true;
    }
    return stored === "1";
  } catch {
    return true;
  }
}

export function writeEditorFlatSubsectionsPreference(flat: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.editorFlatSubsections, flat ? "1" : "0");
  } catch {
    // no-op
  }
}