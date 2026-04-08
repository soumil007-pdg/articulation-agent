// Articulate AI Coach — Backend Server

require('dotenv').config({ path: './api.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const app = express();
const port = 8000;
const AI_SERVICE_URL = 'http://localhost:8001';

app.use(cors());
app.use(express.json());

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("🔴 FATAL ERROR: API_KEY not found in your api.env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const generationConfig = {
    responseMimeType: "application/json",
};

// Multer: store audio in memory (max 100MB for 5-min audio)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
});

// ── Existing: Text coaching via Gemini ────────────────────────────────────────
app.post('/gemini', async (req, res) => {
    console.log("✅ Gemini request received.");
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings, generationConfig });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        if (!response.text()) {
            throw new Error("Response was blocked by Gemini's safety filters.");
        }

        console.log("✅ Gemini responded successfully.");
        res.json({ text: response.text() });

    } catch (error) {
        console.error('🔴 Gemini error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── New: Audio upload → transcription via local Whisper AI service ─────────────
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
    console.log("🎤 Audio upload received.");

    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' });
    }

    try {
        // Forward audio to the Python AI service
        const form = new FormData();
        form.append('file', req.file.buffer, {
            filename: req.file.originalname || 'recording.webm',
            contentType: req.file.mimetype || 'audio/webm',
        });

        const aiResponse = await fetch(`${AI_SERVICE_URL}/transcribe-audio`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            throw new Error(`AI service error: ${errText}`);
        }

        const transcriptionData = await aiResponse.json();
        console.log(`✅ Transcription complete. Words: ${transcriptionData.speech_metrics?.total_words}`);

        // Return transcript + audio metrics to the frontend
        res.json(transcriptionData);

    } catch (error) {
        console.error('🔴 Audio processing error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🟢 Backend server is running at http://localhost:${port}`);
});
