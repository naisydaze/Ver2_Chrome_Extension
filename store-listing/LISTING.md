# V2 Chrome Web Store listing

## Name

V2 — Self-Improvement Prompts

## Short description

Build better habits with focused, configurable self-improvement reminders.

## Single purpose

V2 delivers configurable self-improvement prompts through Chrome notifications, with category selection, active hours, and timed deep-work pauses.

## Detailed description

V2 is a lightweight reminder companion for deliberate personal growth. Choose from Health, Career, and Motivation, then decide how often reminders should appear and when notifications are allowed.

Features:

- Three focused prompt categories
- Custom reminder intervals
- Active hours
- Timed Deep Work mode
- Cached AI-generated prompts with bundled offline fallbacks
- Recent prompts saved locally, with an option to clear them
- Preferences stored locally on your device

V2 does not read browsing history or page contents.

## What's new

### Version 1.1.1

- Revisit or clear up to 20 recent reminders in settings.
- Requests shorter prompts for easier reading in notifications.

- Offers Health, Career, and Motivation, and asks affected users to review changed categories.
- Supports larger cached prompt batches and reduces repeats across up to 50 prompts per category.
- The accompanying Worker refreshes Health, Career, and Motivation batches twice daily after quality checks, once deployed.

- Improves migration of version 1.0 settings, including mapping Motivational to Motivation.
- Adds a settings review notice when a previous category or hidden-preview option is unavailable. Reminders are paused until affected users save their choices.
- Fixes an issue where Health could be re-enabled when another category was selected.

### Version 1.1.0

- Added five preset categories, active hours, and timed Deep Work pauses.
- Added cached AI-generated prompts and bundled offline fallback prompts.
- Updated the settings and popup interfaces.

### Version 1.0

- Introduced motivational reminders, category selection, custom intervals, and Do Not Disturb.

## Permission justifications

- `alarms`: schedules reminders at the interval selected by the user.
- `notifications`: displays the selected self-improvement prompts.
- `storage`: saves categories, reminder timing, deep-work status, an installation identifier, recently displayed prompt identifiers, and up to 20 recent prompt texts locally.
- `https://v2-quote-api.shanaisyz.workers.dev/*`: retrieves cached prompt text from the V2 Cloudflare service.

## Data disclosure

V2 sends a selected preset category, a random installation identifier, and recently shown prompt identifiers to its Cloudflare service. It does not send browsing history or page contents. The current Worker code uses Cloudflare Workers AI for generation and quality checks; an earlier deployed version may use OpenAI to evaluate generated candidates until the Worker is updated. See `PRIVACY.md` and host that document at a public URL before submission.

## Required listing assets

- Extension icon: `assets/icons/icon-128.png`
- Small promotional tile: `store-assets/v2-small-promo-440x280.png`
- Settings screenshot: replace `store-assets/v2-settings-1280x800.png` with a current screenshot showing the three categories and tabs before publishing.
