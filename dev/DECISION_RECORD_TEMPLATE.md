# Decision Record — MuhFweeCeeVee

Use this template to record architecture decisions, design choices, and
important workflow changes. Keep copies in `docs/decisions/` or reference
them from this file.

## Title

- short decision name

## Status

- proposed | accepted | superseded

## Date

- YYYY-MM-DD

## Context

- why this decision needed to be made
- relevant constraints (privacy, cost, portability, etc.)

## Decision

- the chosen approach

## Alternatives Considered

- option 1 and why it was not chosen
- option 2 and why it was not chosen

## Consequences

- what becomes simpler
- what becomes harder
- privacy or deployment implications

## Validation

- how to verify the decision was sound

## Follow-Up

- any future trigger for revisiting this decision

## Example

### CV targeting should be company-agnostic at CV level

- Status: accepted
- Date: 2026-03-08
- Context: CV files previously embedded target company metadata, making CVs
  less reusable across multiple job applications and creating privacy risks
  when sharing CV files.
- Decision: target company metadata is managed in dedicated company metadata
  files (`data/settings/companies.*.json`), not inside the CV YAML. The CV
  document stays reusable across multiple employers.
- Alternatives considered:
  - keep targeting metadata in CV YAML — made CV reuse harder and risked
    leaking employer-specific info
  - embed targeting in template mappings — added coupling between templates
    and job applications
- Consequences:
  - CVs are now portable across job applications without editing YAML
  - company metadata editing requires a separate UI flow
- Validation: Editor AI targeting now supports metadata source selection and
  multi-company selection with inline metadata editing.
- Follow-Up: none expected.
