import { supabase }              from "./supabase.js";
import { initNavbar }            from "./navbar.js";
import { calcStreak, startMidnightCountdown } from "./helpers.js";
import { hideSpinner, initTransitions } from "./spinner-trans.js";

// ─── Perfil ────────────────────────────────────────────────────────────────
async function loadProfile(userId) {

    //perfil
    const {data:profile} = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle()

    document.getElementById('profile-username').textContent = profile??'Anónimo'
    
    //club
    const {data:membership} = await supabase
        .from('club-members')
        .select('clubs(name, badge)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

    if (membership) {
        const badge = membership.clubs.badge
        const name = membership.clubs.name
        const isImg = badge && badge.startsWith('http')
        document.getElementById('profile-club').innerHTML = 
            `${isImg ? `<img src="${badge}" class="profile-club-badge">` : badge} ${name}`
    }else {
        document.getElementById('profile-club').textContent = 'Sem clube'
    }

    //scores
    const {data:scores} = await supabase
        .from('scores')
        .select('total_score, quiz_score, wordle_score, created_at, challenge_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

    if (!scores || scores.length === 0) {
        document.getElementById('profile-total-score').textContent = 0
        document.getElementById('profile-challenges').textContent = 0
        document.getElementById('profile-streak').textContent = '🔥 0 dias'
        return
    }

    const totalScore = scores.reduce((sum, s) => sum + s.total_score, 0)
    document.getElementById('profile-total-score').textContent = totalScore
    document.getElementById('profile-challenges').textContent = scores.length
    document.getElementById('profile-streak').textContent = '🔥 ${calcStreak(scores)} dias'

    drawChart(scores)
    renderHistory(scores)

}

// ─── Grafico ────────────────────────────────────────────────────────────────

function drawChart(scores) {
    const canvas = document.getElementById('score-chart')
    const ctx = canvas.getContext('2d')

    //dados
    const labels = scores.map((s, i) => `#${i + 1}`)
    const data = scores.map(s => s.total_score)

    //tamanho
    canvas.width = canvas.offsetWidth
    canvas.height = 200

    const padding = 40
    const chartWidth = canvas.width - padding * 2
    const chartHeight = canvas.height - padding * 2
    const maxVal = Math.max(...data, 1)

    //clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = 'rgba(107, 56, 248, 0.15)'
    ctx.lineWidth = 1
    for (i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(canvas.width - padding, y)
        ctx.stroke()
    }

    //calcula os pontos
    const points = data.map((val, i) => ({
        x: padding + (i/ (data.length - 1 || 1)) * chartWidth,
        y: padding + chartHeight - (val / maxVal) * chartHeight
    }))

    //area abaixo da linha
    ctx.beginPath()
    ctx.moveTo(points[0].x, canvas.height - padding)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.linteTo(points[points.length - 1].x, canvas.height - padding)
    ctx.closePath()
    ctx.fillStyle = 'rbga(107, 56, 248, 0.1)'
    ctx.fill()

    //linha principal
    ctx.beginPath()
    ctx.strokeStyle = '#6b38f8'
    ctx.lineWidth = 2
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()

    //pontos
    points.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#a78bfa'
        ctx.strokeStyle = '#6b38f8'
        ctx.lineWidth = 2
        ctx.fill()
        ctx.storke()
    })
}
// ─── Historico ────────────────────────────────────────────────────────────────
function renderHistory(scores) {
    const container = document.getElementById('history-list')
    container.innerHTML = ''

    //do mais recente para o mais antigo
    const reversed = [...scores].reverse()

    reversed.forEach((scores, index) => {
        const date = new Date(scores.created_at).toLocaleDateString('pt-PT')
        const card = document.createElement('div')
        card.className = 'history-card'

        card.innerHTML = `
            <div class="history-left">
                <span class="history-date">${date}</span>
                <span class="history-challenge">Desafio #${scores.challenge_id}</span>
            </div>
            <div class="history-scores">
                <span class="history-quiz">🧠 ${score.quiz_score}</span>
                <span class="history-wordle">🟩 ${score.wordle_score}</span>
                <span class="history-total">🏆 ${score.total_score}</span>
            </div>
        `

        container.appendChild(card)

        setTimeout(() => {
            card.classList.add("animate-in")
        }, index * 80)
    })
} 

// ─── init ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    initTransitions()
    const {user} = await initNavbar({ redirectIfLoggedOut: true})
    if(!user) return

    await loadProfile(user.id)
    hideSpinner()
})