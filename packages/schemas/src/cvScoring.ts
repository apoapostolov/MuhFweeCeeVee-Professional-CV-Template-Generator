export type CvScoreWeights = {
  timelineIntegrity: number;
  roleRelevance: number;
  evidenceQuantification: number;
  screeningClarity: number;
  credibilitySignals: number;
  transitionNarrative: number;
  languageProfessionalism: number;
};

export const CV_SCORE_WEIGHTS_V1: CvScoreWeights = {
  timelineIntegrity: 25,
  roleRelevance: 20,
  evidenceQuantification: 15,
  screeningClarity: 15,
  credibilitySignals: 10,
  transitionNarrative: 10,
  languageProfessionalism: 5,
};

export const CV_SCORE_MAX_V1 = 100;
