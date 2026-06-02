# TODO — MuhFweeCeeVee

This template is optimized for a planner plus executor workflow. Each `TODO.md`
should usually represent **one active epic**. Copy this file to `TODO.md` when
starting a new epic; keep the working rules section intact.

## Current Focus

- epic name and one-sentence mission
- explicit canonical file or system owner (for example `apps/web/src/app/ComposerClient.tsx`)

## Scope and Boundaries

- what this pass owns
- what this pass explicitly does not own

## Active Prompt Queue

Start active entries at `Prompt 1`. Add `Prompt 1A`, `Prompt 1B`, etc. only when
a single deliverable needs to be split without hiding partial completion.

## Working Rules

- **Execution-ready:** every active prompt must be runnable without hidden planner
  context.
- **Prompt completeness:** state canonical inputs, expected outputs, validation,
  and constraints. Avoid vague prompts without acceptance criteria.
- **One epic per file:** split unrelated epics into separate TODO files.
- **Prompt growth:** add prompts or sub-prompts when execution reveals missing work.
- **Constant pushing:** continue to the next clear prompt unless blocked or the
  user must decide.
- **Subagents:** propose when work parallelizes safely; default 1 coordinator +
  1–3 workers (max ~4). See
  [`skills/patterns/subagent-delegation/SKILL.md`](skills/patterns/subagent-delegation/SKILL.md).
- **Canonical sources:** CV YAML in `data/cvs/`, templates in `templates/`, API in
  `apps/web/src/app/api/`, keywords in `keywords/`.
- **Derived artifacts:** regenerate per [`GENERATED_FILES.md`](GENERATED_FILES.md).
- **Privacy:** never commit private CVs, photos, or API keys.
- **Markdown:** run `npm run lint:md:fix <file>` after editing docs. See
  [`MARKDOWN_LINT.md`](MARKDOWN_LINT.md).

## Decision Log

- YYYY-MM-DD: important scope or design decision

## Risks and Blockers

- open risk
- explicit blocker if present

## Template — New Epic Block

```md
### [ ] Prompt 1 — <goal>

Short prompt description.

Context:

- canonical files, systems, and assumptions

Inputs:

- exact files, commands, or upstream prompts to inspect

Outputs:

- expected file or system result

Validation:

- `npm run check`, `npm run test:keywords`, manual Print Room check, etc.

Delegation notes:

- constraints and non-goals for executors
```
