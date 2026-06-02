# Retired Keywords workspace

Archived on 2026-06-02. Not wired into the active Next.js app or CI.

## Contents

| Path | Description |
|------|-------------|
| `keywords/` | Python keyword engine: `analysis_engine.py` (CV vs JD analysis CLI), `jd_scraper.py`, configs, tests |
| `apps-web/src/app/api/analysis/keywords/` | API routes: analysis, datasets, JD collection manage |
| `apps-web/src/components/composer/` | `KeywordStudioPanel.tsx`, `buildKeywordMatcher.ts`, `keyword-tag-ui.ts` |
| `apps-web/src/lib/server/keywordCoreDataset.ts` | SQLite scrape cache → merged core dataset builder |
| `skills-sqlite-binary-path/` | Agent skill for sqlite3 path issues in the keyword pipeline |

## Restore (manual)

1. Move `keywords/` back to repo root.
2. Copy `apps-web/` paths back under `apps/web/src/`.
3. Re-add Keywords tab in `ComposerNav`, panel in `ComposerShell`, state/effects in `useComposerController`, and keyword types in `types.ts`.
4. Re-enable `npm run test:keywords` and the CI keyword job.

## CV keyword CLI (was `keywords/analysis_engine.py`)

```bash
cd keywords
/usr/bin/python3 analysis_engine.py --help
```

See `keywords/README.md` for full scraper and engine documentation.