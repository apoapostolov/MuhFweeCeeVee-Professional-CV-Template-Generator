# AGENTS.md — MuhFweeCeeVee Development Operating Contract

## Purpose

This file defines the operating contract for AI-assisted development on
MuhFweeCeeVee. It is adapted from the shared defaults in
`/mnt/c/git/defaults` and extended with product-specific stack, validation, and
privacy rules.

## Source Hierarchy

Use this order when instructions conflict:

1. explicit user instruction in the current session
2. this `AGENTS.md` file
3. project `README.md`, `TODO.md`, `DEVELOPMENT_PLAN.md`, `DEVELOPMENT_LOG.md`,
   and `CHANGELOG.md`
4. `docs/` specifications (`docs/API.md`, `docs/CV_YAML_STANDARD.md`, etc.)
5. surrounding code and documentation patterns
6. shared defaults in `/mnt/c/git/defaults` when refreshing templates only
7. external best practices only after local practice is understood

If a user instruction conflicts with a durable repository rule, ask which rule
to override only when the conflict affects safety, privacy, public visibility,
or an irreversible state change. Otherwise follow the user instruction and note
the tradeoff in the development log if needed.

## Operating Principles

- Keep canonical files authoritative.
- Regenerate derived files instead of hand-editing generated output. See
  [`GENERATED_FILES.md`](GENERATED_FILES.md).
- Keep sensitive data out of docs, prompts, public repos, and changelogs.
- Use absolute dates in logs, release notes, and decision records.
- Prefer explicit file paths, commands, output paths, and validation checks.
- Keep one clear home per workflow.
- Archive useful historical context instead of deleting it.
- Do not leave planning labels in source comments or user-facing UI text.
- Write comments to explain technical intent, not project-management state.

## Project Stack

| Area | Location | Notes |
|------|----------|-------|
| Web app | `apps/web/` | Next.js 16 App Router, TypeScript, Tailwind |
| Shared schemas | `packages/schemas/` | CV validation, scoring constants |
| Render (planned) | `packages/render-core/` | Placeholder; live rendering in `renderCvTemplate.ts` |
| MCP wrapper | `packages/mcp-wrapper/` | stdio server over `/api/*` |
| Parser | `services/parser/` | FastAPI scaffold on `:8001` |
| Keywords | `keywords/` | Python analysis engine + pytest |
| Templates | `templates/` | YAML template definitions |
| Sample data | `data/cvs/`, `data/template_mappings/` | Public sample only in git |

**Package manager:** npm workspaces (monorepo root).

## Learning Artifacts

- [`HARD_PROBLEMS.md`](HARD_PROBLEMS.md) — recurring blockers and root causes.
- [`SELF_REVIEW.md`](SELF_REVIEW.md) — mistaken approaches and better defaults.
- [`skills/`](skills/) — repeatable techniques (see [`SKILLS_GUIDE.md`](SKILLS_GUIDE.md)).
- [`VIBECHECK.md`](VIBECHECK.md) — developer interaction profile (read at session
  start when working with the same user).
- [`AGENT_ISSUES.md`](AGENT_ISSUES.md) — subagent/coordination failures (not user
  interaction patterns).

After non-trivial work, ask: *"Will another agent need this again?"* If yes,
write or update a skill while context is fresh.

## Standard Work Loop

### 1. Orient

- Read this `AGENTS.md` and [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md)
  when unsure where a rule lives.
- Identify canonical source files for the subsystem being changed.
- Inspect `TODO.md`, `DEVELOPMENT_PLAN.md`, `DEVELOPMENT_LOG.md`, and
  `CHANGELOG.md` before changing behavior.
- Check the working tree and avoid touching unrelated user changes.
- Start the dev server before code changes. See
  [`DEV_SERVER_WORKFLOW.md`](DEV_SERVER_WORKFLOW.md).

```bash
npm run dev                    # Next.js, default port 3000
npm run dev --workspace @muhfweeceevee/web -- -p 3005   # custom port
npm run dev:parser             # optional FastAPI on 8001
```

### 2. Plan at the Right Level

- Use `TODO.md` for executable work queues (copy structure from
  [`TODO_TEMPLATE.md`](TODO_TEMPLATE.md)).
- Put design specs, architecture notes, and API contracts in `docs/`.
- Keep each TODO file focused on one active epic.
- Write prompts so a capable executor can run them without hidden planner
  context: context, inputs, outputs, validation, constraints, stop conditions.
- For large parallel work, use
  [`skills/patterns/subagent-delegation/SKILL.md`](skills/patterns/subagent-delegation/SKILL.md).
  Default: 1 coordinator + 1–3 workers; max ~4 agents unless the user approves more.

### 2a. Maintain the Plan

- [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) — forward-looking execution map.
- Update when scope, sequencing, or ownership changes.

### 2b. Maintain the Learning Base

- Add or update `skills/` notes for repeatable wins or failures.
- Update `HARD_PROBLEMS.md` when a problem stumps the team multiple times.
- Update `SELF_REVIEW.md` when a mistake is worth preserving.

### 3. Execute

