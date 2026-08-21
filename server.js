// Articulate AI Coach — Backend Server (Gemini coaching + Groq Whisper transcription)

require('dotenv').config({ path: './api.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 8000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// Coaching calls (/coach) run on Gemini — Groq's free tier caps at 8000
// tokens/minute, which one coaching run nearly exhausts by itself. Whisper
// transcription (/upload-audio, via ai-service) stays on Groq: that's a
// separate quota and Gemini doesn't give reliable word-level timestamps,
// which the pacing/pause/filler metrics are built from.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);

// CORS: default to permissive for localhost dev; if ALLOWED_ORIGINS set, restrict
app.use(cors(ALLOWED_ORIGINS.length
    ? { origin: ALLOWED_ORIGINS }
    : {}));

app.use(express.json({ limit: '5mb' }));
// frontend/ is now a standalone TanStack Start app (its own Vite dev server) —
// Express no longer serves it as static files, it's a pure API backend.

// Multer: store audio in memory (max 100MB for 5-min audio)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripCodeFences(text) {
    if (!text) return text;
    // Strip ```json ... ``` or ``` ... ```
    return text
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
}

/**
 * A single coaching run can fire this back to back with other calls, which
 * can trip a per-minute rate limit. The upstream tells us how long to wait
 * via `retry-after`, so honour it rather than surfacing the 429 to the user.
 */
async function fetchWithRateLimitRetry(url, init, attempts = 3) {
    let response;
    for (let i = 0; i < attempts; i++) {
        response = await fetch(url, init);
        if (response.status !== 429 || i === attempts - 1) return response;

        const header = Number(response.headers.get('retry-after'));
        // Cap the wait so a long retry-after can't stall the request forever.
        const waitMs = Math.min(Number.isFinite(header) && header > 0 ? header * 1000 : 2000 * (i + 1), 12000);
        console.log(`⏳ Rate limit, retrying in ${waitMs}ms (attempt ${i + 1}/${attempts})...`);
        await new Promise((r) => setTimeout(r, waitMs));
    }
    return response;
}

async function callGemini(prompt, maxTokens = 2048) {
    if (!GEMINI_API_KEY) {
        const e = new Error('GEMINI_API_KEY missing. Get a free key at https://aistudio.google.com/apikey and add it to api.env');
        e.code = 'NO_KEY';
        throw e;
    }

    const response = await fetchWithRateLimitRetry(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: 'You are an expert communication coach. Always respond with VALID JSON ONLY that exactly matches the schema requested below. Do not include any prose, markdown, or code fences — only raw JSON.\n\n' + prompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.5,
                // Same reasoning as before: callers size this per call so a
                // low cap doesn't truncate the JSON mid-object.
                maxOutputTokens: maxTokens,
                responseMimeType: 'application/json',
                // 2.5 Flash "thinks" before answering by default, and those
                // thinking tokens are drawn from the SAME maxOutputTokens
                // budget as the actual JSON — on a long coaching prompt it
                // was spending the whole budget thinking and leaving nothing
                // to write the answer, truncating mid-object every time.
                // This is a structured-extraction task, not a reasoning task,
                // so thinking buys nothing here.
                thinkingConfig: { thinkingBudget: 0 },
            },
        }),
    });

    if (response.status === 400 || response.status === 403) {
        const e = new Error('Gemini API key is invalid. Check it at https://aistudio.google.com/apikey');
        e.code = 'BAD_KEY';
        throw e;
    }
    if (response.status === 429) {
        const e = new Error('Gemini rate limit hit. Try again in a minute.');
        e.code = 'RATE_LIMIT';
        e.retryAfter = response.headers.get('retry-after');
        throw e;
    }
    if (!response.ok) {
        const body = await response.text();
        const e = new Error(`Gemini returned ${response.status}: ${body.slice(0, 200)}`);
        e.code = 'UPSTREAM';
        throw e;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    // MAX_TOKENS means the JSON was cut off mid-object, even when partial text
    // is present — a caller downstream can otherwise "successfully" parse a
    // salvaged fragment of it and silently lose whole sections. Fail loudly
    // instead, so callers retry with a bigger cap rather than saving garbage.
    if (candidate?.finishReason === 'MAX_TOKENS') {
        const e = new Error('Gemini response was cut off (increase maxTokens)');
        e.code = 'TRUNCATED';
        throw e;
    }
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return stripCodeFences(text);
}

