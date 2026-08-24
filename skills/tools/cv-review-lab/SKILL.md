---
name: cv-review-lab
description: |
  Use when reviewing or implementing MuhFweeCeeVee workflows for ATS keyword
  coverage, natural resume language, AI-writing detector comparisons, PDF
  overflow and metadata checks, or versioned CV review loops.
---

# CV Review Lab

Review a CV as a hiring document first. ATS graders and AI-writing detectors are
diagnostic inputs, not authorities and not authorship proof.

## Load only what the task needs

- For the end-to-end review sequence, read
  [references/review-workflow.md](references/review-workflow.md).
- For the free local and online tools, limits, and interpretation rules, read
  [references/free-services.md](references/free-services.md).
- For adding this workflow to MuhFweeCeeVee, read
  [references/product-integration.md](references/product-integration.md).
- For supported provider APIs, credentials, normalized results, and automation
  boundaries, read
  [references/provider-api-integration.md](references/provider-api-integration.md).

## Core rules

1. Preserve factual meaning, seniority, dates, metrics, credits, and the user's
   voice. Never invent evidence or inflate proficiency.
2. Check ATS relevance before rewriting for style. Keep job-description terms
   only when the CV contains truthful evidence for them.
3. Humanize generic corporate prose through concrete verbs, natural rhythm,
   and specific ownership. First person is acceptable when it sounds more
   genuine; a grader's pronoun warning is a style preference, not a parse error.
4. Never add typos, grammar errors, or noise to manipulate a detector.
5. Preserve a baseline and compare the same text scope. Record provider, model
   when shown, timestamp, character and word count, and score.
6. Limit detector-driven rewriting to one or two bounded passes. Stop when the
   CV is credible, readable, ATS-complete, and fits the intended layout.
7. Build the PDF after every accepted content pass. Inspect page count, page
   breaks, clipping, hidden fields, searchable text, and metadata.
8. Do not submit personal contact data, addresses, references, or hidden fields
   to an online service. External submission requires current user authority;
   sanitize the text first.
9. Treat sharp score changes or disagreement between providers as detector
   instability. Retest the prior text in the same session/model when possible,
   then report the anomaly instead of rewriting around it.

## Required handoff

Report the selected source version and PDF, layout status, ATS coverage, exact
scan scope, provider results, factual changes, and any results rejected as
unstable. Distinguish local validation from online third-party scores.