- Follow [`PROJECT_CONVENTIONS.md`](PROJECT_CONVENTIONS.md) before new patterns.
- Keep edits scoped to the request.
- Run `npm run bootstrap` after dependency changes.
- Do not revert another agent's or user's changes unless explicitly asked.

### 3a. Test

- **Python:** `npm run test:keywords` or `cd keywords && python3 -m pytest tests/`
- **Web:** `npm run check` (`eslint` + `tsc --noEmit`)
- **Significant features:** add or extend tests; today the web app has no automated
  tests — record that gap in the development log when shipping without coverage.
- Run tests before declaring done.

### 4. Validate

- Run the narrowest relevant check first.
- Node `>= 22`, Python `3.12.x` for parser/keywords.
- Restart dev servers after code changes per `DEV_SERVER_WORKFLOW.md`.
- PDF export: confirm Playwright can launch and `/api/export/pdf` returns bytes.
- Keywords: set `SQLITE_BIN` when JD cache appears empty (see `HARD_PROBLEMS.md`).

### 5. Record

- Update `DEVELOPMENT_PLAN.md`, `DEVELOPMENT_LOG.md`, `TODO.md` as applicable.
- Update `CHANGELOG.md` only for user-visible changes per
  [`CHANGELOG_GUIDE.md`](CHANGELOG_GUIDE.md).
- Sync `docs/API.md` when API routes change.

## When to Ask the User

Ask before acting when the choice changes scope, risk, cost, privacy, or public
visibility.

Ask for approval before:

- publishing or promoting public-facing content
- deleting audit-relevant records
- changing secrets, billing, or OpenRouter configuration irreversibly
- exposing new personal CV paths or company metadata in git
- spending significant OpenRouter credits on batch analysis
- force-push, tag moves, or history rewrite

Do not ask before:

- documented validation (`npm run check`, pytest)
- restarting local dev services per workflow
- small fixes that directly implement the request

## Commit and Push Flow

Do not commit or push unless the user asks, project policy requires it, or the
task is explicitly release/sync work.

When committing:

- Keep commits atomic; use conventional prefixes (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`).
- Never commit `.env`, private CV YAML, `photos/`, or personal company JSON.
- Never commit CV YAML or history whose **path** contains `Apostol` or `ApoApostolov`
  (any casing), or whose `metadata.internal_name` is **Apostol Apostolov CV** (any
  version suffix). The public repo keeps only fictional samples (e.g.
  `data/cvs/cv_en_john_doe.yaml`). See `.gitignore` name patterns.
- Commit source + regenerated lockfile together when `package.json` changes.

## Changelog Governance

See [`CHANGELOG_GUIDE.md`](CHANGELOG_GUIDE.md). Skeleton for new releases:
[`CHANGELOG_TEMPLATE.md`](CHANGELOG_TEMPLATE.md).

Summary:

- **Overwrite** unreleased bullets; do not append duplicate feature lines.
- Unreleased work uses `Added` only until release.
- Pre-release fixes on unreleased features get no changelog entry.

## TODO Hygiene

- `TODO.md` is the active execution queue when in use.
- Specs and rationale belong in `docs/`, linked from TODO.
- Remove completed prompt sections when nothing actionable remains.
- See [`TODO_TEMPLATE.md`](TODO_TEMPLATE.md) for prompt structure and working rules.

## Documentation Quality

- Use exact paths and commands.
- Run `npm run lint:md` (or `npm run lint:md:fix`) after editing markdown. See
  [`MARKDOWN_LINT.md`](MARKDOWN_LINT.md).
- Naming and layout: [`PROJECT_CONVENTIONS.md`](PROJECT_CONVENTIONS.md).

## Public Repository Safety

Before push or public sync:

- Confirm no API keys, private CVs, photos, or `companies.personal.json` in the
  index.
- Confirm only fictional sample data (`cv_en_john_doe.yaml`) is tracked — no paths
  matching `*Apostol*` / `*ApoApostolov*` (case-insensitive) and no **Apostol
  Apostolov CV** internal names.
- Review [`SECURITY.md`](SECURITY.md).

## Dependency and Runtime Changes

When dependencies change:

- Update manifests and lockfiles; run `npm run bootstrap`.
- Update `README.md` / `CONTRIBUTING.md` if install steps change.
- Record validation in `DEVELOPMENT_LOG.md`.
- Changelog only for user-visible behavior changes.

## Subagent and Delegation Flow

Use subagents only when phases are separable and parallel work saves time. The
main agent owns integration and quality.

- Full rules: [`skills/patterns/subagent-delegation/SKILL.md`](skills/patterns/subagent-delegation/SKILL.md)
- Failures: [`AGENT_ISSUES.md`](AGENT_ISSUES.md)
- User delegation preferences: [`VIBECHECK.md`](VIBECHECK.md)

## Definition of Done

A task is done only when:

- behavior or docs exist in the correct canonical location
- generated artifacts are regenerated or marked N/A
- `npm run check` and relevant pytest pass, or gaps are documented
- TODO, development log, and changelog are synchronized where applicable
- public/private boundaries were checked
- the response lists what changed and what was validated

## Related Documentation

See [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) for the full map
of templates, checklists, and product specs.
