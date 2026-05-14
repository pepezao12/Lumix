import { supabase }              from "./supabase.js";
import { initNavbar }            from "./navbar.js";
import { groupScoresByUser, startMidnightCountdown, calcStreak } from "./helpers.js";
import { showSpinner, hideSpinner, initTransitions } from "./spinner-trans.js";

// ─── Stats ─────────────────────────────────────────────────────────────────
async function loadUserStats(userId) {
    const { data: scores, error } = await supabase
        .from("scores")
        .select("total_score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    if (error) { console.error("Erro ao carregar stats:", error); return; }

    const total = scores.reduce((sum, s) => sum + s.total_score, 0);
    document.getElementById("stat-total-score").textContent = total;
    document.getElementById("stat-challenges").textContent  = scores.length;
    document.getElementById("stat-streak").textContent      = calcStreak(scores) + " dias";
}

// ─── Today card ────────────────────────────────────────────────────────────
async function loadTodayStatus(userId) {
    const today      = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data: playedToday, error } = await supabase
        .from("scores")
        .select("total_score")
        .eq("user_id", userId)
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay);

    if (error) { console.error("Erro ao verificar jogo de hoje:", error); return; }

    const todayStatus = document.getElementById("today-status");
    const playBtn     = document.getElementById("play-btn");
    const countdown   = document.getElementById("today-countdown");

    if (playedToday?.length > 0) {
        todayStatus.textContent  = `✅ Já jogaste hoje! Pontuação: ${playedToday[0].total_score} pontos`;
        playBtn.style.display    = "none";
        startMidnightCountdown(text => { countdown.textContent = text; });
    } else {
        todayStatus.textContent = "🎯 Ainda não jogaste hoje!";
        playBtn.style.display   = "block";
        countdown.textContent   = "";
        playBtn.onclick = () => { window.location.href = "game.html"; };
    }
}

// ─── Top 3 ─────────────────────────────────────────────────────────────────
async function loadTop3() {
    const { data: scores, error } = await supabase
        .from("scores")
        .select("user_id, total_score, profiles(username)");

    if (error) { console.error("Erro ao carregar top 3:", error); return; }

    const top3      = groupScoresByUser(scores).slice(0, 3);
    const medals    = ["🥇", "🥈", "🥉"];
    const container = document.getElementById("top3-list");
    container.innerHTML = "";

    top3.forEach((player, i) => {
        const card = document.createElement("div");
        card.className = "top3-card";
        card.innerHTML = `
            <span class="top3-medal">${medals[i]}</span>
            <span class="top3-name">${player.username}</span>
            <span class="top3-score">${player.totalScore} pts</span>
        `;
        container.appendChild(card);
    });
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    initTransitions()
    const { user, profile } = await initNavbar();

    if (user) {
        document.getElementById("welcome-msg").textContent = `Olá, ${profile?.username} 👋`;
        await Promise.all([
            loadUserStats(user.id),
            loadTodayStatus(user.id),
            loadTop3(),
        ]);
    } else {
        document.getElementById("dashboard").style.display = "none";
    }

    // Textos estáticos do "Como Jogar" — movidos para aqui apenas porque o
    // HTML original os tem vazios. O ideal é preenchê-los directamente no HTML.
    document.querySelector("#how-to-play .how-card:nth-child(1) p").textContent =
        "Responde a uma pergunta de escolha múltipla. Acerta para ganhar 10 pontos!";
    document.querySelector("#how-to-play .how-card:nth-child(2) p").textContent =
        "Adivinha a palavra de 5 letras. Verde = letra certa no lugar certo. Amarelo = letra existe mas está no lugar errado. Tens 6 tentativas!";


    hideSpinner()
});
