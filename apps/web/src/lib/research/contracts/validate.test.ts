import { describe, expect, it } from "vitest";

import { getCompanyFieldContract, getJobFieldContract } from "./index";
import { validateFieldValue } from "./validate";

describe("validateFieldValue", () => {
  it("accepts https urls and rejects non-https", () => {
    const contract = getCompanyFieldContract("identity.website")!;
    expect(validateFieldValue(contract, "https://acme.com").ok).toBe(true);
    expect(validateFieldValue(contract, "http://acme.com").ok).toBe(false);
    expect(validateFieldValue(contract, "javascript:alert(1)").ok).toBe(false);
  });

  it("rejects invalid office_type enum", () => {
    const contract = getCompanyFieldContract("office.office_type")!;
    expect(validateFieldValue(contract, "banana").ok).toBe(false);
    expect(validateFieldValue(contract, "headquarters")).toEqual({
      ok: true,
      value: "headquarters",
    });
  });

  it("rejects email without sources (D4)", () => {
    const contract = getCompanyFieldContract("contacts.hr_email")!;
    expect(validateFieldValue(contract, "hr@acme.com").ok).toBe(false);
    expect(
      validateFieldValue(contract, "hr@acme.com", {
        sources: ["https://acme.com/careers"],
      }).ok,
    ).toBe(true);
  });

  it("allows empty email", () => {
    const contract = getCompanyFieldContract("contacts.hr_email")!;
    expect(validateFieldValue(contract, "")).toEqual({ ok: true, value: "" });
  });

  it("filters people without linkedin", () => {
    const contract = getCompanyFieldContract("people")!;
    const result = validateFieldValue(contract, [
      { name: "Jane", title: "Recruiter", linkedin_url: "https://www.linkedin.com/in/jane" },
      { name: "Ghost", title: "HR" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("parses weighted keywords with cap", () => {
    const contract = getJobFieldContract("weighted_keywords")!;
    const result = validateFieldValue(contract, [
      { keyword: "TypeScript", weight: 90, source: "ai" },
      { keyword: "Rust", weight: 80, source: "ai", evidence: [{ kind: "jd_quote", text: "Rust" }] },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const list = result.value as Array<{ keyword: string; weight: number }>;
      const ts = list.find((k) => k.keyword === "TypeScript");
      const rust = list.find((k) => k.keyword === "Rust");
      expect(ts?.weight).toBe(40);
      expect(rust?.weight).toBe(80);
    }
  });
});
