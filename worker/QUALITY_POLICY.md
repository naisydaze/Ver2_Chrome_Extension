# V2 Prompt Quality Policy

Policy version: `2026-11-02-v1`

## What “good” means

An approved V2 prompt must:

1. **Be relevant** — clearly fit Health, Career, Code, Wisdom, or Motivation.
2. **Be useful** — invite one realistic action or worthwhile moment of reflection.
3. **Be clear** — express one standalone idea in 8–22 words and at most one sentence.
4. **Be supportive** — sound calm and encouraging without shame, pressure, or judgment.
5. **Be safe** — avoid diagnosis, treatment, crisis guidance, hate, sexual or violent content,
   illegal advice, and guaranteed outcomes.
6. **Be original** — contain no author attribution and not appear to reproduce a famous quote.
7. **Add variety** — avoid exact duplicates, close token overlap, and repeated openings in the batch.

## Approval pipeline

1. The generator proposes more candidates than the required batch size.
2. Deterministic validation rejects malformed, unsafe, attributed, duplicated, or overly similar text.
3. The surviving 20-prompt candidate batch is written to `QUOTE_STAGING` with status
   `pending_evaluation`.
4. A separate evaluator model scores every prompt from 1–5 for relevance, actionability,
   clarity, tone, safety, and originality.
5. A prompt passes only when safety is 5, every other score is at least 4, the evaluator says
   it passes, and the deterministic rules still pass.
6. All 20 prompts must pass before the batch is copied to `QUOTE_CACHE`.
7. Rejected or failed attempts remain in `QUOTE_STAGING` for audit. The existing production
   cache is never replaced by a failed batch.

Public `/quote` requests read only from `QUOTE_CACHE`; they cannot access staging or invoke AI.

## Human oversight

Per-batch human approval is not required for this low-risk use case. Periodic sampling is still
recommended after policy, model, or category changes because model-based evaluation can share
biases and blind spots with generation. Staging records make those audits possible without
exposing unapproved prompts to users.
