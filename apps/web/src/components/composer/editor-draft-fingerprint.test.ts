import { describe, expect, it } from "vitest";

import { editorDraftFingerprint } from "./editor-draft-fingerprint";

describe("editorDraftFingerprint", () => {
  it("uses the form serialization for a clean form draft", () => {
    expect(
      editorDraftFingerprint("form", "full_name!: Jane Doe\n", {
        full_name: "Jane Doe",
      }),
    ).toBe("full_name: Jane Doe\n");
  });

  it("keeps the exact YAML source in YAML view", () => {
    expect(
      editorDraftFingerprint("yaml", "full_name!: Jane Doe\n", {
        full_name: "Jane Doe",
      }),
    ).toBe("full_name!: Jane Doe\n");
  });
});
