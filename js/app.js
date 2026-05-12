/**
 * SportIQ — Логика тестов
 * Таймер, подсчёт баллов, прогресс, localStorage
 */

// ============================================
// DOM
// ============================================
const $ = id => document.getElementById(id);
const els = {
    testsGrid: $('tests-grid'),
    statsGrid: $('stats-grid'),
    statsChart: $('stats-chart'),
    statCompleted: $('stat-completed'),
    statAvg: $('stat-avg'),
    statBest: $('stat-best'),
    statTotal: $('stat-total'),
    quizModal: $('quiz-modal'),
    quizLevel: $('quiz-level'),
    quizTitle: $('quiz-title'),
    timer: $('timer'),
    quizClose: $('quiz-close'),
    progressFill: $('progress-fill'),
    progressText: $('progress-text'),
    quizBody: $('quiz-body'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnFinish: $('btn-finish'),
    resultModal: $('result-modal'),
    resultIcon: $('result-icon'),
    resultTitle: $('result-title'),
    resultScore: $('result-score'),
    resultPercent: $('result-percent'),
    resultTime: $('result-time'),
    resultMessage: $('result-message'),
    resultDetails: $('result-details'),
    btnRetry: $('btn-retry'),
    btnCloseResult: $('btn-close-result')
};

// ============================================
// State
// ============================================
let currentQuiz = null;
let currentQuestion = 0;
let answers = [];
let timerInterval = null;
let timeLeft = 0;
let timeSpent = 0;
let quizStartTime = 0;

// ============================================
// LocalStorage
// ============================================
function getStats() {
    try {
        return JSON.parse(localStorage.getItem('sportiq_stats')) || {};
    } catch {
        return {};
    }
}

function saveStats(stats) {
    localStorage.setItem('sportiq_stats', JSON.stringify(stats));
}

function getQuizKey(id) {
    return `quiz_${id}`;
}

// ============================================
// Render tests list
// ============================================
function renderTests() {
    const stats = getStats();
    els.testsGrid.innerHTML = QUIZ_DATA.map(q => {
        const key = getQuizKey(q.id);
        const completed = stats[key];
        const bestScore = completed ? completed.bestScore : null;
        const attempts = completed ? completed.attempts : 0;

        return `
            <div class="test-card" data-id="${q.id}">
                <div class="test-card__header" style="border-color: ${q.color}">
                    <span class="test-card__icon">${q.icon}</span>
                    <span class="test-card__level" style="color: ${q.color}">${q.level}</span>
                </div>
                <h3 class="test-card__title">${q.title}</h3>
                <p class="test-card__desc">${q.description}</p>
                <div class="test-card__meta">
                    <span class="test-card__meta-item">📋 ${q.questions.length} вопросов</span>
                    <span class="test-card__meta-item">⏱ ${Math.floor(q.timeLimit / 60)} мин</span>
                </div>
                ${completed ? `
                    <div class="test-card__result">
                        <span class="test-card__result-best">Лучший: ${bestScore}/${q.questions.length}</span>
                        <span class="test-card__result-attempts">Попыток: ${attempts}</span>
                    </div>
                ` : ''}
                <button class="test-card__btn" style="background: ${q.color}">
                    ${completed ? 'Пройти снова' : 'Начать тест'}
                </button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.test-card').forEach(card => {
        card.addEventListener('click', () => startQuiz(card.dataset.id));
    });
}

// ============================================
// Start quiz
// ============================================
function startQuiz(quizId) {
    currentQuiz = QUIZ_DATA.find(q => q.id === quizId);
    if (!currentQuiz) return;

    currentQuestion = 0;
    answers = new Array(currentQuiz.questions.length).fill(null);
    timeLeft = currentQuiz.timeLimit;
    timeSpent = 0;
    quizStartTime = Date.now();

    els.quizLevel.textContent = currentQuiz.level;
    els.quizLevel.style.color = currentQuiz.color;
    els.quizTitle.textContent = currentQuiz.title;

    els.quizModal.hidden = false;
    document.body.style.overflow = 'hidden';

    updateProgress();
    renderQuestion();
    startTimer();
}

// ============================================
// Timer
// ============================================
function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        timeSpent++;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishQuiz(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    els.timer.textContent = `${m}:${s}`;

    if (timeLeft <= 30) {
        els.timer.style.color = '#ef4444';
    } else {
        els.timer.style.color = '';
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} мин ${s} сек`;
}

// ============================================
// Progress
// ============================================
function updateProgress() {
    const total = currentQuiz.questions.length;
    const pct = ((currentQuestion + 1) / total) * 100;
    els.progressFill.style.width = `${pct}%`;
    els.progressText.textContent = `${currentQuestion + 1} / ${total}`;
}

// ============================================
// Render question
// ============================================
function renderQuestion() {
    const q = currentQuiz.questions[currentQuestion];
    const answered = answers[currentQuestion];

    els.quizBody.innerHTML = `
        <div class="question">
            <h4 class="question__text">${currentQuestion + 1}. ${q.q}</h4>
            <div class="question__options">
                ${q.options.map((opt, i) => `
                    <label class="question__option ${answered === i ? 'question__option--selected' : ''}">
                        <input type="radio" name="answer" value="${i}" ${answered === i ? 'checked' : ''}>
                        <span class="question__option-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="question__option-text">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    document.querySelectorAll('input[name="answer"]').forEach(radio => {
        radio.addEventListener('change', () => {
            answers[currentQuestion] = parseInt(radio.value);
            renderQuestion();
        });
    });

    updateNavButtons();
}

// ============================================
// Navigation
// ============================================
function updateNavButtons() {
    els.btnPrev.disabled = currentQuestion === 0;

    const isLast = currentQuestion === currentQuiz.questions.length - 1;
    els.btnNext.hidden = isLast;
    els.btnFinish.hidden = !isLast;
}

els.btnPrev.addEventListener('click', () => {
    if (currentQuestion > 0) {
        currentQuestion--;
        updateProgress();
        renderQuestion();
    }
});

els.btnNext.addEventListener('click', () => {
    if (currentQuestion < currentQuiz.questions.length - 1) {
        currentQuestion++;
        updateProgress();
        renderQuestion();
    }
});

els.btnFinish.addEventListener('click', () => {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
        if (!confirm(`Вы ответили не на ${unanswered} вопросов. Завершить тест?`)) {
            return;
        }
    }
    finishQuiz();
});

