import { describe, expect, it } from "vitest";

import {
  buildCvProfileVariantId,
  buildCvVariantId,
  buildCvVariantIdLoose,
  compareCvInternalVersions,
  cvVariantGroupKey,
  cvVariantGroupKeyWithVersion,
  normalizeCvInternalVersion,
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

  it("groups EN/BG profile CVs when metadata target differs", () => {
    const enKey = cvVariantGroupKey({
      id: "cv_apoapostolov_en_001",
      language: "en",
      iteration: "001",
      target: "alianz",
    });
    const bgKey = cvVariantGroupKey({
      id: "cv_apoapostolov_bg_001",
      language: "bg",
      iteration: "001",
      target: "",
    });
    expect(enKey).toBe("profile:apoapostolov:001");
    expect(bgKey).toBe(enKey);
  });

  it("prefers explicit family and release identity", () => {
    expect(cvVariantGroupKey({
      id: "legacy-en",
      language: "en",
      familyId: "apoapostolov-cv",
      releaseId: "001",
    })).toBe("family:apoapostolov-cv:001");
  });

  it("keeps different internal versions in separate pairs", () => {
    const v10 = cvVariantGroupKeyWithVersion({
      id: "cv_apoapostolov_en_001",
      displayVersion: "1.0.0",
      language: "en",
    });
    const v11 = cvVariantGroupKeyWithVersion({
      id: "cv_apoapostolov_en_001",
      displayVersion: "1.1.0",
      language: "en",
    });
    expect(v10).not.toBe(v11);
    expect(v10).toBe("profile:apoapostolov:001:version:1.0.0");
    expect(v11).toBe("profile:apoapostolov:001:version:1.1.0");
  });
});

describe("CV internal versions", () => {
  it("normalizes retained two-part labels to semantic versions", () => {
    expect(normalizeCvInternalVersion("1.0")).toBe("1.0.0");
    expect(normalizeCvInternalVersion("1.15")).toBe("1.1.5");
    expect(normalizeCvInternalVersion("1.16")).toBe("1.1.6");
    expect(normalizeCvInternalVersion("1.2")).toBe("1.2.0");
  });

  it("orders versions numerically instead of by timestamps or text", () => {
    const versions = ["1.2.1", "1.1.6", "1.2.0", "1.0.0", "1.1.5", "1.1.0"];
    expect(versions.sort(compareCvInternalVersions)).toEqual([
      "1.0.0",
      "1.1.0",
      "1.1.5",
      "1.1.6",
      "1.2.0",
      "1.2.1",
    ]);
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
