// Articulate AI Coach — Frontend Logic
// Modules: Toast, ProgressUI, SessionHistory, Settings, ExportService,
//          KeyboardShortcuts, ArticulateCoach (main).

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ────────────────────────────────────────────────────────────────────────────
// Toast — replaces alert() with friendlier notifications
// ────────────────────────────────────────────────────────────────────────────
class Toast {
    static container = null;

    static init() {
        Toast.container = $('toastContainer');
    }

    static show(message, opts = {}) {
        const { type = 'info', title = null, duration = 5000 } = opts;
        const icons = {
            success: 'fa-circle-check',
            error:   'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info:    'fa-circle-info',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="toast-icon fa-solid ${icons[type] || icons.info}"></i>
            <div class="toast-body">
                ${title ? `<strong></strong>` : ''}
                <p></p>
            </div>
            <button class="toast-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        `;
        if (title) toast.querySelector('strong').textContent = title;
        toast.querySelector('p').textContent = message;

        const dismiss = () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 200);
        };
        toast.querySelector('.toast-close').onclick = dismiss;
        if (duration > 0) setTimeout(dismiss, duration);

        Toast.container.appendChild(toast);
        return toast;
    }

    static success(msg, title)   { return Toast.show(msg, { type: 'success', title }); }
    static error(msg, title = 'Error') { return Toast.show(msg, { type: 'error', title, duration: 7000 }); }
    static warning(msg, title)   { return Toast.show(msg, { type: 'warning', title }); }
    static info(msg, title)      { return Toast.show(msg, { type: 'info', title }); }
}

// ────────────────────────────────────────────────────────────────────────────
// ProgressUI — per-stage progress indicator
// ────────────────────────────────────────────────────────────────────────────
class ProgressUI {
    static container = null;
    static STEPS = ['score', 'vocab', 'structure', 'rhetoric', 'exercises'];

    static init() { ProgressUI.container = $('progressStages'); }

    static show() {
        $('emptyState').style.display = 'none';
        ProgressUI.container.style.display = 'grid';
        ProgressUI.STEPS.forEach((s) => ProgressUI.set(s, 'pending'));
    }

    static hide() { ProgressUI.container.style.display = 'none'; }

