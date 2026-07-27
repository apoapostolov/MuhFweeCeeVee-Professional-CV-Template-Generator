# Dev Server Workflow — MuhFweeCeeVee

Development-server lifecycle for this monorepo (Next.js Turbopack + optional
FastAPI parser). Ensures the user and AI never work against stale in-memory
state.

Referenced from [`AGENTS.md`](AGENTS.md#standard-work-loop).

## Core Rules

### Always Start a Dev Server

After orienting (`AGENTS.md`, `TODO.md`, etc.) and before editing application
code, start the web dev server:

```bash
npm run dev
# Custom port (example):
npm run dev --workspace @muhfweeceevee/web -- -p 3005
```

Optional parser (second terminal):

```bash
npm run dev:parser
```

Do not run `npm run build` during active feature development.

### Two Services

| Service | Command | Default port | Tech |
|---------|---------|--------------|------|
| Web app | `npm run dev` | `3000` | Next.js 16 (Turbopack HMR) |
| Parser | `npm run dev:parser` | `8001` | FastAPI + uvicorn reload |

The parser is optional for most UI work; PDF export and some analysis paths use
the web app and Playwright directly.

### Restart After Every Development Prompt

A **development prompt** modifies source, styles, templates, or build config.

At the end of each development prompt, restart the affected dev server:

```bash
# Ctrl+C in the server terminal, then:
npm run dev
```

Do not skip restart because "nothing visible changed." Next.js may retain stale
module graphs or `.next` cache entries.

### Stale UI Recovery (Next.js)

If the UI still looks wrong after restart, follow
[`skills/tools/next-dev-workflow/SKILL.md`](../skills/tools/next-dev-workflow/SKILL.md):

1. Confirm the browser URL uses the live dev port (not an old tab or `npm start`
   production port).
2. Hard refresh (Ctrl+Shift+R).
3. Delete `apps/web/.next/` and restart `npm run dev`.
4. Clear browser storage used by the composer (local selections, panel state).
5. Re-open the changed route directly.

**Not applicable:** Vite `node_modules/.vite` cache (this project does not use Vite).

### What Is Not a Development Prompt

No restart required for:

- **Audit** — read-only code/doc review
- **Plan** — TODO, design docs, specifications
- **Check** — logs, diagnostics
- **Docs-only** — `AGENTS.md`, `CHANGELOG.md`, `docs/*.md` without app code

Mixed prompts (plan + code) require restart after the code portion.

### Do Not Build for Production Prematurely

Run `npm run build` only when the user requests release prep, production preview,
or an explicit ship task.

## Quick Reference

| Trigger | Action |
|---------|--------|
| After orient, before coding | `npm run dev` (and parser if needed) |
| After code-modifying prompt | Restart web and/or parser |
| Audit / plan / docs only | No restart |
| Stale UI after restart | Next dev workflow skill + clear `.next/` |
| Release / ship | `npm run build`, then `npm run start` or deploy units |
