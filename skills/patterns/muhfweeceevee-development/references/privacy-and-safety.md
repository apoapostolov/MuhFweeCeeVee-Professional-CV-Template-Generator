# Privacy and Repository Safety

Mandatory reading before commits or public push: [`SECURITY.md`](../../../../dev/SECURITY.md),
[`AGENTS.md`](../../../../AGENTS.md) (Public Repository Safety).

## Never commit

| Artifact | Why |
|----------|-----|
| `.env`, API keys | `OPENROUTER_API_KEY`, `MFCV_API_TOKEN` |
| `photos/`, `photos/metadata.json` | Personal images + AI analysis |
| `data/settings/companies.personal.json` | Real employer targeting |
| `data/settings/openrouter.yaml` | Local runtime settings |
| Personal CV YAML | Paths matching `*Apostol*`, `*apoapostolov*`, `cv_*_private.yaml` |
| `data/cvs/history/` | Autosave snapshots |
| `keywords/outputs/*` | Local sqlite/cache |

## Safe public sample

- `data/cvs/cv_en_john_doe.yaml` — fictional John Doe profile
- `data/settings/companies.example.json` — fictional companies

## Internal name rule

Do not commit CVs whose `metadata.internal_name` is **Apostol Apostolov CV** (any version).

## Agent behavior

- Do not paste real CV content, emails, or phone numbers into changelogs or skills
- Use John Doe for repro steps in PRs and docs
- Ask user before batch OpenRouter calls that spend credits
- When `MFCV_API_TOKEN` is set, never log the token

## Pre-push checklist

1. `git status` — no ignored personal paths staged
2. `git diff --cached` — no secrets or PII
3. Only fictional CV paths in `data/cvs/`
4. Changelog describes behavior, not private filenames

## Local-only planning docs

May exist on disk but are often gitignored or personal copies:

- `TODO.md`, `dev/DEVELOPMENT_PLAN.md`, `dev/DEVELOPMENT_LOG.md`, `dev/VIBECHECK.md`

`AGENTS.md` is tracked in this repo as the AI contract.