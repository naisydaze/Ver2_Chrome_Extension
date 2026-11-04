# V2 — Your Self-Improvement Companion

*Small reminders for the person you're becoming.*

V2 is a Chrome extension that delivers gentle prompts throughout your day. Choose a category, set a reminder interval, and make space for a moment of reflection—whether you're working, studying, coding, or taking a break.

[View V2 in the Chrome Web Store](https://chromewebstore.google.com/detail/igonfkldenaeailncliahdblmcmnnoci) · [Privacy policy](PRIVACY.md) · [Prompt quality policy](worker/QUALITY_POLICY.md)

## What it does

- **Three categories:** Health, Career, and Motivation.
- **Flexible reminders:** Choose a preset interval or set your own.
- **Active hours:** Limit notifications to the times that work for you.
- **Deep Work mode:** Pause reminders temporarily when you need to focus.
- **Offline fallback:** Use bundled prompts when the online service is unavailable.
- **Recent prompts:** Revisit or clear your last 20 reminders in the settings page, stored locally on your device.
- **Local settings:** Save preferences and recently shown prompt identifiers in Chrome's local storage.

V2 includes AI-generated prompts. Prompts are served from a shared cache; a reminder does not call an AI model. Each installation tracks the prompts it has seen within a batch to reduce repetition.

## How it works

The extension schedules reminders using Chrome alarms and displays them with Chrome notifications. For each reminder it requests a prompt from a Cloudflare Worker. If that request fails, it selects a bundled local prompt instead.

The Worker can refresh shared batches on a schedule and through a protected administrator endpoint:

1. Cloudflare Workers AI generates candidate prompts.
2. Rules check format, length, duplicates, attribution, and certain unsafe language.
3. Candidates are stored in a separate staging namespace. A separate Cloudflare Workers AI model evaluates them for relevance, usefulness, clarity, tone, safety, and originality.
4. Only prompts that pass are eligible for the shared cache. Scheduled batches are promoted only if at least 20 pass; otherwise the previous cache remains in use. Manual refreshes can replace rejected candidates within a limited number of attempts.

The scheduled workflow requests up to 50 candidates each for Health, Career, and Motivation twice daily at 00:15 and 12:15 UTC (8:15 a.m. and 8:15 p.m. Singapore time). Duplicate scheduled events are guarded against and failed scheduled batches are not automatically retried. Actual neuron use varies; the schedule does not impose an account-wide spending cap. The deployed Worker may differ until redeployed.

AI checks reduce risk but cannot guarantee every prompt is appropriate or original. See the [quality policy](worker/QUALITY_POLICY.md) for the criteria and limitations. Existing cache entries may predate the current evaluation workflow.

## Version history

### 1.1.1

- Saves up to 20 recent reminders locally for review in the settings page.
- Requests shorter generated prompts for easier reading in notifications.

- Limits categories to Health, Career, and Motivation. Users with removed selections are asked to review their settings; Failure and Success map to Motivation.
- Tracks up to 50 prompts per category so users can cycle through a larger shared batch before repeats.
- The accompanying Worker schedules Cloudflare-only batch checks twice daily for Health, Career, and Motivation.

- Maps the previous **Motivational** category to **Motivation** when migrating version 1.0 settings.
- Asks affected users to review their settings when their previous category is unavailable or they had hidden notification previews. Reminders remain paused until they save their choices.
- Fixes an issue that could re-enable Health when another category was selected.

The review notice applies when version 1.0 settings are first migrated. It does not automatically restore choices already changed by an earlier 1.1.0 migration.

### 1.1.0

- Added five preset categories, active hours, and timed Deep Work pauses.
- Added shared cached AI-generated prompts and bundled fallback prompts.
- Updated the settings and popup interfaces.

### 1.0

- Introduced motivational reminders, category selection, custom intervals, and Do Not Disturb.

## Technology

- **Extension:** JavaScript, HTML, CSS, and Chrome's Manifest V3 APIs.
- **Backend:** Cloudflare Workers and Workers KV.
- **Generation and evaluation:** Cloudflare Workers AI.

## Run locally

1. Clone this repository:

   ```bash
   git clone https://github.com/naisydaze/Ver2_Chrome_Extension.git
   cd Ver2_Chrome_Extension
   ```

2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Open V2's settings, choose a category and interval, and allow Chrome notifications if prompted.

An unpacked extension can have a different ID from the published extension. The configured Worker accepts only its allowed extension origins, so a different local ID may use bundled fallback prompts unless the Worker configuration is updated.

## Develop the Worker

The repository's Worker configuration points to V2's existing Cloudflare resources. To deploy your own instance, create separate `QUOTE_CACHE` and `QUOTE_STAGING` KV namespaces in your Cloudflare account and replace their IDs in `worker/wrangler.jsonc`. Configure the allowed extension origin, the Worker URL in `src/utils/quoteClient.js`, and the corresponding host permission in `manifest.json` for your deployment.

From the `worker` directory, install dependencies and authenticate Wrangler:

```bash
cd worker
npm install
npx wrangler login
```

Set `ADMIN_TOKEN` for protected maintenance requests as a Worker secret. Never put this secret in the extension or commit it to Git. Both the generator and the evaluator use Workers AI and consume Cloudflare neurons.

```bash
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

Generate a category batch from a trusted terminal, with `V2_ADMIN_TOKEN` set to the same value as `ADMIN_TOKEN`:

```bash
curl "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/admin/generate" \
  -X POST \
  -H "Authorization: Bearer $V2_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"health"}'
```

Inspect the latest staged result through the protected endpoint:

```bash
curl "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/admin/staging?category=health" \
  -H "Authorization: Bearer $V2_ADMIN_TOKEN"
```

Run the automated tests from `worker`:

```bash
npm test
```

To create a clean Chrome Web Store package from the repository root:

```bash
./scripts/build-extension.sh
```

The resulting package is `dist/v2-extension-1.1.1.zip`.

## Privacy

V2 does not read browsing history or page contents. The extension sends the selected category, a random installation identifier, and recently shown prompt identifiers to the Worker when requesting a cached prompt. The repository's evaluator uses Workers AI; a previous deployed version may still use OpenAI until the Worker is updated. See the [privacy policy](PRIVACY.md) for details.
