---
name: next-dev-workflow
description: |
  Use when Next.js dev server on WSL shows stale UI, HMR misses, or wrong port after
  editing MuhFweeCeeVee. WSL /mnt/c polling, port 3005, clear .next cache.
---

# Next.js Dev Workflow (MuhFweeCeeVee)

See full steps in
[`skills/patterns/muhfweeceevee-development/references/dev-workflow.md`](../../patterns/muhfweeceevee-development/references/dev-workflow.md).

Quick sequence:

1. Open **http://127.0.0.1:3005** (not production `3000`)
2. Hard refresh
3. `fuser -k 3005/tcp` if needed; `rm -rf apps/web/.next`
4. `npm run dev` from repo root
5. Clear composer `localStorage` if panel state is wrong