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

export function calcStreak(scores) {
    if (scores.length === 0) return 0;

    // Normaliza cada score para "YYYY-M-D" (chave de dia)
    const uniqueDays = [
        ...new Set(
            scores.map(s => {
                const d = new Date(s.created_at);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
        )
    ];

    let streak = 1;
    for (let i = uniqueDays.length - 1; i > 0; i--) {
        // Reconstrói datas a partir das chaves para comparar
        const [cy, cm, cd] = uniqueDays[i].split("-").map(Number);
        const [py, pm, pd] = uniqueDays[i - 1].split("-").map(Number);
        const current  = new Date(cy, cm, cd);
        const previous = new Date(py, pm, pd);
        const diffDays = Math.round((current - previous) / 86_400_000);
        if (diffDays === 1) streak++;
        else break;
    }
    return streak;
}

export async function showStreakToast(supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Vai buscar os scores ordenados por data
    const { data: scores } = await supabase
        .from('scores')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

    if (!scores || scores.length === 0) return

    const streak = calcStreak(scores)
    if (streak === 0) return

    // Verifica se já mostrou o toast hoje para não repetir
    const lastShown = localStorage.getItem('streak-toast-shown')
    const today     = new Date().toDateString()
    if (lastShown === today) return

    // Guarda que já mostrou hoje
    localStorage.setItem('streak-toast-shown', today)

    // Escolhe a mensagem com base no streak
    let message = ''
    if (streak === 1) {
        message = '🔥 Começaste um streak! Joga hoje para o manter!'
    } else if (streak < 5) {
        message = `🔥 Streak de ${streak} dias! Continua assim!`
    } else if (streak < 10) {
        message = `🔥 ${streak} dias seguidos! Estás em chama!`
    } else {
        message = `🔥 ${streak} dias! És imparável!`
    }

    // Preenche e mostra o toast
    const toast     = document.getElementById('streak-toast')
    const toastText = document.getElementById('streak-toast-text')

    if (!toast || !toastText) return

    toastText.textContent = message

    // Pequeno delay antes de aparecer para a página carregar primeiro
    setTimeout(() => {
        toast.classList.add('visible')
    }, 1000)

    // Desaparece automaticamente após 5 segundos
    setTimeout(() => {
        hideToast(toast)
    }, 6000)

    // Botão de fechar
    document.getElementById('streak-toast-close').onclick = () => {
        hideToast(toast)
    }
}

function hideToast(toast) {
    toast.classList.add('hiding')
    setTimeout(() => {
        toast.classList.remove('visible', 'hiding')
    }, 400)
}