// **Final Version: Dynamic Method Coach (Green Theme)**

class ArticulateCoach {
    constructor() {
        this.apiUrl = 'http://localhost:8000/gemini';
        this.currentContext = 'prep'; // Default context
        this.userInput = document.getElementById('userInput');
        this.resultsContainer = document.getElementById('results');
        this.loadingSkeleton = document.getElementById('loadingSkeleton');
        this.practicePromptContainer = document.getElementById('practicePrompt');
        this.processBtn = document.getElementById('processBtn');
        this.currentTopic = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.context-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleContextSwitch(e));
        });
        document.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.getPracticePrompt(e.currentTarget.dataset.topic));
        });
        this.processBtn.addEventListener('click', () => this.processText());
    }

    async getPracticePrompt(topic) {
        this.currentTopic = topic;
        let promptText = '';
        switch (topic) {
            case 'introduction':
                promptText = "Imagine you're in a job interview. The interviewer says, 'Tell me about yourself.'";
                break;
            case 'hobby':
                promptText = "Someone asks you about your favorite hobby. How would you describe it and why you enjoy it?";
                break;
            case 'day':
                promptText = "A friend asks you, 'How was your day?' Describe a recent interesting day you had.";
                break;
        }
        this.practicePromptContainer.innerHTML = `<i class="fa-solid fa-lightbulb"></i> **Prompt:** ${promptText}`;
        this.practicePromptContainer.style.display = 'block';
        this.userInput.focus();
    }

    async processText() {
        const input = this.userInput.value.trim();
        if (!input) {
            this.showError('Please enter some text to improve!');
            return;
        }

        this.processBtn.disabled = true;
        this.processBtn.classList.add('loading');
        
        this.clearResults();
        this.loadingSkeleton.style.display = 'block';
        this.resultsContainer.style.display = 'none';

        try {
            const scoreResult = await this.scoreText(input);
            this.displayScore(scoreResult);
            
            const stage1Result = await this.enhanceVocabulary(input);
            this.displayStage1(input, stage1Result);

            const stage2Result = await this.enhanceStructure(input, this.currentContext);
            this.displayStage2(input, stage2Result);
            
            const exercises = await this.generateExercises(this.currentTopic, this.currentContext);
            this.displayStage3(exercises);
            
            this.loadingSkeleton.style.display = 'none';
            this.resultsContainer.style.display = 'block';

        } catch (error) {
            console.error('Processing error:', error);
            this.loadingSkeleton.style.display = 'none';
            this.showError(`A critical error occurred: ${error.message}. Please check your backend server and API key.`);
        } finally {
            this.processBtn.disabled = false;
            this.processBtn.classList.remove('loading');
        }
    }

    async scoreText(text) {
        const prompt = `
            Analyze the following text on a scale of 1-10 across: Clarity, Conciseness, Vocabulary, Structure, Impact, Grammar, and Tone Match for a ${this.currentContext} context.
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
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                const labels = { clarity: 'Clarity', conciseness: 'Conciseness', vocabulary: 'Vocabulary', structure: 'Structure', impact: 'Impact', grammar: 'Grammar', tone: 'Tone Match' };
                // Restored red-to-green color logic
                scoreItem.innerHTML = `<div class="score-item-label">${labels[key]}</div><div class="score-item-value">${value.score}/10</div><div class="score-item-bar-container"><div class="score-item-bar" style="width: ${value.score * 10}%; background-color: hsl(${value.score * 12}, 80%, 60%);"></div></div>`;
                detailedScoresEl.appendChild(scoreItem);
            }
        }
        document.getElementById('keyAdvice').textContent = data.keyActionItem;
    }

    async enhanceVocabulary(text) { 
        const prompt = `
            Analyze the text for a ${this.currentContext} context. Enhance ONLY the vocabulary.
            Rules: DO NOT change sentence structure. Identify 3-5 words to replace with potent synonyms. Rewrite the text replacing ONLY those words. Provide flashcards and a one-sentence explanation.
            Original Text: "${text}"
            Respond in this exact JSON format:
            {"enhancedText":"","explanation":"","flashcards":[{"original":"","new":"","definition":""}]}
        `;
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayStage1(originalText, data) { 
        const comparisonContainer = document.getElementById('stage1-comparison');
        comparisonContainer.innerHTML = `<div class="comparison"><div class="before"><h4>Previous Version</h4><p>${originalText}</p></div><div class="after"><h4>Enhanced Version</h4><p>${data.enhancedText}</p></div></div>`;
        document.getElementById('stage1Explanation').textContent = data.explanation;
        const flashcardsContainer = document.getElementById('flashcards');
        flashcardsContainer.innerHTML = '';
        data.flashcards.forEach(card => {
            const flashcard = document.createElement('div');
            flashcard.className = 'flashcard';
            flashcard.innerHTML = `<p>${card.original} ➞ <strong>${card.new}</strong></p><small>${card.definition}</small>`;
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
        } else { // Default to PREP
            prompt = `You are an elite communication coach teaching the PREP method. Restructure the user's text using the Point, Reason, Example, Point framework. Explain the method and provide a breakdown. User's Text: "${text}"
            Respond in this exact JSON format:
            {"structurallyEnhancedText":"","method":{"name":"The PREP Method","description":"PREP stands for Point, Reason, Example, Point. It's a powerful framework for structuring your thoughts to be clear, concise, and persuasive."}, "breakdown":[{"step":"Point","explanation":""},{"step":"Reason","explanation":""},{"step":"Example","explanation":""},{"step":"Point (Conclusion)","explanation":""}]}`;
        }
        
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayStage2(previousText, data) { 
        document.getElementById('stage2Before').textContent = previousText;
        document.getElementById('stage2After').textContent = data.structurallyEnhancedText;
        document.getElementById('methodName').innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${data.method.name}`;
        document.getElementById('methodDescription').textContent = data.method.description;
        const breakdownContainer = document.getElementById('methodBreakdown');
        breakdownContainer.innerHTML = '<h4>Your Thoughts, Restructured:</h4>';
        const breakdownList = document.createElement('ul');
        breakdownList.className = 'breakdown-list';
        data.breakdown.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${item.step}:</strong> ${item.explanation}`;
            breakdownList.appendChild(listItem);
        });
        breakdownContainer.appendChild(breakdownList);
    }
    
    async generateExercises(originalTopic, context) {
        const prompts = {
            introduction: "Tell me about a project you are proud of.",
            hobby: "Describe a skill you would like to learn and why.",
            day: "Talk about a challenge you recently overcame."
        };
        const newTopic = prompts[originalTopic] || "Describe an interesting article you recently read.";
        const methodName = document.getElementById('methodName').textContent;

        const prompt = `
            Create a practice exercise for a user who just learned the "${methodName}" framework.
            New Topic: "${newTopic}". Provide guiding questions based on the framework.
            Respond in this exact JSON format:
            {"title":"Practice the ${methodName}","newTopic":"${newTopic}","instructions":"Use the guiding questions below to structure your thoughts on the new topic.","guidance":[{"step":"...","question":"..."}]}
        `;
        const response = await this.callGeminiAPI(prompt);
        return JSON.parse(response);
    }

    displayStage3(data) { 
        const exerciseContainer = document.getElementById('practice-exercise');
        exerciseContainer.innerHTML = `
            <h4>${data.title}</h4>
            <p><strong>New Practice Topic:</strong> ${data.newTopic}</p>
            <p><em>${data.instructions}</em></p>
            <ul class="guidance-list">
                ${data.guidance.map(item => `<li><strong>${item.step}:</strong> ${item.question}</li>`).join('')}
            </ul>
        `;
    }

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

    showError(message) {
        alert(message);
    }

    clearResults() { 
        this.resultsContainer.style.display = 'none';
        document.getElementById('detailedScores').innerHTML = '';
        document.getElementById('stage1-comparison').innerHTML = '';
        document.getElementById('flashcards').innerHTML = '';
        document.getElementById('methodBreakdown').innerHTML = '';
        document.getElementById('practice-exercise').innerHTML = '';
        document.getElementById('keyAdvice').textContent = '';
        document.getElementById('stage1Explanation').textContent = '';
        document.getElementById('stage2Before').textContent = '';
        document.getElementById('stage2After').textContent = '';
        document.getElementById('methodName').innerHTML = '';
        document.getElementById('methodDescription').textContent = '';
    }

    handleContextSwitch(e) {
        document.querySelectorAll('.context-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentContext = e.currentTarget.dataset.context;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ArticulateCoach();
});