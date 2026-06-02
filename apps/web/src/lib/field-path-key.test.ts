import { describe, expect, it } from "vitest";

import { parseFieldPath, serializeFieldPath } from "./field-path-key";

describe("field-path-key", () => {
  it("serializes and parses mixed object and array segments", () => {
    const path = [0, "responsibilities", 1];
    const key = serializeFieldPath(path);
    expect(key).toBe("[0].responsibilities.[1]");
    expect(parseFieldPath(key)).toEqual(path);
  });
});