els.quizClose.addEventListener('click', () => {
    if (confirm('Прервать тест? Прогресс не сохранится.')) {
        closeQuiz();
    }
});

function closeQuiz() {
    clearInterval(timerInterval);
    els.quizModal.hidden = true;
    document.body.style.overflow = '';
    currentQuiz = null;
}

// ============================================
// Finish quiz
// ============================================
function finishQuiz(timeOut = false) {
    clearInterval(timerInterval);

    let correct = 0;
    const details = [];

    currentQuiz.questions.forEach((q, i) => {
        const isCorrect = answers[i] === q.correct;
        if (isCorrect) correct++;
        details.push({
            question: q.q,
            userAnswer: answers[i] !== null ? q.options[answers[i]] : '—',
            correctAnswer: q.options[q.correct],
            isCorrect
        });
    });

    const total = currentQuiz.questions.length;
    const percent = Math.round((correct / total) * 100);
    const timeStr = formatTime(timeSpent);

    // Save stats
    const stats = getStats();
    const key = getQuizKey(currentQuiz.id);
    const existing = stats[key] || { attempts: 0, bestScore: 0, bestPercent: 0 };

    stats[key] = {
        attempts: existing.attempts + 1,
        bestScore: Math.max(existing.bestScore, correct),
        bestPercent: Math.max(existing.bestPercent, percent),
        lastScore: correct,
        lastPercent: percent,
        lastTime: timeStr,
        lastDate: new Date().toISOString()
    };
    saveStats(stats);

    // Show result
    showResult(correct, total, percent, timeStr, timeOut, details);
    closeQuiz();
    renderTests();
    renderStats();
}