    static set(step, state) {
        const el = ProgressUI.container.querySelector(`[data-step="${step}"]`);
        if (!el) return;
        const icon = el.querySelector('.progress-step-icon');
        el.classList.remove('active', 'done', 'skipped', 'error');
        const ico = {
            pending: '<i class="fa-regular fa-circle"></i>',
            active:  '<i class="fa-solid fa-circle-notch fa-spin"></i>',
            done:    '<i class="fa-solid fa-circle-check"></i>',
            skipped: '<i class="fa-solid fa-triangle-exclamation"></i>',
            error:   '<i class="fa-solid fa-circle-xmark"></i>',
        };
        icon.innerHTML = ico[state] || ico.pending;
        if (state !== 'pending') el.classList.add(state);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// SessionHistory — localStorage persistence for past analyses
// ────────────────────────────────────────────────────────────────────────────
class SessionHistory {
    static KEY = 'articulate_sessions';
    static MAX_ENTRIES = 50;

    static load() {
        try { return JSON.parse(localStorage.getItem(SessionHistory.KEY)) || []; }
        catch { return []; }
    }

    static save(sessions) {
        localStorage.setItem(SessionHistory.KEY, JSON.stringify(sessions));
    }

    static add(session) {
        const sessions = SessionHistory.load();
        sessions.unshift(session);
        // FIFO cap
        if (sessions.length > SessionHistory.MAX_ENTRIES) sessions.length = SessionHistory.MAX_ENTRIES;
        SessionHistory.save(sessions);
        SessionHistory.renderBadge();
        return session;
    }

    static remove(id) {
        const next = SessionHistory.load().filter(s => s.id !== id);
        SessionHistory.save(next);
        SessionHistory.renderBadge();
    }

    static toggleStar(id) {
        const sessions = SessionHistory.load();
        const s = sessions.find(s => s.id === id);
        if (s) { s.starred = !s.starred; SessionHistory.save(sessions); }
    }

    static get(id) {
        return SessionHistory.load().find(s => s.id === id);
    }

    static clearAll() {
        SessionHistory.save([]);
        SessionHistory.renderBadge();
    }

    static renderBadge() {
        const count = SessionHistory.load().length;
        const badge = $('historyBadge');
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    static renderList() {
        const list = $('historyList');
        const sessions = SessionHistory.load();
        const empty = $('historyEmptyState');

        if (sessions.length === 0) {
            list.innerHTML = '';
            list.appendChild(empty);
            empty.style.display = 'block';
            return;
        }

        list.innerHTML = '';
        const contextEmoji = { prep: '💼', star: '⭐', logos: '🧠', '5ws': '😎' };

        for (const s of sessions) {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.dataset.id = s.id;

            const date = new Date(s.timestamp).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            });
            const preview = (s.input?.text || s.input?.transcript || '')
                .slice(0, 90).replace(/\s+/g, ' ');
            const score = s.overallScore?.toFixed?.(1) || '—';

            item.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-meta">
                        <span>${date}</span>
                        <span title="${s.context}">${contextEmoji[s.context] || ''}</span>
                        <span><i class="fa-solid fa-${s.mode === 'audio' ? 'microphone' : 'keyboard'}"></i></span>
                        <span class="history-item-score">${score}</span>
                    </div>
                    <div class="history-item-actions">
                        <button class="star-btn ${s.starred ? 'star-active' : ''}" title="Star"><i class="fa-solid fa-star"></i></button>
                        <button class="del-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div class="history-item-preview"></div>
            `;
            item.querySelector('.history-item-preview').textContent = preview || '(no input)';

            item.querySelector('.star-btn').onclick = (e) => {
                e.stopPropagation();
                SessionHistory.toggleStar(s.id);
                SessionHistory.renderList();
            };
            item.querySelector('.del-btn').onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete this session?')) {
                    SessionHistory.remove(s.id);
                    SessionHistory.renderList();
                }
            };
            item.onclick = () => window.app.loadSession(s.id);

            list.appendChild(item);
        }
    }

    static exportAll() {
        const data = SessionHistory.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `articulate-history-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    static genId() {
        return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Settings — preferences (theme, defaults, profile)
// ────────────────────────────────────────────────────────────────────────────
class Settings {
    static KEY = 'articulate_settings';

    static defaults = {
        defaultContext: 'prep',
        defaultMode: 'text',
        theme: 'auto',
    };

    static load() {
        try { return { ...Settings.defaults, ...(JSON.parse(localStorage.getItem(Settings.KEY)) || {}) }; }
        catch { return { ...Settings.defaults }; }
    }

    static save(patch) {
        const current = Settings.load();
        const updated = { ...current, ...patch };
        localStorage.setItem(Settings.KEY, JSON.stringify(updated));
        return updated;
    }

    static applyTheme(theme) {
        const root = document.documentElement;
        const useDark = theme === 'dark'
            || (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', useDark);
        // Toggle icon
        const icon = $('themeToggleBtn').querySelector('i');
        icon.className = useDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    static initialize() {
        const s = Settings.load();
        Settings.applyTheme(s.theme);

        // Sync changes to prefers-color-scheme when in 'auto'
        window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const current = Settings.load();
            if (current.theme === 'auto') Settings.applyTheme('auto');
        });
    }

    static cycleTheme() {
        const cur = Settings.load().theme;
        const next = cur === 'light' ? 'dark' : cur === 'dark' ? 'auto' : 'light';
        Settings.save({ theme: next });
        Settings.applyTheme(next);
        Toast.info(`Theme: ${next}`, null);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// ExportService — PDF, JSON, clipboard
// ────────────────────────────────────────────────────────────────────────────
class ExportService {
    static toClipboard(session) {
        const lines = [
            `Articulate AI Coach — Analysis`,
            `Date: ${new Date(session.timestamp).toLocaleString()}`,
            `Goal: ${session.context.toUpperCase()}`,
            `Overall Score: ${session.overallScore?.toFixed?.(1) || '—'} / 10`,
            ``,
            `KEY ACTION ITEM:`,
            session.results?.scores?.keyActionItem || '(none)',
            ``,
            `ORIGINAL TEXT:`,
            session.input?.text || session.input?.transcript || '(no input)',
        ];
        if (session.results?.vocab?.enhancedText) {
            lines.push('', 'VOCABULARY-ENHANCED:', session.results.vocab.enhancedText);
        }
        if (session.results?.structure?.structurallyEnhancedText) {
            lines.push('', 'STRUCTURALLY ENHANCED:', session.results.structure.structurallyEnhancedText);
        }
        const text = lines.join('\n');
        navigator.clipboard?.writeText(text).then(
            () => Toast.success('Summary copied to clipboard'),
            () => Toast.error('Could not access clipboard')
        );
    }

    static toJSON(session) {
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `articulate-${new Date(session.timestamp).toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('JSON downloaded');
    }

    static async toPDF(session) {
        if (!window.jspdf?.jsPDF) {
            Toast.error('PDF library not loaded yet. Try again in a moment.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'letter' });

        const W = doc.internal.pageSize.getWidth();
        let y = 56;
        const lh = 14;
        const margin = 56;
        const wrapWidth = W - 2 * margin;

        const writeLine = (text, size = 11, style = 'normal', color = [15, 23, 42]) => {
            doc.setFont('helvetica', style);
            doc.setFontSize(size);
            doc.setTextColor(...color);
            const lines = doc.splitTextToSize(String(text || ''), wrapWidth);
            for (const line of lines) {
                if (y > 740) { doc.addPage(); y = 56; }
                doc.text(line, margin, y);
                y += size * 1.25;
            }
        };

        const heading = (t) => { y += 8; writeLine(t, 14, 'bold', [20, 83, 45]); y += 4; };
        const subheading = (t) => { writeLine(t, 11, 'bold', [22, 163, 74]); };

        // Title
        writeLine('Articulate AI — Coaching Report', 22, 'bold', [20, 83, 45]);
        y += 6;
        writeLine(new Date(session.timestamp).toLocaleString(), 10, 'normal', [100, 116, 139]);
        writeLine(`Goal: ${session.context.toUpperCase()} · Mode: ${session.mode}`, 10, 'normal', [100, 116, 139]);
        y += 10;

        // Overall score
        heading('Overall Score');
        writeLine(`${session.overallScore?.toFixed?.(1) || '—'} / 10`, 28, 'bold', [22, 163, 74]);

        // Detailed scores
        if (session.results?.scores?.scores) {
            heading('Detailed Scores');
            const labels = { clarity: 'Clarity', conciseness: 'Conciseness', vocabulary: 'Vocabulary', structure: 'Structure', impact: 'Impact', grammar: 'Grammar', tone: 'Tone Match' };
            for (const [key, lbl] of Object.entries(labels)) {
                const v = session.results.scores.scores[key];
                if (!v) continue;
                writeLine(`${lbl}: ${v.score}/10 — ${v.justification}`);
            }
        }

        // Key action item
        if (session.results?.scores?.keyActionItem) {
            heading('Key Action Item');
            writeLine(session.results.scores.keyActionItem);
        }

        // Delivery (audio)
        if (session.results?.deliveryScores) {
            heading('Delivery Scores');
            const ds = session.results.deliveryScores.delivery_scores || {};
            for (const [k, v] of Object.entries(ds)) {
                writeLine(`${k}: ${v.score}/10 — ${v.justification}`);
            }
            if (session.results.deliveryScores.delivery_feedback) {
                y += 4;
                subheading('Delivery Feedback:');
                writeLine(session.results.deliveryScores.delivery_feedback);
            }
        }

        // Original input
        heading('Original Input');
        writeLine(session.input?.text || session.input?.transcript || '(no input)');

        // Vocab enhancement
        if (session.results?.vocab?.enhancedText) {
            heading('Vocabulary Enhanced');
            writeLine(session.results.vocab.enhancedText);
            if (session.results.vocab.flashcards?.length) {
                y += 4;
                subheading('Flashcards:');
                for (const f of session.results.vocab.flashcards) {
                    writeLine(`• ${f.original} → ${f.new} — ${f.definition}`);
                }
            }
        }

        // Structural enhancement
        if (session.results?.structure?.structurallyEnhancedText) {
            heading('Structurally Enhanced');
            writeLine(session.results.structure.structurallyEnhancedText);
            if (session.results.structure.method?.name) {
                y += 4;
                subheading(`Method: ${session.results.structure.method.name}`);
                writeLine(session.results.structure.method.description);
            }
        }

        // Rhetorical analysis
        if (session.results?.rhetoric) {
            const r = session.results.rhetoric;
            heading('Rhetorical Analysis');
            writeLine(`Rhetorical impact: ${r.rhetoricalScore ?? '—'}/10`);
            if (r.summary) writeLine(r.summary);
            for (const d of (r.devices || [])) {
                writeLine(`• ${d.name}: ${d.found ? `found — "${d.evidence}"` : 'not used'}`);
            }
            if (r.suggestion?.device) {
                y += 4;
                subheading(`Suggested device: ${r.suggestion.device}`);
                writeLine(r.suggestion.tip || '');
                if (r.suggestion.exampleRewrite) writeLine(`Example: "${r.suggestion.exampleRewrite}"`);
            }
        }

        // Exercise
        if (session.results?.exercises?.title) {
            heading('Practice Exercise');
            writeLine(session.results.exercises.title, 11, 'bold');
            writeLine(`Topic: ${session.results.exercises.newTopic}`);
            writeLine(session.results.exercises.instructions);
            for (const g of (session.results.exercises.guidance || [])) {
                writeLine(`• ${g.step}: ${g.question}`);
            }
        }

        const filename = `articulate-${new Date(session.timestamp).toISOString().slice(0,10)}.pdf`;
        doc.save(filename);
        Toast.success('PDF downloaded');
    }
}

// ────────────────────────────────────────────────────────────────────────────
// KeyboardShortcuts — single global key listener
// ────────────────────────────────────────────────────────────────────────────
class KeyboardShortcuts {
    static install(app) {
        document.addEventListener('keydown', (e) => {
            // Don't trigger letter shortcuts inside form fields
            const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
            const cmd = e.metaKey || e.ctrlKey;

            // Always-on shortcuts (regardless of input focus)
            if (cmd && e.key === 'Enter') {
                e.preventDefault();
                app.submit();
                return;
            }
            if (cmd && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                app.toggleSettings();
                return;
            }
            if (cmd && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                app.toggleHistory();
                return;
            }
            if (e.key === 'Escape') {
                app.closeAllModals();
                return;
            }

            // Letter shortcuts skipped when typing
            if (inField) return;

            if (e.key === '?') { e.preventDefault(); app.toggleShortcuts(); return; }
            if (e.key.toLowerCase() === 'r' && app.currentMode === 'audio') {
                e.preventDefault();
                if (!app.mediaRecorder || app.mediaRecorder.state === 'inactive') app.startRecording();
                return;
            }
            if (e.key.toLowerCase() === 's' && app.currentMode === 'audio') {
                e.preventDefault();
                if (app.mediaRecorder?.state === 'recording') app.stopRecording();
                return;
            }
            if (e.key.toLowerCase() === 't') { e.preventDefault(); app.switchMode('text'); return; }
            if (e.key.toLowerCase() === 'a') { e.preventDefault(); app.switchMode('audio'); return; }

            const idx = ['1', '2', '3', '4'].indexOf(e.key);
            if (idx >= 0) {
                e.preventDefault();
                const ctx = ['prep', 'star', 'logos', '5ws'][idx];
                app.setContext(ctx);
            }
        });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// DailyPractice — daily challenge, rotating skill focus, streak tracking
// ────────────────────────────────────────────────────────────────────────────
class DailyPractice {
    // One challenge per day, deterministic by date. Mix of storytelling,
    // persuasion, explanation, description, and impromptu formats.
    static CHALLENGES = [
        "Explain what you do (work or study) to a curious 10-year-old.",
        "Argue for one change you'd make in your city — in under a minute.",
        "Tell the story of a failure that taught you something important.",
        "Describe your favorite place as if the listener will never see it.",
        "Convince a skeptic to try your favorite hobby.",
        "Explain a complex idea you understand well, using one everyday analogy.",
        "Give a 60-second toast for someone you admire.",
        "Describe a small moment from this week that meant something.",
        "Pitch an idea you've had — any idea — as if to an investor.",
        "Retell the plot of a movie or book you love, and why it works.",
        "Argue the opposite of an opinion you actually hold.",
        "Explain how something works: coffee, elevators, the internet — your pick.",
        "Describe the best advice you ever received and how it changed you.",
        "Tell the story of how you met one of your closest friends.",
        "Persuade someone to visit your hometown.",
        "Explain a decision you're currently weighing — out loud, both sides.",
        "Describe a person who shaped you, so vividly a stranger could picture them.",
        "Give an acceptance speech for an award you'd love to win.",
        "Explain why a piece of music, art, or design moves you.",
        "Summarize the news story you followed most closely this month.",
        "Teach one thing you're good at, in three clear steps.",
        "Describe your morning routine and defend every part of it.",
        "Tell a story that starts with: 'The moment I walked in, I knew…'",
        "Argue why everyone should learn one specific skill.",
        "Describe a tradition — family, cultural, personal — and its meaning.",
        "Explain a mistake people commonly make in your field, and the fix.",
        "Recount the most interesting conversation you've had recently.",
        "Pitch yourself for your dream role in exactly three sentences, then expand.",
    ];

    // 7-day skill rotation grounded in the research base.
    static FOCUS_ROTATION = [
        { key: 'storytelling', name: 'Storytelling Arc', icon: 'fa-book-open',
          why: "TED speakers are coached on one arc: concrete moment → universal principle. Stories are remembered far better than facts alone (Stanford, Aaker).",
          drill: "Start today's answer with a specific moment (\"Last Tuesday at 9am…\") and end with the lesson it proves." },
        { key: 'pacing', name: 'Pacing & Strategic Pauses', icon: 'fa-gauge-high',
          why: "Great speakers average 120–150 wpm but vary it — slowing ~20% before key points. A deliberate 1–2s pause before your main idea signals importance.",
          drill: "Pause for a full second before your single most important sentence today. Silence is emphasis." },
        { key: 'fillers', name: 'Filler Elimination', icon: 'fa-comment-slash',
          why: "Listeners judge fluency within seconds; frequent fillers measurably lower perceived confidence. The fix is replacing fillers with silence, not talking faster.",
          drill: "When you feel an \"um\" coming, close your mouth and pause instead. Target: under 2 fillers total." },
        { key: 'vocabulary', name: 'Vocabulary Precision', icon: 'fa-pen-fancy',
          why: "Precision beats fanciness — the right word, not the rare one. Orwell: never use a long word where a short one will do. Precise verbs carry sentences.",
          drill: "Replace every \"very + adjective\" and every vague verb (do, get, make) with one precise word." },
        { key: 'structure', name: 'Structural Frameworks', icon: 'fa-sitemap',
          why: "Minto's Pyramid Principle (McKinsey): state the answer first, then support it. PREP and STAR exist because audiences retain structured messages far better.",
          drill: "Say your conclusion in the first sentence. Spend the rest proving it." },
        { key: 'rhetoric', name: 'Rhetorical Devices', icon: 'fa-scroll',
          why: "The gap between clear and Lincoln: rule of three, anaphora, antithesis. \"Of the people, by the people, for the people\" is a triple AND anaphora at once.",
          drill: "Work one rule-of-three into today's answer: \"X, Y, and Z.\" Let the third item land hardest." },
        { key: 'concreteness', name: 'Concreteness & Concision', icon: 'fa-cube',
          why: "\"Cut processing time from 3 days to 4 hours\" beats \"improved efficiency.\" Concrete language is more credible and more memorable (Heath, Made to Stick).",
          drill: "Include one real number and one named example. Then cut every word that carries no weight." },
    ];

    static dayIndex(date = new Date()) {
        // Days since epoch, local-time — stable for the whole calendar day
        return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
    }

    static todaysChallenge() {
        return DailyPractice.CHALLENGES[DailyPractice.dayIndex() % DailyPractice.CHALLENGES.length];
    }

    static todaysFocus() {
        return DailyPractice.FOCUS_ROTATION[new Date().getDay()];
    }

    static practiceDays() {
        // Set of local-date strings (YYYY-MM-DD) with at least one session
        const days = new Set();
        for (const s of SessionHistory.load()) {
            const d = new Date(s.timestamp);
            if (!isNaN(d)) days.add(d.toLocaleDateString('en-CA'));
        }
        return days;
    }

    static computeStreak() {
        const days = DailyPractice.practiceDays();
        if (days.size === 0) return 0;
        let streak = 0;
        const cursor = new Date();
        // A streak survives until you miss a full day — so if today has no
        // session yet, start counting from yesterday.
        if (!days.has(cursor.toLocaleDateString('en-CA'))) cursor.setDate(cursor.getDate() - 1);
        while (days.has(cursor.toLocaleDateString('en-CA'))) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        }
        return streak;
    }

    static sessionsThisWeek() {
        const weekAgo = Date.now() - 7 * 86400000;
        return SessionHistory.load().filter(s => new Date(s.timestamp).getTime() >= weekAgo).length;
    }

    static render() {
        const focus = DailyPractice.todaysFocus();
        const focusCard = $('dailyFocusCard');
        if (focusCard) {
            const label = focusCard.querySelector('.daily-card-label');
            label.innerHTML = `<i class="fa-solid ${focus.icon}"></i> Today's Focus`;
            $('focusName').textContent = focus.name;
            $('focusWhy').textContent = focus.why;
            $('focusDrill').textContent = `Drill: ${focus.drill}`;
        }
        const challengeEl = $('challengeText');
        if (challengeEl) challengeEl.textContent = DailyPractice.todaysChallenge();
        DailyPractice.renderStats();
    }

    static renderStats() {
        const streakEl = $('streakCount');
        const weekEl = $('weekCount');
        if (streakEl) streakEl.textContent = DailyPractice.computeStreak();
        if (weekEl) weekEl.textContent = DailyPractice.sessionsThisWeek();
        const chip = $('streakChip');
        if (chip) chip.classList.toggle('streak-hot', DailyPractice.computeStreak() >= 3);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// ProgressDashboard — trends computed from session history
// ────────────────────────────────────────────────────────────────────────────
class ProgressDashboard {
    static render() {
        const body = $('dashboardBody');
        if (!body) return;
        const sessions = SessionHistory.load().slice().reverse(); // chronological

        if (sessions.length === 0) {
            body.innerHTML = `
                <div class="dash-empty">
                    <i class="fa-solid fa-seedling"></i>
                    <p>No sessions yet — your progress will grow here.</p>
                    <small>Run your first analysis to start the streak.</small>
                </div>`;
            return;
        }

        const scores = sessions.map(s => s.overallScore || 0);
        const recent = scores.slice(-5);
        const earlier = scores.slice(0, -5);
        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const recentAvg = avg(recent);
        const earlierAvg = avg(earlier.length ? earlier : recent);
        const delta = recentAvg - earlierAvg;
        const best = Math.max(...scores);

        // Audio filler trend: fillers per 100 words per audio session
        const audioSessions = sessions.filter(s =>
            s.mode === 'audio' && s.input?.audioMetrics?.speech_metrics?.total_words > 0);
        const fillerRates = audioSessions.map(s => {
            const m = s.input.audioMetrics.speech_metrics;
            return { rate: (m.total_filler_words / m.total_words) * 100, wpm: m.words_per_minute };
        });

        const statChip = (icon, value, label, extraCls = '') => `
            <div class="dash-stat ${extraCls}">
                <i class="fa-solid ${icon}"></i>
                <strong>${value}</strong>
                <span>${label}</span>
            </div>`;

        let html = `
            <div class="dash-stats">
                ${statChip('fa-fire', DailyPractice.computeStreak(), 'day streak')}
                ${statChip('fa-list-check', sessions.length, 'total sessions')}
                ${statChip('fa-trophy', best.toFixed(1), 'best score')}
                ${statChip(delta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
                           `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`,
                           'recent trend', delta >= 0 ? 'dash-up' : 'dash-down')}
            </div>

            <h4 class="dash-section-title"><i class="fa-solid fa-chart-column"></i> Score per session (last ${Math.min(scores.length, 14)})</h4>
            <div class="dash-chart">
                ${scores.slice(-14).map(v => {
                    const h = Math.max(6, Math.round(v * 10));
                    const cls = v >= 8 ? 'dash-bar-good' : v >= 6 ? 'dash-bar-mid' : 'dash-bar-low';
                    return `<div class="dash-bar ${cls}" style="height:${h}%" title="${v.toFixed(1)}/10"><span>${v.toFixed(1)}</span></div>`;
                }).join('')}
            </div>`;

        if (fillerRates.length >= 2) {
            const firstRate = fillerRates[0].rate;
            const lastRate = fillerRates[fillerRates.length - 1].rate;
            const improving = lastRate <= firstRate;
            html += `
            <h4 class="dash-section-title"><i class="fa-solid fa-comment-slash"></i> Filler words per 100 words (audio sessions)</h4>
            <div class="dash-chart dash-chart-small">
                ${fillerRates.slice(-14).map(f => {
                    const h = Math.max(6, Math.min(100, Math.round(f.rate * 10)));
                    return `<div class="dash-bar ${f.rate <= 3 ? 'dash-bar-good' : f.rate <= 6 ? 'dash-bar-mid' : 'dash-bar-low'}" style="height:${h}%" title="${f.rate.toFixed(1)} per 100 words"><span>${f.rate.toFixed(1)}</span></div>`;
                }).join('')}
            </div>
            <p class="dash-note">${improving
                ? '📉 Trending down — exactly what you want. Fillers are shrinking.'
                : '📈 Fillers ticked up recently. Today\'s drill: pause instead of "um."'}</p>`;
        }

        // Per-dimension averages across recent sessions (content scores)
        const dims = ['clarity', 'conciseness', 'vocabulary', 'structure', 'impact', 'grammar', 'tone'];
        const dimLabels = { clarity: 'Clarity', conciseness: 'Conciseness', vocabulary: 'Vocabulary', structure: 'Structure', impact: 'Impact', grammar: 'Grammar', tone: 'Tone' };
        const dimAverages = dims.map(d => {
            const vals = sessions.map(s => s.results?.scores?.scores?.[d]?.score).filter(v => typeof v === 'number');
            return { d, avg: avg(vals), n: vals.length };
        }).filter(x => x.n > 0);

        if (dimAverages.length) {
            const weakest = dimAverages.slice().sort((a, b) => a.avg - b.avg)[0];
            html += `
            <h4 class="dash-section-title"><i class="fa-solid fa-braille"></i> Skill averages (all sessions)</h4>
            <div class="dash-dims">
                ${dimAverages.map(x => `
                    <div class="dash-dim">
                        <span class="dash-dim-label">${dimLabels[x.d]}</span>
                        <div class="dash-dim-bar-wrap"><div class="dash-dim-bar" style="width:${x.avg * 10}%"></div></div>
                        <span class="dash-dim-value">${x.avg.toFixed(1)}</span>
                    </div>`).join('')}
            </div>
            <p class="dash-note">🎯 Weakest link: <strong>${dimLabels[weakest.d]}</strong> (${weakest.avg.toFixed(1)}/10). Make it tomorrow's personal focus.</p>`;
        }

        body.innerHTML = html;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// ArticulateCoach — main app
// ────────────────────────────────────────────────────────────────────────────
class ArticulateCoach {
    constructor() {
        this.apiUrl = '/coach';
        this.audioUploadUrl = '/upload-audio';
        this.healthUrl = '/health';

        this.currentMode = 'text';
        this.currentContext = 'prep';
        this.currentAudience = 'general';
        this.currentTopic = '';

        // Audio state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.recordingTimer = null;
        this.recordingSeconds = 0;
        this.MAX_SECONDS = 5 * 60;
        this.audioMetrics = null;
        this.fillerHighlightActive = false;

        // Most recent results (for save/export)
        this.currentSession = null;
        this.viewingPast = false;

        this.init();
    }

    init() {
        Toast.init();
        ProgressUI.init();
        Settings.initialize();
        SessionHistory.renderBadge();

        const settings = Settings.load();
        this.currentMode = settings.defaultMode;
        this.currentContext = settings.defaultContext;

        this.handleAuth();
        this.setupEventListeners();
        this.checkBackendHealth();
        DailyPractice.render();
        this.setupRevealAnimations();

        // Apply defaults to UI once authed
        $$('.context-btn').forEach(b => b.classList.toggle('active', b.dataset.context === this.currentContext));
        if (this.currentMode === 'audio') this.switchMode('audio');

        KeyboardShortcuts.install(this);
        window.app = this;
    }

    // ── Scroll-reveal animations ───────────────────────────────────────────
    setupRevealAnimations() {
        if (!('IntersectionObserver' in window)
            || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        document.documentElement.classList.add('anim-ready');
        const observer = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add('in-view');
                    observer.unobserve(e.target);
                }
            }
        }, { threshold: 0.08 });

        $$('.stage-card, .daily-card, .main-card').forEach(el => observer.observe(el));

        // Cards inside #results start hidden; when results are shown later the
        // observer fires as they scroll in. Re-observe on each pipeline run in
        // case a card was already unobserved.
        this._revealObserver = observer;
    }

    replayReveals() {
        if (!this._revealObserver) return;
        $$('#results .stage-card').forEach(el => {
            el.classList.remove('in-view');
            this._revealObserver.observe(el);
        });
    }

    // ── Journey onboarding (Fabulous-style narrative) ──────────────────────
    static ARCHETYPES = {
        career:     { title: 'The Composed Candidate', context: 'star',  audience: 'interviewer',
                      note: 'Interview-sharp answers: one vivid story, zero hedging.' },
        leadership: { title: 'The Clear Leader',       context: 'prep',  audience: 'executives',
                      note: 'Conclusion first, evidence second — the way rooms actually listen.' },
        confidence: { title: 'The Steady Voice',       context: '5ws',   audience: 'general',
                      note: 'Everyday clarity, until speaking well stops feeling like a performance.' },
        ideas:      { title: 'The Idea Weaver',        context: 'logos', audience: 'general',
                      note: 'Your ideas deserve words as sharp as they are.' },
    };

    static STRUGGLE_NOTES = {
        rambling: 'We’ll start with structure — every session rebuilds your answer on a proven skeleton.',
        fillers:  'We’ll hunt your fillers — every recording highlights each "um" so you can watch them vanish.',
        nerves:   'We’ll train your delivery — pitch, pacing, and energy, coached from your own voice.',
        words:    'We’ll sharpen your vocabulary — every session swaps vague words for precise ones.',
    };

    handleAuth() {
        const stored = this.loadUser();
        if (stored) {
            this.showApp(stored.name);
        } else {
            this.startJourney();
        }
    }

    startJourney() {
        const overlay = $('journeyOverlay');
        overlay.style.display = 'flex';
        $('mainApp').style.display = 'none';

        const journey = { why: null, struggle: null };
        const scenes = $$('.journey-scene');
        const dots = $$('#journeyDots .dot');

        const go = (n) => {
            scenes.forEach((s, i) => s.classList.toggle('active', i === n));
            dots.forEach((d, i) => d.classList.toggle('active', i <= n));
            if (n === 3) this.renderArchetype(journey);
        };

        overlay.querySelector('[data-next]').addEventListener('click', () => go(1));

        $$('#whyChoices .choice-card').forEach(card => card.addEventListener('click', () => {
            journey.why = card.dataset.why;
            $$('#whyChoices .choice-card').forEach(c => c.classList.toggle('selected', c === card));
            setTimeout(() => go(2), 450);
        }));

        $$('#struggleChoices .choice-card').forEach(card => card.addEventListener('click', () => {
            journey.struggle = card.dataset.struggle;
            $$('#struggleChoices .choice-card').forEach(c => c.classList.toggle('selected', c === card));
            setTimeout(() => go(3), 450);
        }));

        const complete = (name) => {
            localStorage.setItem('articulate_user', JSON.stringify({ name, email: '' }));
            localStorage.setItem('articulate_journey', JSON.stringify(journey));
            this.applyJourneyDefaults(journey);
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('closing');
                this.showApp(name);
            }, 700);
        };

        $('journeyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('journeyName').value.trim();
            if (!name) { $('journeyError').textContent = 'Tell us your name — or walk as a guest below.'; return; }
            $('journeyError').textContent = '';
            complete(name);
        });

        $('journeySkipBtn').addEventListener('click', () => complete('Guest'));
    }

    renderArchetype(journey) {
        const arch = ArticulateCoach.ARCHETYPES[journey.why] || ArticulateCoach.ARCHETYPES.confidence;
        $('journeyArchetype').textContent = arch.title;
        const struggleNote = ArticulateCoach.STRUGGLE_NOTES[journey.struggle] || '';
        $('journeyPathNote').textContent = `${arch.note} ${struggleNote}`;
    }

    // The journey answers become real coaching defaults — goal + audience.
    applyJourneyDefaults(journey) {
        const arch = ArticulateCoach.ARCHETYPES[journey.why];
        if (!arch) return;
        this.currentContext = arch.context;
        this.currentAudience = arch.audience;
        $$('.context-btn').forEach(b => b.classList.toggle('active', b.dataset.context === arch.context));
        $$('.audience-btn').forEach(b => b.classList.toggle('active', b.dataset.audience === arch.audience));
        const settings = Settings.load();
        settings.defaultContext = arch.context;
        Settings.save(settings);
    }

    showApp(name) {
        $('mainApp').style.display = 'block';
        $('userNameDisplay').textContent = name;
    }

    // ── Celebration (session complete) ─────────────────────────────────────
    showCelebration(score, streak) {
        const overlay = $('celebrationOverlay');
        if (!overlay) return;

        const line = score >= 8.5 ? 'That was genuinely eloquent.'
            : score >= 7   ? 'Your clarity is growing.'
            : score >= 5.5 ? 'Progress — the path is working.'
            :                'Every master was once unclear. Keep walking.';
        $('celebrationLine').textContent = line;

        const streakEl = $('celebrationStreak');
        if (streak >= 2) {
            $('celebrationStreakText').textContent = `${streak}-day streak — don’t break it now`;
            streakEl.style.display = 'inline-flex';
        } else {
            streakEl.style.display = 'none';
        }

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        this.animateScore($('celebrationScore'), score || 0, 1100);
        this.spawnCelebrationParticles();
    }

    spawnCelebrationParticles() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const host = $('celebrationParticles');
        host.innerHTML = '';
        for (let i = 0; i < 26; i++) {
            const p = document.createElement('span');
            p.className = 'cel-particle' + (i % 3 === 0 ? ' gold' : '');
            p.style.left = Math.random() * 100 + '%';
            p.style.setProperty('--dur', (3.2 + Math.random() * 3) + 's');
            p.style.setProperty('--delay', (Math.random() * 1.6) + 's');
            p.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
            p.style.setProperty('--size', (6 + Math.random() * 8) + 'px');
            host.appendChild(p);
        }
    }

    hideCelebration() {
        const overlay = $('celebrationOverlay');
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        $('celebrationParticles').innerHTML = '';
        $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    loadUser() {
        try { return JSON.parse(localStorage.getItem('articulate_user')); }
        catch { return null; }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    signOut() {
        localStorage.removeItem('articulate_user');
        location.reload();
    }

    // ── Backend health ─────────────────────────────────────────────────────
    async checkBackendHealth() {
        try {
            const r = await fetch(this.healthUrl);
            const h = await r.json();
            const statusEl = $('backendStatus');
            if (statusEl) {
                statusEl.innerHTML = `Express: ${h.express} · Python: ${h.python} · Groq: ${h.groq}`;
            }
            if (h.groq === 'no-key') {
                Toast.warning(
                    'Add your free Groq API key to api.env to enable text coaching. Get one at console.groq.com/keys.',
                    'No API key set'
                );
            }
            if (h.python === 'down') {
                Toast.warning(
                    'Audio transcription service is offline. Start it with: python ai-service/main.py',
                    'Python service down'
                );
            }
        } catch (e) {
            console.warn('Health check failed', e);
        }
    }

    // ── Event Listeners ────────────────────────────────────────────────────
    setupEventListeners() {
        // Celebration overlay
        $('celebrationContinueBtn').addEventListener('click', () => this.hideCelebration());
        $('celebrationOverlay').addEventListener('click', (e) => {
            if (e.target === $('celebrationOverlay')) this.hideCelebration();
        });

        // Mode tabs
        $('textModeTab').addEventListener('click', () => this.switchMode('text'));
        $('audioModeTab').addEventListener('click', () => this.switchMode('audio'));

        // Context buttons
        $$('.context-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setContext(e.currentTarget.dataset.context));
        });

        // Practice prompts
        $$('.practice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.getPracticePrompt(e.currentTarget.dataset.topic));
        });

        // Audience buttons
        $$('.audience-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setAudience(e.currentTarget.dataset.audience));
        });

        // Daily challenge
        $('useChallengeBtn').addEventListener('click', () => this.useDailyChallenge());

        // Progress dashboard
        $('dashboardBtn').addEventListener('click', () => this.toggleDashboard());
        $('closeDashboardBtn').addEventListener('click', () => this.closeDashboard());
        $('dashboardBackdrop').addEventListener('click', () => this.closeDashboard());

        // Process buttons
        $('processBtn').addEventListener('click', () => this.processText());
        $('processAudioBtn').addEventListener('click', () => this.processAudio());

        // Recorder
        $('recordBtn').addEventListener('click', () => this.startRecording());
        $('stopBtn').addEventListener('click', () => this.stopRecording());
        $('playBtn').addEventListener('click', () => this.playRecording());
        $('clearRecordingBtn').addEventListener('click', () => this.clearRecording());

        // Header
        $('historyBtn').addEventListener('click', () => this.toggleHistory());
        $('themeToggleBtn').addEventListener('click', () => Settings.cycleTheme());
        $('settingsBtn').addEventListener('click', () => this.toggleSettings());
        $('shortcutsBtn').addEventListener('click', () => this.toggleShortcuts());

        // History drawer
        $('closeHistoryBtn').addEventListener('click', () => this.closeHistory());
        $('historyBackdrop').addEventListener('click', () => this.closeHistory());
        $('clearHistoryBtn').addEventListener('click', () => {
            if (confirm('Clear ALL session history? This cannot be undone.')) {
                SessionHistory.clearAll();
                SessionHistory.renderList();
                Toast.success('History cleared');
            }
        });
        $('exportAllBtn').addEventListener('click', () => SessionHistory.exportAll());

        // Settings modal
        $('closeSettingsBtn').addEventListener('click', () => this.closeSettings());
        $('settingsBackdrop').addEventListener('click', () => this.closeSettings());
        $('settingsName').addEventListener('change', (e) => this.updateProfile({ name: e.target.value }));
        $('settingsEmail').addEventListener('change', (e) => this.updateProfile({ email: e.target.value }));
        $('settingsDefaultContext').addEventListener('change', (e) => Settings.save({ defaultContext: e.target.value }));
        $('settingsDefaultMode').addEventListener('change', (e) => Settings.save({ defaultMode: e.target.value }));
        $('settingsTheme').addEventListener('change', (e) => {
            Settings.save({ theme: e.target.value });
            Settings.applyTheme(e.target.value);
        });
        $('signOutBtn').addEventListener('click', () => {
            if (confirm('Sign out and clear your profile?')) this.signOut();
        });
        $('clearAllDataBtn').addEventListener('click', () => {
            if (confirm('Wipe ALL data (profile, history, settings)? Cannot be undone.')) {
                localStorage.clear();
                location.reload();
            }
        });

        // Shortcuts modal
        $('closeShortcutsBtn').addEventListener('click', () => this.closeShortcuts());
        $('shortcutsBackdrop').addEventListener('click', () => this.closeShortcuts());

        // Results actions
        $('copySummaryBtn').addEventListener('click', () => {
            if (this.currentSession) ExportService.toClipboard(this.currentSession);
        });
        $('exportPdfBtn').addEventListener('click', () => {
            if (this.currentSession) ExportService.toPDF(this.currentSession);
        });
        $('exportJsonBtn').addEventListener('click', () => {
            if (this.currentSession) ExportService.toJSON(this.currentSession);
        });
    }

    updateProfile(patch) {
        const user = this.loadUser() || { name: '', email: '' };
        Object.assign(user, patch);
        localStorage.setItem('articulate_user', JSON.stringify(user));
        if (patch.name) $('userNameDisplay').textContent = patch.name;
    }

    // ── Mode/Context ───────────────────────────────────────────────────────
    switchMode(mode) {
        this.currentMode = mode;
        this.clearResults();

        $$('.mode-tab').forEach(t => t.classList.remove('active'));
        $(`${mode}ModeTab`).classList.add('active');

        $('textInputSection').style.display = mode === 'text' ? 'block' : 'none';
        $('audioInputSection').style.display = mode === 'audio' ? 'block' : 'none';

        $('processBtn').style.display = mode === 'text' ? 'block' : 'none';
        $('processAudioBtn').style.display = mode === 'audio' ? 'block' : 'none';
    }

    setContext(ctx) {
        this.currentContext = ctx;
        $$('.context-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.context === ctx);
        });
    }

    setAudience(aud) {
        this.currentAudience = aud;
        $$('.audience-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.audience === aud);
        });
    }

