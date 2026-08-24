import { describe, expect, it } from "vitest";

import {
  DEFAULT_ATS_SCORE_PROVIDERS,
  DEFAULT_DETECTOR_SCORE_PROVIDERS,
  withCvReviewScoreDefaults,
} from "./cvReviewMetadata";

describe("withCvReviewScoreDefaults", () => {
  it("adds the built-in providers to uninitialized metadata", () => {
    const metadata = withCvReviewScoreDefaults({ language: "en" });
    expect((metadata.ats_scores as Array<{ label: string }>).map((entry) => entry.label))
      .toEqual(DEFAULT_ATS_SCORE_PROVIDERS);
    expect((metadata.detector_scores as Array<{ label: string }>).map((entry) => entry.label))
      .toEqual(DEFAULT_DETECTOR_SCORE_PROVIDERS);
  });

  it("preserves initialized groups, including an intentionally empty list", () => {
    const atsScores = [{ label: "Custom ATS", score: "Pass" }];
    const metadata = withCvReviewScoreDefaults({ ats_scores: atsScores, detector_scores: [] });
    expect(metadata.ats_scores).toBe(atsScores);
    expect(metadata.detector_scores).toEqual([]);
  });
});
