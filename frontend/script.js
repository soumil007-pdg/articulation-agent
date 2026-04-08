// Articulate AI Coach — Frontend Logic

class ArticulateCoach {
    constructor() {
        this.apiUrl        = 'http://localhost:8000/gemini';
        this.audioUploadUrl = 'http://localhost:8000/upload-audio';
        this.currentContext = 'prep';
        this.currentMode    = 'text';   // 'text' | 'audio'
        this.currentTopic   = '';

        // Text mode elements
        this.userInput              = document.getElementById('userInput');
        this.processBtn             = document.getElementById('processBtn');

        // Audio mode elements
        this.processAudioBtn        = document.getElementById('processAudioBtn');
        this.recordBtn              = document.getElementById('recordBtn');
        this.stopBtn                = document.getElementById('stopBtn');
        this.playBtn                = document.getElementById('playBtn');
        this.clearRecordingBtn      = document.getElementById('clearRecordingBtn');
        this.audioPlayback          = document.getElementById('audioPlayback');
        this.recorderLabel          = document.getElementById('recorderLabel');
        this.recorderTimer          = document.getElementById('recorderTimer');
        this.recorderIcon           = document.getElementById('recorderIcon');
        this.transcriptPreview      = document.getElementById('transcriptPreview');
        this.transcriptText         = document.getElementById('transcriptText');
        this.audioQuickStats        = document.getElementById('audioQuickStats');

        // Shared elements
        this.resultsContainer       = document.getElementById('results');
        this.loadingSkeleton        = document.getElementById('loadingSkeleton');
        this.practicePromptContainer = document.getElementById('practicePrompt');

        // Audio recording state
        this.mediaRecorder   = null;
        this.audioChunks     = [];
        this.audioBlob       = null;
        this.recordingTimer  = null;
        this.recordingSeconds = 0;
        this.MAX_SECONDS     = 5 * 60; // 5 minutes

        // Stored audio metrics from transcription (used for delivery scoring)
        this.audioMetrics = null;

        this.init();
    }

    // ── Initialisation ──────────────────────────────────────────────────────

    init() {
        this.handleAuth();
        this.setupEventListeners();
    }

    // ── Auth ────────────────────────────────────────────────────────────────

