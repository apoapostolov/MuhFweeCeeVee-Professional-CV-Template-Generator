# Provider API Integration

Use this reference when adding automatic external review to MuhFweeCeeVee.
Provider availability, limits, prices, and response schemas can change; the
status below was verified from official provider material on 2026-08-24.

## Support matrix

| Provider | Product integration | Access | Current boundary |
|---|---|---|---|
| Sapling AI Detector | Supported backend connector | Developer key for testing; metered API for production | English only; do not expose the key in browser code |
| GPTZero | Supported backend connector | API key and API subscription for production | Use `api.gptzero.me`, not the consumer webpage or similarly named domains |
| QuillBot AI Detector | Manual handoff only | No official B2B or B2C API | Do not reverse-engineer private endpoints or automate the webpage |
| ApplyCove ATS check | Manual handoff only | No public grading API verified | Do not automate uploads or private application calls |
| Local ATS Resume Checker | Local integration candidate | MIT-licensed source | Preserve attribution and describe its score as a heuristic |

Official references:

- Sapling detector: <https://sapling.ai/docs/api/detector/>
- Sapling developer allowance: <https://sapling.ai/docs/sdk/HTML/ai_detect_quickstart/>
- Sapling pricing: <https://sapling.ai/docs/api/pricing/>
- GPTZero developers: <https://gptzero.me/developers>
- GPTZero API docs: <https://gptzero.stoplight.io/>
- QuillBot API status: <https://help.quillbot.com/hc/en-us/articles/4541472549527-Does-Quillbot-Offer-an-API>
- ApplyCove product site: <https://applycove.com/>

## Sapling connector

Send a server-side `POST` to:

```text
https://api.sapling.ai/api/v1/aidetect
```

Authenticate with `Authorization: Bearer <key>`. The documented JSON request
fields are `text`, optional `sent_scores`, optional `score_string`, and optional
`version`. Sapling currently accepts up to 200,000 characters and documents
`20251027` as the default detector version. The response includes an overall
`score` from 0 to 1 and may include sentence and token scores.

For development, Sapling documents rate-limited keys that process 50,000
characters per 24 hours. Production is usage-based. The pricing page currently
lists the first tier at USD 0.005 per 1,000 detector characters and a one-time
USD 5 minimum applied as credit. Reverify both limits and pricing before UI or
billing copy is shipped.

Normalize the useful fields rather than persisting Sapling's echoed text:

```text
provider: sapling
model: response version when returned, otherwise requested version
classification: provider estimate derived from the numeric score
aiProbability: score
sentenceSignals: numeric score plus local text offsets when mapping succeeds
```

Do not pretend an application-defined classification threshold came from
Sapling. Display the probability and identify any local threshold explicitly.

## GPTZero connector

Send a server-side `POST` to:

```text
https://api.gptzero.me/v2/predict/text
```

Authenticate with the `x-api-key` header. The official developer example sends
`document` and optional `version`. GPTZero documents classifications such as
`HUMAN_ONLY`, `MIXED`, and `AI_ONLY`, class probabilities, confidence category,
and sentence-level signals.

An account and API subscription are required for normal production use. The
interactive API documentation may allow a small unauthenticated trial, but
that is not a production quota and must not be built into the app. GPTZero says
documents sent through its API are not stored or collected; still submit only
the sanitized visible scope authorized by the user.

Normalize at least:

```text
provider: gptzero
model: requested or returned API version
classification: document_classification
probabilities: class_probabilities
confidence: confidence_category
sentenceSignals: provider signal plus local text offsets when mapping succeeds
```

Reject responses that lack the expected document result instead of converting
missing fields into zero scores.

## Application architecture

Keep provider calls behind MuhFweeCeeVee's backend. Suggested secret names are
`MFCV_SAPLING_API_KEY` and `MFCV_GPTZERO_API_KEY`; follow the application's
existing secret-storage convention if it differs. Never return keys to the
client, embed them in exported CV data, write them to review history, or include
them in request/error logs.

Use a provider adapter with four responsibilities:

1. Validate provider configuration and supported language before submission.
2. Accept only the already-sanitized visible-text snapshot and its scope hash.
3. Call the supported official endpoint and normalize the response into a
   provider-independent envelope without merging provider scores.
4. Persist provenance and numeric results, not echoed input text or an entire
   raw provider response.

A provider result should retain `provider`, `providerUrl`, `checkedAt`, `model`,
`scope`, `inputHash`, `characters`, `words`, `status`, normalized scores, and
notes. Status must distinguish `measured`, `blocked`, `invalid`, `stale`, and
`incomparable`.

## Consent, cost, and failure handling

- External submission must begin with a visible user action after showing the
  sanitized scope, character count, destination provider, and whether the call
  may consume paid quota.
- Consent is per submission, not a permanent permission granted by configuring
  a key. Never scan automatically on edit, save, startup, or version selection.
- Hash the exact submitted text so results cannot silently attach to a changed
  draft.
- Use a bounded timeout. Do not automatically retry a chargeable POST after an
  ambiguous timeout because the first request may already have consumed quota.
- Handle authentication, quota, payment, rate-limit, timeout, schema, and
  provider errors separately. Do not convert any failure to an AI score.
- Keep Sapling and GPTZero results separate. Never average them into a combined
  “human” score.

## Manual-provider flow

For QuillBot and ApplyCove, provide only a sanitized preview, copy button, and
official-site link. Let the user submit and enter the displayed result manually.
Record it with `status: manually_entered`. Do not ship browser automation,
session-cookie reuse, hidden HTTP calls, or undocumented endpoint clients.

## Minimum connector tests

- Sanitization excludes contact details, references, hidden fields, internal
  metadata, and private links before the adapter receives text.
- No network request occurs without the explicit submission action.
- Keys are server-only and redacted from logs and serialized errors.
- Sapling and GPTZero fixtures normalize without retaining echoed CV text.
- Unknown model versions and changed scope hashes mark comparisons as
  incomparable.
- 401/403, 402, 429, timeout, malformed JSON, and unexpected schema produce
  provider failures rather than scores.
- An ambiguous timeout does not trigger an automatic billable retry.
- Manual providers never make a network submission from the application.
