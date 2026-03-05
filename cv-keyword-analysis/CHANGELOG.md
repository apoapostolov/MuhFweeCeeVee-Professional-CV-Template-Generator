# Changelog

All notable changes to this subproject will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning intent.

## [Unreleased]

### Added

- Initial `cv-keyword-analysis` subproject scaffold.
- Governance and execution docs: `AGENTS.md`, `DEVELOPMENT_PLAN.md`, `DEVELOPMENT_LOG.md`, `TODO.md`.
- Project overview and scope in `README.md`.
- First JD scraper implementation:
  - `jd_scraper.py` crawl + relevance scoring CLI
  - role keyword config file: `config/relevance_keywords.json`
  - editable crawl seeds: `sources/seed_urls.txt`
  - JSON output artifacts under `outputs/`
