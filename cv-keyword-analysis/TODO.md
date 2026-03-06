# TODO

## P0 - Core analysis engine

- [x] Define analysis input schema (CV text + JD corpus + config).
- [x] Define output schema (weighted keywords, coverage score, actions).
- [x] Implement baseline JD crawling + relevance extraction pipeline.
- [x] Implement resume-safe cache (URL + content hash dedupe, incremental persistence).
- [x] Implement normalization pipeline (lowercase, lemmatize, dedupe).

## P1 - Weighting and scoring quality

- [x] Implement TF-IDF weighting over JD corpus.
- [x] Implement section-aware weighting for CV fields.
- [x] Implement evidence multiplier for quantified achievements.
- [x] Add scoring confidence and gap severity.

## P2 - Tooling and integration

- [x] Add CLI command for local JD analysis runs.
- [x] Add JSON output report for scrape results.
- [x] Add optional Firecrawl provider backend for higher-quality JD discovery.
- [x] Expand native role-query seed generation for non-Firecrawl crawling.
- [x] Add markdown summary report output.
- [x] Create test fixtures and regression checks.
- [x] Prepare integration hooks for main app Editor panel.
