import { describe, expect, it } from "vitest";

import { extractQuickIntake } from "./applicationIntake";

describe("Quick Intake extraction", () => {
  it("extracts structured fields while preserving user overrides", () => {
    const extracted = extractQuickIntake({
      raw: [
        "Job title: Senior Product Manager",
        "Company: Acme",
        "Location: Sofia, Bulgaria",
        "Salary: €70,000 - 90,000 / year",
        "Employment type: Full-time",
        "Apply: https://acme.example/jobs/123?utm_source=test",
      ].join("\n"),
      companyName: "Acme Europe",
    });
    expect(extracted).toMatchObject({
      companyName: "Acme Europe",
      jobTitle: "Senior Product Manager",
      location: "Sofia, Bulgaria",
      employmentType: "Full-time",
      url: "https://acme.example/jobs/123?utm_source=test",
    });
    expect(extracted.salaryText).toContain("€70,000");
  });

  it("derives useful fallbacks from a URL-only intake", () => {
    expect(
      extractQuickIntake({
        raw: "https://northstar.example/careers/staff-product-designer",
      }),
    ).toMatchObject({
      companyName: "Northstar",
      jobTitle: "staff product designer",
    });
  });
});
