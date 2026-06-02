# Contributing to MuhFweeCeeVee

Thank you for considering contributing! This project is a self-hosted,
local-first CV composer, and contributions should respect its privacy-first
and keep-it-simple philosophy.

## Quick Start

```bash
# Clone the repo
git clone <repo-url>
cd MuhFweeCeeVee-Professional-CV-Template-Generator

# Install all dependencies (npm workspaces)
npm run bootstrap

# Start the web dev server
npm run dev

# (Optional) Start the parser service in a second terminal
npm run dev:parser
```

## Development Workflow

### Prerequisites

- Node.js `>= 22`
- npm `>= 10`
- Python `3.12.x` (for parser service)

### Code Quality

```bash
# Lint and typecheck (TypeScript web app)
npm run lint
npm run typecheck
npm run check

# Python keyword engine tests
npm run test:keywords

# Markdown docs (after editing *.md)
npm run lint:md
npm run lint:md:fix
```

### Agent and Process Docs

Contributors and AI agents should read
[`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) for the full map of
`AGENTS.md`, checklists, templates, and skills. Operating rules live in
[`AGENTS.md`](AGENTS.md).

### Project Structure

```text
apps/web/          — Next.js web application (App Router)
packages/schemas/  — Shared CV schema and scoring constants
packages/render-core/ — Shared rendering primitives
packages/mcp-wrapper/ — MCP stdio server wrapper
services/parser/   — FastAPI parser service (Python)
templates/         — YAML template definitions (cambridge-v1, edinburgh-v1, etc.)
data/              — Sample CV data and template mappings
keywords/          — Python keyword analysis engine
docs/              — Project documentation
```

### Making Changes

1. **Plan first** — Check `TODO.md` and `DEVELOPMENT_PLAN.md` for active work.
2. **Keep changes scoped** — One feature or fix per branch.
3. **Update the changelog** — User-visible changes go in `CHANGELOG.md`.
4. **Test** — Run relevant tests before opening a PR.
5. **Respect privacy boundaries** — Never commit real personal CV data, API
   keys, or private company metadata. The `.gitignore` is configured to help
   with this.

## Pull Request Guidelines

- Keep PRs focused on a single concern.
- Write a clear description of what changed and why.
- Reference any related TODO or issue.
- Confirm that privacy exclusions in `.gitignore` are respected.
- Update docs (`docs/`) if the change affects API surface or workflows.

## Changelog Rules

- See [`CHANGELOG_GUIDE.md`](CHANGELOG_GUIDE.md) for the overwrite-first
  principle, writing style, and category rules.
- Only user-visible changes get entries. Internal refactors, tests, and linting
  do not.

## Code of Conduct

Be respectful and constructive. This is a small project built for practical
use — keep discussions focused on the code and the problem at hand.

## License

By contributing, you agree that your contributions will be licensed under the
MIT License (see [`LICENSE`](LICENSE)).