    handleAuth() {
        const stored = this.loadUser();
        if (stored) {
            this.showApp(stored.name);
        } else {
            document.getElementById('authOverlay').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
        }

        document.getElementById('authForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name  = document.getElementById('authName').value.trim();
            const email = document.getElementById('authEmail').value.trim();
            const errorEl = document.getElementById('authError');

            if (!name) { errorEl.textContent = 'Please enter your name.'; return; }
            if (!this.isValidEmail(email)) { errorEl.textContent = 'Please enter a valid email address.'; return; }

            errorEl.textContent = '';
            localStorage.setItem('articulate_user', JSON.stringify({ name, email }));
            this.showApp(name);
        });
    }

    showApp(name) {
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userNameDisplay').textContent = name;
    }

    loadUser() {
        try { return JSON.parse(localStorage.getItem('articulate_user')); }
        catch { return null; }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ── Event Listeners ─────────────────────────────────────────────────────

    setupEventListeners() {
        // Mode tabs
        document.getElementById('textModeTab').addEventListener('click', () => this.switchMode('text'));
        document.getElementById('audioModeTab').addEventListener('click', () => this.switchMode('audio'));

        // Context buttons (both text and audio sections share same context state)
        document.querySelectorAll('.context-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleContextSwitch(e));
        });

        // Practice prompts
        document.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.getPracticePrompt(e.currentTarget.dataset.topic));
        });

        // Text mode process button
        this.processBtn.addEventListener('click', () => this.processText());

        // Audio recording buttons
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.playBtn.addEventListener('click', () => this.playRecording());
        this.clearRecordingBtn.addEventListener('click', () => this.clearRecording());

        // Audio process button
        this.processAudioBtn.addEventListener('click', () => this.processAudio());
    }

    // ── Mode Switching ───────────────────────────────────────────────────────

    switchMode(mode) {
        this.currentMode = mode;
        this.clearResults();

        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        document.getElementById('textInputSection').style.display = mode === 'text' ? 'block' : 'none';
        document.getElementById('audioInputSection').style.display = mode === 'audio' ? 'block' : 'none';
    }

    handleContextSwitch(e) {
        // Sync both context selector groups
        const context = e.currentTarget.dataset.context;
        document.querySelectorAll('.context-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.context === context);
        });
        this.currentContext = context;
    }

    // ── Practice Prompts ─────────────────────────────────────────────────────

    getPracticePrompt(topic) {
        this.currentTopic = topic;
        const prompts = {
            introduction: "Imagine you're in a job interview. The interviewer says, 'Tell me about yourself.'",
            hobby: "Someone asks you about your favorite hobby. How would you describe it and why you enjoy it?",
            day: "A friend asks you, 'How was your day?' Describe a recent interesting day you had.",
        };
        const text = prompts[topic] || '';
        this.practicePromptContainer.textContent = `Prompt: ${text}`;
        this.practicePromptContainer.style.display = 'block';
        if (this.currentMode === 'text') this.userInput.focus();
    }

    // ── Audio Recording ──────────────────────────────────────────────────────

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.audioBlob   = null;
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(this.audioBlob);
                this.audioPlayback.src = url;
                this.audioPlayback.style.display = 'block';
                stream.getTracks().forEach(t => t.stop());
                this.setRecordingUI('stopped');
                this.uploadAndTranscribe();
            };

            this.mediaRecorder.start(1000); // collect data every second
            this.recordingSeconds = 0;
            this.startTimer();
            this.setRecordingUI('recording');

        } catch (err) {
            this.showError('Microphone access denied. Please allow microphone access and try again.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.stopTimer();
    }

    playRecording() {
        if (this.audioPlayback.src) {
            this.audioPlayback.play();
        }
    }

    clearRecording() {
        this.stopTimer();
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.audioBlob = null;
        this.audioChunks = [];
        this.audioMetrics = null;
        this.audioPlayback.src = '';
        this.audioPlayback.style.display = 'none';
        this.transcriptPreview.style.display = 'none';
        this.transcriptText.textContent = '';
        this.audioQuickStats.innerHTML = '';
        this.processAudioBtn.disabled = true;
        this.setRecordingUI('idle');
    }

    startTimer() {
        this.recordingTimer = setInterval(() => {
            this.recordingSeconds++;
            this.recorderTimer.textContent = `${this.formatTime(this.recordingSeconds)} / 5:00`;

            if (this.recordingSeconds >= this.MAX_SECONDS) {
                this.stopRecording();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    setRecordingUI(state) {
        const icon  = this.recorderIcon;
        const label = this.recorderLabel;

        icon.className = `recorder-icon ${state}`;

        if (state === 'recording') {
            label.textContent = 'Recording...';
            this.recordBtn.disabled = true;
            this.stopBtn.disabled   = false;
            this.playBtn.disabled   = true;
            this.clearRecordingBtn.disabled = false;
        } else if (state === 'stopped') {
            label.textContent = 'Recording complete';
            this.recordBtn.disabled = false;
            this.stopBtn.disabled   = true;
            this.playBtn.disabled   = false;
            this.clearRecordingBtn.disabled = false;
        } else if (state === 'transcribing') {
            label.textContent = 'Transcribing with Whisper...';
            this.recordBtn.disabled = true;
            this.stopBtn.disabled   = true;
            this.playBtn.disabled   = false;
            this.clearRecordingBtn.disabled = true;
        } else {
            // idle
            label.textContent = 'Ready to record';
            this.recorderTimer.textContent = '0:00 / 5:00';
            this.recordBtn.disabled = false;
            this.stopBtn.disabled   = true;
            this.playBtn.disabled   = true;
            this.clearRecordingBtn.disabled = true;
        }
    }

    // ── Upload & Transcribe ───────────────────────────────────────────────────

    async uploadAndTranscribe() {
        if (!this.audioBlob) return;

        this.setRecordingUI('transcribing');
        this.transcriptPreview.style.display = 'none';
        this.processAudioBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('audio', this.audioBlob, 'recording.webm');

            const response = await fetch(this.audioUploadUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Transcription failed');
            }

            const data = await response.json();
            this.audioMetrics = data;

            this.displayTranscriptPreview(data);
            this.setRecordingUI('stopped');
            this.processAudioBtn.disabled = false;

        } catch (error) {
            this.setRecordingUI('stopped');
            this.showError(`Transcription error: ${error.message}. Make sure the AI service is running on port 8001.`);
        }
    }

    displayTranscriptPreview(data) {
        this.transcriptText.textContent = data.transcript || '(no transcript)';
        this.fillerHighlightActive = false;

        const m = data.speech_metrics || {};
        const fillerTotal = m.total_filler_words || 0;
        const wpm = m.words_per_minute || 0;
        const duration = m.duration_seconds ? this.formatTime(Math.round(m.duration_seconds)) : '—';

        const fillerClickable = fillerTotal > 0
            ? `id="fillerStatChip" class="quick-stat ${fillerTotal > 5 ? 'stat-warn' : ''} filler-chip" title="Click to highlight fillers"`
            : `class="quick-stat ${fillerTotal > 5 ? 'stat-warn' : ''}"`;

        this.audioQuickStats.innerHTML = `
            <div class="quick-stat"><i class="fa-solid fa-clock"></i> ${duration}</div>
            <div class="quick-stat"><i class="fa-solid fa-tachometer-alt"></i> ${wpm} wpm</div>
            <div ${fillerClickable}>
                <i class="fa-solid fa-comment-slash"></i> ${fillerTotal} filler word${fillerTotal !== 1 ? 's' : ''}
            </div>
            <div class="quick-stat"><i class="fa-solid fa-pause"></i> ${m.total_pauses || 0} pause${(m.total_pauses || 0) !== 1 ? 's' : ''}</div>
        `;

        if (fillerTotal > 0) {
            document.getElementById('fillerStatChip').addEventListener('click', () => {
                this.toggleFillerHighlight();
            });
        }

        this.transcriptPreview.style.display = 'block';
    }

    toggleFillerHighlight() {
        const chip = document.getElementById('fillerStatChip');
        const fillerWords = (this.audioMetrics?.filler_words || []).map(f => f.word);
        const transcript = this.audioMetrics?.transcript || '';

        if (!fillerWords.length) return;

        this.fillerHighlightActive = !this.fillerHighlightActive;
        chip.classList.toggle('filler-chip-active', this.fillerHighlightActive);

        if (this.fillerHighlightActive) {
            // Build regex that matches any filler word, whole-word, case-insensitive
            const pattern = fillerWords
                .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))  // escape regex chars
                .join('|');
            const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

            this.transcriptText.innerHTML = transcript.replace(
                regex,
                match => `<mark class="filler-highlight">${match}</mark>`
            );
        } else {
            // Reset to plain text
            this.transcriptText.textContent = transcript;
        }
    }

    // ── Process Audio (full coaching pipeline) ───────────────────────────────

    async processAudio() {
        if (!this.audioMetrics || !this.audioMetrics.transcript) {
            this.showError('No transcript available. Please record audio first.');
            return;
        }

        const transcript = this.audioMetrics.transcript.trim();
        if (!transcript) {
            this.showError('The transcript is empty. Please try recording again more clearly.');
            return;
        }

        this.processAudioBtn.disabled = true;
        this.processAudioBtn.classList.add('loading');
        this.clearResults();
        this.loadingSkeleton.style.display = 'block';
        this.resultsContainer.style.display = 'none';

        // Stage 1: scoring (content + delivery) — both diagnostic, run in parallel
        // Hard stop if either fails — nothing meaningful to show without scores
        try {
            const [scoreResult, deliveryResult] = await this.withRetry(() => Promise.all([
                this.scoreText(transcript),
                this.scoreDelivery(this.audioMetrics),
            ]));
            this.displayScore(scoreResult);
            this.displayDeliveryScore(deliveryResult);
        } catch (err) {
            console.error('Scoring failed after all retries:', err);
            this.loadingSkeleton.style.display = 'none';
            this.resultsContainer.style.display = 'block';
            this.showError(`Scoring failed: ${err.message}. Please check your connection and try again.`);
            this.processAudioBtn.disabled = false;
            this.processAudioBtn.classList.remove('loading');
            return;
        }

        // Stage 2: vocab — retry × 3, fallback = transcript passthrough
        let vocabResult;
        try {
            vocabResult = await this.withRetry(() => this.enhanceVocabulary(transcript));
            this.displayStage1(transcript, vocabResult);
        } catch (err) {
            console.warn('Vocab stage failed after all retries, skipping…', err.message);
            vocabResult = { enhancedText: transcript, flashcards: [], explanation: '' };
            this.displayStageSkipped('stage1Section', 'Vocabulary enhancement unavailable right now — skipped.');
        }

        // Stage 3: structure — uses vocab output (or original transcript if vocab skipped)
        let structResult;
        try {
            structResult = await this.withRetry(() =>
                this.enhanceStructure(vocabResult.enhancedText, this.currentContext)
            );
            this.displayStage2(vocabResult.enhancedText, structResult);
        } catch (err) {
            console.warn('Structure stage failed after all retries, skipping…', err.message);
            structResult = {
                structurallyEnhancedText: vocabResult.enhancedText,
                method: { name: 'Framework', description: '' },
                breakdown: [],
            };
            this.displayStageSkipped('stage2Section', 'Structural coaching unavailable right now — skipped.');
        }

        // Stage 4: exercises — uses both; generic fallback if all retries fail
        try {
            const exercises = await this.withRetry(() =>
                this.generateExercises(this.currentTopic, this.currentContext, vocabResult, structResult)
            );
            this.displayStage3(exercises);
        } catch (err) {
            console.warn('Exercises stage failed after all retries, using generic fallback…', err.message);
            this.displayStage3({
                title: 'Practice Exercise',
                newTopic: 'Think of a recent experience at work or school.',
                instructions: 'Structure your response clearly and use precise language.',
                guidance: [
                    { step: 'Opening', question: 'What is the main point you want to make?' },
                    { step: 'Body',    question: 'What evidence or example supports it?' },
                    { step: 'Close',   question: 'What is your call to action or conclusion?' },
                ],
            });
        }

        this.loadingSkeleton.style.display = 'none';
        this.resultsContainer.style.display = 'block';
        this.processAudioBtn.disabled = false;
        this.processAudioBtn.classList.remove('loading');
    }

    // ── Delivery Scoring (audio-specific Gemini call) ────────────────────────

    async scoreDelivery(audioData) {
        const m = audioData.speech_metrics || {};
        const fillers = (audioData.filler_words || [])
            .map(f => `"${f.word}" (×${f.count})`).join(', ') || 'none';
        const longPauses = m.long_pauses || 0;
        const wpm = m.words_per_minute || 0;

        const prompt = `
            You are an expert speech coach. Analyze the following audio delivery metrics and provide delivery scores and specific actionable feedback.

            Audio Delivery Metrics:
            - Total words: ${m.total_words || 0}
            - Duration: ${m.duration_seconds || 0} seconds
            - Speech rate: ${wpm} words per minute (ideal: 120–150 wpm for professional speech)
            - Filler words used: ${fillers}
            - Total filler words: ${m.total_filler_words || 0}
            - Total pauses (>0.5s): ${m.total_pauses || 0}
            - Long pauses (>1.5s): ${longPauses}
            ${audioData.emotion ? `- Detected emotion: ${audioData.emotion}` : ''}

            Score each delivery dimension from 1–10. Provide a brief justification for each. Then write a short, direct paragraph of delivery feedback with 2–3 specific, actionable improvements.

            Respond in this exact JSON format:
            {
              "delivery_scores": {
                "fluency": {"score": 0, "justification": ""},
                "pacing": {"score": 0, "justification": ""},
                "confidence": {"score": 0, "justification": ""}
              },
              "overall_delivery_score": 0,
              "delivery_feedback": ""
            }
        `;
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayDeliveryScore(data) {
        const container = document.getElementById('deliveryScoresContainer');
        const scoresEl  = document.getElementById('deliveryScores');
        const feedbackContainer = document.getElementById('deliveryFeedbackContainer');
        const feedbackEl = document.getElementById('deliveryFeedback');

        container.style.display = 'block';
        feedbackContainer.style.display = 'block';

        scoresEl.innerHTML = '';
        const labels = { fluency: 'Fluency', pacing: 'Pacing', confidence: 'Confidence' };

        for (const [key, label] of Object.entries(labels)) {
            const value = data.delivery_scores?.[key];
            if (!value) continue;
            const item = document.createElement('div');
            item.className = 'score-item';
            item.innerHTML = `
                <div class="score-item-label">${label}</div>
                <div class="score-item-value">${value.score}/10</div>
                <div class="score-item-bar-container">
                    <div class="score-item-bar" style="width:${value.score * 10}%; background-color: hsl(${value.score * 12}, 80%, 60%);"></div>
                </div>
            `;
            scoresEl.appendChild(item);
        }

        feedbackEl.textContent = data.delivery_feedback || '';
    }

    // ── Text Processing ──────────────────────────────────────────────────────

    async processText() {
        const input = this.userInput.value.trim();
        if (!input) { this.showError('Please enter some text to improve!'); return; }

        this.processBtn.disabled = true;
        this.processBtn.classList.add('loading');
        this.clearResults();
        this.loadingSkeleton.style.display = 'block';
        this.resultsContainer.style.display = 'none';

        // Hide delivery sections (text mode has no audio metrics)
        document.getElementById('deliveryScoresContainer').style.display = 'none';
        document.getElementById('deliveryFeedbackContainer').style.display = 'none';

        // Stage 1: scoring — hard stop if fails (nothing meaningful to show without it)
        try {
            const scoreResult = await this.withRetry(() => this.scoreText(input));
            this.displayScore(scoreResult);
        } catch (err) {
            console.error('Scoring failed after all retries:', err);
            this.loadingSkeleton.style.display = 'none';
            this.resultsContainer.style.display = 'block';
            this.showError(`Scoring failed: ${err.message}. Please check your connection and try again.`);
            this.processBtn.disabled = false;
            this.processBtn.classList.remove('loading');
            return;
        }

        // Stage 2: vocab — retry × 3, fallback = original text passthrough
        let vocabResult;
        try {
            vocabResult = await this.withRetry(() => this.enhanceVocabulary(input));
            this.displayStage1(input, vocabResult);
        } catch (err) {
            console.warn('Vocab stage failed after all retries, skipping…', err.message);
            vocabResult = { enhancedText: input, flashcards: [], explanation: '' };
            this.displayStageSkipped('stage1Section', 'Vocabulary enhancement unavailable right now — skipped.');
        }

        // Stage 3: structure — uses vocab output (or original if vocab was skipped)
        let structResult;
        try {
            structResult = await this.withRetry(() =>
                this.enhanceStructure(vocabResult.enhancedText, this.currentContext)
            );
            this.displayStage2(vocabResult.enhancedText, structResult);
        } catch (err) {
            console.warn('Structure stage failed after all retries, skipping…', err.message);
            structResult = {
                structurallyEnhancedText: vocabResult.enhancedText,
                method: { name: 'Framework', description: '' },
                breakdown: [],
            };
            this.displayStageSkipped('stage2Section', 'Structural coaching unavailable right now — skipped.');
        }

        // Stage 4: exercises — uses both; if fails show a generic fallback exercise
        try {
            const exercises = await this.withRetry(() =>
                this.generateExercises(this.currentTopic, this.currentContext, vocabResult, structResult)
            );
            this.displayStage3(exercises);
        } catch (err) {
            console.warn('Exercises stage failed after all retries, using generic fallback…', err.message);
            this.displayStage3({
                title: 'Practice Exercise',
                newTopic: 'Think of a recent experience at work or school.',
                instructions: 'Structure your response clearly and use precise language.',
                guidance: [
                    { step: 'Opening', question: 'What is the main point you want to make?' },
                    { step: 'Body',    question: 'What evidence or example supports it?' },
                    { step: 'Close',   question: 'What is your call to action or conclusion?' },
                ],
            });
        }

        this.loadingSkeleton.style.display = 'none';
        this.resultsContainer.style.display = 'block';
        this.processBtn.disabled = false;
        this.processBtn.classList.remove('loading');
    }

    // ── Gemini Coaching Stages ───────────────────────────────────────────────

    async scoreText(text) {
        const prompt = `
            Analyze the following text on a scale of 1–10 across: Clarity, Conciseness, Vocabulary, Structure, Impact, Grammar, and Tone Match for a ${this.currentContext} context.
            Provide a brief justification for each score, an overall score, and a single key action item.

            Text: "${text}"

            Respond in this exact JSON format:
            {"scores":{"clarity":{"score":0,"justification":""},"conciseness":{"score":0,"justification":""},"vocabulary":{"score":0,"justification":""},"structure":{"score":0,"justification":""},"impact":{"score":0,"justification":""},"grammar":{"score":0,"justification":""},"tone":{"score":0,"justification":""}},"overallScore":0,"keyActionItem":""}
        `;
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayScore(data) {
        document.getElementById('overallScore').textContent = data.overallScore.toFixed(1);
        const detailedScoresEl = document.getElementById('detailedScores');
        detailedScoresEl.innerHTML = '';
        const scoreOrder = ['clarity', 'conciseness', 'vocabulary', 'structure', 'impact', 'grammar', 'tone'];
        for (const key of scoreOrder) {
            if (data.scores[key]) {
                const value = data.scores[key];
                const item  = document.createElement('div');
                item.className = 'score-item';
                const labels = { clarity: 'Clarity', conciseness: 'Conciseness', vocabulary: 'Vocabulary', structure: 'Structure', impact: 'Impact', grammar: 'Grammar', tone: 'Tone Match' };
                item.innerHTML = `<div class="score-item-label">${labels[key]}</div><div class="score-item-value">${value.score}/10</div><div class="score-item-bar-container"><div class="score-item-bar" style="width:${value.score * 10}%; background-color: hsl(${value.score * 12}, 80%, 60%);"></div></div>`;
                detailedScoresEl.appendChild(item);
            }
        }
        document.getElementById('keyAdvice').textContent = data.keyActionItem;
    }

    async enhanceVocabulary(text) {
        const prompt = `
            Analyze the text for a ${this.currentContext} context. Enhance ONLY the vocabulary.
            Rules: DO NOT change sentence structure. Identify 3–5 words to replace with potent synonyms. Rewrite the text replacing ONLY those words. Provide flashcards and a one-sentence explanation.
            Original Text: "${text}"
            Respond in this exact JSON format:
            {"enhancedText":"","explanation":"","flashcards":[{"original":"","new":"","definition":""}]}
        `;
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayStage1(originalText, data) {
        const comparisonContainer = document.getElementById('stage1-comparison');
        // Clear existing content
        comparisonContainer.innerHTML = '';

        // Build comparison block safely using textContent for user-controlled text
        const comparison = document.createElement('div');
        comparison.className = 'comparison';

        const beforeDiv = document.createElement('div');
        beforeDiv.className = 'before';
        const beforeHeading = document.createElement('h4');
        beforeHeading.textContent = 'Previous Version';
        const beforeParagraph = document.createElement('p');
        beforeParagraph.textContent = originalText;
        beforeDiv.appendChild(beforeHeading);
        beforeDiv.appendChild(beforeParagraph);

        const afterDiv = document.createElement('div');
        afterDiv.className = 'after';
        const afterHeading = document.createElement('h4');
        afterHeading.textContent = 'Enhanced Version';
        const afterParagraph = document.createElement('p');
        afterParagraph.textContent = data.enhancedText;
        afterDiv.appendChild(afterHeading);
        afterDiv.appendChild(afterParagraph);

        comparison.appendChild(beforeDiv);
        comparison.appendChild(afterDiv);
        comparisonContainer.appendChild(comparison);

        document.getElementById('stage1Explanation').textContent = data.explanation;
        const flashcardsContainer = document.getElementById('flashcards');
        flashcardsContainer.innerHTML = '';
        data.flashcards.forEach(card => {
            const flashcard = document.createElement('div');
            flashcard.className = 'flashcard';

            const p = document.createElement('p');
            const originalTextNode = document.createTextNode(card.original + ' \u279E '); // ➞
            const strong = document.createElement('strong');
            strong.textContent = card.new;
            p.appendChild(originalTextNode);
            p.appendChild(strong);

            const small = document.createElement('small');
            small.textContent = card.definition;

            flashcard.appendChild(p);
            flashcard.appendChild(small);

            flashcardsContainer.appendChild(flashcard);
        });
    }

    async enhanceStructure(text, context) {
        let prompt;
        if (context === 'star') {
            prompt = `You are an elite communication coach teaching the STAR method. Restructure the user's text to fit the Situation, Task, Action, Result framework. Explain the method and provide a breakdown of how you applied it to their text. User's Text: "${text}"
            Respond in this exact JSON format:
            {"structurallyEnhancedText":"","method":{"name":"The STAR Method","description":"STAR stands for Situation, Task, Action, Result. It's a storytelling framework for providing evidence of your skills, especially in interviews."}, "breakdown":[{"step":"Situation","explanation":""},{"step":"Task","explanation":""},{"step":"Action","explanation":""},{"step":"Result","explanation":""}]}`;
        } else if (context === 'logos') {
            prompt = `You are an elite communication coach teaching persuasive techniques. Restructure the user's text to include Ethos (credibility), Pathos (emotion), and Logos (logic). Explain the method and provide a breakdown. User's Text: "${text}"
            Respond in this exact JSON format:
            {"structurallyEnhancedText":"","method":{"name":"The Persuasive Trio","description":"This method uses Ethos (credibility), Pathos (emotion), and Logos (logic) to create a compelling and persuasive argument."}, "breakdown":[{"step":"Ethos (Credibility)","explanation":""},{"step":"Pathos (Emotion)","explanation":""},{"step":"Logos (Logic)","explanation":""}]}`;
        } else if (context === '5ws') {
            prompt = `You are an elite communication coach teaching the 5 Ws method for clarity. Restructure the user's text to clearly answer Who, What, When, Where, and Why. Explain the method and provide a breakdown. User's Text: "${text}"
            Respond in this exact JSON format:
            {"structurallyEnhancedText":"","method":{"name":"The 5 Ws Method","description":"This is a journalistic framework to ensure you convey information completely and concisely by covering the Who, What, When, Where, and Why."}, "breakdown":[{"step":"Who","explanation":""},{"step":"What","explanation":""},{"step":"When","explanation":""},{"step":"Where","explanation":""},{"step":"Why","explanation":""}]}`;
        } else {
            prompt = `You are an elite communication coach teaching the PREP method. Restructure the user's text using the Point, Reason, Example, Point framework. Explain the method and provide a breakdown. User's Text: "${text}"
            Respond in this exact JSON format:
            {"structurallyEnhancedText":"","method":{"name":"The PREP Method","description":"PREP stands for Point, Reason, Example, Point. It's a powerful framework for structuring your thoughts to be clear, concise, and persuasive."}, "breakdown":[{"step":"Point","explanation":""},{"step":"Reason","explanation":""},{"step":"Example","explanation":""},{"step":"Point (Conclusion)","explanation":""}]}`;
        }
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayStage2(previousText, data) {
        document.getElementById('stage2Before').textContent = previousText;
        document.getElementById('stage2After').textContent  = data.structurallyEnhancedText;
        document.getElementById('methodName').innerHTML      = `<i class="fa-solid fa-graduation-cap"></i> ${data.method.name}`;
        document.getElementById('methodDescription').textContent = data.method.description;
        const breakdownContainer = document.getElementById('methodBreakdown');
        breakdownContainer.innerHTML = '<h4>Your Thoughts, Restructured:</h4>';
        const breakdownList = document.createElement('ul');
        breakdownList.className = 'breakdown-list';
        data.breakdown.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${item.step}:</strong> ${item.explanation}`;
            breakdownList.appendChild(li);
        });
        breakdownContainer.appendChild(breakdownList);
    }

    async generateExercises(originalTopic, context, vocabData, structureData) {
        const prompts = {
            introduction: "Tell me about a project you are proud of.",
            hobby:        "Describe a skill you would like to learn and why.",
            day:          "Talk about a challenge you recently overcame.",
        };
        const newTopic   = prompts[originalTopic] || "Describe an interesting article you recently read.";
        const methodName = structureData?.method?.name || document.getElementById('methodName').textContent;

        // Build context from previous pipeline stages
        const vocabUpgrades = (vocabData?.flashcards || [])
            .map(c => `"${c.original}" → "${c.new}"`)
            .join(', ') || 'none';

        const prompt = `
            Create a practice exercise for a user who has just completed a two-stage coaching pipeline:
            1. Vocabulary upgrade — they improved these specific words: ${vocabUpgrades}
            2. Structural rewrite — they applied the "${methodName}" framework to organise their thoughts

            New Practice Topic: "${newTopic}"

            Design guiding questions that help them practice BOTH improvements together:
            - Encourage use of the upgraded vocabulary words naturally
            - Guide them to follow the "${methodName}" framework step by step

            Respond in this exact JSON format:
            {"title":"Practice: Vocab + ${methodName}","newTopic":"${newTopic}","instructions":"Apply both your vocabulary upgrades and the ${methodName} framework to this new topic.","guidance":[{"step":"...","question":"..."}]}
        `;
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayStage3(data) {
        document.getElementById('practice-exercise').innerHTML = `
            <h4>${data.title}</h4>
            <p><strong>New Practice Topic:</strong> ${data.newTopic}</p>
            <p><em>${data.instructions}</em></p>
            <ul class="guidance-list">
                ${data.guidance.map(item => `<li><strong>${item.step}:</strong> ${item.question}</li>`).join('')}
            </ul>
        `;
    }

    // ── Retry & Fallback Helpers ─────────────────────────────────────────────

    // Retries an async fn up to maxAttempts with exponential backoff.
    // Throws on the last failure so callers can handle it.
    async withRetry(fn, maxAttempts = 3, baseDelay = 1000) {
        let delay = baseDelay;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (err) {
                if (attempt === maxAttempts) throw err;
                console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms…`, err.message);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2; // 1s → 2s → 4s
            }
        }
    }

    // Shows a yellow "skipped" banner inside a section when a stage is bypassed.
    displayStageSkipped(sectionId, message) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.innerHTML = `<div class="stage-skipped">⚠️ ${message}</div>`;
            section.style.display = 'block';
        }
    }

    // ── API Helper ───────────────────────────────────────────────────────────

    async callGeminiAPI(prompt) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.text;
    }

    // ── Utility ──────────────────────────────────────────────────────────────

    showError(message) {
        alert(message);
    }

    clearResults() {
        this.resultsContainer.style.display = 'none';
        document.getElementById('detailedScores').innerHTML   = '';
        document.getElementById('deliveryScores').innerHTML   = '';
        document.getElementById('stage1-comparison').innerHTML = '';
        document.getElementById('flashcards').innerHTML       = '';
        document.getElementById('methodBreakdown').innerHTML  = '';
        document.getElementById('practice-exercise').innerHTML = '';
        document.getElementById('keyAdvice').textContent      = '';
        document.getElementById('stage1Explanation').textContent = '';
        document.getElementById('stage2Before').textContent   = '';
        document.getElementById('stage2After').textContent    = '';
        document.getElementById('methodName').innerHTML       = '';
        document.getElementById('methodDescription').textContent = '';
        document.getElementById('deliveryFeedback').textContent  = '';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ArticulateCoach();
});
