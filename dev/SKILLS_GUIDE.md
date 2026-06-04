# Skills Guide — MuhFweeCeeVee

Skills are the AI's long-term memory for reusable knowledge about this project.
The agent must actively capture skills during development and research.

## When to Write a Skill

Write a skill whenever you encounter information that will save time in future
sessions.

Write a skill when:

- You research an external API and learn its authentication flow, rate limits,
  or undocumented behavior (OpenRouter, OpenAI, etc.).
- You discover a reusable code pattern for CV rendering, YAML manipulation,
  or template processing.
- The user approves or rejects a design choice (button style, layout preference,
  emoji usage, color palette).
- You solve a hard problem that took multiple attempts.
- You find a workaround for a tool, library, or framework bug.
- You learn a project-specific convention not yet documented.
- You debug a dev-server quirk (Next.js HMR, Python venv, sqlite binary paths).
- You optimize a workflow (build scripts, template rendering, PDF export).

Do not write a skill for:

- One-off facts that will change next session.
- Information already in project docs.
- Generic programming knowledge the model already has.

## Skill Categories

| Category | Folder | Examples |
|----------|--------|----------|
| **API Knowledge** | `skills/api/` | OpenRouter auth flow, model selection, rate limits |
| **Code Snippets** | `skills/snippets/` | CV YAML validation pattern, template rendering helper |
| **User Preferences** | `skills/preferences/` | Design choices, approved UX patterns, emoji palette |
| **Tools & Workflows** | `skills/tools/` | Next.js dev server quirks, PDF export debugging |
| **Patterns & Arch** | `skills/patterns/` | CV variant workflow, language sync pattern |
| **Gotchas** | `skills/gotchas/` | sqlite binary path on Windows, Python venv path gotchas |

## Skill Format (SKILL.md)

Skills follow a strict file layout so they can be automatically discovered.

### Directory Structure

```text
skills/<category>/<skill-name>/SKILL.md
```

Examples:

- `skills/patterns/cv-variant-workflow/SKILL.md`
- `skills/api/openrouter-auth/SKILL.md`
- `skills/gotchas/sqlite-binary-path/SKILL.md`

**Never** put skills directly as flat `.md` files.

### Required Frontmatter

Every `SKILL.md` **must** start with this YAML block:

```yaml
---
name: cv-variant-workflow
description: |
  Use when working with CV language variants, translation flows,
  or sync operations between language pairs.
---
```

### Content Structure

After the frontmatter:

```markdown
# Human Readable Title

[Main content here]
```

A good skill typically includes:

- Clear **Core Rules** or principles
- **When to use / When not to use** guidance
- Concrete **templates**, **workflows**, or **checklists**
- **Common failure modes** (very valuable)
- Links to related files or other skills

## Active Mining Rule

While developing or researching, **constantly ask**: *"Will I or another agent
need this information again?"* If yes, draft a skill immediately while the
context is fresh.

Examples of mining in action:

- *"OpenRouter returns `code: 401` in a JSON body while HTTP status is 200"*
  → create `skills/api/openrouter-error-format/SKILL.md`
- *"User prefers compact summary metadata in collapsed form sections"*
  → create `skills/preferences/form-layout/SKILL.md`
- *"sqlite3 binary path differs between dev and prod environments"*
  → create `skills/gotchas/sqlite-binary-path/SKILL.md`
- *"Next.js keeps showing stale CV data after a YAML edit"*
  → create `skills/tools/nextjs-stale-cv/SKILL.md`

## Promotion Pathway

```text
Project skills/ -> (if generally useful) -> Global .agents/skills/
```

Skills are created inside the project under `skills/<category>/<skill-slug>/SKILL.md`.
When a skill proves useful across many projects, copy the entire folder to a
global location.

## Cross-References

- `AGENTS.md` — Learning Artifacts section
- `HARD_PROBLEMS.md` — Problems that took multiple attempts
- `VIBECHECK.md` — User preferences discovered through interactions
