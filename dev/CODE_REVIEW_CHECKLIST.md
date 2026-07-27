# Code Review Checklist — MuhFweeCeeVee

Use this checklist when reviewing AI-generated or human code changes before
merging. Not every item applies to every change — use judgment for the
appropriate scope.

## Structural Review

- [ ] **Architectural fit** — Does the change belong in the layer or module it
      touches? (Next.js app route, package, service, keywords, template)
- [ ] **Abstraction boundary** — Are internal helpers, types, or state exposed
      that should stay private? Are public APIs justified by an external caller?
- [ ] **Workspace boundaries** — Does the change respect npm workspace
      boundaries? Shared logic belongs in `packages/`, not duplicated.
- [ ] **Diff scope** — Does the change include unrelated formatting, linting, or
      renames that should be in a separate commit?
- [ ] **Duplicate work** — Could existing utilities in `packages/schemas/` or
      `packages/render-core/` replace the new code?

## Correctness Review

- [ ] **Edge cases** — What happens with empty CV data, missing sections, null
      template mappings, or network errors? Are these handled?
- [ ] **Error paths** — Are errors surfaced at the right level (UI toast vs.
      console)? Are OpenRouter API errors handled gracefully?
- [ ] **State mutations** — Does the change modify CV YAML state safely? Are
      there race conditions between Form and YAML editor modes?
- [ ] **Async correctness** — Are promises awaited? Are error boundaries in
      async chains intact?
- [ ] **Type safety** — Are there implicit `any`, unsafe casts, or assumptions
      about runtime types that TypeScript cannot verify?

## Security Review

- [ ] **Secret exposure** — Are OpenRouter API keys, tokens, or private CV data
      hardcoded or logged? Could they leak through error messages?
- [ ] **Privacy boundaries** — Does the change respect `.gitignore` exclusions
      for personal CV data, photos, and company metadata?
- [ ] **Input sanitization** — Are user-supplied YAML/JSON values validated
      before use in rendering or analysis?
- [ ] **Injection vectors** — Could the change introduce XSS in rendered CV
      output or API responses?

## Testing Review

- [ ] **Coverage of the new path** — Are the key branches, error paths, and
      edge cases tested? For Python keyword engine — are test fixtures updated?
- [ ] **Regression risk** — Does the change break existing template rendering or
      CV editing behavior?
- [ ] **Test quality** — Do tests assert meaningful outcomes rather than
      implementation details?

## Documentation Review

- [ ] **Changelog entry** — Is there a user-visible changelog entry in the
      correct category? Does it follow the overwrite-first rule?
- [ ] **API docs** — Are new API endpoints documented in `docs/API.md`?
- [ ] **Inline comments** — Do comments explain *why*, not *what*? Are there
      TODO or FIXME comments that should be addressed or tracked?

## Operational Review

- [ ] **Configuration** — Are new environment variables, feature flags, or
      settings documented and given sensible defaults?
- [ ] **Migration** — Does the change require a data migration (CV YAML format
      change, photo storage migration, settings format change)?
- [ ] **Rollback** — Can this change be reverted cleanly?

## MuhFweeCeeVee-Specific Checks

- [ ] **Template compatibility** — Does the change affect any of the 5 shipping
      templates (cambridge-v1, edinburgh-v1, europass-v1, harvard-v1,
      stanford-v1)?
- [ ] **Variant workflow** — Does the change handle language variants
      (`_bg_`, `_en_`) correctly?
- [ ] **Photo pipeline** — If touching photo features, does it work with both
      filesystem-backed and legacy browser-cached gallery data?
- [ ] **MCP wrapper** — If adding API endpoints, should they also be exposed
      via `packages/mcp-wrapper/`?

## Notes

- Run the checklist in order: structural issues invalidate correctness checks,
  security issues block everything.
- If a review item is intentionally skipped, note the reason in PR comments.
- Treat this checklist as a living document — add items when recurring issues
  are discovered in reviews.
