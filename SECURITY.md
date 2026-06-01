# Security Policy

## Goals

- Keep secrets out of the repository.
- Make automation predictable and minimal.
- Surface security issues early.
- Keep the repo easy to audit.

## Repository Defaults

- Keep API keys, tokens, service passwords, and private URLs out of source
  files, docs, prompts, and changelogs.
- OpenRouter API key is stored in local `.env` as `OPENROUTER_API_KEY`. The
  `.env` file is gitignored — never commit it.
- Personal CV data (`data/cvs/cv_*_private.yaml`, `data/cvs/*_private*.yaml`)
  is gitignored. Only the public fictional sample (`cv_en_john_doe.yaml`) is
  tracked.
- Photo assets and metadata (`photos/`, `photos/metadata.json`) are gitignored.
- Company metadata in `data/settings/companies.personal.json` is gitignored.
- Prefer environment variables or local-only configuration for secrets.
- Review dependency and workflow changes like code, not just configuration.

## AI Analysis & OpenRouter

- The OpenRouter API key is required for AI scoring and SYNC translation
  features.
- Per-check cost estimates are displayed in Settings before analysis runs.
- Credits are prepaid through OpenRouter — ensure sufficient balance before
  batch operations.
- AI analysis targets company metadata stored in tracked
  (`data/settings/companies.example.json`) or untracked
  (`data/settings/companies.personal.json`) files.

## GitHub Actions Defaults

- Set the default `GITHUB_TOKEN` permission to `read` unless a workflow needs
  more.
- Grant write permissions only to the specific job that needs them.
- Avoid broad repository write tokens in workflows.
- Pin third-party actions to commit SHAs when practical.
- Treat workflow changes as privileged changes and require review.

## Privacy Hardening

The repository includes privacy hardening for local/private artifacts:

- Personal CVs, local DB/snapshots, editor/runtime files are gitignored.
- Keep real CV content in local/private files outside version control.
- The public repo includes only the fictional sample CV data (`John Doe`).
- Personal company metadata is managed in separate untracked files.

## If a Secret Leaks

1. Revoke or rotate the secret immediately.
2. Remove the secret from the repository and its history if needed.
3. Verify whether GitHub secret scanning or push protection caught it.
4. Record the incident in `DEVELOPMENT_LOG.md` if the project keeps one.

## Reporting a Vulnerability

If you discover a security issue in MuhFweeCeeVee, please open a GitHub issue
with the "security" label, or contact the maintainers directly. Do not post
sensitive details in public issues.

## Notes

- For public repositories, GitHub can run secret scanning for free.
- Pair this file with a branch-protection or CODEOWNERS policy for stronger
  review control if accepting external contributions.
