// Agrupa um array de rows de scores por user_id.
// Cada row deve ter: { user_id, total_score, profiles?: { username } }
// Devolve um array ordenado por totalScore desc.
export function groupScoresByUser(scores) {
    const map = {};
    for (const score of scores) {
        const uid      = score.user_id;
        const username = score.profiles?.username ?? "Anónimo";
        if (!map[uid]) {
            map[uid] = { userId: uid, username, totalScore: 0, gamesPlayed: 0 };
        }
        map[uid].totalScore  += score.total_score;
        map[uid].gamesPlayed += 1;
    }
    return Object.values(map).sort((a, b) => b.totalScore - a.totalScore);
}

export const MEDALS = ["🥇", "🥈", "🥉"];

// Devolve o símbolo de posição (medalha ou número) dado um índice 0-based.
export function position(index) {
    return index < MEDALS.length ? MEDALS[index] : index + 1;
}

// Countdown até à meia-noite. Chama callback(texto) a cada segundo.
// Devolve a função cancel() para parar.
export function startMidnightCountdown(callback) {
    let id;
    function tick() {
        const now      = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff     = tomorrow - now;
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1_000);
        callback(`Próximo desafio em: ${h}h ${m}m ${s}s`);
        id = setTimeout(tick, 1000);
    }
    tick();
    return () => clearTimeout(id);
}