// ============================================
// Show result
// ============================================
function showResult(score, total, percent, timeStr, timeOut, details) {
    els.resultScore.textContent = score;
    els.resultPercent.textContent = `${percent}%`;
    els.resultTime.textContent = `Время: ${timeStr}${timeOut ? ' (время вышло)' : ''}`;

    let icon, title, message, color;
    if (percent >= 90) {
        icon = '👑'; title = 'Великолепно!'; message = 'Вы настоящий эксперт в спорте!';
        color = '#fbbf24';
    } else if (percent >= 70) {
        icon = '🏆'; title = 'Отличный результат!'; message = 'Вы хорошо разбираетесь в спорте.';
        color = '#4ade80';
    } else if (percent >= 50) {
        icon = '🥈'; title = 'Неплохо!'; message = 'Есть к чему стремиться.';
        color = '#f97316';
    } else {
        icon = '📚'; title = 'Попробуйте ещё!'; message = 'Почитайте больше о спорте и возвращайтесь.';
        color = '#ef4444';
    }

    els.resultIcon.textContent = icon;
    els.resultTitle.textContent = title;
    els.resultMessage.textContent = message;
    els.resultTitle.style.color = color;
    els.resultPercent.style.color = color;

    // Details
    els.resultDetails.innerHTML = details.map((d, i) => `
        <div class="result-detail ${d.isCorrect ? 'result-detail--correct' : 'result-detail--wrong'}">
            <div class="result-detail__q">${i + 1}. ${d.question}</div>
            <div class="result-detail__answers">
                <span class="result-detail__user">Ваш ответ: ${d.userAnswer}</span>
                ${!d.isCorrect ? `<span class="result-detail__correct">Правильно: ${d.correctAnswer}</span>` : ''}
            </div>
        </div>
    `).join('');

    els.resultModal.hidden = false;
    document.body.style.overflow = 'hidden';
}

els.btnRetry.addEventListener('click', () => {
    els.resultModal.hidden = true;
    document.body.style.overflow = '';
    startQuiz(currentQuiz.id);
});

els.btnCloseResult.addEventListener('click', () => {
    els.resultModal.hidden = true;
    document.body.style.overflow = '';
});

// ============================================
// Stats
// ============================================
function renderStats() {
    const stats = getStats();
    const keys = Object.keys(stats);

    let completed = 0;
    let totalScore = 0;
    let totalQuestions = 0;
    let bestPercent = 0;

    keys.forEach(key => {
        const s = stats[key];
        if (s.attempts > 0) {
            completed++;
            totalScore += s.lastScore || 0;
            const quiz = QUIZ_DATA.find(q => getQuizKey(q.id) === key);
            if (quiz) {
                totalQuestions += quiz.questions.length;
            }
            bestPercent = Math.max(bestPercent, s.bestPercent || 0);
        }
    });

    const avg = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    els.statCompleted.textContent = completed;
    els.statAvg.textContent = `${avg}%`;
    els.statBest.textContent = bestPercent > 0 ? `${bestPercent}%` : '—';
    els.statTotal.textContent = totalQuestions;

    // Chart
    els.statsChart.innerHTML = QUIZ_DATA.map(q => {
        const key = getQuizKey(q.id);
        const s = stats[key];
        const pct = s ? s.bestPercent : 0;
        return `
            <div class="stats-bar">
                <span class="stats-bar__label">${q.level}</span>
                <div class="stats-bar__track">
                    <div class="stats-bar__fill" style="width: ${pct}%; background: ${q.color}"></div>
                </div>
                <span class="stats-bar__value">${pct}%</span>
            </div>
        `;
    }).join('');
}

// ============================================
// Init
// ============================================
function init() {
    renderTests();
    renderStats();
}

document.addEventListener('DOMContentLoaded', init);
