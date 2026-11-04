# Isolated Workers AI Health Probe

Run date: November 4, 2026. This was a one-time remote development test, not a production cache refresh. The probe had no KV bindings and did not publish prompts.

## Candidate run

The probe requested 50 Health candidates in five groups of ten. After deterministic validation and deduplication, 45 candidates remained. The model evaluated those in nine groups of five; all 45 passed its scores, with no API errors. The test did not record how many raw candidates the generator returned, so the five-candidate difference cannot be attributed solely to filtering.

| Usage | Measured neurons |
| --- | ---: |
| Generator: Llama 3.2 3B | 37.49 |
| Evaluator: Llama 3.3 70B | 931.05 |
| Total | 968.53 |

At this measured rate, three categories refreshed twice daily would consume about 5,811 neurons per day, before failed calls or additional tests. This is a projection from one Health run, not a guarantee or a measurement for the other categories.

## Small control test

A separate five-example control run used 116.45 neurons. It accepted one benign example and rejected four deliberately unsuitable examples, including harmful advice and a likely famous quote. This is a small sanity check, not a safety benchmark.

The evaluator assigned very high scores to nearly all generated examples. Some reasons for rejected control examples described positive characteristics rather than explaining why the prompt was rejected. Its decisions and explanations require further calibration and periodic human review; the probe does not demonstrate that all approved prompts are safe or original.

## Repeating the probe

From `worker`, start `npx wrangler dev --remote --ip 127.0.0.1 --port 8788 --config probe/wrangler.jsonc`. Then send `POST http://127.0.0.1:8788/probe` from another terminal. The response includes generated prompts, decisions, errors, and reported usage. This consumes Workers AI quota and can incur charges depending on the account's plan and usage. Do not deploy the probe as a public endpoint.

The probe itself does not publish or schedule batches. A separate scheduled workflow has since been added to the Worker; it is not active until the Worker is deployed.
