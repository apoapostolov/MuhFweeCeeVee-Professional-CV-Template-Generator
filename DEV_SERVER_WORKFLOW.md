# Dev Server Workflow — MuhFweeCeeVee

This document defines the development-server lifecycle for this monorepo.
The goal is to ensure the user (and the AI) never work against stale in-memory
state during active development sessions.

## Core Rules

### Always Start a Dev Server

After orienting (reading `AGENTS.md`, `TODO.md`, etc.) but before writing any
code, start the project's development server.

```bash
# Start Next.js dev server (primary)
npm run dev

# (Optional) Start the parser service in a second terminal
npm run dev:parser
```

Do not start a production build during active development. Use the dev server
so that file changes appear quickly without a full rebuild cycle.

### Understanding the Two Services

| Service | Command | Port | Tech |
|---------|---------|------|------|
| Web app | `npm run dev` | `:3000` | Next.js (HMR) |
| Parser | `npm run dev:parser` | `:8001` | FastAPI (uvicorn, auto-reload) |

The parser service is optional. The web app can function without it, but some
workflows (PDF rendering, certain analysis features) depend on it.

### Restart After Every Development Prompt

A **development prompt** is any prompt that modifies code files — additions,
edits, refactors, renames, or deletions of source, styles, templates, or
configuration.

At the **end** of every development prompt, restart the relevant dev server:

```bash
# Kill the running server (Ctrl+C in its terminal), then restart:
npm run dev
```

Do **not** skip the restart because "nothing visible changed." Next.js may
have cached module state, resolved paths, compiled artifacts, or plugin data
that no longer matches the filesystem. A clean restart guarantees the user sees
the actual result of the changes.

If the UI still looks stale after the restart:

1. Confirm the page is on the live dev port (`:3000`), not a static build.
2. Hard refresh the browser (Ctrl+Shift+R).
3. Clear Next.js cache: delete `apps/web/.next/` and restart.
4. Clear any app-local storage that can restore old UI state.

### What Is Not a Development Prompt

These prompt types do **not** require a server restart:

- **Audit prompts** — reading files, analyzing structure, reviewing code
- **Plan prompts** — writing TODO entries, design docs, specifications
- **Check prompts** — verifying output, confirming diagnostics, reading logs
- **Config-scope prompts** — changing only `AGENTS.md`, `README.md`,
  `CHANGELOG.md`, `TODO.md`, or similar non-build documentation

If a prompt mixed planning with code changes, it is a development prompt —
restart after completing it.

### Do Not Build for Production Prematurely

Do **not** run `npm run build` during active development unless the user
explicitly requests it for:

- commit and push of a release candidate
- tag creation or release preparation
- preview of the final production bundle

## Quick Reference

| Trigger | Action |
|---------|--------|
| After orient, before coding | `npm run dev` |
| After every code-modifying prompt | Kill old server → restart |
| Non-code prompts (audit, plan, docs) | No action needed |
| User says "commit and push" or "release" | `npm run build` first, then ship |
| User says "preview production build" | `npm run build` + `npm run start` |
| UI looks stale after restart | Hard refresh → clear `.next/` → restart |
| Parser changes needed | Restart parser in its terminal |
