# MuhFweeCeeVee Product Integration

Use this reference when implementing the review workflow in the application.
Read the main `muhfweeceevee-development` skill and the repository privacy and
rendering references before changing code.

## Product outcome

Add a local-first review workspace that compares a saved CV version with one or
more candidates without turning provider scores into a single fake truth.

## Recommended capabilities

### Review input

- Select CV version, language, template, target role, and optional job
  description.
- Build a sanitized visible-text representation from the same visibility rules
  used by the renderer.
- Show exactly which sections and character count will leave the device before
  any third-party action.
- Exclude personal details, references, hidden fields, and internal metadata by
  default.

### Local checks

- PDF text/searchability and expected page count.
- Overflow, clipping, blank-page, and awkward section-break detection.
- PDF metadata inspection.
- ATS parsing and evidence-backed keyword coverage.
- Mechanical templated-language checks with issue locations.
- Prohibited-character and glyph-extraction checks where relevant.

### External comparisons

- Treat ApplyCove, Sapling, QuillBot, and GPTZero as optional provider records,
  not a combined accuracy score.
- Offer backend API connectors for Sapling and GPTZero when the user configures
  a valid provider key. Prefer an “Open provider with copied sanitized text”
  flow for QuillBot and ApplyCove because no supported public API is currently
  verified. Do not silently submit.
- Store provider name, URL, time, displayed model, scope, input hash, character
  and word count, result, and user notes.
- Mark results incomparable when scope or model differs.
- Support stable Sapling chunks below its currently verified free limit.
- Read [provider-api-integration.md](provider-api-integration.md) before
  implementing connectors or provider settings.

### Version loop

- Snapshot before the first edit and before each accepted candidate.
- Show semantic text changes alongside ATS-term gains/losses and page-layout
  changes.
- Default to a maximum of two detector-informed revisions.
- Require an explicit user choice before making the candidate canonical.
- Keep exported PDF version and source version linked.

## Suggested result model

```text
CvReviewRun
  id
  cvId
  sourceVersion
  candidateVersion
  templateId
  targetRole
  jobDescriptionHash?
  sanitizedInputHash
  createdAt
  localChecks[]
  providerChecks[]
  keywordCoverage[]
  layoutChecks[]
  decision
```

Provider checks should include `provider`, `providerUrl`, `checkedAt`, `model`,
`scope`, `characters`, `words`, `result`, `status`, and `notes`. Status should
distinguish measured, stale, blocked, incomparable, and manually entered.

## UX language

Use neutral labels such as “AI-writing signals” and “provider estimate.” Avoid
“AI proof,” “human verified,” “detector passed,” and promises that a score will
beat an ATS. Explain that résumé graders measure different heuristics and that
real ATS behavior depends on the employer, parser, vacancy, and recruiter.

## Acceptance criteria

- No online submission occurs without a visible user action and sanitized-text
  preview.
- A review can run entirely locally.
- The same source and scope produce a stable local result.
- Provider results remain separate and retain model/scope provenance.
- The UI warns when comparing different models or input scopes.
- A candidate cannot be selected without successful PDF export and layout
  validation.
- Tests cover sanitization, stable chunking, keyword regression, version links,
  incomparable-result detection, secret redaction, provider response
  normalization, and explicit-submit enforcement.
