export type CvReviewSectionScore = {
  label: string;
  score: string;
};

export type CvReviewScore = CvReviewSectionScore & {
  section_scores?: CvReviewSectionScore[];
};

export const DEFAULT_ATS_SCORE_PROVIDERS = [
  "ApplyCove",
  "CVParserPro",
  "Local ATS Resume Checker",
] as const;

export const DEFAULT_DETECTOR_SCORE_PROVIDERS = [
  "Sapling",
  "QuillBot",
  "GPTZero",
  "Local AI Writing Detector",
] as const;

function defaultScoreEntries(
  labels: readonly string[],
  includeSections: boolean,
): CvReviewScore[] {
  return labels.map((label) => ({
    label,
    score: "",
    ...(includeSections ? { section_scores: [] } : {}),
  }));
}

/** Add provider presets only when a CV has not initialized that score group. */
export function withCvReviewScoreDefaults(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...metadata,
    ats_scores: Array.isArray(metadata.ats_scores)
      ? metadata.ats_scores
      : defaultScoreEntries(DEFAULT_ATS_SCORE_PROVIDERS, false),
    detector_scores: Array.isArray(metadata.detector_scores)
      ? metadata.detector_scores
      : defaultScoreEntries(DEFAULT_DETECTOR_SCORE_PROVIDERS, true),
  };
}
