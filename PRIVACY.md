# V2 Privacy Policy

Effective date: November 2, 2026

V2 provides configurable self-improvement prompts through Chrome notifications.

## Data handled by the extension

V2 stores notification preferences, active hours, deep-work status, recently shown prompt identifiers, and a random installation identifier in `chrome.storage.local` on the user's device.

When requesting a cached AI-generated prompt, V2 sends only:

- one selected preset category (Health, Career, Code, Wisdom, or Motivation); and
- the random installation identifier used for abuse prevention and rate limiting.

V2 does not collect or transmit browsing history, page contents, names, email addresses, precise location, advertising identifiers, financial information, or authentication credentials.

## Service providers

Requests are sent over HTTPS to a V2 Cloudflare Worker. Cloudflare provides request processing, rate limiting, key-value cache storage, operational logging, and Workers AI generation. As an internet service provider, Cloudflare may process technical request information such as IP addresses according to its own privacy terms.

Generated prompts are cached by category and shared across users. V2 does not store the random installation identifier in the prompt cache.

## Purpose and sharing

Data is used only to deliver prompts, prevent abuse, diagnose failures, and maintain the service. V2 does not sell data, use it for advertising, or share it except with Cloudflare as necessary to provide the service or when required by law.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Retention and control

Local data remains until the extension is removed, its storage is cleared, or preferences are reset. Cached prompts contain no user identifiers. Cloudflare retains platform logs according to the account's configured Cloudflare retention settings.

If the online service is unavailable, V2 uses prompts bundled with the extension.

## Contact

Privacy questions can be submitted through the repository's issue tracker: https://github.com/naisydaze/Ver2_Chrome_Extension/issues
