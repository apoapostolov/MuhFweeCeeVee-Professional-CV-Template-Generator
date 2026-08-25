import {
  clampPrintTextScale,
  PRINT_TEXT_SCALE_DEFAULT,
  type PrintTweaksState,
  STORAGE_KEYS,
} from "./constants";
import { readStoredPrintTextScale } from "@/lib/print-text-scale";

export type PrintTweaksScope = {
  cvId: string;
  templateId: string;
  language: string;
};

export type PrintTweaksByScopeStore = Record<string, PrintTweaksState>;

export const DEFAULT_PRINT_TWEAKS_STATE: PrintTweaksState = {
  intelligentPagination: false,
  intelligentPaginationMode: "normal",
  removePhoto: false,
  removePageCount: false,
  moveSkillsLeft: false,
  sidebarTextScaleEnabled: false,
  sidebarTextScale: PRINT_TEXT_SCALE_DEFAULT,
  contentTextScaleEnabled: false,
  contentTextScale: PRINT_TEXT_SCALE_DEFAULT,
};

export function printTweaksScopeKey(scope: PrintTweaksScope): string {
  const cvId = scope.cvId.trim() || "_no_cv_";
  const templateId = scope.templateId.trim() || "_no_template_";
  const language = scope.language.trim().toLowerCase() || "en";
  return `${cvId}::${templateId}::${language}`;
}

export function isPrintTweaksScopeReady(scope: PrintTweaksScope): boolean {
  return Boolean(scope.cvId.trim() && scope.templateId.trim());
}

export function readPrintTweaksFromCvDocument(
  cv: unknown,
  scope: PrintTweaksScope,
): PrintTweaksState | null {
  if (!cv || typeof cv !== "object" || !isPrintTweaksScopeReady(scope)) return null;
  const metadata = (cv as Record<string, unknown>).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const printTweaks = (metadata as Record<string, unknown>).print_tweaks;
  if (!printTweaks || typeof printTweaks !== "object" || Array.isArray(printTweaks)) return null;
  const scopes = (printTweaks as Record<string, unknown>).scopes;
  if (!scopes || typeof scopes !== "object" || Array.isArray(scopes)) return null;
  const templateScopes = (scopes as Record<string, unknown>)[scope.templateId.trim()];
  if (!templateScopes || typeof templateScopes !== "object" || Array.isArray(templateScopes)) return null;
  const values = (templateScopes as Record<string, unknown>)[scope.language.trim().toLowerCase() || "en"];
  return parsePrintTweaksState(values);
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "1" || value === 1 || value === "true") {
    return true;
  }
  if (value === "0" || value === 0 || value === "false") {
    return false;
  }
  return fallback;
}

export function parsePrintTweaksState(value: unknown): PrintTweaksState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    intelligentPagination: asBoolean(record.intelligentPagination),
    intelligentPaginationMode: record.intelligentPaginationMode === "aggressive" ? "aggressive" : "normal",
    removePhoto: asBoolean(record.removePhoto),
    removePageCount: asBoolean(record.removePageCount),
    moveSkillsLeft: asBoolean(record.moveSkillsLeft),
    sidebarTextScaleEnabled: asBoolean(
      record.sidebarTextScaleEnabled ?? record.sidebarTextScaleActive,
    ),
    sidebarTextScale: clampPrintTextScale(
      Number(
        record.sidebarTextScale ??
          record.sidebar_text_scale ??
          PRINT_TEXT_SCALE_DEFAULT,
      ),
    ),
    contentTextScaleEnabled: asBoolean(
      record.contentTextScaleEnabled ?? record.contentTextScaleActive,
    ),
    contentTextScale: clampPrintTextScale(
      Number(
        record.contentTextScale ??
          record.content_text_scale ??
          PRINT_TEXT_SCALE_DEFAULT,
      ),
    ),
  };
}

/** Read legacy global single-value keys (pre-scoped storage). */
export function readLegacyGlobalPrintTweaks(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): PrintTweaksState {
  if (!storage) {
    return { ...DEFAULT_PRINT_TWEAKS_STATE };
  }
  try {
    return {
      intelligentPagination: false,
      intelligentPaginationMode: "normal",
      removePhoto: storage.getItem(STORAGE_KEYS.printTweakRemovePhoto) === "1",
      removePageCount: false,
      moveSkillsLeft:
        storage.getItem(STORAGE_KEYS.printTweakMoveSkillsLeft) === "1",
      sidebarTextScaleEnabled:
        storage.getItem(STORAGE_KEYS.printTweakSidebarTextScaleEnabled) === "1",
      sidebarTextScale: readStoredPrintTextScale(
        storage.getItem(STORAGE_KEYS.printTweakSidebarTextScale),
      ),
      contentTextScaleEnabled:
        storage.getItem(STORAGE_KEYS.printTweakContentTextScaleEnabled) === "1",
      contentTextScale: readStoredPrintTextScale(
        storage.getItem(STORAGE_KEYS.printTweakContentTextScale),
      ),
    };
  } catch {
    return { ...DEFAULT_PRINT_TWEAKS_STATE };
  }
}

export function readPrintTweaksByScopeStore(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): PrintTweaksByScopeStore {
  if (!storage) {
    return {};
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.printTweaksByScope);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const store: PrintTweaksByScopeStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!key.trim()) {
        continue;
      }
      const tweaks = parsePrintTweaksState(value);
      if (tweaks) {
        store[key] = tweaks;
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function writePrintTweaksByScopeStore(
  store: PrintTweaksByScopeStore,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEYS.printTweaksByScope, JSON.stringify(store));
  } catch {
    // no-op
  }
}

/**
 * Last tweaks for this CV + template + language.
 * Falls back to legacy global keys when the scope has never been saved.
 */
export function readPrintTweaksForScope(
  scope: PrintTweaksScope,
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): PrintTweaksState {
  if (!isPrintTweaksScopeReady(scope)) {
    return { ...DEFAULT_PRINT_TWEAKS_STATE };
  }
  const key = printTweaksScopeKey(scope);
  const store = readPrintTweaksByScopeStore(storage);
  if (store[key]) {
    return { ...store[key] };
  }
  return readLegacyGlobalPrintTweaks(storage);
}

export function writePrintTweaksForScope(
  scope: PrintTweaksScope,
  tweaks: PrintTweaksState,
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage || !isPrintTweaksScopeReady(scope)) {
    return;
  }
  const key = printTweaksScopeKey(scope);
  const store = readPrintTweaksByScopeStore(storage);
  store[key] = {
    intelligentPagination: Boolean(tweaks.intelligentPagination),
    intelligentPaginationMode: tweaks.intelligentPaginationMode,
    removePhoto: Boolean(tweaks.removePhoto),
    removePageCount: Boolean(tweaks.removePageCount),
    moveSkillsLeft: Boolean(tweaks.moveSkillsLeft),
    sidebarTextScaleEnabled: Boolean(tweaks.sidebarTextScaleEnabled),
    sidebarTextScale: clampPrintTextScale(tweaks.sidebarTextScale),
    contentTextScaleEnabled: Boolean(tweaks.contentTextScaleEnabled),
    contentTextScale: clampPrintTextScale(tweaks.contentTextScale),
  };
  writePrintTweaksByScopeStore(store, storage);
}
