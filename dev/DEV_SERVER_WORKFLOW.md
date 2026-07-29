# Dev Server Workflow — MuhFweeCeeVee

Development-server lifecycle for this monorepo (Next.js webpack + optional
FastAPI parser). The primary web host is native Windows because the repository
lives on `C:\`; this avoids WSL DrvFS polling and cross-platform native-module
churn.

Referenced from [`AGENTS.md`](../AGENTS.md#standard-work-loop).

## Core Rules

### Always Start a Dev Server

After orienting (`AGENTS.md`, `TODO.md`, etc.) and before editing application
code, start the Windows-native web dev server:

```powershell
npx playwright install chromium  # first setup only; required for PDF export
npm run dev:windows:start
```

The tracked background process listens at `http://127.0.0.1:10004`. For an
interactive foreground terminal, use:

```powershell
npm run dev
```

Optional WSL fallback (polling is required for `/mnt/c`):

```bash
npm run dev:wsl
```

Optional parser in WSL:

```bash
npm run dev:parser
```

Do not run `npm run build` during active feature development.

### Two Services

| Service | Command | Default port | Tech |
|---------|---------|--------------|------|
| Web app | `npm run dev:windows:start` | `10004` | Next.js 16 webpack HMR on Windows |
| Parser | `npm run dev:parser` | `8001` | FastAPI + uvicorn reload |

The parser is optional for most UI work; PDF export and some analysis paths use
the web app and Playwright directly.

### Restart After Every Development Prompt

A **development prompt** modifies source, styles, templates, or build config.

At the end of each development prompt, restart the Windows dev server:

```powershell
npm run dev:windows:restart
```

Do not skip restart because “nothing visible changed.” Next.js may retain stale
module graphs or `.next` cache entries.

Use `npm run dev:windows:stop` to stop only the process recorded by the
repository launcher. It refuses to kill an untracked process occupying the
port.

### Stale UI Recovery (Next.js)

If the UI still looks wrong after restart:

1. Confirm the browser uses `http://127.0.0.1:10004`.
2. Hard refresh with Ctrl+Shift+R.
3. Stop the server, delete `apps/web/.next/`, and start it again.
4. Clear browser storage used by the composer if persisted selections are stale.
5. Re-open the changed route directly.

**Not applicable:** Vite `node_modules/.vite` cache (this project does not use
Vite).

### What Is Not a Development Prompt

No restart required for:

- **Audit** — read-only code/doc review
- **Plan** — TODO, design docs, specifications
- **Check** — logs, diagnostics
- **Docs-only** — `AGENTS.md`, `CHANGELOG.md`, `docs/*.md` without app code

Mixed prompts (plan + code) require restart after the code portion.

### Do Not Build for Production Prematurely

Run `npm run build` only when the user requests release prep, production
preview, or an explicit ship task.

## Quick Reference

| Trigger | Action |
|---------|--------|
| After orient, before coding | `npm run dev:windows:start` |
| After code-modifying prompt | `npm run dev:windows:restart` |
| Audit / plan / docs only | No restart |
| Stale UI after restart | Stop, clear `.next`, start, then hard refresh |
| Release / ship | `npm run build`, then `npm run start` or deploy units |

## Why Windows Is Primary

The previous WSL systemd service watched the Windows checkout through
`/mnt/c`. Repeated development runs showed:

- slow initial compilation from DrvFS traversal;
- Watchpack polling memory pressure and `ENOMEM`;
- partial `.next/dev/types` writes during concurrent checks;
- Windows and Linux optional native packages replacing each other in the
  shared `node_modules`.

Native Windows Next.js watches the same filesystem that the editor changes,
uses platform-matched dependencies, and keeps the Windows browser on the same
network stack. WSL remains appropriate for Docker and the optional parser.
