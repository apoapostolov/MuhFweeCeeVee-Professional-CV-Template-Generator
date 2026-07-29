import { describe, expect, it } from "vitest";

import { computeApplicationAnalytics } from "./applicationAnalytics";
import type { Application } from "./applicationStore";

function app(overrides: Partial<Application>): Application {
  return {
    id: "a1",
    company_name: "Acme",
    job_title: "Product Lead",
    status: "applied",
    source: "LinkedIn",
    role_family: "Product",
    applied_at: "2026-01-01T00:00:00.000Z",
    status_since: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    activities: [],
    submission_snapshots: [],
    ...overrides,
  };
}

describe("application analytics", () => {
  it("derives funnel conversion from status and timeline events", () => {
    const analytics = computeApplicationAnalytics([
      app({
        id: "offer",
        status: "offer",
        activities: [
          {
            id: "i",
            type: "interview_round",
            occurred_at: "2026-01-05T00:00:00.000Z",
            summary: "Interview",
          },
          {
            id: "o",
            type: "offer",
            occurred_at: "2026-01-10T00:00:00.000Z",
            summary: "Offer",
          },
        ],
      }),
      app({ id: "silent", source: "Referral", role_family: "Engineering" }),
    ]);
    expect(analytics.totals).toMatchObject({
      submitted: 2,
      responses: 1,
      interviews: 1,
      offers: 1,
    });
    expect(analytics.conversion.offerRate).toBe(50);
    expect(analytics.bySource).toHaveLength(2);
  });

  it("flags incomplete history instead of overstating confidence", () => {
    const analytics = computeApplicationAnalytics([
      app({ activities: [], submission_snapshots: [] }),
    ]);
    expect(analytics.dataQuality).toEqual({
      applicationsWithoutTimeline: 1,
      submittedWithoutSnapshot: 1,
    });
  });
});
