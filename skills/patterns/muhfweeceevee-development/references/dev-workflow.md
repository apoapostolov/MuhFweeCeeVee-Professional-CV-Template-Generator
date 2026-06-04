# Dev Workflow

Full policy: [`DEV_SERVER_WORKFLOW.md`](../../../../dev/DEV_SERVER_WORKFLOW.md).

## Commands (repo root)

| Command | Purpose |
|---------|---------|
| `npm run bootstrap` | `npm install` all workspaces |
| `npm run dev` | Next.js web — **port 3005**, webpack, WSL polling |
| `npm run dev:parser` | FastAPI on `127.0.0.1:8001` (optional scaffold) |
| `npm run check` | `eslint` + `tsc --noEmit` for web |
| `npm run build` | Production build — only when shipping |
| `npm run start` | Production server (default port 3000) |
| `npm test` | Vitest (root) |
| `npm run mcp:api` | MCP stdio wrapper |

Web workspace script (`apps/web/package.json`):

```bash
WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true next dev --webpack -p 3005 -H 127.0.0.1
```

**WSL + Windows browser:** repo lives on `/mnt/c/...` — polling is required for reliable HMR.
`next.config.ts` sets `allowedDevOrigins` for `localhost:3005`, `127.0.0.1:3005`.

Do **not** mix Turbopack and webpack sessions on the same browser tab without full restart.

## When to restart

Restart `npm run dev` after every **development prompt** that changes:

- TS/TSX/CSS, templates YAML, `next.config.ts`, env usage

No restart for docs-only / audit / plan work.

## Stale UI recovery

1. Confirm URL is **http://127.0.0.1:3005** (not production `3000`)
2. Hard refresh (Ctrl+Shift+R)
3. `rm -rf apps/web/.next && npm run dev`
4. Clear composer `localStorage` keys (`STORAGE_KEYS` in constants)
5. Re-open route in fresh tab

If port stuck: `fuser -k 3005/tcp` then restart.

## Environment variables

| Variable | Effect |
|----------|--------|
| `OPENROUTER_API_KEY` | AI routes (via .env) |
| `MFCV_API_TOKEN` | Enables API auth on mutations |
| `SQLITE_BIN` | Only if keywords subsystem restored — see retired note |
| `CV_API_BASE_URL` | MCP wrapper API base (include `/api`) |

## Validation before done

```bash
npm run check
# Optional: npx playwright install chromium  # first PDF export setup
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3005/
```

Manual smoke: Print Room PDF, Editor save, Settings credit ping.

## Systemd / long-running (optional)

Reference units: `deploy/systemd/myfreeceevee-web.service`.
Personal WSL pattern may use port `10001-19999` per user `wsl-dev-server-manager` skill —
this project conventionally uses **3005** for daily dev.

## Changelog / API docs

- User-visible changes → `CHANGELOG.md` per `dev/CHANGELOG_GUIDE.md`
- New routes → `docs/API.md`
- Markdown edits → `npm run lint:md`