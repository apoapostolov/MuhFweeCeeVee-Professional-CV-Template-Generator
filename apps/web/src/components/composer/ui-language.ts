import { STORAGE_KEYS } from "./constants";

export const UI_LANGUAGE_OPTIONS = [
  { code: "bg", label: "Български" },
  { code: "en", label: "English" },
] as const;

export type UiLanguageCode = (typeof UI_LANGUAGE_OPTIONS)[number]["code"];

export const DEFAULT_UI_LANGUAGE: UiLanguageCode = "en";

export function normalizeUiLanguage(input: string | null | undefined): UiLanguageCode {
  const code = (input ?? "").trim().toLowerCase();
  return UI_LANGUAGE_OPTIONS.some((entry) => entry.code === code) ? (code as UiLanguageCode) : DEFAULT_UI_LANGUAGE;
}

export function uiIsBg(uiLanguage: string): boolean {
  return normalizeUiLanguage(uiLanguage) === "bg";
}

export function readUiLanguage(): UiLanguageCode {
  if (typeof window === "undefined") {
    return DEFAULT_UI_LANGUAGE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.uiLanguage);
    return normalizeUiLanguage(raw);
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

export function writeUiLanguage(language: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.uiLanguage, normalizeUiLanguage(language));
  } catch {
    // no-op
  }
}