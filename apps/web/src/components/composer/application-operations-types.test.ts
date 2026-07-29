import { describe, expect, it } from "vitest";

import {
  applicationMatchesFilters,
  DEFAULT_APPLICATION_FILTERS,
  type Application,
} from "./application-operations-types";

const application: Application = {
  id: "a1",
  company_name: "Acme",
  job_title: "Product Lead",
  status: "applied",
  priority: "high",
  notes: "Follow up with recruiter",
  status_since: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("application portfolio filters", () => {
  it("searches across notes and core identity", () => {
    expect(
      applicationMatchesFilters(application, {
        ...DEFAULT_APPLICATION_FILTERS,
        search: "recruiter",
      }),
    ).toBe(true);
    expect(
      applicationMatchesFilters(application, {
        ...DEFAULT_APPLICATION_FILTERS,
        search: "engineering",
      }),
    ).toBe(false);
  });

  it("supports archive and priority views", () => {
    expect(
      applicationMatchesFilters(application, {
        ...DEFAULT_APPLICATION_FILTERS,
        priority: "high",
      }),
    ).toBe(true);
    expect(
      applicationMatchesFilters(
        { ...application, archived_at: "2026-02-01T00:00:00.000Z" },
        DEFAULT_APPLICATION_FILTERS,
      ),
    ).toBe(false);
  });
});
