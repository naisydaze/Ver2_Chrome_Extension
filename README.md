# 🌱 V2 — Your Self-Improvement Chrome Companion  
*Version 2 — the next version of you.*

**[→ Try it on Chrome (dev mode)](chrome://extensions/)(link coming soon!)**  
**[→ GitHub Repo](https://github.com/naisydaze/Ver2_Chrome_Extension)**

---

## ✨ What is V2?

**V2** is a motivational quote extension for Chrome, designed to align you with the best version of yourself. It’s a lightweight productivity companion that sends you gentle, timely nudges using curated quotes from categories like *Wisdom*, *Failure*, and *Success* — or your own custom ones.

Whether you're coding, studying, or simply navigating your day, V2 offers quiet moments of insight to help you reset and refocus.

---

## 🌟 Features

- 🔁 **Custom Notification Intervals**  
  Get reminded every 5 minutes, 3 hours, or whenever you want — with dropdown + custom interval support.

- 💬 **Quote Categories**  
  Choose from *Wisdom*, *Failure*, *Success* — or enter your own category (e.g. “Kindness” or “Focus”).

- 📥 **Gemini API Quote Fetching**  
  No scraping required — dynamically fetch quotes using Gemini 2.5 Flash.

- 🧘‍♀️ **Do Not Disturb Mode**  
  Mute notifications until midnight with one click.

- 💡 **Smart Preview Setting**  
  Toggle whether notifications show a full quote or a preview teaser (“Click to reveal”).

- 🖼️ **Minimal UI**  
  Designed with clean HTML, inline CSS, and optional TailwindCSS.

- 🔄 **Chrome Sync**  
  User settings persist across Chrome browsers/devices using `chrome.storage.sync`.

---

## 🧪 Screenshots (Coming Soon!)

---

## 🛠 Tech Stack

| Area | Tech |
|------|------|
| Frontend | Vanilla JS, HTML5 |
| Chrome APIs | `chrome.notifications`, `chrome.storage.sync`, `chrome.alarms` |
| Backend | Python (BeautifulSoup for scraping, for fallback quote caching) |
| AI 🚀| Gemini 2.5 Flash API for live quote generation |

---

## 🚀 Getting Started

### 🧩 Install Extension (Dev Mode)

1. Clone the repo:
   ```bash
   git clone https://github.com/naisydaze/Ver2_Chrome_Extension.git
   cd Ver2_Chrome_Extension
