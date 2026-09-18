import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readApplicationBoard: vi.fn(),
  upsertApplication: vi.fn(),
  readResearchCatalog: vi.fn(),
  upsertResearchedCompany: vi.fn(),
  upsertResearchedJobPosition: vi.fn(),
}));

vi.mock("./applicationStore", () => ({
  normalizeApplicationUrl: (value: string | undefined) => value ?? "",
  readApplicationBoard: mocks.readApplicationBoard,
  upsertApplication: mocks.upsertApplication,
}));

vi.mock("./researchStore", () => ({
  readResearchCatalog: mocks.readResearchCatalog,
  upsertResearchedCompany: mocks.upsertResearchedCompany,
  upsertResearchedJobPosition: mocks.upsertResearchedJobPosition,
}));

import { extractQuickIntake, quickIntakeApplication } from "./applicationIntake";

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

describe("quickIntakeApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readResearchCatalog.mockResolvedValue({
      companies: [],
      job_positions: [],
    });
    mocks.readApplicationBoard.mockResolvedValue({ applications: [] });
    mocks.upsertApplication.mockImplementation(async (application) => ({
      applications: [{ id: "application_1", ...application }],
    }));
  });

  it("creates new quick-intake records in wishlist status", async () => {
    const result = await quickIntakeApplication({
      raw: "Company: Acme\nJob title: Systems Designer",
    });

    expect(mocks.upsertApplication).toHaveBeenCalledWith(
      expect.objectContaining({ status: "wishlist" }),
    );
    expect(result.application.status).toBe("wishlist");
  });
});
