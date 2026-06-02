import { STORAGE_KEYS, themeOptionsForTemplate } from "./constants";
import type { CvListResponse } from "./types";

export type PersistedWorkspacePrefs = {
  cvId: string;
  cvPairKey: string;
  language: string;
  templateId: string;
  templateTheme: string;
};

export function cvPairKeyForItem(item: CvListResponse["items"][number]): string {
  if (item.iteration && item.target) {
    return `${item.iteration}::${item.target}`;
  }
  return item.id;
}

export function readPersistedWorkspacePrefs(): PersistedWorkspacePrefs {
  if (typeof window === "undefined") {
    return {
      cvId: "",
      cvPairKey: "",
      language: "",
      templateId: "",
      templateTheme: "default",
    };
  }
  try {
    const rawLanguage = (window.localStorage.getItem(STORAGE_KEYS.selectedLanguage) ?? "").toLowerCase();
    return {
      cvId: window.localStorage.getItem(STORAGE_KEYS.selectedCvId) ?? "",
      cvPairKey: window.localStorage.getItem(STORAGE_KEYS.selectedCvPairKey) ?? "",
      language: /^[a-z]{2,8}$/.test(rawLanguage) ? rawLanguage : "",
      templateId: window.localStorage.getItem(STORAGE_KEYS.selectedTemplateId) ?? "",
      templateTheme: window.localStorage.getItem(STORAGE_KEYS.selectedTemplateTheme) ?? "default",
    };
  } catch {
    return {
      cvId: "",
      cvPairKey: "",
      language: "",
      templateId: "",
      templateTheme: "default",
    };
  }
}

export function writePersistedWorkspacePrefs(partial: Partial<PersistedWorkspacePrefs>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (partial.cvId !== undefined && partial.cvId) {
      window.localStorage.setItem(STORAGE_KEYS.selectedCvId, partial.cvId);
    }
    if (partial.cvPairKey !== undefined && partial.cvPairKey) {
      window.localStorage.setItem(STORAGE_KEYS.selectedCvPairKey, partial.cvPairKey);
    }
    if (partial.language !== undefined && partial.language) {
      window.localStorage.setItem(STORAGE_KEYS.selectedLanguage, partial.language);
    }
    if (partial.templateId !== undefined && partial.templateId) {
      window.localStorage.setItem(STORAGE_KEYS.selectedTemplateId, partial.templateId);
    }
    if (partial.templateTheme !== undefined && partial.templateTheme) {
      window.localStorage.setItem(STORAGE_KEYS.selectedTemplateTheme, partial.templateTheme);
    }
  } catch {
    // no-op
  }
}

export function resolveCvItemFromPersistedPrefs(
  items: CvListResponse["items"],
  prefs: PersistedWorkspacePrefs,
): CvListResponse["items"][number] | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const language = prefs.language || "en";

  if (prefs.cvPairKey) {
    const inPair = items.filter((item) => cvPairKeyForItem(item) === prefs.cvPairKey);
    if (inPair.length > 0) {
      const byId = prefs.cvId ? inPair.find((item) => item.id === prefs.cvId) : undefined;
      if (byId) {
        return byId;
      }
      const byLanguage = inPair.find((item) => (item.language ?? "").toLowerCase() === language);
      if (byLanguage) {
        return byLanguage;
      }
      const byEnglish = inPair.find((item) => (item.language ?? "").toLowerCase() === "en");
      if (byEnglish) {
        return byEnglish;
      }
      return inPair[0];
    }
  }

  if (prefs.cvId) {
    const byId = items.find((item) => item.id === prefs.cvId);
    if (byId) {
      return byId;
    }
  }

  return items[0];
}

export function resolveTemplateSelection(
  templateItems: Array<{ id: string }>,
  prefs: PersistedWorkspacePrefs,
): { templateId: string; themeId: string } {
  if (templateItems.length === 0) {
    return { templateId: "", themeId: "default" };
  }

  const templateId =
    templateItems.find((item) => item.id === prefs.templateId)?.id
    ?? templateItems.find((entry) => entry.id === "cambridge-v1")?.id
    ?? templateItems.find((entry) => entry.id === "europass-v1")?.id
    ?? templateItems[0].id;

  const themeOptions = themeOptionsForTemplate(templateId);
  const themeId = themeOptions.some((option) => option.id === prefs.templateTheme)
    ? prefs.templateTheme
    : "default";

  return { templateId, themeId };
}