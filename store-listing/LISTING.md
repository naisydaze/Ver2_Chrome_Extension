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

## Permission justifications

- `alarms`: schedules reminders at the interval selected by the user.
- `notifications`: displays the selected self-improvement prompts.
- `storage`: saves categories, reminder timing, deep-work status, an anonymous installation identifier, and recently displayed prompt identifiers.
- `https://v2-quote-api.shanaisyz.workers.dev/*`: retrieves cached prompt text from the V2 Cloudflare service.

## Data disclosure

V2 sends a selected preset category and a random installation identifier to its Cloudflare service. It does not send browsing history or page contents. See `PRIVACY.md` and host that document at a public URL before submission.

## Required listing assets

- Extension icon: `assets/icons/icon-128.png`
- Small promotional tile: `store-assets/v2-small-promo-440x280.png`
- Settings screenshot: `store-assets/v2-settings-1280x800.png`