    // Register guidance injected into every coaching prompt so vocabulary,
    // tone, and structure advice match who the speaker is addressing.
    audienceLine() {
        const registers = {
            general:     'a general audience — plain, warm, jargon-free language',
            executives:  'senior executives — lead with the conclusion, be crisp, quantify impact, no fluff',
            technical:   'a technical team — precision matters, domain terms are fine, vagueness is not',
            interviewer: 'a job interviewer — confident first-person ownership, concrete achievements, no hedging',
            public:      'a live public audience — vivid, rhythmic, emotionally resonant language that lands when spoken aloud',
            friends:     'friends in casual conversation — natural, relaxed, and warm; formal phrasing would feel stiff',
        };
        return `The speaker is addressing ${registers[this.currentAudience] || registers.general}. Calibrate all advice, word choices, and tone to that audience.`;
    }

    useDailyChallenge() {
        const challenge = DailyPractice.todaysChallenge();
        const focus = DailyPractice.todaysFocus();
        this.currentTopic = 'daily-challenge';
        $('practicePrompt').textContent = `Today's Challenge: ${challenge}  ·  Focus: ${focus.name} — ${focus.drill}`;
        $('practicePrompt').style.display = 'block';
        $('practicePrompt').scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (this.currentMode === 'text') $('userInput').focus();
        Toast.info(`Focus on: ${focus.name}`, "Today's drill");
    }

