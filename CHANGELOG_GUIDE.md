# Changelog Guide

`CHANGELOG.md` is for power users, not developers.

The reader is assumed to understand the product well, but not the codebase.
Write about what they can now do, what changed in behavior, what got fixed, and
what was removed.

## Template

The project's `CHANGELOG.md` follows Keep a Changelog format with Semantic
Versioning. The expected shape:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [1.0.2] - 2026-03-08

### Added
- ...
```

## Overwrite-First Principle

The default action when editing the `Unreleased` section is to **overwrite** an
existing entry, not to append a new one. Treat each user-visible change as a
single living bullet that gets refined until the feature ships.

Apply this priority when deciding whether to overwrite or add:

1. **Same behavior, same entry** — If the `Unreleased` section already has a
   bullet describing the same user-facing behavior, overwrite that bullet with
   the refined description.
2. **Same feature, extended scope** — If the new work extends, refines, or fixes
   a feature that already has an unreleased entry, merge the new information
   into the existing `Added` bullet. The feature stays under `Added` only — the
   user has never seen it, so there is nothing to "change" from their
   perspective.
3. **Same feature, pre-release bug fix** — If the new work fixes a bug in a
   feature that has not shipped yet, **do not add any changelog entry**. The
   user has never encountered this bug and never needs to know about it.
4. **Disjoint behavior** — Only add a new bullet when the change introduces
   independent, disjoint user-visible behavior with no existing representation
   in the `Unreleased` section.
5. **When in doubt** — Add a new bullet and merge during release curation.

## Changelog Scope

Add entries for:

- new user workflows (tabs, editors, analysis features)
- visible behavior changes (template rendering, preview, export)
- fixed bugs users could notice
- import/export format changes (YAML schema, PDF output)
- settings, compatibility, migration, or deployment changes that affect usage
- performance or reliability improvements users can feel
- security or privacy changes with user-facing impact
- template additions or significant template changes

Do not add entries for:

- internal refactors
- tests
- code comments
- linting
- build metadata
- agent instruction changes
- README-only edits
- development log updates
- changes to features that have not shipped yet, unless they alter the
  upcoming release description
- bugs or bug fixes in features that have not shipped yet

## Changelog Categories

- `Added`: new capabilities or workflows
- `Changed`: changed behavior users already had
- `Fixed`: defects in previously released behavior
- `Removed`: removed capabilities or compatibility
- `Security`: user-facing security or privacy fixes, if relevant

## Changelog Writing Style

- **Assume a power-user reader.** Write for someone who understands CV workflow
  well but not the codebase. They know what they want to do; tell them whether
  this release helps them do it.
- **Lead with the user-visible result.** Describe what the user can now see, do,
  or control.
- **Use a soft marketing tone.** Write to excite — emphasize capability,
  convenience, and outcome.
- **Frontend > backend in detail.** User-facing features get detailed,
  capability-oriented prose. Backend fixes get one-line technical descriptions
  under `Fixed`.
- **Prefer one strong bullet over several thin bullets.** Merge related
  capabilities into a single statement rather than scattering them.
- **Include important constraints, defaults, and migration notes** when they
  affect how the feature works (e.g., "OpenRouter key is stored in `.env`").
- **Avoid implementation names** (library, class, internal module) unless the
  user has to interact with them.
- **Avoid commit-message language** like "refactor", "wire up", "plumb",
  "cleanup", or "fix edge case" unless the product behavior is named.

**Good — user-facing feature with power-user tone:**

> Added a reusable Photo Booth workflow with drag-and-drop upload, per-image
> approval, and dedicated AI photo analysis actions. Now you can compare
> multiple profile photos side by side with ranked AI recommendations before
> choosing the best one for your CV.

**Good — backend fix, brief and technical:**

> Fixed an issue where keyword analysis returned empty results when the sqlite
> binary path differed from the runtime environment, preventing silent zero-item
> core rebuilds.

**Bad:**

> Added API endpoint and UI state for photo comparison.
