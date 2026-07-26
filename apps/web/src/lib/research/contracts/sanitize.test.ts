import { describe, expect, it } from "vitest";

import { sanitizeResearchedCompany, sanitizeResearchedJobPosition } from "./sanitize";

describe("sanitizeResearchedCompany", () => {
  it("strips bad office_type and inventable email", () => {
    const { company, warnings } = sanitizeResearchedCompany({
      id: "acme_us",
      name: "Acme",
      office: { country: "US", office_type: "banana" as "unknown" },
      contacts: { hr_email: "hr@acme.com" },
      people: [{ name: "Nobody", title: "HR" }],
      research: { sources: [] },
    });
    expect(company.office.office_type).toBeUndefined();
    expect(company.contacts?.hr_email).toBeUndefined();
    expect(company.people ?? []).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("keeps people with linkedin and email when sources exist", () => {
    const { company } = sanitizeResearchedCompany({
      id: "acme_us",
      name: "Acme",
      office: { country: "US" },
      contacts: { hr_email: "hr@acme.com" },
      people: [
        {
          name: "Jane",
          title: "Recruiter",
          linkedin_url: "https://www.linkedin.com/in/jane",
        },
      ],
      research: { sources: ["https://acme.com/careers"] },
    });
    expect(company.contacts?.hr_email).toBe("hr@acme.com");
    expect(company.people).toHaveLength(1);
  });
});

describe("sanitizeResearchedJobPosition", () => {
  it("caps unverified keyword weights", () => {
    const { job } = sanitizeResearchedJobPosition({
      id: "job_1",
      company_id: "acme_us",
      title: "Engineer",
      weighted_keywords: [{ keyword: "Java", weight: 99, source: "ai" }],
    });
    expect(job.weighted_keywords[0]?.weight).toBe(40);
  });
});
