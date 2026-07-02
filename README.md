# Articulate AI Coach

Articulate AI is a web-based personal communication coach that helps users improve their writing and speaking. It scores your content + delivery, suggests vocabulary upgrades, restructures your message using proven frameworks (PREP, STAR, Persuasive Trio, 5 Ws), and generates guided practice exercises.

**Powered by:** [Groq](https://console.groq.com) (Llama 3 family) for coaching · OpenAI Whisper for transcription · localStorage for privacy.

## ⚡ Quick Start (3 steps)

1. **Get a free Groq API key** — 30-second signup, no credit card:
   👉 https://console.groq.com/keys

2. **Set up environment**
   ```sh
   git clone <repo-url>
   cd articulation-project
   npm install
   cp api.env.example api.env
   # Edit api.env and paste your Groq key
   ```

3. **Start both services**
   ```sh
   # Terminal 1 — Express backend (text coaching + serves frontend)
   node server.js

   # Terminal 2 — Python AI service (audio transcription)
   cd ai-service
   python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```

   Open http://localhost:8000 and start coaching!

## ✨ Features

- **Text & Audio modes** — Type, or record up to 5 minutes; Whisper transcribes locally.
- **4-stage coaching pipeline** — Scoring → Vocabulary → Structure → Practice Exercise.
- **4 communication frameworks** — PREP (Professional), STAR (Interview), Persuasive Trio (Pitch), 5 Ws (Casual).
- **Delivery analytics** (audio mode) — Speech rate, filler words, pauses, optional emotion detection.
- **Click-to-highlight** filler words in your transcript.
- **Session history** — Auto-saves every analysis to localStorage; revisit, star, delete, or export.
- **Export** — PDF, JSON, or copy summary to clipboard.
- **Dark mode** — Auto-detects system preference, or manually toggle.
- **Keyboard shortcuts** — ⌘+Enter to submit, R/S for record/stop, 1–4 for goals, ? for help.
- **Mobile responsive** — Works on phones, tablets, desktops.

## 🔧 Configuration (api.env)

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | _(required)_ | Your Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model to use |
| `AI_SERVICE_URL` | `http://localhost:8001` | Python service URL |
| `PORT` | `8000` | Express port |
| `ALLOWED_ORIGINS` | _(localhost)_ | CORS allowlist for production |

## 🩺 Troubleshooting

Run a health check: `curl http://localhost:8000/health`
- `groq: 'no-key'` → Add `GROQ_API_KEY` to `api.env`
- `python: 'down'` → Start the Python service: `python ai-service/main.py`
- `python: 'partial'` → Whisper loaded but emotion detection failed (this is fine)

## 🔐 Privacy

Your name, email, transcripts, and history all stay in `localStorage` on your device. The only data sent to the cloud is the coaching prompt → Groq (and audio → your local Whisper, not cloud). No analytics, no tracking.

## 🛠️ Architecture

```
┌───────────────────────────┐
│ Browser (frontend/)       │
│  - index.html / style.css │
│  - script.js              │
└───────────┬───────────────┘
            │ /coach, /upload-audio, /health
┌───────────▼──────────────┐    ┌──────────────────────┐
│ Express (server.js :8000) │───▶│ Groq API (cloud)     │
│  - Static file serving    │    │  llama-3.3-70b       │
│  - Health checks          │    └──────────────────────┘
│  - Audio multipart proxy  │
└───────────┬──────────────┘
            │ /transcribe-audio
┌───────────▼─────────────────┐
│ FastAPI (ai-service :8001)  │
│  - Whisper (base, CPU)      │
│  - Speech metrics extraction│
│  - Optional emotion (wav2vec)│
└─────────────────────────────┘
```
