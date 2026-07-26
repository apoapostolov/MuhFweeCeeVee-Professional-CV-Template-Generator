import { describe, expect, it } from "vitest";

import { readCvTargeting, writeCvTargeting } from "./cvTargeting";

describe("cvTargeting", () => {
  it("writes and reads targeting block", () => {
    const next = writeCvTargeting(
      { id: "cv_en_x", metadata: { language: "en" } },
      { company_id: "acme_us", job_id: "job_1" },
    );
    const targeting = readCvTargeting(next);
    expect(targeting?.company_id).toBe("acme_us");
    expect(targeting?.job_id).toBe("job_1");
  });

  it("clears targeting when null", () => {
    const withTarget = writeCvTargeting(
      { id: "cv_en_x", metadata: { language: "en" } },
      { company_id: "a", job_id: "b" },
    );
    const cleared = writeCvTargeting(withTarget, null);
    expect(readCvTargeting(cleared)).toBeNull();
  });
});
