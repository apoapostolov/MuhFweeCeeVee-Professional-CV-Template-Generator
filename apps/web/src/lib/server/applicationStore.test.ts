import { describe, expect, it } from "vitest";

import {
  clampDwellDays,
  daysWithoutForwardProgress,
  findApplicationDuplicates,
  isApplicationPacketFile,
  packetCompleteness,
  PACKET_FORMAT,
  resolveStatusSince,
  statusSinceFromDays,
  type Application,
} from "./applicationStore";

describe("application packets", () => {
  it("scores packet completeness from CV/photo/company/letter", () => {
    const partial: Application = {
      id: "a1",
      company_name: "Acme",
      job_title: "Engineer",
      status: "wishlist",
      cv_id: "cv_en_0001_acme",
      status_since: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    expect(packetCompleteness(partial)).toEqual({
      cv: true,
      photo: false,
      company: true,
      letter: false,
      score: 2,
    });

    const full: Application = {
      ...partial,
      photo_id: "photo1",
      cover_letter_id: "cl_1",
      company_id: "co_1",
      status_since: partial.status_since,
    };
    expect(packetCompleteness(full).score).toBe(4);
  });

  it("validates portable packet files", () => {
    expect(
      isApplicationPacketFile({
        format: PACKET_FORMAT,
        version: 1,
        exported_at: "2026-01-01T00:00:00.000Z",
        packet: {
          company_name: "Acme",
          job_title: "Engineer",
          status: "wishlist",
          cv_id: "cv_1",
        },
      }),
    ).toBe(true);

    expect(isApplicationPacketFile({ format: "other", version: 1 })).toBe(false);
    expect(isApplicationPacketFile(null)).toBe(false);
  });

  it("resets status_since only on real forward pipeline moves", () => {
    const existing: Application = {
      id: "a1",
      company_name: "Acme",
      job_title: "Engineer",
      status: "applied",
      status_since: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-10T00:00:00.000Z",
    };
    const now = "2026-02-01T00:00:00.000Z";
    expect(
      resolveStatusSince({ existing, nextStatus: "interview", now }),
    ).toBe(now);
    expect(
      resolveStatusSince({ existing, nextStatus: "wishlist", now }),
    ).toBe("2026-01-01T00:00:00.000Z");
    expect(
      resolveStatusSince({ existing, nextStatus: "applied", now }),
    ).toBe("2026-01-01T00:00:00.000Z");
    // Terminal outcomes do not reset the dwell clock.
    expect(
      resolveStatusSince({ existing, nextStatus: "rejected", now }),
    ).toBe("2026-01-01T00:00:00.000Z");
    expect(
      resolveStatusSince({ existing, nextStatus: "ghosted", now }),
    ).toBe("2026-01-01T00:00:00.000Z");
  });

  it("counts whole days without forward progress", () => {
    const since = "2026-01-01T12:00:00.000Z";
    const day30 = Date.parse("2026-01-31T12:00:00.000Z");
    expect(daysWithoutForwardProgress(since, day30)).toBe(30);
  });

  it("round-trips manual day counter edits via status_since", () => {
    const now = Date.parse("2026-07-27T15:00:00.000Z");
    expect(clampDwellDays(-3)).toBe(0);
    expect(clampDwellDays(12.9)).toBe(12);
    expect(clampDwellDays(20_000)).toBe(9999);
    const since = statusSinceFromDays(45, now);
    expect(daysWithoutForwardProgress(since, now)).toBe(45);
    expect(
      resolveStatusSince({
        existing: {
          id: "a1",
          company_name: "Acme",
          job_title: "Engineer",
          status: "applied",
          status_since: "2026-01-01T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-10T00:00:00.000Z",
        },
        nextStatus: "interview",
        now: "2026-07-27T15:00:00.000Z",
        explicit: since,
      }),
    ).toBe(since);
  });

  it("detects duplicate URLs after stripping tracking and company-role pairs", () => {
    const base: Application = {
      id: "a1",
      company_name: "Acme Inc.",
      job_title: "Product Lead",
      status: "wishlist",
      url: "https://jobs.example/42?utm_source=linkedin",
      status_since: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const duplicates = findApplicationDuplicates([
      base,
      {
        ...base,
        id: "a2",
        url: "https://jobs.example/42",
      },
      {
        ...base,
        id: "a3",
        company_name: "Other",
        job_title: "Engineer",
        url: "https://jobs.example/99",
      },
    ]);
    expect(duplicates.a1).toContain("a2");
    expect(duplicates.a2).toContain("a1");
    expect(duplicates.a3).toBeUndefined();
  });
});
