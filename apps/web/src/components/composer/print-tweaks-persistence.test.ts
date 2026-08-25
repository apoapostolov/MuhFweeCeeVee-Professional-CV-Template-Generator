import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRINT_TWEAKS_STATE,
  isPrintTweaksScopeReady,
  parsePrintTweaksState,
  printTweaksScopeKey,
  readLegacyGlobalPrintTweaks,
  readPrintTweaksByScopeStore,
  readPrintTweaksForScope,
  readPrintTweaksFromCvDocument,
  writePrintTweaksForScope,
} from "./print-tweaks-persistence";
import { STORAGE_KEYS } from "./constants";

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("print-tweaks-persistence", () => {
  it("builds stable scope keys from cv + template + language", () => {
    expect(
      printTweaksScopeKey({
        cvId: " cv_en_1 ",
        templateId: " harvard-v1 ",
        language: "EN",
      }),
    ).toBe("cv_en_1::harvard-v1::en");
  });

  it("requires cv and template before persisting", () => {
    expect(
      isPrintTweaksScopeReady({ cvId: "", templateId: "harvard-v1", language: "en" }),
    ).toBe(false);
    expect(
      isPrintTweaksScopeReady({
        cvId: "cv_1",
        templateId: "harvard-v1",
        language: "en",
      }),
    ).toBe(true);
  });

  it("parses and clamps tweak payloads", () => {
    const parsed = parsePrintTweaksState({
      intelligentPagination: "1",
      removePhoto: true,
      removePageCount: true,
      moveSkillsLeft: "1",
      sidebarTextScaleEnabled: false,
      sidebarTextScale: 999,
      contentTextScaleEnabled: true,
      contentTextScale: 10,
    });
    expect(parsed).toEqual({
      intelligentPagination: true,
      removePhoto: true,
      removePageCount: true,
      moveSkillsLeft: true,
      sidebarTextScaleEnabled: false,
      sidebarTextScale: 200,
      contentTextScaleEnabled: true,
      contentTextScale: 50,
    });
  });

  it("reads scoped tweaks from CV metadata", () => {
    expect(
      readPrintTweaksFromCvDocument(
        {
          metadata: {
            print_tweaks: {
              version: 1,
              scopes: {
                "harvard-v1": {
                  en: {
                    intelligentPagination: true,
                    futureTweakExample: "keep me",
                  },
                },
              },
            },
          },
        },
        { cvId: "cv_en", templateId: "harvard-v1", language: "en" },
      ),
    ).toEqual({
      ...DEFAULT_PRINT_TWEAKS_STATE,
      intelligentPagination: true,
    });
  });

  it("writes and reads per scope without clobbering other combos", () => {
    const storage = memoryStorage();
    const scopeA = {
      cvId: "cv_en",
      templateId: "harvard-v1",
      language: "en",
    };
    const scopeB = {
      cvId: "cv_bg",
      templateId: "harvard-v1",
      language: "bg",
    };
    writePrintTweaksForScope(
      scopeA,
      {
        ...DEFAULT_PRINT_TWEAKS_STATE,
        removePhoto: true,
        contentTextScaleEnabled: true,
        contentTextScale: 90,
      },
      storage,
    );
    writePrintTweaksForScope(
      scopeB,
      {
        ...DEFAULT_PRINT_TWEAKS_STATE,
        moveSkillsLeft: true,
        sidebarTextScaleEnabled: true,
        sidebarTextScale: 110,
      },
      storage,
    );

    expect(readPrintTweaksForScope(scopeA, storage)).toEqual({
      ...DEFAULT_PRINT_TWEAKS_STATE,
      removePhoto: true,
      contentTextScaleEnabled: true,
      contentTextScale: 90,
    });
    expect(readPrintTweaksForScope(scopeB, storage)).toEqual({
      ...DEFAULT_PRINT_TWEAKS_STATE,
      moveSkillsLeft: true,
      sidebarTextScaleEnabled: true,
      sidebarTextScale: 110,
    });
    expect(Object.keys(readPrintTweaksByScopeStore(storage))).toHaveLength(2);
  });

  it("falls back to legacy global keys when scope is unseen", () => {
    const storage = memoryStorage({
      [STORAGE_KEYS.printTweakRemovePhoto]: "1",
      [STORAGE_KEYS.printTweakContentTextScaleEnabled]: "1",
      [STORAGE_KEYS.printTweakContentTextScale]: "85",
    });
    const tweaks = readPrintTweaksForScope(
      { cvId: "cv_new", templateId: "cambridge-v1", language: "en" },
      storage,
    );
    expect(tweaks.removePhoto).toBe(true);
    expect(tweaks.contentTextScaleEnabled).toBe(true);
    expect(tweaks.contentTextScale).toBe(85);
    expect(readLegacyGlobalPrintTweaks(storage).removePhoto).toBe(true);
  });
});
