# InterviewX

Interview practice in the browser: pick a target role, answer spoken questions on camera, and get structured feedback on what you said.

Built with vanilla HTML/CSS/JS and a single zero-dependency Node server (`server.js`) that proxies to the Groq API.

## What is actually AI (and what is not)

This README is deliberately precise about which features use an LLM. If it's not listed as LLM-powered, it isn't.

### LLM-powered (requires the server running with a `GROQ_API_KEY`)

| Feature | How it works |
|---|---|
| **Question generation** | `POST /api/questions` asks Groq `llama-3.1-8b-instant` for role-specific questions (your role + difficulty), returned as validated JSON. |
| **Answer feedback** | `POST /api/feedback` sends the question, your transcribed answer, and delivery metrics to the same model, which returns a 1–10 rubric score with a written justification, specific strengths, specific gaps, and one concrete suggestion. |

Every question set and every feedback card in the UI carries a badge saying whether it came from the **LLM** (green) or the **offline fallback** (yellow). The header shows a live status badge for the same thing.

### NOT AI — local features, honestly labeled

| Feature | What it really is |
|---|---|
| **Speech-to-text** | The browser's built-in Web Speech API (best in Chrome/Edge). Nothing we built; no LLM involved. |
| **Question voice** | Browser speech synthesis reading the question aloud. |
| **Offline question bank** | `data/questions.json` — 15 generic hardcoded questions, used only when the LLM is unavailable and labeled *"Built-in question bank — NOT AI-generated"* in the UI. |
| **Offline scoring fallback** | A word-count/filler-word/timing heuristic. It does **not** read your answer's content. Labeled *"Offline heuristic — not AI"* wherever it appears. |
| **"Visual presence" meter** | A brightness/stability heuristic on the webcam feed: are you in frame and is the scene stable. It is **not** face, emotion, or confidence detection, and the UI says so. |
| **Filler words / word count / response time** | Simple local counting and timers. |
| **Login/signup** | Browser `localStorage` only, Base64-"encoded" passwords. A demo, not real authentication — don't reuse a real password. |

## Quick start

Requires Node 18+ (no `npm install` needed — the server has zero dependencies).

```bash
# 1. Get a free API key at https://console.groq.com/keys
cp .env.example .env        # then paste your key into .env

# 2. Run
node server.js

# 3. Open http://localhost:3000 in Chrome or Edge
```

Grant microphone + camera permission when prompted, type a target role (e.g. *"Data Analyst"*), and press **Start Interview**.

Without a key (or if you open `index.html` directly as a file) the app still runs, but in **offline mode**: generic question bank, heuristic scoring, and yellow "not AI" labels everywhere.

## API

| Endpoint | Body | Returns |
|---|---|---|
| `GET /api/health` | – | `{ ok, llm: bool, model }` |
| `POST /api/questions` | `{ role, difficulty, count }` | `{ source: "llm", model, questions: [{ question, category, tips }] }` |
| `POST /api/feedback` | `{ question, answer, role, metrics }` | `{ source: "llm", model, score: 1-10, justification, strengths[], gaps[], suggestion }` |

Errors return proper status codes (`503` when no key is configured), and the frontend falls back to labeled offline mode.

The Groq key lives only on the server (`.env`, gitignored). It is never sent to the browser.

## Project structure

```
├── server.js           # Static host + Groq LLM endpoints (zero deps, Node 18+)
├── .env.example        # GROQ_API_KEY template
├── index.html
├── css/                # style.css (design system) · auth.css · dashboard.css
├── js/
│   ├── config.js       # App configuration (API paths, timings)
│   ├── ai-analysis.js  # AIService: LLM calls + labeled heuristic fallback
│   ├── app.js          # Interview flow
│   ├── auth.js         # localStorage demo auth
│   ├── camera.js       # Webcam + presence heuristic (not AI)
│   ├── speech.js       # Web Speech API wrapper (not AI)
│   ├── charts.js       # Chart.js live presence graph
│   ├── storage.js      # localStorage persistence
│   ├── ui.js           # Toasts + modals
│   └── utils.js
└── data/questions.json # Offline fallback question bank (not AI)
```

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| Camera | ✅ | ✅ | ✅ | ✅ |
| Speech recognition | ✅ | ✅ | ❌ | ⚠️ |
| Speech synthesis | ✅ | ✅ | ✅ | ✅ |

## Privacy

- Your transcribed answers are sent to the local server and forwarded to the Groq API for evaluation (when LLM mode is on). Video never leaves your machine — the presence heuristic runs entirely in your browser.
- Chrome's speech recognition may process audio on Google servers (that's how the Web Speech API works).
- Account data and history live only in your browser's localStorage.
