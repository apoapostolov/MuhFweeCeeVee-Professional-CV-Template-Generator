# TODO Template — MuhFweeCeeVee

Reference template for TODO.md structure. Use this format when starting a new
epic in `TODO.md`.

```md
# TODO — <Epic Name>

## Current Focus

- epic name and one-sentence mission
- explicit canonical file or system owner

## Scope and Boundaries

- what this pass owns
- what this pass explicitly does not own

## Active Prompt Queue

### [ ] Prompt 1 — <goal>

Short prompt description.

Context:

- canonical files, systems, and assumptions this prompt depends on

Inputs:

- exact files, commands, or upstream prompts to inspect before acting

Outputs:

- expected file or system result

Validation:

- tests, lint, preview commands, or manual checks

Delegation notes:

- constraints, non-goals, and implementation guidance needed for a cheaper
  executor to finish safely

### [ ] Prompt 1A — <sub-goal>

Use sub-prompts when a prompt needs to be split without hiding partial
completion.

Dependencies:

- parent prompt or upstream prerequisite if applicable

Completed output:

- concrete finished deliverable

## Decision Log

- YYYY-MM-DD: important scope or design decision

## Risks and Blockers

- open risk
- explicit blocker if present
```

## Working Rules

- Execution-ready rule: every active prompt must be documented so a capable,
  lower-cost executor can perform the work without relying on hidden planner
  context.
- Prompt completeness rule: prompts should state canonical inputs, expected
  outputs, validation, and constraints.
- One-epic-per-file rule: treat `Current Focus` as the active epic for this
  file.
- Prompt granularity rule: add a new top-level prompt when the work introduces
  a materially different deliverable, validation path, or ownership boundary.
- Cleanup rule: when asked to clean this file, remove completed prompt dumps
  from the active TODO instead of preserving them.
- Removal rule: if the user says to remove prompts, tasks, or completed items
  from this file, delete them outright.
