// **Definitive Final server.js with Granular Scoring**

require('dotenv').config({ path: './api.env' });
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("🔴 FATAL ERROR: API_KEY not found in your api.env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Settings to be less restrictive and encourage JSON output
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- THIS IS THE NEW, CRITICAL ADDITION ---
// This tells the model that it MUST output a JSON object.
const generationConfig = {
    responseMimeType: "application/json",
};
// ------------------------------------------

app.post('/gemini', async (req, res) => {
    console.log("✅ Request received. Attempting to call Gemini...");
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            safetySettings,
            generationConfig // Add the new config here
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;

        // Check if the response was blocked despite our settings
        if (!response.text()) {
             console.error("🔴 Gemini blocked the response for safety reasons, even with relaxed settings.");
             throw new Error("Response was blocked by Gemini's safety filters. Try rephrasing your input.");
        }

        const text = response.text();
        console.log("✅ Successfully received a valid JSON response from Gemini.");
        res.json({ text });

    } catch (error) {
        console.error('🔴 CRITICAL SERVER ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🟢 Backend server is running perfectly at http://localhost:${port}`);
});