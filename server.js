// Articulate AI Coach — Backend Server (Groq + Whisper)

require('dotenv').config({ path: './api.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 8000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.API_KEY || '';

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

async function callGroq(prompt) {
    if (!GROQ_API_KEY) {
        const e = new Error('GROQ_API_KEY missing. Get a free key at https://console.groq.com/keys and add it to api.env');
        e.code = 'NO_KEY';
        throw e;
    }

    const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert communication coach. Always respond with VALID JSON ONLY that exactly matches the schema requested in the user prompt. Do not include any prose, markdown, or code fences — only raw JSON.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.5,
            // Coaching responses are compact JSON; a lower cap reduces
            // per-request token pressure against the free-tier TPM limit.
            max_tokens: 2048,
            response_format: { type: 'json_object' },
        }),
    });

    if (response.status === 401) {
        const e = new Error('Groq API key is invalid. Check it at https://console.groq.com/keys');
        e.code = 'BAD_KEY';
        throw e;
    }
    if (response.status === 429) {
        const e = new Error('Groq rate limit hit. Try again in a minute.');
        e.code = 'RATE_LIMIT';
        e.retryAfter = response.headers.get('retry-after');
        throw e;
    }
    if (!response.ok) {
        const body = await response.text();
        const e = new Error(`Groq returned ${response.status}: ${body.slice(0, 200)}`);
        e.code = 'UPSTREAM';
        throw e;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from Groq');
    return stripCodeFences(text);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Main coaching endpoint (Groq)
async function handleCoach(req, res) {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

        const text = await callGroq(prompt);
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

        const aiResponse = await fetch(`${AI_SERVICE_URL}/transcribe-audio`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
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

// Health endpoint — used by frontend on startup and by humans for diagnosis
app.get('/health', async (req, res) => {
    const health = {
        express: 'ok',
        port: PORT,
        python: 'unknown',
        groq: GROQ_API_KEY ? 'configured' : 'no-key',
        model: GROQ_MODEL,
        timestamp: new Date().toISOString(),
    };

    // Probe Python service (with short timeout)
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1500);
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
    console.log(`🧠 Groq model        : ${GROQ_MODEL}`);
    if (GROQ_API_KEY) {
        console.log(`🔑 Groq API key      : set (${GROQ_API_KEY.slice(0, 7)}…)`);
    } else {
        console.log('⚠️  Groq API key      : NOT SET');
        console.log('   ↳ Get a free key at https://console.groq.com/keys');
        console.log('   ↳ Add to api.env as: GROQ_API_KEY=your_key_here');
        console.log('   ↳ Audio transcription still works without it.');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
