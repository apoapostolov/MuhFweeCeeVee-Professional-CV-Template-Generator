# Development Plan

## Phase 1 - Foundations

- Define input/output schemas for CV and JD analysis.
- Implement keyword extraction baseline (token + phrase).
- Add normalization (case, punctuation, lemmatization).

## Phase 2 - Weighting Engine

- Add TF-IDF corpus weighting across multiple job descriptions.
- Add section-aware CV weighting (experience > skills > summary).
- Add evidence multiplier (quantified outcomes boost).

## Phase 3 - Scoring + Recommendations

- Compute CV coverage score against weighted target keywords.
- Generate top keyword gaps and rewrite suggestions.
- Add severity bands and expected score uplift estimates.

## Phase 4 - Integration

- Expose CLI entrypoint and JSON report output.
- Integrate with main app editor workflow.
- Add regression tests and fixtures for stable scoring.
