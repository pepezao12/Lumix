import { supabase }                    from "./supabase.js";
import { initNavbar }                  from "./navbar.js";
import { groupScoresByUser, position } from "./helpers.js";

let currentFilter = "all";
let sortBy        = "totalScore";
let sortDir       = "desc";

// ─── Leaderboard ───────────────────────────────────────────────────────────
async function loadLeaderboard(filter) {
    document.getElementById("leaderboard-loading").style.display   = "block";
    document.getElementById("leaderboard-container").style.display = "none";
    document.getElementById("leaderboard-empty").style.display     = "none";

    let startDate = null;
    if (filter === "today") {
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    } else if (filter === "week") {
        startDate = new Date(Date.now() - 7 * 86_400_000).toISOString();
    }

    let query = supabase.from("scores").select("user_id, total_score, profiles(username)");
    if (startDate) query = query.gte("created_at", startDate);

    const { data: scores, error } = await query;
    if (error) { console.error("Erro ao carregar leaderboard:", error); return; }

    let players = groupScoresByUser(scores);

    // Ordenação dinâmica
    players.sort((a, b) => {
        const diff = b[sortBy] - a[sortBy];
        return sortDir === "desc" ? diff : -diff;
    });

    document.getElementById("leaderboard-loading").style.display = "none";

    if (players.length === 0) {
        document.getElementById("leaderboard-empty").style.display = "block";
        return;
    }

    document.getElementById("leaderboard-container").style.display = "block";
    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";

    players.forEach((player, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${position(index)}</td>
            <td>${player.username}</td>
            <td>${player.totalScore}</td>
            <td>${player.gamesPlayed}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateSortArrows() {
    document.getElementById("arrow-score").textContent = "";
    document.getElementById("arrow-games").textContent = "";
    const arrow = sortDir === "desc" ? "▼" : "▲";
    const targetId = sortBy === "totalScore" ? "arrow-score" : "arrow-games";
    document.getElementById(targetId).textContent = arrow;
}

function updateActiveFilter() {
    document.querySelectorAll("#filters button").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`filter-${currentFilter}`).classList.add("active");
}

function handleFilterClick(filter) {
    currentFilter = filter;
    updateActiveFilter();
    loadLeaderboard(filter);
}

function handleSortClick(column) {
    if (sortBy === column) {
        sortDir = sortDir === "desc" ? "asc" : "desc";
    } else {
        sortBy  = column;
        sortDir = "desc";
    }
    updateSortArrows();
    loadLeaderboard(currentFilter);
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await initNavbar();

    document.getElementById("filter-all").addEventListener("click",   () => handleFilterClick("all"));
    document.getElementById("filter-week").addEventListener("click",  () => handleFilterClick("week"));
    document.getElementById("filter-today").addEventListener("click", () => handleFilterClick("today"));
    document.getElementById("sort-score").addEventListener("click",   () => handleSortClick("totalScore"));
    document.getElementById("sort-games").addEventListener("click",   () => handleSortClick("gamesPlayed"));

    updateSortArrows();
    loadLeaderboard("all");
});
