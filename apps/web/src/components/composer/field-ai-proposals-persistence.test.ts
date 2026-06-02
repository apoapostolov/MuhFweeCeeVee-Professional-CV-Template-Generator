import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fieldRewriteStorageKey,
  formatProposalCharacterCount,
  readFieldRewriteSession,
  writeFieldRewriteSession,
} from "./field-ai-proposals-persistence";

describe("field-ai-proposals-persistence", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    };
    vi.stubGlobal("window", { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("builds stable storage keys", () => {
    expect(
      fieldRewriteStorageKey({
        cvId: "cv_1",
        language: "en",
        editorPath: "experience",
        pathLabel: "experience[0].summary",
      }),
    ).toBe("cv_1::en::experience::experience[0].summary");
  });

  it("formats character count labels", () => {
    expect(formatProposalCharacterCount("en", 1)).toBe("(1 character)");
    expect(formatProposalCharacterCount("en", 42)).toBe("(42 characters)");
    expect(formatProposalCharacterCount("bg", 12)).toBe("(12 знака)");
  });

  it("round-trips sessions in localStorage", () => {
    const key = "test::en::person::person.summary";
    const session = {
      currentScore: 61,
      proposals: [
        { text: "Alpha", confidence: 90 },
        { text: "Beta", confidence: 80 },
        { text: "Gamma", confidence: 70 },
      ],
    };
    writeFieldRewriteSession(key, session);
    expect(readFieldRewriteSession(key)).toEqual(session);
    writeFieldRewriteSession(key, null);
    expect(readFieldRewriteSession(key)).toBeNull();
  });
});