    // ── Practice Prompts ───────────────────────────────────────────────────
    getPracticePrompt(topic) {
        this.currentTopic = topic;
        const prompts = {
            introduction: "Imagine you're in a job interview. The interviewer says, 'Tell me about yourself.'",
            hobby: "Someone asks you about your favorite hobby. How would you describe it and why you enjoy it?",
            day: "A friend asks you, 'How was your day?' Describe a recent interesting day you had.",
        };
        const text = prompts[topic] || '';
        $('practicePrompt').textContent = `Prompt: ${text}`;
        $('practicePrompt').style.display = 'block';
        if (this.currentMode === 'text') $('userInput').focus();
    }

    // ── Audio Recording ────────────────────────────────────────────────────
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.audioBlob = null;
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(this.audioBlob);
                $('audioPlayback').src = url;
                $('audioPlayback').style.display = 'block';
                stream.getTracks().forEach(t => t.stop());
                this.setRecordingUI('stopped');
                this.uploadAndTranscribe();
            };

            this.mediaRecorder.start(1000);
            this.recordingSeconds = 0;
            this.startTimer();
            this.setRecordingUI('recording');
        } catch (err) {
            Toast.error(
                'Microphone access blocked. Enable it in your browser settings.',
                'Cannot record'
            );
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.stopTimer();
    }

    playRecording() {
        if ($('audioPlayback').src) $('audioPlayback').play();
    }

    clearRecording() {
        this.stopTimer();
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.audioBlob = null;
        this.audioChunks = [];
        this.audioMetrics = null;
        $('audioPlayback').src = '';
        $('audioPlayback').style.display = 'none';
        $('transcriptPreview').style.display = 'none';
        $('transcriptText').textContent = '';
        $('audioQuickStats').innerHTML = '';
        $('processAudioBtn').disabled = true;
        this.setRecordingUI('idle');
    }

    startTimer() {
        this.recordingTimer = setInterval(() => {
            this.recordingSeconds++;
            $('recorderTimer').textContent = `${this.formatTime(this.recordingSeconds)} / 5:00`;
            if (this.recordingSeconds >= this.MAX_SECONDS) this.stopRecording();
        }, 1000);
    }

    stopTimer() {
        if (this.recordingTimer) { clearInterval(this.recordingTimer); this.recordingTimer = null; }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    setRecordingUI(state) {
        const icon = $('recorderIcon');
        const label = $('recorderLabel');
        icon.className = `recorder-icon ${state}`;

        if (state === 'recording') {
            label.textContent = 'Recording... speak naturally';
            $('recordBtn').disabled = true;
            $('stopBtn').disabled = false;
            $('playBtn').disabled = true;
            $('clearRecordingBtn').disabled = false;
        } else if (state === 'stopped') {
            label.textContent = 'Recording complete';
            $('recordBtn').disabled = false;
            $('stopBtn').disabled = true;
            $('playBtn').disabled = false;
            $('clearRecordingBtn').disabled = false;
        } else if (state === 'transcribing') {
            label.textContent = 'Transcribing... (can take 10–30s)';
            $('recordBtn').disabled = true;
            $('stopBtn').disabled = true;
            $('playBtn').disabled = false;
            $('clearRecordingBtn').disabled = true;
        } else {
            label.textContent = 'Ready to record';
            $('recorderTimer').textContent = '0:00 / 5:00';
            $('recordBtn').disabled = false;
            $('stopBtn').disabled = true;
            $('playBtn').disabled = true;
            $('clearRecordingBtn').disabled = true;
        }
    }

    async uploadAndTranscribe() {
        if (!this.audioBlob) return;
        this.setRecordingUI('transcribing');
        $('transcriptPreview').style.display = 'none';
        $('processAudioBtn').disabled = true;

        try {
            const formData = new FormData();
            formData.append('audio', this.audioBlob, 'recording.webm');
            // Prime Whisper with what the user is talking about — dramatically
            // improves recognition of on-topic words and names.
            const promptEl = $('practicePrompt');
            const speechContext = promptEl && promptEl.style.display !== 'none' ? promptEl.textContent.trim() : '';
            if (speechContext) formData.append('context', speechContext.slice(0, 200));
            const response = await fetch(this.audioUploadUrl, { method: 'POST', body: formData });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Transcription failed');
            }

            const data = await response.json();
            this.audioMetrics = data;
            this.displayTranscriptPreview(data);
            this.setRecordingUI('stopped');
            $('processAudioBtn').disabled = false;
        } catch (error) {
            this.setRecordingUI('stopped');
            Toast.error(error.message, 'Transcription error');
        }
    }

    displayTranscriptPreview(data) {
        $('transcriptText').textContent = data.transcript || '(no transcript)';
        this.fillerHighlightActive = false;

        const m = data.speech_metrics || {};
        const fillerTotal = m.total_filler_words || 0;
        const wpm = m.words_per_minute || 0;
        const duration = m.duration_seconds ? this.formatTime(Math.round(m.duration_seconds)) : '—';

        const fillerWarn = fillerTotal > 5 ? 'stat-warn' : '';
        $('audioQuickStats').innerHTML = `
            <div class="quick-stat"><i class="fa-solid fa-clock"></i> ${duration}</div>
            <div class="quick-stat"><i class="fa-solid fa-tachometer-alt"></i> ${wpm} wpm</div>
            <div ${fillerTotal > 0 ? `id="fillerStatChip" class="quick-stat ${fillerWarn} filler-chip" title="Click to highlight fillers in transcript"` : `class="quick-stat ${fillerWarn}"`}>
                <i class="fa-solid fa-comment-slash"></i> ${fillerTotal} filler${fillerTotal !== 1 ? 's' : ''}
            </div>
            <div class="quick-stat"><i class="fa-solid fa-pause"></i> ${m.total_pauses || 0} pause${(m.total_pauses || 0) !== 1 ? 's' : ''}</div>
        `;
        if (fillerTotal > 0) {
            $('fillerStatChip').addEventListener('click', () => this.toggleFillerHighlight());
        }
        $('transcriptPreview').style.display = 'block';
    }

    toggleFillerHighlight() {
        const chip = $('fillerStatChip');
        const fillerWords = (this.audioMetrics?.filler_words || []).map(f => f.word);
        const transcript = this.audioMetrics?.transcript || '';
        if (!fillerWords.length) return;

        this.fillerHighlightActive = !this.fillerHighlightActive;
        chip.classList.toggle('filler-chip-active', this.fillerHighlightActive);

        if (this.fillerHighlightActive) {
            const pattern = fillerWords
                .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|');
            const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
            $('transcriptText').innerHTML = transcript.replace(
                regex,
                match => `<mark class="filler-highlight"></mark>`
            ).replace(/<mark class="filler-highlight"><\/mark>/g, (_, ) => {
                return `<mark class="filler-highlight"></mark>`;
            });
            // Safer: rebuild via DOM manipulation
            const fragments = transcript.split(regex);
            $('transcriptText').textContent = '';
            for (let i = 0; i < fragments.length; i++) {
                if (i % 2 === 0) {
                    $('transcriptText').appendChild(document.createTextNode(fragments[i]));
                } else {
                    const mark = document.createElement('mark');
                    mark.className = 'filler-highlight';
                    mark.textContent = fragments[i];
                    $('transcriptText').appendChild(mark);
                }
            }
        } else {
            $('transcriptText').textContent = transcript;
        }
    }

    // ── Unified submit (for Cmd+Enter) ─────────────────────────────────────
    submit() {
        if (this.currentMode === 'text') this.processText();
        else if (this.currentMode === 'audio' && !$('processAudioBtn').disabled) this.processAudio();
    }

    // ── Process Text ───────────────────────────────────────────────────────
    async processText() {
        const input = $('userInput').value.trim();
        if (!input) { Toast.warning('Please enter some text to improve!'); return; }

        this.viewingPast = false;
        this.beginProcessing($('processBtn'));
        $('deliveryScoresContainer').style.display = 'none';
        $('deliveryFeedbackContainer').style.display = 'none';

        const session = this.makeSession({ text: input });
        await this.runPipeline(input, session);

        this.endProcessing($('processBtn'));
        this.finalizeSession(session);
    }

    // ── Process Audio ──────────────────────────────────────────────────────
    async processAudio() {
        if (!this.audioMetrics || !this.audioMetrics.transcript) {
            Toast.warning('No transcript available. Record first.');
            return;
        }
        const transcript = this.audioMetrics.transcript.trim();
        if (!transcript) {
            Toast.warning('Transcript is empty. Try recording again.');
            return;
        }

        this.viewingPast = false;
        this.beginProcessing($('processAudioBtn'));

        const session = this.makeSession({
            text: '',
            transcript,
            audioMetrics: this.audioMetrics,
        });

        // Score text + delivery in parallel
        ProgressUI.set('score', 'active');
        try {
            const [scoreResult, deliveryResult] = await this.withRetry(() => Promise.all([
                this.scoreText(transcript),
                this.scoreDelivery(this.audioMetrics),
            ]));
            this.displayScore(scoreResult);
            this.displayDeliveryScore(deliveryResult);
            this.renderVerbalCoaching(this.audioMetrics, deliveryResult);
            session.results.scores = scoreResult;
            session.results.deliveryScores = deliveryResult;
            session.overallScore = scoreResult.overallScore;
            ProgressUI.set('score', 'done');
        } catch (err) {
            ProgressUI.set('score', 'error');
            this.handlePipelineError(err, $('processAudioBtn'));
            return;
        }

        await this.runVocabStructureExercises(transcript, session);

        this.endProcessing($('processAudioBtn'));
        this.finalizeSession(session);
    }

    // ── Pipeline (common to text + audio after initial scoring) ────────────
    async runPipeline(input, session) {
        // 1. Score (hard stop on failure)
        ProgressUI.set('score', 'active');
        try {
            const scoreResult = await this.withRetry(() => this.scoreText(input));
            this.displayScore(scoreResult);
            session.results.scores = scoreResult;
            session.overallScore = scoreResult.overallScore;
            ProgressUI.set('score', 'done');
        } catch (err) {
            ProgressUI.set('score', 'error');
            this.handlePipelineError(err, $('processBtn'));
            return;
        }

        await this.runVocabStructureExercises(input, session);
    }

    async runVocabStructureExercises(input, session) {
        // Stage 2: Vocab
        ProgressUI.set('vocab', 'active');
        let vocabResult;
        try {
            vocabResult = await this.withRetry(() => this.enhanceVocabulary(input));
            this.displayStage1(input, vocabResult);
            session.results.vocab = vocabResult;
            ProgressUI.set('vocab', 'done');
        } catch (err) {
            console.warn('Vocab skipped:', err.message);
            vocabResult = { enhancedText: input, flashcards: [], explanation: '' };
            this.displayStageSkipped('stage1Section', 'Vocabulary enhancement unavailable — skipped.');
            ProgressUI.set('vocab', 'skipped');
        }

        // Stage 3: Structure
        ProgressUI.set('structure', 'active');
        let structResult;
        try {
            structResult = await this.withRetry(() => this.enhanceStructure(vocabResult.enhancedText, this.currentContext));
            this.displayStage2(vocabResult.enhancedText, structResult);
            session.results.structure = structResult;
            ProgressUI.set('structure', 'done');
        } catch (err) {
            console.warn('Structure skipped:', err.message);
            structResult = {
                structurallyEnhancedText: vocabResult.enhancedText,
                method: { name: 'Framework', description: '' },
                breakdown: [],
            };
            this.displayStageSkipped('stage2Section', 'Structural coaching unavailable — skipped.');
            ProgressUI.set('structure', 'skipped');
        }

        // Stage 4: Rhetorical devices
        ProgressUI.set('rhetoric', 'active');
        try {
            const rhetoricResult = await this.withRetry(() =>
                this.analyzeRhetoric(structResult.structurallyEnhancedText || input)
            );
            this.displayRhetoric(rhetoricResult);
            session.results.rhetoric = rhetoricResult;
            ProgressUI.set('rhetoric', 'done');
        } catch (err) {
            console.warn('Rhetoric skipped:', err.message);
            this.displayStageSkipped('rhetoricSection', 'Rhetorical analysis unavailable — skipped.');
            ProgressUI.set('rhetoric', 'skipped');
        }

        // Stage 5: Exercises
        ProgressUI.set('exercises', 'active');
        try {
            const exercises = await this.withRetry(() =>
                this.generateExercises(this.currentTopic, this.currentContext, vocabResult, structResult)
            );
            this.displayStage3(exercises);
            session.results.exercises = exercises;
            ProgressUI.set('exercises', 'done');
        } catch (err) {
            console.warn('Exercises fallback:', err.message);
            const fallback = {
                title: 'Practice Exercise',
                newTopic: 'Think of a recent experience at work or school.',
                instructions: 'Structure your response clearly and use precise language.',
                guidance: [
                    { step: 'Opening', question: 'What is the main point you want to make?' },
                    { step: 'Body',    question: 'What evidence or example supports it?' },
                    { step: 'Close',   question: 'What is your call to action or conclusion?' },
                ],
            };
            this.displayStage3(fallback);
            session.results.exercises = fallback;
            ProgressUI.set('exercises', 'skipped');
        }

        $('results').style.display = 'block';
        $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    beginProcessing(btn) {
        btn.disabled = true;
        btn.classList.add('loading');
        this.clearResults();
        this.replayReveals();
        ProgressUI.show();
        $('results').style.display = 'none';
        $('emptyState').style.display = 'none';
    }

    endProcessing(btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
        setTimeout(() => ProgressUI.hide(), 600);
    }

    handlePipelineError(err, btn) {
        this.endProcessing(btn);
        // Re-show empty state since no results will render
        $('emptyState').style.display = 'block';
        const msg = err.message || 'Unknown error';
        if (msg.includes('NO_KEY') || msg.includes('GROQ_API_KEY')) {
            Toast.error(
                'Backend has no Groq API key. Add GROQ_API_KEY to api.env (free at console.groq.com/keys).',
                'Setup needed'
            );
        } else if (msg.includes('BAD_KEY')) {
            Toast.error('Your Groq API key is invalid. Check it at console.groq.com/keys.', 'Auth failed');
        } else if (msg.includes('RATE_LIMIT')) {
            Toast.warning('Hit Groq free-tier rate limit. Wait a minute and retry.', 'Rate limited');
        } else {
            Toast.error(msg, 'Scoring failed');
        }
    }

    makeSession(input) {
        return {
            id: SessionHistory.genId(),
            timestamp: new Date().toISOString(),
            mode: this.currentMode,
            context: this.currentContext,
            audience: this.currentAudience,
            topic: this.currentTopic,
            input,
            results: {},
            overallScore: 0,
            starred: false,
        };
    }

    finalizeSession(session) {
        if (!session.results.scores) return; // failed before any results — don't save
        SessionHistory.add(session);
        SessionHistory.renderList();
        this.currentSession = session;
        $('historyBadgeLabel').style.display = 'none';
        DailyPractice.renderStats();
        const streak = DailyPractice.computeStreak();
        this.showCelebration(session.overallScore ?? 0, streak);
    }

    // ── Coaching Stages (Groq via backend) ─────────────────────────────────
    // What the speaker was responding to — lets the coach judge the text
    // against its intent instead of in a vacuum.
    intentLine() {
        const promptEl = $('practicePrompt');
        const activePrompt = promptEl && promptEl.style.display !== 'none' ? promptEl.textContent.trim() : '';
        if (activePrompt) return `The speaker was responding to this prompt: "${this.escapeForPrompt(activePrompt.slice(0, 220))}"`;
        return '';
    }

    async scoreText(text) {
        const prompt = `Analyze the following text on a scale of 1–10 across: Clarity, Conciseness, Vocabulary, Structure, Impact, Grammar, and Tone Match for a ${this.currentContext} context.
${this.audienceLine()}
${this.intentLine()}

First, state in ONE sentence what you understood the speaker's core message and intent to be (who/what they are referring to, and the point they are making). If the text seems to contain speech-to-text transcription errors (words that don't fit the context), interpret the intended meaning charitably rather than penalising the speaker.
Then provide a brief justification for each score, an overall score (average), and a single key action item.

Text: "${this.escapeForPrompt(text)}"

Respond in this exact JSON format:
{"interpretedMeaning":"","scores":{"clarity":{"score":0,"justification":""},"conciseness":{"score":0,"justification":""},"vocabulary":{"score":0,"justification":""},"structure":{"score":0,"justification":""},"impact":{"score":0,"justification":""},"grammar":{"score":0,"justification":""},"tone":{"score":0,"justification":""}},"overallScore":0,"keyActionItem":""}`;
        const response = await this.callBackend(prompt);
        return JSON.parse(response);
    }

    animateScore(el, target, duration = 900) {
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            el.textContent = (target * eased).toFixed(1);
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    displayScore(data) {
        this.animateScore($('overallScore'), data.overallScore || 0);

        // "What I heard" — the coach's one-sentence reading of your intent,
        // so you can immediately see whether it understood you.
        const interpreted = $('interpretedMeaning');
        const interpretedBox = $('interpretedContainer');
        if (interpreted && interpretedBox) {
            if (data.interpretedMeaning) {
                interpreted.textContent = data.interpretedMeaning;
                interpretedBox.style.display = 'block';
            } else {
                interpretedBox.style.display = 'none';
            }
        }
        const el = $('detailedScores');
        el.innerHTML = '';
        const order = ['clarity', 'conciseness', 'vocabulary', 'structure', 'impact', 'grammar', 'tone'];
        const labels = { clarity: 'Clarity', conciseness: 'Conciseness', vocabulary: 'Vocabulary', structure: 'Structure', impact: 'Impact', grammar: 'Grammar', tone: 'Tone Match' };
        for (const key of order) {
            if (!data.scores?.[key]) continue;
            const v = data.scores[key];
            const item = document.createElement('div');
            item.className = 'score-item';
            const lbl = document.createElement('div');
            lbl.className = 'score-item-label'; lbl.textContent = labels[key];
            const val = document.createElement('div');
            val.className = 'score-item-value'; val.textContent = `${v.score}/10`;
            const barC = document.createElement('div');
            barC.className = 'score-item-bar-container';
            const bar = document.createElement('div');
            bar.className = 'score-item-bar';
            bar.style.width = `${v.score * 10}%`;
            bar.style.backgroundColor = `hsl(${v.score * 12}, 75%, 55%)`;
            barC.appendChild(bar);
            item.append(lbl, val, barC);
            item.title = v.justification || '';
            el.appendChild(item);
        }
        $('keyAdvice').textContent = data.keyActionItem || '';
    }

    async scoreDelivery(audioData) {
        const m = audioData.speech_metrics || {};
        const p = audioData.prosody || null;
        const fillers = (audioData.filler_words || []).map(f => `"${f.word}" (×${f.count})`).join(', ') || 'none';
        const textEmotionLine = audioData.text_emotion
            ? `- Word-choice emotion (GoEmotion top-3): ${audioData.text_emotion.top3.map(e => `${e.label} (${Math.round(e.score * 100)}%)`).join(', ')}`
            : '';
        const audioEmotionLine = audioData.emotion ? `- Vocal emotion (audio signal): ${audioData.emotion}` : '';

        const prosodyLines = p ? [
            `- Pitch mean: ${p.pitch_mean_hz} Hz, std deviation: ${p.pitch_std_hz} Hz (>30 Hz std = expressive, <15 Hz = monotone)`,
            `- Vocal energy profile: ${p.energy_profile} (consistent/drops_at_end/spikes_mid/flat)`,
            `- Silence ratio: ${Math.round(p.silence_ratio * 100)}% of recording`,
            p.sentence_wpm && p.sentence_wpm.length > 0
                ? `- Per-sentence WPM: ${p.sentence_wpm.map(s => `"${s.sentence.substring(0,30)}…" → ${s.wpm} wpm`).join(' | ')}`
                : '',
            p.pauses_enriched && p.pauses_enriched.length > 0
                ? `- Key pauses: ${p.pauses_enriched.slice(0, 5).map(pa => `${pa.duration}s after "${pa.after_word}"${pa.before_word ? ` before "${pa.before_word}"` : ''}`).join(', ')}`
                : '',
        ].filter(Boolean).join('\n') : '';

        const prompt = `You are an expert speech coach. Analyze the following audio delivery metrics and provide delivery scores and specific actionable verbal coaching.

BASIC METRICS:
- Total words: ${m.total_words || 0}
- Duration: ${m.duration_seconds || 0} seconds
- Overall speech rate: ${m.words_per_minute || 0} wpm (ideal: 120–150 wpm)
- Filler words: ${fillers}
- Pauses (>0.5s): ${m.total_pauses || 0}, long pauses (>1.5s): ${m.long_pauses || 0}
${audioEmotionLine}
${textEmotionLine}

${prosodyLines ? `PROSODY & VOCAL ANALYSIS:\n${prosodyLines}` : ''}

Score each delivery dimension 1–10 with a brief justification. Then provide 5 specific verbal coaching tips based on the data above — each tip should reference actual numbers from the metrics and give a concrete action the speaker can take next time.

Respond in this exact JSON format:
{"delivery_scores":{"fluency":{"score":0,"justification":""},"pacing":{"score":0,"justification":""},"confidence":{"score":0,"justification":""}},"overall_delivery_score":0,"delivery_feedback":"","verbal_advice":{"pacing_tip":"","pause_tip":"","energy_tip":"","pitch_tip":"","emotion_alignment":""}}`;
        const response = await this.callBackend(prompt);
        return JSON.parse(response);
    }

    renderVerbalCoaching(audioData, deliveryData) {
        const card = $('verbalCoachingCard');
        if (!card) return;

        const p = audioData && audioData.prosody;
        const te = audioData && audioData.text_emotion;
        const va = deliveryData && deliveryData.verbal_advice;

        // Hide all sub-sections first
        ['verbalEmotionSection','verbalPacingSection','verbalEnergySection','verbalAdviceSection']
            .forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });

        let hasContent = false;

        // ── Emotion ──────────────────────────────────────────────────────────
        if (te && te.top3 && te.top3.length > 0) {
            const chipsEl = $('emotionChips');
            if (chipsEl) {
                chipsEl.innerHTML = te.top3.map(e => {
                    const pct = Math.round(e.score * 100);
                    return `<span class="emotion-chip" style="--pct:${pct}%">${e.label} <em>${pct}%</em></span>`;
                }).join('');
            }
            if (va && va.emotion_alignment) {
                const alignEl = $('emotionAlignmentText');
                if (alignEl) alignEl.textContent = va.emotion_alignment;
            }
            const sec = $('verbalEmotionSection');
            if (sec) sec.style.display = 'block';
            hasContent = true;
        }

        // ── Per-sentence pacing ───────────────────────────────────────────────
        if (p && p.sentence_wpm && p.sentence_wpm.length > 0) {
            const barsEl = $('wpmBars');
            if (barsEl) {
                const maxWpm = Math.max(...p.sentence_wpm.map(s => s.wpm), 200);
                barsEl.innerHTML = p.sentence_wpm.map(s => {
                    const cls = s.wpm < 100 ? 'slow' : s.wpm > 150 ? 'fast' : 'ideal';
                    const w = Math.round((s.wpm / maxWpm) * 100);
                    const label = s.sentence.length > 40 ? s.sentence.substring(0, 40) + '…' : s.sentence;
                    return `<div class="wpm-row">
                        <span class="wpm-label" title="${s.sentence}">${label}</span>
                        <div class="wpm-bar-wrap"><div class="wpm-bar wpm-${cls}" style="width:${w}%"></div></div>
                        <span class="wpm-value">${s.wpm}</span>
                    </div>`;
                }).join('');
            }
            const sec = $('verbalPacingSection');
            if (sec) sec.style.display = 'block';
            hasContent = true;
        }

        // ── Vocal energy ──────────────────────────────────────────────────────
        if (p && p.energy_profile) {
            const profileLabels = {
                consistent: { label: 'Consistent Energy', icon: 'fa-check-circle', cls: 'good' },
                drops_at_end: { label: 'Energy Drops at End', icon: 'fa-arrow-trend-down', cls: 'warn' },
                spikes_mid: { label: 'Energy Spikes Mid-Speech', icon: 'fa-chart-line', cls: 'info' },
                flat: { label: 'Flat / Monotone', icon: 'fa-minus', cls: 'warn' },
            };
            const badge = profileLabels[p.energy_profile] || profileLabels.consistent;
            const badgeEl = $('energyProfileBadge');
            if (badgeEl) {
                badgeEl.innerHTML = `<span class="energy-badge energy-${badge.cls}"><i class="fa-solid ${badge.icon}"></i> ${badge.label}</span>`;
                if (va && va.energy_tip) {
                    badgeEl.innerHTML += `<p class="verbal-subtext">${va.energy_tip}</p>`;
                }
            }

            // Mini energy chart (sparkline using CSS bars)
            const chartEl = $('energyChart');
            if (chartEl && p.energy_values && p.energy_values.length > 0) {
                const vals = p.energy_values;
                chartEl.innerHTML = vals.map(v =>
                    `<div class="energy-bar" style="height:${Math.round(v * 48)}px"></div>`
                ).join('');
            }
            const sec = $('verbalEnergySection');
            if (sec) sec.style.display = 'block';
            hasContent = true;
        }

        // ── Advice pills ──────────────────────────────────────────────────────
        if (va) {
            const tips = [
                { icon: 'fa-gauge-high', key: 'pacing_tip', label: 'Pacing' },
                { icon: 'fa-pause-circle', key: 'pause_tip', label: 'Pauses' },
                { icon: 'fa-bolt', key: 'energy_tip', label: 'Energy' },
                { icon: 'fa-music', key: 'pitch_tip', label: 'Pitch & Tone' },
            ].filter(t => va[t.key]);

            if (tips.length > 0) {
                const pillsEl = $('advicePills');
                if (pillsEl) {
                    pillsEl.innerHTML = tips.map(t =>
                        `<div class="advice-pill">
                            <div class="advice-pill-header"><i class="fa-solid ${t.icon}"></i> ${t.label}</div>
                            <p>${va[t.key]}</p>
                        </div>`
                    ).join('');
                }
                const sec = $('verbalAdviceSection');
                if (sec) sec.style.display = 'block';
                hasContent = true;
            }
        }

        card.style.display = hasContent ? 'block' : 'none';
    }

    displayDeliveryScore(data) {
        $('deliveryScoresContainer').style.display = 'block';
        $('deliveryFeedbackContainer').style.display = 'block';
        const el = $('deliveryScores');
        el.innerHTML = '';
        const labels = { fluency: 'Fluency', pacing: 'Pacing', confidence: 'Confidence' };
        for (const [key, lbl] of Object.entries(labels)) {
            const v = data.delivery_scores?.[key];
            if (!v) continue;
            const item = document.createElement('div');
            item.className = 'score-item';
            const lblEl = document.createElement('div');
            lblEl.className = 'score-item-label'; lblEl.textContent = lbl;
            const valEl = document.createElement('div');
            valEl.className = 'score-item-value'; valEl.textContent = `${v.score}/10`;
            const barC = document.createElement('div');
            barC.className = 'score-item-bar-container';
            const bar = document.createElement('div');
            bar.className = 'score-item-bar';
            bar.style.width = `${v.score * 10}%`;
            bar.style.backgroundColor = `hsl(${v.score * 12}, 75%, 55%)`;
            barC.appendChild(bar);
            item.append(lblEl, valEl, barC);
            item.title = v.justification || '';
            el.appendChild(item);
        }
        $('deliveryFeedback').textContent = data.delivery_feedback || '';
    }

    async enhanceVocabulary(text) {
        const prompt = `Analyze the text for a ${this.currentContext} context. Enhance ONLY the vocabulary.
${this.audienceLine()}
Rules: DO NOT change sentence structure. Identify 3–5 words to replace with more PRECISE words — precision over fanciness; never suggest a rare word where a plain one is sharper. Rewrite the text replacing ONLY those words. Provide flashcards and a one-sentence explanation.
Original Text: "${this.escapeForPrompt(text)}"
Respond in this exact JSON format:
{"enhancedText":"","explanation":"","flashcards":[{"original":"","new":"","definition":""}]}`;
        const response = await this.callBackend(prompt);
        return JSON.parse(response);
    }

    displayStage1(originalText, data) {
        // Restore section (in case it was previously marked as skipped)
        const stage1 = $('stage1Section');
        if (!$('stage1-comparison')) {
            stage1.innerHTML = `
                <h3><i class="fa-solid fa-pen-fancy"></i> Stage 1: Vocabulary Enhancement</h3>
                <div id="stage1-comparison"></div>
                <div class="explanation"><h5><i class="fa-solid fa-lightbulb"></i> Key Improvements</h5><p id="stage1Explanation"></p></div>
                <h4><i class="fa-solid fa-layer-group"></i> Interactive Flashcards</h4>
                <div class="flashcards" id="flashcards"></div>
            `;
        }
        const cmp = $('stage1-comparison');
        cmp.innerHTML = '';
        const comparison = document.createElement('div');
        comparison.className = 'comparison';
        const before = document.createElement('div'); before.className = 'before';
        const beforeH = document.createElement('h4'); beforeH.textContent = 'Previous Version';
        const beforeP = document.createElement('p'); beforeP.textContent = originalText;
        before.append(beforeH, beforeP);
        const after = document.createElement('div'); after.className = 'after';
        const afterH = document.createElement('h4'); afterH.textContent = 'Enhanced Version';
        const afterP = document.createElement('p'); afterP.textContent = data.enhancedText;
        after.append(afterH, afterP);
        comparison.append(before, after);
        cmp.appendChild(comparison);
        $('stage1Explanation').textContent = data.explanation || '';

        const fc = $('flashcards');
        fc.innerHTML = '';
        (data.flashcards || []).forEach(card => {
            const div = document.createElement('div');
            div.className = 'flashcard';
            const p = document.createElement('p');
            p.appendChild(document.createTextNode(`${card.original} ➞ `));
            const strong = document.createElement('strong');
            strong.textContent = card.new;
            p.appendChild(strong);
            const small = document.createElement('small');
            small.textContent = card.definition;
            div.append(p, small);
            fc.appendChild(div);
        });
    }

    async enhanceStructure(text, context) {
        let prompt;
        const ctx = this.escapeForPrompt(text);
        if (context === 'star') {
            prompt = `You are an elite communication coach teaching the STAR method. Restructure the user's text to fit the Situation, Task, Action, Result framework. Explain the method and provide a breakdown of how you applied it. User's Text: "${ctx}"
Respond in this exact JSON format:
{"structurallyEnhancedText":"","method":{"name":"The STAR Method","description":"STAR stands for Situation, Task, Action, Result. It's a storytelling framework for providing evidence of your skills, especially in interviews."},"breakdown":[{"step":"Situation","explanation":""},{"step":"Task","explanation":""},{"step":"Action","explanation":""},{"step":"Result","explanation":""}]}`;
        } else if (context === 'logos') {
            prompt = `You are an elite communication coach teaching persuasive techniques. Restructure the user's text to include Ethos (credibility), Pathos (emotion), and Logos (logic). Explain the method and provide a breakdown. User's Text: "${ctx}"
Respond in this exact JSON format:
{"structurallyEnhancedText":"","method":{"name":"The Persuasive Trio","description":"This method uses Ethos (credibility), Pathos (emotion), and Logos (logic) to create a compelling and persuasive argument."},"breakdown":[{"step":"Ethos (Credibility)","explanation":""},{"step":"Pathos (Emotion)","explanation":""},{"step":"Logos (Logic)","explanation":""}]}`;
        } else if (context === '5ws') {
            prompt = `You are an elite communication coach teaching the 5 Ws method for clarity. Restructure the user's text to clearly answer Who, What, When, Where, and Why. Explain the method and provide a breakdown. User's Text: "${ctx}"
Respond in this exact JSON format:
{"structurallyEnhancedText":"","method":{"name":"The 5 Ws Method","description":"This is a journalistic framework to ensure you convey information completely and concisely by covering the Who, What, When, Where, and Why."},"breakdown":[{"step":"Who","explanation":""},{"step":"What","explanation":""},{"step":"When","explanation":""},{"step":"Where","explanation":""},{"step":"Why","explanation":""}]}`;
        } else {
            prompt = `You are an elite communication coach teaching the PREP method. Restructure the user's text using the Point, Reason, Example, Point framework. Explain the method and provide a breakdown. User's Text: "${ctx}"
Respond in this exact JSON format:
{"structurallyEnhancedText":"","method":{"name":"The PREP Method","description":"PREP stands for Point, Reason, Example, Point. It's a powerful framework for structuring your thoughts to be clear, concise, and persuasive."},"breakdown":[{"step":"Point","explanation":""},{"step":"Reason","explanation":""},{"step":"Example","explanation":""},{"step":"Point (Conclusion)","explanation":""}]}`;
        }
        prompt += `\n${this.audienceLine()}`;
        const response = await this.callBackend(prompt);
        return JSON.parse(response);
    }

    // ── Rhetorical Devices Stage ───────────────────────────────────────────
    async analyzeRhetoric(text) {
        const prompt = `You are a master teacher of classical rhetoric — the toolkit of Lincoln, Kennedy, and King.
${this.audienceLine()}

Analyze this text for FIVE rhetorical devices. For each, state whether it is present and quote the exact evidence if found:
1. Rule of Three — three parallel items ("of the people, by the people, for the people")
2. Anaphora — repeated phrase opening successive sentences ("I have a dream that…")
3. Antithesis — balanced contrast ("ask not what your country can do for you…")
4. Metaphor / Analogy — abstract idea made concrete through comparison
5. Storytelling Arc — a concrete moment or example that builds to a universal point

Then: give a rhetorical impact score 1–10 (most everyday text scores 2–4; don't inflate). Write a 2-sentence summary of the text's rhetorical character. Finally, choose the ONE device that would most elevate this specific text and rewrite ONE sentence from it demonstrating that device.

Text: "${this.escapeForPrompt(text)}"

Respond in this exact JSON format:
{"devices":[{"name":"Rule of Three","found":false,"evidence":""},{"name":"Anaphora","found":false,"evidence":""},{"name":"Antithesis","found":false,"evidence":""},{"name":"Metaphor/Analogy","found":false,"evidence":""},{"name":"Storytelling Arc","found":false,"evidence":""}],"rhetoricalScore":0,"summary":"","suggestion":{"device":"","tip":"","exampleRewrite":""}}`;
        const response = await this.callBackend(prompt);
        return JSON.parse(response);
    }

    displayRhetoric(data) {
        // Restore section markup in case it was overwritten by a skip message
        const section = $('rhetoricSection');
        if (!$('deviceChips')) {
            section.innerHTML = `
                <h3><i class="fa-solid fa-scroll"></i> Stage 3: Rhetorical Power</h3>
                <div class="rhetoric-score-row" id="rhetoricScoreRow"></div>
                <div class="device-chips" id="deviceChips"></div>
                <div class="explanation" id="rhetoricSummaryBox">
                    <h5><i class="fa-solid fa-feather-pointed"></i> Rhetorical Read</h5>
                    <p id="rhetoricSummary"></p>
                </div>
                <div class="rhetoric-suggestion" id="rhetoricSuggestion"></div>
            `;
        }

        const score = data.rhetoricalScore || 0;
        const scoreRow = $('rhetoricScoreRow');
        scoreRow.innerHTML = `
            <div class="rhetoric-score">
                <span class="rhetoric-score-value">${score}</span>
                <span class="rhetoric-score-max">/10</span>
            </div>
            <div class="rhetoric-score-caption">Rhetorical impact — most everyday speech scores 2–4. Lincoln territory starts at 8.</div>
        `;

        const chips = $('deviceChips');
        chips.innerHTML = '';
        (data.devices || []).forEach(d => {
            const chip = document.createElement('div');
            chip.className = `device-chip ${d.found ? 'device-found' : 'device-missing'}`;
            const icon = document.createElement('i');
            icon.className = `fa-solid ${d.found ? 'fa-circle-check' : 'fa-circle-plus'}`;
            const name = document.createElement('span');
            name.textContent = d.name;
            chip.append(icon, name);
            if (d.found && d.evidence) {
                chip.title = `Found: "${d.evidence}"`;
                const quote = document.createElement('small');
                quote.className = 'device-evidence';
                quote.textContent = `"${d.evidence.slice(0, 80)}${d.evidence.length > 80 ? '…' : ''}"`;
                chip.appendChild(quote);
            } else {
                chip.title = 'Not used yet — an opportunity';
            }
            chips.appendChild(chip);
        });

        $('rhetoricSummary').textContent = data.summary || '';

        const sug = $('rhetoricSuggestion');
        sug.innerHTML = '';
        if (data.suggestion?.device) {
            const header = document.createElement('div');
            header.className = 'rhetoric-suggestion-header';
            header.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Your biggest upgrade: <strong></strong>`;
            header.querySelector('strong').textContent = data.suggestion.device;
            const tip = document.createElement('p');
            tip.className = 'rhetoric-tip';
            tip.textContent = data.suggestion.tip || '';
            sug.append(header, tip);
            if (data.suggestion.exampleRewrite) {
                const rewrite = document.createElement('blockquote');
                rewrite.className = 'rhetoric-rewrite';
                rewrite.textContent = data.suggestion.exampleRewrite;
                sug.appendChild(rewrite);
            }
        }
    }

    displayStage2(previousText, data) {
        // Restore section markup in case it was overwritten
        const stage2 = $('stage2Section');
        if (!$('stage2Before')) {
            stage2.innerHTML = `
                <h3><i class="fa-solid fa-sitemap"></i> Stage 2: Structural Flow Coaching</h3>
                <div class="comparison">
                    <div class="before"><h4>Previous Version</h4><p id="stage2Before"></p></div>
                    <div class="after"><h4>Structurally Enhanced</h4><p id="stage2After"></p></div>
                </div>
                <div class="explanation" id="method-explanation">
                    <h5 id="methodName"></h5>
                    <p id="methodDescription"></p>
                </div>
                <div id="methodBreakdown"></div>
            `;
        }
        $('stage2Before').textContent = previousText;
        $('stage2After').textContent = data.structurallyEnhancedText || '';

        const methodName = $('methodName');
        methodName.innerHTML = '';
        const icon = document.createElement('i'); icon.className = 'fa-solid fa-graduation-cap';
        methodName.append(icon, document.createTextNode(' ' + (data.method?.name || '')));
        $('methodDescription').textContent = data.method?.description || '';

        const bdc = $('methodBreakdown');
        bdc.innerHTML = '';
        const h4 = document.createElement('h4'); h4.textContent = 'Your Thoughts, Restructured:';
        bdc.appendChild(h4);
        const ul = document.createElement('ul'); ul.className = 'breakdown-list';
        (data.breakdown || []).forEach(item => {
            const li = document.createElement('li');
            const strong = document.createElement('strong'); strong.textContent = `${item.step}: `;
            li.append(strong, document.createTextNode(item.explanation || ''));
            ul.appendChild(li);
        });
        bdc.appendChild(ul);
    }

    async generateExercises(originalTopic, context, vocabData, structureData) {
        const prompts = {
            introduction: "Tell me about a project you are proud of.",
            hobby:        "Describe a skill you would like to learn and why.",
            day:          "Talk about a challenge you recently overcame.",
        };
        const newTopic = prompts[originalTopic] || "Describe an interesting article you recently read.";
        const methodName = structureData?.method?.name || 'the framework';
        const vocabUpgrades = (vocabData?.flashcards || []).map(c => `"${c.original}" → "${c.new}"`).join(', ') || 'none';

        const prompt = `Create a practice exercise for a user who has just completed a coaching pipeline:
1. Vocabulary upgrade — they improved these specific words: ${vocabUpgrades}
2. Structural rewrite — they applied the "${methodName}" framework to organise their thoughts
${this.audienceLine()}

New Practice Topic: "${newTopic}"

Design guiding questions that help them practice BOTH improvements together:
- Encourage use of the upgraded vocabulary words naturally
- Guide them to follow the "${methodName}" framework step by step

Respond in this exact JSON format:
{"title":"Practice: Vocab + ${methodName}","newTopic":"${newTopic}","instructions":"Apply both your vocabulary upgrades and the ${methodName} framework to this new topic.","guidance":[{"step":"...","question":"..."}]}`;
        const response = await this.callBackend(prompt);
        return JSON.parse(response);
    }

    displayStage3(data) {
        const ex = $('practice-exercise');
        ex.innerHTML = '';
        const h4 = document.createElement('h4'); h4.textContent = data.title || 'Practice Exercise';
        const p1 = document.createElement('p');
        const s1 = document.createElement('strong'); s1.textContent = 'New Practice Topic: ';
        p1.append(s1, document.createTextNode(data.newTopic || ''));
        const p2 = document.createElement('p');
        const em = document.createElement('em'); em.textContent = data.instructions || '';
        p2.appendChild(em);
        const ul = document.createElement('ul'); ul.className = 'guidance-list';
        (data.guidance || []).forEach(item => {
            const li = document.createElement('li');
            const strong = document.createElement('strong'); strong.textContent = `${item.step}: `;
            li.append(strong, document.createTextNode(item.question || ''));
            ul.appendChild(li);
        });
        ex.append(h4, p1, p2, ul);
    }

    displayStageSkipped(sectionId, message) {
        const section = $(sectionId);
        if (!section) return;
        section.innerHTML = `<div class="stage-skipped">⚠️ ${this.escapeHtml(message)}</div>`;
        section.style.display = 'block';
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    async callBackend(prompt) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const code = errorBody.code || '';
            const message = errorBody.error || `HTTP ${response.status}`;
            const err = new Error(`${code} ${message}`.trim());
            err.code = code;
            throw err;
        }
        const data = await response.json();
        return data.text;
    }

    async withRetry(fn, maxAttempts = 3, baseDelay = 1000) {
        let delay = baseDelay;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try { return await fn(); }
            catch (err) {
                // Don't retry on auth/key errors — they won't fix themselves
                if (err.code === 'NO_KEY' || err.code === 'BAD_KEY') throw err;
                if (attempt === maxAttempts) throw err;
                // Rate limits reset on a per-minute window — short retries just
                // burn attempts. Wait long enough for tokens to free up.
                const wait = err.code === 'RATE_LIMIT' ? Math.max(delay, 12000) : delay;
                console.warn(`Attempt ${attempt} failed, retrying in ${wait}ms…`, err.message);
                await new Promise(r => setTimeout(r, wait));
                delay *= 2;
            }
        }
    }

    escapeForPrompt(text) {
        return String(text).replace(/"/g, '\\"').replace(/\n/g, ' ');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    clearResults() {
        $('results').style.display = 'none';
        ['detailedScores', 'deliveryScores', 'stage1-comparison', 'flashcards', 'methodBreakdown', 'practice-exercise',
         'rhetoricScoreRow', 'deviceChips', 'rhetoricSuggestion']
            .forEach(id => { const el = $(id); if (el) el.innerHTML = ''; });
        ['keyAdvice', 'stage1Explanation', 'stage2Before', 'stage2After', 'methodName', 'methodDescription', 'deliveryFeedback',
         'rhetoricSummary', 'interpretedMeaning']
            .forEach(id => { const el = $(id); if (el) el.textContent = ''; });
        const interpretedBox = $('interpretedContainer');
        if (interpretedBox) interpretedBox.style.display = 'none';
        const verbalCard = $('verbalCoachingCard');
        if (verbalCard) verbalCard.style.display = 'none';
    }

    // ── Drawers/Modals ─────────────────────────────────────────────────────
    toggleHistory() {
        if ($('historyDrawer').classList.contains('open')) this.closeHistory();
        else this.openHistory();
    }

    openHistory() {
        SessionHistory.renderList();
        $('historyDrawer').classList.add('open');
        $('historyDrawer').setAttribute('aria-hidden', 'false');
        $('historyBackdrop').classList.add('open');
    }

    closeHistory() {
        $('historyDrawer').classList.remove('open');
        $('historyDrawer').setAttribute('aria-hidden', 'true');
        $('historyBackdrop').classList.remove('open');
    }

    toggleSettings() {
        if ($('settingsModal').classList.contains('open')) this.closeSettings();
        else this.openSettings();
    }

    openSettings() {
        // Populate settings values
        const settings = Settings.load();
        const user = this.loadUser() || {};
        $('settingsName').value = user.name || '';
        $('settingsEmail').value = user.email || '';
        $('settingsDefaultContext').value = settings.defaultContext;
        $('settingsDefaultMode').value = settings.defaultMode;
        $('settingsTheme').value = settings.theme;

        $('settingsModal').classList.add('open');
        $('settingsModal').setAttribute('aria-hidden', 'false');
        $('settingsBackdrop').classList.add('open');
    }

    closeSettings() {
        $('settingsModal').classList.remove('open');
        $('settingsModal').setAttribute('aria-hidden', 'true');
        $('settingsBackdrop').classList.remove('open');
    }

    toggleShortcuts() {
        if ($('shortcutsModal').classList.contains('open')) this.closeShortcuts();
        else this.openShortcuts();
    }

    openShortcuts() {
        $('shortcutsModal').classList.add('open');
        $('shortcutsBackdrop').classList.add('open');
    }

    closeShortcuts() {
        $('shortcutsModal').classList.remove('open');
        $('shortcutsBackdrop').classList.remove('open');
    }

    closeAllModals() {
        this.closeHistory();
        this.closeSettings();
        this.closeShortcuts();
        this.closeDashboard();
    }

    toggleDashboard() {
        if ($('dashboardModal').classList.contains('open')) this.closeDashboard();
        else this.openDashboard();
    }

    openDashboard() {
        ProgressDashboard.render();
        $('dashboardModal').classList.add('open');
        $('dashboardModal').setAttribute('aria-hidden', 'false');
        $('dashboardBackdrop').classList.add('open');
    }

    closeDashboard() {
        $('dashboardModal').classList.remove('open');
        $('dashboardModal').setAttribute('aria-hidden', 'true');
        $('dashboardBackdrop').classList.remove('open');
    }

    // ── Load Past Session ──────────────────────────────────────────────────
    loadSession(id) {
        const s = SessionHistory.get(id);
        if (!s) return;
        this.currentSession = s;
        this.viewingPast = true;
        this.clearResults();
        this.closeHistory();

        // Restore section HTML structure (in case stages were skipped before)
        // displayStage1 / displayStage2 / displayStage3 handle this themselves.

        if (s.results?.scores) this.displayScore(s.results.scores);
        if (s.results?.deliveryScores) this.displayDeliveryScore(s.results.deliveryScores);
        else {
            $('deliveryScoresContainer').style.display = 'none';
            $('deliveryFeedbackContainer').style.display = 'none';
        }
        if (s.results?.vocab) this.displayStage1(s.input?.text || s.input?.transcript || '', s.results.vocab);
        if (s.results?.structure) this.displayStage2(s.results?.vocab?.enhancedText || s.input?.text || s.input?.transcript || '', s.results.structure);
        if (s.results?.rhetoric) this.displayRhetoric(s.results.rhetoric);
        if (s.results?.exercises) this.displayStage3(s.results.exercises);
        if (s.mode === 'audio' && s.input?.audioMetrics && s.results?.deliveryScores) {
            this.renderVerbalCoaching(s.input.audioMetrics, s.results.deliveryScores);
        }

        $('results').style.display = 'block';
        $('historyBadgeLabel').style.display = 'inline-flex';
        $('emptyState').style.display = 'none';
        $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    new ArticulateCoach();
});
