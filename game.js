import { supabase }               from "./supabase.js";
import { initNavbar }             from "./navbar.js";
import { startMidnightCountdown } from "./helpers.js";
import { showSpinner, hideSpinner, initTransitions, navigateTo } from "./spinner-trans.js";

let currentChallenge = null;
let quizScore        = 0;
let wordleScore      = 0;
let wordleAttempts   = 0;
let wordleFinished   = false;
const MAX_ATTEMPTS   = 6;

// ─── Helpers ───────────────────────────────────────────────────────────────

// Reseta as 5 caixas de input do wordle
function resetInputBoxes() {
    for (let i = 0; i < 5; i++) {
        const box = document.getElementById(`box-${i}`);
        box.textContent = "";
        box.classList.remove("active");
    }
}

// Ativa/desativa todos os botões do quiz de uma vez
function setQuizButtonsDisabled(disabled) {
    document.querySelectorAll(".quiz-options button").forEach(btn => {
        btn.disabled = disabled;
    });
}

// ─── Challenge ─────────────────────────────────────────────────────────────
async function loadChallenge() {
    const today      = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data: playedToday } = await supabase
        .from("scores")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user.id)
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay);

    if (playedToday?.length > 0) {
        document.getElementById("loading").style.display       = "none";
        document.getElementById("already-played").style.display = "flex";
        startMidnightCountdown(text => {
            document.getElementById("next-challenge-time").textContent = text;
        });
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: completedRows } = await supabase
        .from("scores")
        .select("challenge_id")
        .eq("user_id", user.id);

    const completedIds = completedRows.map(r => r.challenge_id);

    const { data: allChallenges, error } = await supabase
        .from("daily_challenges")
        .select("*");

    if (error) { console.error("Erro ao carregar desafios:", error); return; }

    const remaining = allChallenges.filter(c => !completedIds.includes(c.id));

    if (remaining.length === 0) {
        alert("Completaste todos os desafios!");
        return;
    }

    currentChallenge = remaining[Math.floor(Math.random() * remaining.length)];

    document.getElementById("loading").style.display        = "none";
    document.getElementById("intro-section").style.display  = "flex";
    document.getElementById("challenge-number").textContent = `Desafio #${currentChallenge.id}`;
}

// ─── Quiz ──────────────────────────────────────────────────────────────────
function setupIntro() {
    document.getElementById("start-btn").onclick = () => {
        document.getElementById("intro-section").style.display = "none";
        document.getElementById("quiz-section").style.display  = "flex";
        showQuiz();
    };
}

function showQuiz() {
    document.getElementById("quiz-question").textContent = currentChallenge.quiz_question;

    const options = ["A", "B", "C", "D"];
    options.forEach(letter => {
        const btn = document.getElementById(`btn-${letter.toLowerCase()}`);
        btn.textContent = `${letter}: ${currentChallenge[`option_${letter.toLowerCase()}`]}`;
        btn.onclick = () => handleAnswer(letter);
    });
}

function handleAnswer(chosen) {
    const correct  = currentChallenge.correct_answer;
    const feedback = document.getElementById("quiz-feedback");

    setQuizButtonsDisabled(true);

    if (chosen === correct) {
        quizScore            = 10;
        feedback.textContent = "✅ Correto! +10 pontos";
    } else {
        quizScore            = 0;
        feedback.textContent = `❌ Errado! A resposta correta era: ${correct}`;
    }

    setTimeout(() => {
        document.getElementById("quiz-section").style.display   = "none";
        document.getElementById("wordle-section").style.display = "block";
        showWordle();
    }, 1500);
}

// ─── Wordle ────────────────────────────────────────────────────────────────
function showWordle() {
    wordleAttempts = 0;
    wordleFinished = false;

    document.getElementById("wordle-input").value        = "";
    document.getElementById("wordle-feedback").innerHTML = "";
    // Corrigido: "Tentativas" (estava "Tentivas")
    document.getElementById("wordle-attempts").textContent = `Tentativas restantes: ${MAX_ATTEMPTS}`;

    resetInputBoxes();
    document.getElementById("wordle-input").focus();
}

