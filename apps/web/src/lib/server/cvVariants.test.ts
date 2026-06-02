import { describe, expect, it } from "vitest";

import {
  buildCvProfileVariantId,
  buildCvVariantId,
  buildCvVariantIdLoose,
  parseCvProfileVariantId,
  parseCvVariantId,
  parseCvVariantIdLoose,
  resolveSiblingCvId,
} from "./cvVariants";

describe("parseCvVariantId", () => {
  it("parses iteration-style ids", () => {
    expect(parseCvVariantId("cv_en_0001_john_doe")).toEqual({
      language: "en",
      iteration: "0001",
      target: "john_doe",
    });
  });

  it("returns null for invalid ids", () => {
    expect(parseCvVariantId("not_a_cv")).toBeNull();
  });
});

describe("parseCvVariantIdLoose", () => {
  it("parses ids without iteration segment", () => {
    expect(parseCvVariantIdLoose("cv_en_john_doe")).toEqual({
      language: "en",
      iteration: null,
      target: "john_doe",
    });
  });

  it("parses profile-prefixed ids (owner slug + language + iteration)", () => {
    expect(parseCvVariantIdLoose("cv_apoapostolov_en_001")).toEqual({
      language: "en",
      iteration: "001",
      target: "",
    });
  });
});

describe("profile CV ids", () => {
  it("round-trips profile variant ids", () => {
    expect(parseCvProfileVariantId("cv_apoapostolov_en_001")).toEqual({
      profile: "apoapostolov",
      language: "en",
      iteration: "001",
    });
    expect(
      buildCvProfileVariantId({ profile: "apoapostolov", language: "bg", iteration: "001" }),
    ).toBe("cv_apoapostolov_bg_001");
  });

  it("resolves sibling profile CV id for translation", () => {
    expect(resolveSiblingCvId("cv_apoapostolov_en_001", "bg")).toBe("cv_apoapostolov_bg_001");
  });
});

describe("buildCvVariantId", () => {
  it("round-trips strict ids", () => {
    const id = buildCvVariantId({
      language: "bg",
      iteration: "0042",
      target: "acme_corp",
    });
    expect(id).toBe("cv_bg_0042_acme_corp");
    expect(parseCvVariantId(id)?.target).toBe("acme_corp");
  });

  it("builds loose ids without iteration", () => {
    expect(
      buildCvVariantIdLoose({ language: "en", iteration: null, target: "john_doe" }),
    ).toBe("cv_en_john_doe");
  });
});