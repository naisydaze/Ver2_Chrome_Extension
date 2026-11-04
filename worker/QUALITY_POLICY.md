# V2 Prompt Quality Policy

Policy version: `2026-11-04-v3`

## What “good” means

An approved V2 prompt must:

1. **Be relevant** — aim to fit Health, Career, Code, Wisdom, or Motivation.
2. **Be useful** — invite one realistic action or worthwhile moment of reflection.
3. **Be clear** — express one standalone idea in 6–12 words, at most 100 characters and at most one sentence.
4. **Be supportive** — sound calm and encouraging without shame, pressure, or judgment.
5. **Be safe** — avoid diagnosis, treatment, crisis guidance, hate, sexual or violent content,
   illegal advice, and guaranteed outcomes.
6. **Be original** — contain no author attribution and not appear to reproduce a famous quote.
7. **Add variety** — avoid exact duplicates, close token overlap, and repeated openings in the batch.

## Approval pipeline

1. The generator proposes candidates, with a small allowance for filtering.
2. Deterministic validation rejects malformed, unsafe, attributed, duplicated, or overly similar text.
   Follow-up calls request the missing number plus an allowance and check duplicates against
   earlier candidates.
3. Candidate prompts are written to `QUOTE_STAGING` before evaluation.
4. A separate Cloudflare Workers AI model scores each candidate in groups of up to five from 1–5 for
   relevance, actionability, clarity, tone, safety, and originality. Any malformed or
   missing evaluation fails the whole batch.
5. A prompt passes only when safety is 5, every other score is at least 4, the evaluator says
   it passes, and the deterministic rules still pass.
6. A scheduled refresh requests up to 50 candidates per category and publishes the approved
   subset only if at least 20 pass. It does not retry the category until the next schedule.
   Manual administrator refreshes instead retain approved prompts across up to three generation
   attempts and require a full batch of 20 before promotion.
7. Rejected, incomplete, or failed batches remain in `QUOTE_STAGING` for audit. The existing
   production cache is never replaced by an unsuccessful batch.

Public `/quote` requests read only from `QUOTE_CACHE`; they cannot access staging or invoke AI.
The repository's generator and evaluator both use Cloudflare Workers AI. The deployed Worker
may still use an earlier OpenAI-based evaluator until it is updated.

The schedule runs at 00:15 and 12:15 UTC for Health, Career, and Motivation. A Durable Object
guards against duplicate scheduled events, but this is not an account-wide neuron or spending
limit: other Worker calls, manual refreshes, usage by other projects, and paid-plan overages
must be monitored separately.

## Human oversight

Per-batch human approval is not required for this use case. Automated checks and model scores
cannot guarantee safety, relevance, or originality. Periodic sampling is recommended after policy,
model, or category changes because evaluators can make mistakes and share biases or blind spots
with the generator. Staging records make those audits possible without exposing unapproved new
prompts to users. Cache entries generated before this policy may not have passed these checks.
