# Parser Service — Scaffold Only

The FastAPI app in this folder is a **placeholder**, not a production PDF or
template-ingestion pipeline.

## Current Behavior

- `GET /health` — liveness check
- `POST /analyze-pdf`, `/draft-template`, `/ingest-template/*` — return stub JSON
  with byte counts and phase labels only

## When to Use

- Optional local experimentation (`npm run dev:parser` on port `8001`)
- Future work to decompose PDFs into template YAML drafts

## What the Web App Uses Today

- CV storage and YAML editing: `apps/web` + `data/cvs/`
- PDF export: Playwright via `apps/web` `/api/export/pdf` (not this service)
- Keywords: Python engine under `keywords/` invoked from the web API

Do not document this service as required for the 1.0.2 user workflow unless a
feature explicitly wires it in.