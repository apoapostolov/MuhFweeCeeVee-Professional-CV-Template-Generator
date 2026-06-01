# SELF REVIEW — MuhFweeCeeVee

Running journal of mistaken approaches, better defaults, and reusable lessons
learned during implementation work.

## Review Template

### YYYY-MM-DD - Review title

- Task:
- Mistake:
- What I missed:
- Better approach:
- Signals it was wrong:
- Validation:
- Reusable rule:
- Related files:

## Recurring Mistakes

- None recorded yet.

## Reliable Heuristics

- None recorded yet.

## Process Upgrades

- 2026-03-08 — Privacy isolation for personal CV data
  - Why: personal CVs, photos, and local company metadata were at risk of
    accidental git commits.
  - Result: comprehensive `.gitignore` exclusions for personal/private
    artifacts; public repo carries only fictional sample data.
  - Reusable rule: set up privacy exclusions early in a CV tool's lifecycle;
    retrofitting is harder.

- 2026-03-08 — Target metadata belongs outside CV YAML
  - Why: embedding company-targeting metadata in CV files made them less
    portable and risked leaking employer info.
  - Result: company metadata moved to dedicated files; CVs stay reusable
    across job applications.
  - Reusable rule: separate reusable content from transient targeting data.
