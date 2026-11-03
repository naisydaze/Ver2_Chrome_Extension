# V2 Privacy Policy

Effective date: November 3, 2026

V2 provides configurable self-improvement prompts through Chrome notifications.

## Data handled by the extension

V2 stores notification preferences, active hours, deep-work status, recently shown prompt identifiers, and a random installation identifier in `chrome.storage.local` on the user's device.

When requesting a cached AI-generated prompt, V2 sends only:

- one selected preset category (Health, Career, Code, Wisdom, or Motivation);
- the random installation identifier used for abuse prevention and rate limiting; and
- recently shown prompt identifiers, so the service can avoid repeats.

V2 does not collect or transmit browsing history, page contents, names, email addresses, precise location, advertising identifiers, financial information, or authentication credentials.

## Service providers

Requests are sent over HTTPS to a V2 Cloudflare Worker. Cloudflare provides request processing, rate limiting, key-value cache storage, operational logging, and Workers AI generation. As an internet service provider, Cloudflare may process technical request information such as IP addresses according to its own privacy terms.

Generated prompts are cached by category and shared across users. V2 does not store the random installation identifier in the prompt cache.

For batch quality checks, the Worker sends generated candidate prompts and their preset category to OpenAI. This maintenance request does not include a user's installation identifier, notification history, or browsing data.

## Purpose and sharing

Data is used only to deliver prompts, prevent abuse, diagnose failures, and maintain the service. V2 does not sell data or use it for advertising. Cloudflare processes extension requests; OpenAI receives generated candidate prompts and categories for quality checks, as described above. Data may also be disclosed when required by law.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Retention and control

Settings are stored locally on each device. On upgrade from version 1.0, V2 reads the previous settings from Chrome's sync storage; subsequent settings changes are stored locally rather than synchronized. V2 does not delete the old sync values during migration.

Resetting preferences restores default settings. The installation identifier and prompt history are separate from preferences and remain until extension storage is cleared or the extension is removed. Cached prompts contain no user identifiers. Cloudflare retains platform logs according to the account's configured Cloudflare retention settings.

If the online service is unavailable, V2 uses prompts bundled with the extension.

## Contact

Privacy questions can be submitted through the repository's issue tracker: https://github.com/naisydaze/Ver2_Chrome_Extension/issues
