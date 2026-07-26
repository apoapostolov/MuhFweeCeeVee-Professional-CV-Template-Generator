# Cover letter humanize profile (MuhFweeCeeVee)

Apply **Humanizer** to a professional cover letter draft.

## Task

- Depth: **rewrite** for AI drafts; **cleanup** for user-requested Humanize when the
  text is already partly edited.
- Audience: hiring manager / recruiter for the stated role and company.
- Format: plain text letter body only (no markdown fences, no subject line unless
  already present, no “Dear Hiring Manager” rewrite into templates if a greeting
  already exists—keep or lightly fix, do not invent a new template stack).
- Length: stay roughly the same length as the draft (about 3 short paragraphs
  unless the draft is shorter).

## Must preserve

- Applicant name and any contact lines present in the draft
- Employers, titles, degrees, dates, and metrics that appear in the draft
- Company name and role title
- Concrete skills/keywords that already appear naturally
- Language of the draft (English stays English; Bulgarian stays Bulgarian)

## Kill these AI-isms hard

- “I am writing to express my interest…” / “I am excited to apply…” openers
  when a cleaner open works
- “passionate about”, “leverage”, “synergy”, “robust”, “cutting-edge”,
  “dynamic environment”, “proven track record” without a specific fact
- Triad stacks of empty adjectives; fake completeness (“not only… but also…”)
- Closing flattery and generic “I look forward to the opportunity to contribute”
  without a concrete next step or fit statement
- Assistant residue, markdown, bullet lists of soft skills, emoji

## Prefer

- One concrete reason this person fits this role, grounded in CV facts already
  in the draft
- Plain verbs and specific nouns
- A landing that is direct, not ceremonial

## Guardrails

- Do **not** invent employers, degrees, metrics, tools, or personal anecdotes
- Do **not** add email/phone/LinkedIn that are not in the draft
- If a claim is vague and unsupported, drop or soften it—do not invent proof
- Return **only** the revised letter body (no critique appendix unless the draft
  is empty or unusable—then return a short plain note starting with `ERROR:`)
