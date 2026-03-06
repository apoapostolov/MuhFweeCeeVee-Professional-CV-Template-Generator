# TODO

## P0 - Taxonomy extraction and weighted signal capture

- [x] Add explicit keyword taxonomy schema for `hard_skill`, `soft_skill`, `seniority`, `action_verb`, and `domain_term` tags.
- [x] Implement JD text classifier that tags extracted terms into hard/soft/seniority buckets with confidence scores.
- [x] Add seniority-intent detector from JD signals (for example `senior`, `lead`, `principal`, `director`, team-size ownership phrases).
- [x] Add action-verb recognizer and normalization layer (lemma-based) for weighted impact language extraction.
- [x] Extend parser to detect multi-word skill phrases (n-grams) such as `systems design`, `economy balancing`, `a/b testing`, `live ops`.
- [ ] Add weighted term storage in SQLite cache for per-profile term category frequency and confidence.

## P1 - Relevance, weighting, and de-duplication quality

- [x] Implement category-aware weighting formula so hard skills, soft skills, and seniority tags can have separate multipliers.
- [x] Add Indeed/JD source-quality weighting (freshness, completeness, role-match confidence, duplicate-likelihood penalties).
- [x] Add near-duplicate JD detection beyond URL/hash (set-similarity threshold) to reduce repeated term inflation.
- [x] Add recency decay for old JDs so newer market terms are weighted higher over time.
- [x] Add role-cluster weighting profiles (for example producer/designer/analytics) with tunable category priors.
- [x] Add threshold tuning pipeline for missing/underused/used classification per category.

## P2 - Optimization, coverage, and feedback loop

- [ ] Add daily auto-refresh pipeline that rebalances taxonomy weights from newly ingested profiles.
- [x] Add expansion dictionaries for aliases and abbreviations (for example `ltv`, `lifetime value`, `live-ops`, `live ops`).
- [x] Add contextual negation handling to avoid false positives (for example `no management experience`, `not required`).
- [x] Add per-category analytics report (top hard skills, top soft skills, top seniority tags, trending verbs).
- [ ] Add precision/recall benchmark set for tagged JD samples with regression gating in CI.
- [ ] Add user-feedback capture hooks from Keyword Studio edits to improve future weighting calibration.

## Completed Foundation (archived)

- [x] Define analysis input schema (CV text + JD corpus + config).
- [x] Define output schema (weighted keywords, coverage score, actions).
- [x] Implement baseline JD crawling + relevance extraction pipeline.
- [x] Implement resume-safe cache (URL + content hash dedupe, incremental persistence).
- [x] Implement normalization pipeline (lowercase, lemmatize, dedupe).
- [x] Implement TF-IDF weighting over JD corpus.
- [x] Implement section-aware weighting for CV fields.
- [x] Implement evidence multiplier for quantified achievements.
- [x] Add scoring confidence and gap severity.
- [x] Add CLI command for local JD analysis runs.
- [x] Add JSON output report for scrape results.
- [x] Add optional Firecrawl provider backend for higher-quality JD discovery.
- [x] Expand native role-query seed generation for non-Firecrawl crawling.
- [x] Add markdown summary report output.
- [x] Create test fixtures and regression checks.
- [x] Prepare integration hooks for main app Editor panel.
