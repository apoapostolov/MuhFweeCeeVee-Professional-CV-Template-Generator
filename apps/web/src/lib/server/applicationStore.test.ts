import { describe, expect, it } from "vitest";

import {
  isApplicationPacketFile,
  packetCompleteness,
  PACKET_FORMAT,
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
});
