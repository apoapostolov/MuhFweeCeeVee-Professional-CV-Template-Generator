# HARD PROBLEMS — MuhFweeCeeVee

Record of issues that repeatedly stalled progress, required multiple attempts,
or exposed a non-obvious root cause.

## Entry Template

### YYYY-MM-DD - Problem title

- Problem:
- Context:
- Symptoms:
- Attempts that failed:
  - attempt 1
  - attempt 2
- Root cause:
- Winning fix:
- Why this fix works:
- Validation:
- Residual risk:
- Reusable rule:

## Current Open Problems

- None recorded yet.

## Recent Resolutions

- 2026-03-08 — Keyword analysis empty dataset on sqlite binary mismatch
  - Problem: Keywords tab showed empty JD results despite existing cache data
    on certain environments.
  - Context: the keyword analysis engine uses sqlite3 for dataset management.
  - Symptoms: silent zero-item core rebuilds when sqlite binary path differed
    from runtime expectations.
  - Attempts that failed: hardcoding sqlite paths per environment.
  - Root cause: `SQLITE_BIN` environment variable was not set, or the system
    sqlite binary path differed from the one the engine expected.
  - Winning fix: documented the `SQLITE_BIN` environment variable requirement
    in README and exposed it as a configurable setting.
  - Why this fix works: users can now set `SQLITE_BIN` before starting the
    web app, matching their runtime environment.
  - Validation: set `SQLITE_BIN` to the correct path, restart web app, keyword
    data appears correctly.
  - Residual risk: users who skip setting `SQLITE_BIN` will still encounter
    the issue.
  - Reusable rule: when a tool depends on a system binary, make the binary
    path configurable and document it prominently.

- 2026-03-08 — Language variant auto-resolution with iteration id format
  - Problem: language variant detection failed for CV ids that included an
    iteration number between language and target.
  - Context: CV variant ids can use either `cv_<lang>_<target>` or
    `cv_<lang>_<iteration>_<target>` format.
  - Symptoms: translation flows and language sync couldn't find variants with
    the iteration format.
  - Attempts that failed: requiring a strict single format for all CV ids.
  - Root cause: the auto-resolution parser assumed a fixed number of segments
    in the CV id.
  - Winning fix: made the parser accept both formats, treating extra segments
    as iteration identifiers.
  - Validation: both id formats now work correctly in translation and sync
    flows.
  - Residual risk: none.
  - Reusable rule: accept both minimal and extended identifier formats to
    avoid breaking existing data when schemas evolve.
