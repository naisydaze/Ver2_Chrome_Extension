# 🌱 V2 — Your Self-Improvement Chrome Companion  
*Version 2 — the next version of you.*

**[→ Try it on Chrome (dev mode)](chrome://extensions/)(link coming soon!)**  
**[→ GitHub Repo](https://github.com/naisydaze/Ver2_Chrome_Extension)**

---

## ✨ What is V2?

**V2** is a motivational prompt extension for Chrome, designed to align you with the best version of yourself. It’s a lightweight productivity companion that sends gentle, timely nudges across five preset categories: *Health*, *Career*, *Code*, *Wisdom*, and *Motivation*.

Whether you're coding, studying, or simply navigating your day, V2 offers quiet moments of insight to help you reset and refocus.

---

## 🌟 Features

- 🔁 **Custom Notification Intervals**  
  Get reminded every 5 minutes, 3 hours, or whenever you want — with dropdown + custom interval support.

- 💬 **Prompt Categories**
  Choose from *Health*, *Career*, *Code*, *Wisdom*, and *Motivation*.

- 📥 **Resilient Quote Delivery**
  Bundled category-based quotes work offline, with an optional HTTPS backend integration for generated content.

- 🧘‍♀️ **Do Not Disturb Mode**  
  Start a timed deep-work block and resume notifications automatically when it ends.

- 🗂️ **Goal Categories & Active Hours**
  Organize prompts across goals such as Health, Career, and Code, and limit reminders to your preferred hours.

- 🖼️ **Minimal UI**  
  Designed with clean HTML, inline CSS, and optional TailwindCSS.

- 💾 **Local Persistence**
  Categories, active hours, and deep-work blocks persist locally using `chrome.storage.local`.

---

## 🧪 Screenshots (Coming Soon!)

---

## 🛠 Tech Stack

| Area | Tech |
|------|------|
| Frontend | Vanilla JS, HTML5 |
| Chrome APIs | `chrome.notifications`, `chrome.storage.local`, `chrome.alarms` |
| Backend | Python (BeautifulSoup for scraping, for fallback quote caching) |
| Content | Bundled local quotes with an optional server-side AI backend |

---

## 🚀 Getting Started

### 🧩 Install Extension (Dev Mode)

1. Clone the repo:
   ```bash
   git clone https://github.com/naisydaze/Ver2_Chrome_Extension.git
   cd Ver2_Chrome_Extension
   ```

### Optional AI prompt backend

The extension works offline with bundled prompts. The `worker/` project adds
original AI-generated prompts without exposing an API key in the extension.
Cloudflare Workers AI creates a protected maintenance batch, Workers KV caches it, and
the extension falls back to its bundled prompts whenever the backend is
unavailable.

1. Create a Cloudflare account, then install and authenticate Wrangler:

   ```bash
   cd worker
   npm install
   npx wrangler login
   ```

2. Find the extension ID on `chrome://extensions`. Replace
   `REPLACE_WITH_YOUR_EXTENSION_ID` in `worker/wrangler.jsonc` with that ID.

3. Complete Workers onboarding in the Cloudflare dashboard and choose your
   account's `workers.dev` subdomain. Workers AI always uses a remote binding,
   even while the Worker code runs locally, so this one-time account setup is
   required before testing AI generation.

4. Run the Worker locally and test its health endpoint:

   ```bash
   npm run dev
   curl http://localhost:8787/health
   ```

   If Wrangler offers to switch to local mode, that mode can test `/health` and
   the unit tests, but it cannot execute the Workers AI binding.

5. Deploy it. Wrangler automatically provisions the KV namespace declared in
   `wrangler.jsonc` and writes its generated ID back to that file:

   ```bash
   npm run deploy
   ```

6. Copy the resulting `https://...workers.dev/quote` URL into
   `QUOTE_BACKEND_URL` in `src/utils/quoteClient.js`.

7. Add only that Worker origin to `host_permissions` in `manifest.json`:

   ```json
   "host_permissions": ["https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/*"]
   ```

8. Create a secret used only for protected cache refreshes:

   ```bash
   npx wrangler secret put ADMIN_TOKEN
   ```

9. Deploy again, then generate all five preset caches from a trusted terminal:

   ```bash
   curl "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/admin/generate" \
     -X POST \
     -H "Authorization: Bearer $V2_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

   Set `V2_ADMIN_TOKEN` locally to the same secret entered into Wrangler. Never
   put this secret in the extension or commit it to Git.

10. Reload the unpacked extension on `chrome://extensions`. The public
    `/quote` endpoint only reads the cache and never invokes AI. Each extension
    installation sees all prompts in a batch before beginning a new cycle.

### Build the Chrome Web Store package

```bash
./scripts/build-extension.sh
```

Upload `dist/v2-extension-1.1.0.zip`. The package intentionally excludes the
Worker, development dependencies, screenshots, scraping scripts, and Git data.

Run the Worker unit tests at any time with:

```bash
cd worker
npm test
```
