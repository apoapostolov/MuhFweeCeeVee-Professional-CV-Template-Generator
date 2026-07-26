# Release Checklist — MuhFweeCeeVee

Use this before publishing, tagging, or syncing a release.

## Preflight

- [ ] Read the current `DEVELOPMENT_PLAN.md` and `DEVELOPMENT_LOG.md`
- [ ] Confirm `CHANGELOG.md` reflects the user-visible outcome, not code churn
- [ ] Run `npm run check` (lint + typecheck)
- [ ] Run `npm run build` and confirm the production build succeeds
- [ ] Run the parser test suite if changes touch `services/parser/`
- [ ] Run keyword tests if changes touch `keywords/` (`npm run test:keywords`)
- [ ] Check for unrelated working tree changes
- [ ] Confirm secrets, credentials, and private files are excluded
  - No `.env` files committed
  - No personal CV data (`data/cvs/cv_*_private.yaml`)
  - No photo artifacts (`photos/`)
- [ ] Review `.gitignore` — any new generated paths that should be excluded?
- [ ] Verify CHANGELOG.md deduplication (no duplicate unreleased entries)

## Publish

- [ ] Update version in `package.json` if applicable
- [ ] Regenerate derived outputs instead of editing them by hand
- [ ] Commit only the related files (source + regenerated output together)
- [ ] Tag the release (`v1.x.x`)
- [ ] Push tag and commits

## Post-Release

- [ ] Record the final validation result in `DEVELOPMENT_LOG.md`
- [ ] Backfill any missing changelog notes while the work is fresh
- [ ] Note residual risk or follow-up work in `DEVELOPMENT_PLAN.md`
- [ ] Update `deploy/systemd/` service files if runtime paths changed
- [ ] Update `deploy/nginx/` config if URL paths or ports changed

## Notes

- Keep this list short enough that it is used.
- If the project adds stricter steps (CI workflows, etc.), extend this file.
