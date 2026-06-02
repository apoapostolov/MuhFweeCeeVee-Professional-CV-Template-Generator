---
name: sqlite-binary-path
description: |
  Use when the Keywords workspace shows empty JD results despite cache data on
  disk, keyword core dataset rebuild returns zero rows, or sqlite3 is missing
  from PATH on WSL/Linux/macOS/Windows. Set SQLITE_BIN before starting the web app.
---

# SQLite Binary Path (Keywords)

The keyword analysis pipeline shells out to `sqlite3` for JD scrape cache and
core dataset builds (`keywords/outputs/jd_scrape_cache.sqlite`).

## Symptoms

- Keywords tab empty with no obvious API error
- Silent zero-item rebuilds in keyword dataset management

## Fix

1. Locate sqlite: `which sqlite3` (Linux/macOS) or install via package manager.
2. Export before `npm run dev` (Windows: full path to `sqlite3.exe`):

```bash
export SQLITE_BIN=/path/to/sqlite3
npm run dev
```

1. Restart the web app after setting the variable.

## Validation

- Keywords workspace lists JD-derived terms after refresh
- `npm run test:keywords` still passes (unit tests do not replace sqlite runtime)

## Related

- [`HARD_PROBLEMS.md`](../../../HARD_PROBLEMS.md) — 2026-03-08 entry
- [`README.md`](../../../README.md) — Keywords troubleshooting section
