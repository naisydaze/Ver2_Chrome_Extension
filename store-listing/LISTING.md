# V2 Chrome Web Store listing

## Name

V2 — Self-Improvement Prompts

## Short description

Build better habits with focused, configurable self-improvement reminders.

## Single purpose

V2 delivers configurable self-improvement prompts through Chrome notifications, with category selection, active hours, and timed deep-work pauses.

## Detailed description

V2 is a lightweight reminder companion for deliberate personal growth. Choose from Health, Career, Code, Wisdom, and Motivation, then decide how often reminders should appear and when notifications are allowed.

Features:

- Five focused prompt categories
- Custom reminder intervals
- Active hours
- Timed Deep Work mode
- Cached AI-generated prompts with bundled offline fallbacks
- Preferences stored locally on your device

V2 does not read browsing history or page contents.

## What's new

### Version 1.1.1

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
- `storage`: saves categories, reminder timing, deep-work status, an anonymous installation identifier, and recently displayed prompt identifiers.
- `https://v2-quote-api.shanaisyz.workers.dev/*`: retrieves cached prompt text from the V2 Cloudflare service.

## Data disclosure

V2 sends a selected preset category, a random installation identifier, and recently shown prompt identifiers to its Cloudflare service. It does not send browsing history or page contents. For administrator-triggered quality checks, generated candidate prompts and their category are sent to OpenAI. See `PRIVACY.md` and host that document at a public URL before submission.

## Required listing assets

- Extension icon: `assets/icons/icon-128.png`
- Small promotional tile: `store-assets/v2-small-promo-440x280.png`
- Settings screenshot: `store-assets/v2-settings-1280x800.png`
