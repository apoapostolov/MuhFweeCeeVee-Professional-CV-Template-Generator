# Markdown Lint — MuhFweeCeeVee

This project uses [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2)
for consistent markdown quality across documentation.

## Quick Commands

```sh
# Check everything
npx -y markdownlint-cli2 "**/*.md" --ignore node_modules --ignore .git

# Auto-fix what can be fixed
npx -y markdownlint-cli2 --fix "**/*.md" --ignore node_modules --ignore .git
```

## Configuration

The rules for this repo are defined in [`.markdownlint.json`](.markdownlint.json).

We deliberately relax several notoriously noisy rules while keeping the ones
that actually improve readability and maintainability.

## Commonly Annoying Rules (and How We Handle Them)

### MD013 — line-length

**Default:** 80 characters. Extremely painful for technical prose.

**Our setting:**
- `line_length`: 120
- `code_blocks`: false
- `tables`: false
- `headings`: false

### Table Formatting Rules (MD055, MD056, MD058, MD060)

These rules are obsessively strict about table alignment and spacing.

**Our recommendation:** Disabled. Tables in project documentation and templates
should stay readable during editing, not fight the author.

### Other Rules

| Rule | Trigger | Our Setting |
|------|---------|-------------|
| **MD024** (no-duplicate-headings) | Repeated "Notes" sections | `siblings_only: true` |
| **MD041** (first line must be heading) | Template files, changelog fragments | Disabled |
| **MD033** (inline HTML) | Mermaid diagrams, image alignment | Disabled |

## Adding Enforcement

Run markdown lint after editing any markdown file in this project:

```sh
npx -y markdownlint-cli2 --fix "**/*.md" --ignore node_modules --ignore .git
```
