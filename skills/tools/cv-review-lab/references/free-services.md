# Free ATS and AI-Writing Review Services

Availability and limits can change. Reverify before product integration. These
notes reflect the workflow used and checked on 2026-08-24.

## ATS and résumé checks

### ApplyCove

- URL: <https://applycove.com/>
- Used for a free ATS-style résumé score and fix list.
- Its feedback included a preference against three first-person pronouns. Treat
  this as conventional résumé style guidance, not proof of parsing failure.
- Useful for a second opinion on completeness and résumé conventions.
- Do not adopt every stylistic warning when it removes the candidate's voice or
  makes the document more generic.

### Local ATS Resume Checker

- Source checkout: `C:\git-ext\ats-resume-checker`
- Upstream: <https://github.com/Jahangirhussen/ats-resume-checker>
- MIT-licensed, client-side, and usable without sending résumé content to a
  backend.
- Provides transparent weighted checks for keywords, structure, formatting,
  writing, achievements, experience, education, and contact information.
- It is not a simulation of Workday, Taleo, Greenhouse, or a real recruiter
  corpus. Present its output as an explainable heuristic score.
- Reuse its ideas or code only after checking the license, attribution, current
  source, and fit with MuhFweeCeeVee's existing keyword engine.

## AI-writing signals

### Local AI Writing Detector

- Skill/tool: `ai-writing-detector`
- Local source mirror used during research: `C:\git-ext\avoid-ai-writing`
- Deterministic pattern analysis for generic or templated language.
- Safe first check because text stays local and results are reproducible.
- A clean result means no configured mechanical patterns were found. It does
  not prove human authorship or predict a commercial detector.

### Sapling AI Detector

- URL: <https://sapling.ai/ai-content-detector>
- Free input was limited to roughly 2,000 characters during this review.
- Split longer CV text into stable semantic chunks and report each separately.
- Sapling itself warns that short, general, essay-like text can produce false
  positives.
- Useful for locating a compact block of generic language, not for deciding
  whether a person used AI.
- Sapling also offers a documented Detector API. Use the supported backend API,
  not automation of the free webpage. See
  [provider-api-integration.md](provider-api-integration.md).

### QuillBot AI Detector

- URL: <https://quillbot.com/ai-content-detector>
- Free detection was available without a paid plan; account state and upload
  limits may differ.
- It accepted the full sanitized CV text and reported AI-generated,
  human-written and AI-refined, and human-written proportions.
- Record the displayed model version because results may shift when the model
  changes.
- QuillBot's official help center stated on 2026-06-10 that it offers no B2B or
  B2C API. Keep this provider manual-only; do not call its private web
  endpoints.

### GPTZero

- URL: <https://app.gptzero.me/>
- Offers limited free scans; quotas and login requirements can change.
- During the 2026-08-24 review, an earlier text moved from a mixed result to
  100% AI when retested under a different displayed model. The revised text
  also received 100%, while the highlighted sentences had not changed.
- Treat this as direct evidence that cross-session scores are not comparable
  unless the model and scope match. Do not rewrite a CV around an isolated
  GPTZero reversal.
- GPTZero has a documented developer API separate from the consumer scan page.
  Use that API for product automation and treat consumer-page quotas as
  irrelevant to API availability. See
  [provider-api-integration.md](provider-api-integration.md).

### ApplyCove automation status

- No public résumé-grading API or developer documentation was verified on
  2026-08-24.
- Keep ApplyCove as an optional manual check. Do not automate its upload flow or
  reverse-engineer private application endpoints.

## Privacy and automation boundary

- Online services receive submitted text. Strip phone, email, address,
  references, private links, hidden skills, and internal metadata first.
- Permission to use an online service in one review is not permanent product
  consent.
- Prefer local checks by default. An integrated product should require an
  explicit action before opening or submitting to a third party.
- Do not build unofficial scraping or automated submission into the product
  without confirming the provider's current terms and a supported API.
- Never label a detector result as proof that a CV was written by AI or by a
  human.
