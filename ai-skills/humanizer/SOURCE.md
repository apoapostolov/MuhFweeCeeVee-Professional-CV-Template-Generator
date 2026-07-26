# Humanizer — product vendored copy

- Upstream: https://github.com/apoapostolov/humanizer
- Install path in upstream: `skills/humanizer/`
- Vendored into MuhFweeCeeVee: `ai-skills/humanizer/`
- Purpose here: second-pass rewrite of AI cover letters (and manual Humanize)

Refresh from upstream when the skill meaningfully improves:

```bash
# from repo root (example)
git clone --depth 1 https://github.com/apoapostolov/humanizer /tmp/humanizer
cp /tmp/humanizer/skills/humanizer/SKILL.md ai-skills/humanizer/
cp /tmp/humanizer/skills/humanizer/references/humanizing-text.md ai-skills/humanizer/references/
# keep product overlays (cover-letter.md, SOURCE.md, manifest hooks)
```

Do not strip attribution from `SKILL.md`. Product-only files (`cover-letter.md`,
this `SOURCE.md`) stay in this tree.
