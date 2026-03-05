# CV Keyword Analysis

Lightweight subproject for extracting, weighting, and scoring CV/job-description keywords without paid CV optimization platforms.

## Goals

- Build a free keyword-weighting pipeline for CVs and job descriptions.
- Produce explainable term weights (not black-box scoring only).
- Generate actionable optimization suggestions per CV section.

## Scope (initial)

- Ingest CV text (YAML/JSON/plain text) and one or more target job descriptions.
- Compute weighted keyword sets (frequency + corpus relevance).
- Rank CV coverage vs target role keywords.
- Provide section-aware and evidence-aware scoring.

## Planned Tech

- Python 3.12
- `scikit-learn` for TF-IDF
- `spaCy` for phrase extraction
- optional `rapidfuzz` for fuzzy normalization

## Project Structure

- `AGENTS.md` - operating rules
- `DEVELOPMENT_PLAN.md` - implementation milestones
- `DEVELOPMENT_LOG.md` - chronological engineering log
- `CHANGELOG.md` - user-visible changes
- `TODO.md` - actionable tasks by priority

## JD Scraper (started)

First implementation is now available:

- `jd_scraper.py` - crawls seed URLs, extracts candidate job pages, scores
  relevance for target roles, and exports JSON results.
- `config/relevance_keywords.json` - weighted role/keyword configuration.
- `sources/seed_urls.txt` - editable crawl entrypoints.
- `outputs/` - exported scrape results.

Run:

```bash
cd cv-keyword-analysis
/usr/bin/python3 jd_scraper.py --max-pages 300 --max-depth 2 --min-score 10
```

Optional:

```bash
/usr/bin/python3 jd_scraper.py --seed-file sources/seed_urls.txt --output outputs/my_run.json
```

## Status

Bootstrap + first JD scraping pipeline implemented.
