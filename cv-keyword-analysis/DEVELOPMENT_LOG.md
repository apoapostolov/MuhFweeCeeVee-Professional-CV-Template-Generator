# DEVELOPMENT_LOG

## 2026-03-05 - Subproject bootstrap

Context/root cause:

- Needed a dedicated workspace for free CV keyword weighting analysis and planning.

Files touched:

- `README.md`
- `AGENTS.md`
- `DEVELOPMENT_PLAN.md`
- `CHANGELOG.md`
- `TODO.md`
- `DEVELOPMENT_LOG.md`

Validation commands and results:

- Directory scaffold created successfully.
- Documentation files created successfully.

## 2026-03-05 - Started JD scraper for role-relevant positions

Context/root cause:

- Needed to start collection of job descriptions relevant to target roles:
  Video Game Producer, Game Producer, Game Designer, Data Analyst,
  Game Data Designer, Tracking Data / analytics roles.

Files touched:

- `jd_scraper.py`
- `config/relevance_keywords.json`
- `sources/seed_urls.txt`
- `outputs/.gitkeep`
- `README.md`
- `CHANGELOG.md`
- `TODO.md`
- `DEVELOPMENT_LOG.md`

Validation commands and results:

- `/usr/bin/python3 -m py_compile jd_scraper.py` -> pass

## 2026-03-05 - Added optional Firecrawl provider for JD scraping

Context/root cause:

- Requested consideration of Firecrawl-style tooling for JD scraping quality.

Files touched:

- `jd_scraper.py`
- `README.md`
- `CHANGELOG.md`
- `TODO.md`
- `DEVELOPMENT_LOG.md`

Validation commands and results:

- `/usr/bin/python3 -m py_compile jd_scraper.py` -> pass

## 2026-03-05 - Resume-safe crawler cache (start/resume)

Context/root cause:

- Needed crawler stop/resume support with hard dedupe guarantees to avoid
  reprocessing the same job pages/information.

Files touched:

- `jd_scraper.py`
- `README.md`
- `TODO.md`
- `CHANGELOG.md`
- `DEVELOPMENT_LOG.md`

Validation commands and results:

- `/usr/bin/python3 -m py_compile jd_scraper.py` -> pass

## 2026-03-05 - Expanded native seed/query discovery and reran without Firecrawl


Context/root cause:

- Firecrawl quota was exhausted; native crawler needed broader discovery to continue growing corpus.
- Existing native crawl used too few static seed URLs and saturated quickly.

Files touched:

- `jd_scraper.py`
- `config/relevance_keywords.json`
- `README.md`
- `CHANGELOG.md`
- `TODO.md`
- `DEVELOPMENT_LOG.md`

Validation commands and results:

- `/usr/bin/python3 -m py_compile jd_scraper.py` -> pass
- `/usr/bin/python3 jd_scraper.py --provider native --mode resume --max-pages 400 --max-depth 1 --max-results 10000 --min-score 8 --timeout 4 --sleep-ms 0` -> pass
- Output: `outputs/jd_relevant_20260305T170300Z.json`
- Cache totals: `pages_total=330`, `pages_relevant=235`, `native_pages=229`

## 2026-03-06 - Implemented P0/P1/P2 keyword analysis engine backlog

Context/root cause:

- Subproject had JD scraping but lacked complete CV-vs-JD scoring pipeline tasks
  in TODO (schemas, normalization, weighting quality, markdown reporting, tests,
  and editor integration hooks).

Files touched:

- `analysis_engine.py`
- `schemas/analysis_input.schema.json`
- `schemas/analysis_output.schema.json`
- `tests/fixtures/analysis_input.json`
- `tests/test_analysis_engine.py`
- `README.md`
- `CHANGELOG.md`
- `TODO.md`
- `DEVELOPMENT_LOG.md`
- `outputs/analysis_report_fixture.json`
- `outputs/analysis_report_fixture.md`
- `outputs/editor_hook_fixture.json`

Validation commands and results:

- `/usr/bin/python3 -m py_compile jd_scraper.py analysis_engine.py` -> pass
- `/usr/bin/python3 -m unittest tests/test_analysis_engine.py` -> pass (5 tests)
- `/usr/bin/python3 analysis_engine.py --input tests/fixtures/analysis_input.json --output outputs/analysis_report_fixture.json --markdown-output outputs/analysis_report_fixture.md --editor-hook-output outputs/editor_hook_fixture.json` -> pass

## 2026-03-06 - Extended TODO with taxonomy and weighting improvement ideas

Context/root cause:

- Needed a forward execution backlog focused on better keyword recognition and weighting quality.
- Required explicit roadmap coverage for hard-skill, soft-skill, and seniority-tag extraction from JD/Indeed profiles.

Files touched:

- `TODO.md`
- `CHANGELOG.md`
- `DEVELOPMENT_LOG.md`

Validation commands and results:

- Documentation update only; no runtime commands executed.

## 2026-03-06 - Continued PX implementation: taxonomy, weighting quality, and category analytics

Context/root cause:

- Needed to continue implementation of new P0/P1/P2 priorities beyond planning.
- Required concrete extraction and weighting upgrades for hard skills, soft skills, seniority, and action verbs from JD/Indeed-style profiles.

Files touched:

- `analysis_engine.py`
- `config/keyword_taxonomy.json`
- `schemas/analysis_input.schema.json`
- `schemas/analysis_output.schema.json`
- `tests/fixtures/analysis_input.json`
- `tests/test_analysis_engine.py`
- `README.md`
- `CHANGELOG.md`
- `TODO.md`
- `DEVELOPMENT_LOG.md`
- `outputs/analysis_report_fixture.json`
- `outputs/analysis_report_fixture.md`
- `outputs/editor_hook_fixture.json`

Validation commands and results:

- `/usr/bin/python3 -m py_compile analysis_engine.py jd_scraper.py` -> pass
- `/usr/bin/python3 -m unittest tests/test_analysis_engine.py` -> pass (6 tests)
- `/usr/bin/python3 analysis_engine.py --input tests/fixtures/analysis_input.json --output outputs/analysis_report_fixture.json --markdown-output outputs/analysis_report_fixture.md --editor-hook-output outputs/editor_hook_fixture.json` -> pass
