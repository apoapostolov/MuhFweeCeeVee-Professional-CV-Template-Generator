# AGENTS.md - cv-keyword-analysis

## Mission

Deliver a practical and transparent keyword weighting engine for CV optimization that users can run locally without paid tooling.

## Operating Principles

- Prefer deterministic, explainable scoring over opaque heuristics.
- Keep outputs recruiter- and ATS-friendly.
- Never invent facts for CV text suggestions.
- Keep dependencies minimal and reproducible.

## Engineering Rules

1. Keep changes small and atomic.
2. Update `CHANGELOG.md`, `DEVELOPMENT_LOG.md`, and `TODO.md` in the same change when behavior changes.
3. Add validation notes for every development log entry.
4. Avoid introducing network-coupled runtime paths for core scoring.

## Quality Baseline

- Unit coverage for keyword extraction, weighting, and scoring helpers.
- Deterministic test fixtures for CV/JD input and score snapshots.
- Clear schema for analysis output (weights, section contribution, actions).
