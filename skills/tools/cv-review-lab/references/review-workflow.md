# Versioned CV Review Workflow

## 1. Establish the target

- Identify the canonical CV source, template, language, target role, and job
  description when available.
- Extract the target role's important terms into a short evidence checklist.
- Separate must-have terms from optional vacancy language. Do not force a term
  into the CV when the candidate cannot defend it in an interview.
- Decide the maximum page count and preserve the current text scale and export
  settings unless the user requests a layout change.

## 2. Freeze a baseline

- Save an immutable source snapshot before editing.
- Record the version, timestamp, rendered page count, and scan scope.
- Use rendered, visible CV content for external review. Do not include hidden
  skills, alternate-language fields, editor metadata, contact details, or
  references.
- Keep a stable comparison order, for example: summary, target roles and
  responsibilities, core strengths, social skills, and visible other skills.

## 3. Review ATS relevance

Check four separate concerns:

1. **Parsing:** searchable text, conventional headings, readable dates, contact
   fields, and no essential information trapped in an image.
2. **Coverage:** truthful target-role terms appear in natural context.
3. **Evidence:** responsibilities identify ownership, decisions, scope, or
   outcomes without exaggeration.
4. **Density:** keyword additions do not turn bullets into lists of jargon.

Keep a machine-readable coverage result for each requested term: present,
supported but absent, unsupported, or intentionally omitted.

An ATS style warning is not automatically a parsing failure. For example,
ApplyCove objected to first-person pronouns during the 2026-08-24 review, but
the summary still parsed. Retain first person when it materially improves the
candidate's voice and the user accepts the tradeoff.

## 4. Humanize without gaming

Prioritize passages that contain generic labels, stacked abstract nouns,
promotional claims without evidence, or repeated sentence structures.

Useful transformations include:

- “responsible for” -> a concrete verb describing the work;
- abstract process language -> what changed for the team;
- vague performance claims -> a bounded, defensible contribution;
- identical bullet cadence -> a modest mix of short and medium sentences;
- generic strengths -> how the person actually approaches design decisions.

Keep résumé fragments where they are compact and clear. Use first-person prose
sparingly in summaries or personal strengths when it sounds natural. Do not
make every responsibility first person merely to influence a detector.

## 5. Render and inspect

Build from canonical source through the normal MuhFweeCeeVee export route.
Never hand-edit the PDF.

Verify:

- expected page count and clean section boundaries;
- no bullet, role, or publication block split awkwardly;
- no clipped last line, footer collision, or accidental blank page;
- all intended sections are visible and hidden sections remain absent;
- ATS terms survive rendering as searchable text;
- metadata contains ordinary document tooling, not an unintended AI product,
  private path, prompt, or authoring note;
- punctuation and glyph extraction are intact.

Inspect the actual PDF and a full-page visual preview. Source-only inspection
cannot prove pagination or visibility.

## 6. Run comparable checks

Run the deterministic local checks first. For online checks, obtain current
permission and submit only sanitized professional text.

When a free provider has a length limit, split at stable semantic boundaries.
Label each chunk separately and never present chunk scores as a whole-document
score. Keep the same chunks across candidate versions.

Record results in this shape:

| Field | Meaning |
|---|---|
| Provider | Exact service name and URL |
| Checked at | Absolute timestamp and timezone |
| Model | Displayed provider model/version, if available |
| Scope | Full visible text or named stable chunk |
| Characters / words | Input size used for comparison |
| Result | Provider's exact category and percentage |
| Notes | Limits, login state, stale score, or anomaly |

## 7. Use a bounded loop

1. Compare the baseline and candidate.
2. Identify the smallest passage that is both templated and worth improving for
   a human reader.
3. Rewrite only that passage.
4. Rebuild and repeat layout, ATS, and detector checks.
5. Stop after one or two passes, or earlier when the prose is credible and the
   layout is stable.

Never choose a worse résumé solely because a detector calls it more human.
When a provider sharply reverses its judgment, retest the prior version in the
same session/model if possible. If both versions receive the same new result,
record provider drift and exclude it from the selection decision.

## 8. Final validation

- Facts and evidence are unchanged unless the user approved a correction.
- Technical proficiency remains conservative and interview-defensible.
- Target-role keywords are present, supported, and readable.
- No artificial mistakes or detector-evasion artifacts were introduced.
- The selected source and exported PDF correspond to the same version.
- The report distinguishes measured results from judgment and provider noise.

## 9. Choose the version to send

Do not select a winner by averaging ATS and detector scores. Make the decision
in three stages.

### Gate the candidates

Exclude a version when it has a material factual problem, an unsupported claim,
a missing must-have ATS term with truthful evidence elsewhere in the CV, an
interview-indefensible proficiency rating, or a visible PDF layout defect.
Compare rendered, visible content rather than hidden fields or stale metadata.

### Read the viable versions as hiring documents

Judge the remaining versions primarily on:

- clarity of the target role and seniority;
- specific ownership, decisions, evidence, and results;
- natural voice without generic corporate or template language;
- concision, scanning rhythm, and information hierarchy;
- consistency across the summary, experience, strengths, and skills.

Prefer the strongest hiring document that passes the gates. A version with a
slightly weaker detector result can still be the right choice when it is more
specific, credible, and readable.

### Use detector evidence conservatively

Compare detector results only when provider, model, scope, session conditions,
and chunk boundaries are equivalent. An acceptable result is enough; there is
no universal percentage that proves human authorship. Reduce the weight of a
provider when small edits cause sharp reversals or when providers disagree.

A missing fresh result is an uncertainty, not a measured pass or failure. State
it rather than inferring a score from nearby versions. Never disqualify a sound
CV solely because one short section receives a high and unstable result.

### Make one recommendation

End the review with:

1. `Send version X`, linked to the exact source and matching PDF.
2. Two to four reasons based first on hiring quality, then ATS coverage and
   comparable detector evidence.
3. The most important caveat, including any unmeasured or unstable result.
4. At most one fallback version and the specific condition for choosing it.
5. Confirmation that the selected PDF has no overflow or visibility defect.

Do not create another version solely to improve a detector once a credible,
ATS-complete, layout-safe candidate has acceptable overall signals. Reopen the
loop only for a new job target, a material content defect, or meaningful new
evidence.