// Render's free tier spins services down after ~15 min idle; waking one up
// can take 20-50s. Retry with backoff so a cold AI service doesn't surface
// as an immediate 500 to the user.
async function fetchWithRetry(url, options, { attempts = 4, delaysMs = [3000, 8000, 15000] } = {}) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 20000);
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(t);
            if (res.ok || (res.status < 500 && res.status !== 0)) return res;
            lastError = new Error(`Upstream returned ${res.status}`);
        } catch (err) {
            lastError = err;
        }
        if (i < delaysMs.length) {
            console.log(`⏳ AI service not ready yet, retrying in ${delaysMs[i]}ms (attempt ${i + 1}/${attempts})...`);
            await new Promise((r) => setTimeout(r, delaysMs[i]));
        }
    }
    throw lastError;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Main coaching endpoint (Gemini)
async function handleCoach(req, res) {
    try {
        const { prompt, maxTokens } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

        const requested = Number(maxTokens);
        const cap = Number.isFinite(requested) ? Math.min(Math.max(requested, 256), 6000) : 2048;
        const text = await callGemini(prompt, cap);
        res.json({ text });
    } catch (error) {
        console.error(`🔴 Coaching error [${error.code || '?'}]:`, error.message);
        const status = error.code === 'NO_KEY' || error.code === 'BAD_KEY' ? 401
                     : error.code === 'RATE_LIMIT' ? 429
                     : 500;
        res.status(status).json({
            error: error.message,
            code: error.code,
            ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
        });
    }
}

app.post('/coach', handleCoach);
app.post('/gemini', handleCoach); // Backwards-compat alias

// Audio upload → Whisper transcription
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' });
    }

    try {
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname || 'recording.webm',
            contentType: req.file.mimetype || 'audio/webm',
        });
        if (req.body?.context) form.append('context', String(req.body.context).slice(0, 300));

        // Buffer the multipart body up front so it can be safely resent on
        // each retry attempt — a FormData stream can only be read once.
        const formHeaders = form.getHeaders();
        const formBuffer = form.getBuffer();

        const aiResponse = await fetchWithRetry(`${AI_SERVICE_URL}/transcribe-audio`, {
            method: 'POST',
            body: formBuffer,
            headers: formHeaders,
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            const e = new Error(`Transcription service error: ${errText.slice(0, 200)}`);
            e.code = 'TRANSCRIBE_FAIL';
            throw e;
        }

        const data = await aiResponse.json();
        console.log(`✅ Transcription: ${data.speech_metrics?.total_words || 0} words`);
        res.json(data);
    } catch (error) {
        console.error('🔴 Audio error:', error.message);
        const friendly = error.cause?.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')
            ? 'Audio transcription service is not running. Start it with: python ai-service/main.py'
            : error.message;
        res.status(500).json({ error: friendly, code: error.code || 'AUDIO_FAIL' });
    }
});

// Fire-and-forget wake-up ping — called by the frontend as soon as the app
// loads, so the AI service (which sleeps on Render's free tier) starts
// spinning up well before the user finishes recording. Responds immediately
// so it never blocks page load; the outbound request to the AI service is
// given a long timeout so it actually rides out a full cold-start wake
// instead of being aborted early like the /health probe is.
app.post('/warm-ai', (req, res) => {
    res.status(202).json({ status: 'warming' });
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60000);
    fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal })
        .then(() => console.log('🔥 AI service warmed'))
        .catch(() => {})
        .finally(() => clearTimeout(t));
});

// Health endpoint — used by frontend on startup and by humans for diagnosis
app.get('/health', async (req, res) => {
    const health = {
        express: 'ok',
        port: PORT,
        python: 'unknown',
        gemini: GEMINI_API_KEY ? 'configured' : 'no-key',
        model: GEMINI_MODEL,
        timestamp: new Date().toISOString(),
    };

    // Probe Python service. Render free-tier services can take 20-50s to wake
    // from a cold start, so give the probe enough room to catch a service
    // that's already stirring rather than always reporting a false "down".
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
        clearTimeout(t);
        if (r.ok) {
            const body = await r.json();
            health.python = body.whisper === 'ready' ? 'ok' : 'partial';
            health.pythonDetail = body;
        } else {
            health.python = 'error';
        }
    } catch {
        health.python = 'down';
    }

    res.json(health);
});

// ── Startup ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🟢 Articulate AI backend listening on http://localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 AI service URL    : ${AI_SERVICE_URL}`);
    console.log(`🧠 Gemini model      : ${GEMINI_MODEL}`);
    if (GEMINI_API_KEY) {
        console.log('🔑 Gemini API key    : set');
    } else {
        console.log('⚠️  Gemini API key    : NOT SET');
        console.log('   ↳ Get a free key at https://aistudio.google.com/apikey');
        console.log('   ↳ Add to api.env as: GEMINI_API_KEY=your_key_here');
        console.log('   ↳ Coaching (/coach) will fail without it.');
    }
    // Whisper transcription is a separate concern, handled by ai-service with
    // its own GROQ_API_KEY — not reported here, see /health for its status.
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