function checkGuess(guess) {
    guess = guess.toUpperCase();
    const word = currentChallenge.wordle_word.toUpperCase();

    if (guess.length !== 5) {
        alert("A palavra tem de ter 5 letras!");
        return;
    }

    wordleAttempts++;

    // Algoritmo de coloração do wordle (two-pass para duplicados)
    const colors      = Array(5).fill("gray");
    const wordLetters  = word.split("");
    const guessLetters = guess.split("");

    // Passe 1: verdes
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === wordLetters[i]) {
            colors[i]      = "green";
            wordLetters[i]  = null;
            guessLetters[i] = null;
        }
    }

    // Passe 2: amarelos
    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === null) continue;
        const foundIndex = wordLetters.indexOf(guessLetters[i]);
        if (foundIndex !== -1) {
            colors[i]              = "yellow";
            wordLetters[foundIndex] = null;
        }
    }

    // Renderiza a linha com animação flip
    const row = document.createElement("div");
    row.className = "wordle-row";

    for (let i = 0; i < 5; i++) {
        const span = document.createElement("span");
        span.className   = "wordle-letter";
        span.textContent = guess[i];
        row.appendChild(span);

        setTimeout((el, color) => {
            el.classList.add(color, "flip");
        }, i * 350, span, colors[i]);
    }

    document.getElementById("wordle-feedback").appendChild(row);

    const remaining = MAX_ATTEMPTS - wordleAttempts;
    document.getElementById("wordle-attempts").textContent = `Tentativas restantes: ${remaining}`;

    if (guess === word) {
        wordleFinished  = true;
        wordleScore     = (MAX_ATTEMPTS - wordleAttempts + 1) * 10;
        document.getElementById("wordle-attempts").textContent =
            `🎉 Acertaste em ${wordleAttempts} tentativa(s)! +${wordleScore} pontos`;
        setTimeout(showResults, 1700 + 1500);
        return;
    }

    if (wordleAttempts >= MAX_ATTEMPTS) {
        wordleFinished  = true;
        wordleScore     = 0;
        document.getElementById("wordle-attempts").textContent =
            `😢 Esgotaste as tentativas! A palavra era: ${word}`;
        setTimeout(showResults, 1700 + 1500);
        return;
    }

    document.getElementById("wordle-input").value = "";
    resetInputBoxes();
    document.getElementById("wordle-input").focus();
}

function setupWordle() {
    document.getElementById("wordle-submit").onclick = () => {
        if (wordleFinished) return;
        checkGuess(document.getElementById("wordle-input").value);
    };

    document.getElementById("wordle-input").onkeydown = (e) => {
        if (e.key === "Enter") {
            if (wordleFinished) return;
            checkGuess(document.getElementById("wordle-input").value);
        }
    };

    document.getElementById("wordle-input-display").onclick = () => {
        document.getElementById("wordle-input").focus();
    };

    document.getElementById("wordle-input").oninput = function () {
        const val = this.value.toUpperCase();
        this.value = val;
        for (let i = 0; i < 5; i++) {
            const box = document.getElementById(`box-${i}`);
            box.textContent = val[i] ?? "";
            box.classList.toggle("active", i === val.length);
        }
    };
}

// ─── Results ───────────────────────────────────────────────────────────────
function animateScore(elementId, target, duration) {
    const el = document.getElementById(elementId);
    if (target === 0) { el.textContent = "0"; return; }

    const steps     = 30;
    const stepTime  = Math.floor(duration / steps);
    const increment = target / steps;
    let current     = 0;

    const interval = setInterval(() => {
        current += increment;
        el.textContent = Math.round(current);
        if (current >= target) {
            el.textContent = target;
            clearInterval(interval);
        }
    }, stepTime);
}

function showResults() {
    document.getElementById("wordle-section").style.display  = "none";
    document.getElementById("results-section").style.display = "flex";

    const total = quizScore + wordleScore;
    animateScore("anim-quiz", quizScore, 800);
    setTimeout(() => animateScore("anim-wordle", wordleScore, 800), 600);
    setTimeout(() => animateScore("anim-total", total, 1000), 1200);

    saveScore(total);

    startMidnightCountdown(text => {
        const el = document.getElementById("results-countdown");
        if (el) el.textContent = text;
    });

    // Após 8 s passa para o ecrã "já jogaste"
    setTimeout(() => {
        document.getElementById("results-section").style.display  = "none";
        document.getElementById("already-played").style.display    = "flex";
        startMidnightCountdown(text => {
            document.getElementById("next-challenge-time").textContent = text;
        });
    }, 8000);
}

async function saveScore(total) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("scores").insert({
        user_id:       user.id,
        challenge_id:  currentChallenge.id,
        quiz_score:    quizScore,
        wordle_score:  wordleScore,
        total_score:   total,
    });
    if (error) console.error("Erro ao guardar pontuação:", error.message, error.details, error.hint);
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    initTransitions()
    const { user } = await initNavbar({ redirectIfLoggedOut: true });
    if (!user) {
        hideSpinner()  // ← esconde se não há user
        return;
    }

    setupIntro();
    setupWordle();
    await loadChallenge();

    hideSpinner()

    
});
