# Product AI skills

Runtime skills for MuhFweeCeeVee. Unlike `skills/patterns/` (agent/dev guidance),
these files are **loaded by the web server** and injected into model prompts or
used as a second-pass fix on AI output.

## Layout

```text
ai-skills/
  manifest.json          # registry: id, hooks, files per use-case
  README.md
  <skill-id>/
    SKILL.md             # core instructions
    SOURCE.md            # provenance / license / pin
    cover-letter.md      # optional product overlay (cover letters)
    references/          # deeper guidance when a hook requests it
```

## Current skills

| id | Use |
|----|-----|
| `humanizer` | Cover letter AI draft post-process + manual **Humanize** action |

Source: [apoapostolov/humanizer](https://github.com/apoapostolov/humanizer).

## Hooks

Hooks are named product events (see `manifest.json`):

| Hook | When |
|------|------|
| `cover_letter_draft` | After cheap AI cover-letter draft |
| `cover_letter_humanize` | User clicks **Humanize** on an existing body |

`mode: postprocess` = second model call that rewrites the draft using the skill
text as system guidance. Future skills may use `inject` (append to the first-pass
system prompt only).

## Adding a skill

1. Create `ai-skills/<id>/` with `SKILL.md` (+ `SOURCE.md`).
2. Register it in `manifest.json` with `hooks` pointing at product events.
3. Call `loadAiSkillForHook(hook)` / `applyAiSkillPostprocess(...)` from the route.
4. Keep default file bundles small enough for analysis-model context.

## API

- `GET /api/ai-skills` — list enabled skills and hooks (no skill body text).
