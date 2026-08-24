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
