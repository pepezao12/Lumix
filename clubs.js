import { supabase }                    from "./supabase.js";
import { initNavbar }                  from "./navbar.js";
import { groupScoresByUser, position } from "./helpers.js";
import { showSpinner, hideSpinner, initTransitions } from "./spinner-trans.js";

// ─── Club ──────────────────────────────────────────────────────────────────
async function loadClub(userId, isAdmin) {
    let clubId = null;

    if (isAdmin) {
        const { data: firstClub } = await supabase
            .from("clubs")
            .select("id")
            .limit(1)
            .maybeSingle();
        clubId = firstClub?.id;
    } else {
        const { data: membership } = await supabase
            .from("club_members")
            .select("club_id")           // ← corrigido: era membership?.id (bug crítico)
            .eq("user_id", userId)
            .maybeSingle();
        clubId = membership?.club_id;    // ← campo correto
    }

    if (!clubId) {
        document.getElementById("club-loading").style.display = "none";
        document.getElementById("no-club").style.display      = "flex";
        return;
    }

    const { data: club, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .maybeSingle();

    if (error) { console.error("Erro ao carregar clube:", error); return; }

    const headerBadge = document.getElementById('header-badge')
    if (club.badge && club.badge.startsWith('http')) {
        headerBadge.innerHTML = '<img src="' + club.badge + '" alt="club badge">'
    } else {
        headerBadge.textContent = club.badge
    }
    document.getElementById("header-name").textContent        = club.name;
    document.getElementById("header-description").textContent = club.description;

    document.getElementById("club-loading").style.display = "none";
    document.getElementById("club-header").style.display  = "flex";
    document.getElementById("club-tabs").style.display    = "flex";

    await Promise.all([
        loadMembers(clubId),
        loadClubLeaderboard(clubId),
    ]);
}

// ─── Members ───────────────────────────────────────────────────────────────
async function loadMembers(clubId) {
    const { data: members, error } = await supabase
        .from("club_members")
        .select("user_id, role, joined_at, profiles(username)")
        .eq("club_id", clubId);

    if (error) { console.error("Erro ao carregar membros:", error); return; }

    // Corrigido: o container correto é "tab-members" (não "members-list" que não existe)
    const container = document.getElementById("tab-members");
    container.innerHTML = "";

    // Cria um sub-wrapper para manter o layout de lista
    const list = document.createElement("div");
    list.id = "members-list";
    container.appendChild(list);

    members.forEach((member, index) => {
        const joinDate = new Date(member.joined_at).toLocaleDateString("pt-PT")
        const card = document.createElement("div")
        card.className = "member-card"
        card.innerHTML = `
            <div class="member-info">
                <span class="member-icon">👤</span>
                <span class="member-name">${member.profiles?.username ?? "Anónimo"}</span>
                ${member.role === "captain" ? '<span class="captain-badge">⭐ Capitão</span>' : ""}
            </div>
            <span class="member-date">Desde ${joinDate}</span>
        `
        list.appendChild(card)

        // Cada card aparece com delay crescente
        setTimeout(() => {
            card.classList.add("animate-in")
        }, index * 100)
    })
}

// ─── Club Leaderboard ──────────────────────────────────────────────────────
async function loadClubLeaderboard(clubId) {
    const { data: members, error: membersError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", clubId);

    if (membersError) { console.error("Erro ao carregar membros:", membersError); return; }

    const memberIds = members.map(m => m.user_id);

    const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select("user_id, total_score, profiles(username)")
        .in("user_id", memberIds);

    if (scoresError) { console.error("Erro ao carregar scores:", scoresError); return; }

    const players = groupScoresByUser(scores);
    const tbody   = document.getElementById("club-leaderboard-body");
    tbody.innerHTML = "";

    players.forEach((player, index) => {
        const row = document.createElement("tr")
        row.innerHTML = `
            <td>${position(index)}</td>
            <td>${player.username}</td>
            <td>${player.totalScore}</td>
            <td>${player.gamesPlayed}</td>
        `
        tbody.appendChild(row)

        // Cada linha aparece com delay crescente
        setTimeout(() => {
            row.classList.add("animate-in")
        }, index * 80)
    })
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
function setupTabs() {
    const buttons = document.querySelectorAll(".tab-btn")

    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove("active"))
            document.querySelectorAll(".tab-content").forEach(tab => {
                tab.style.display = "none"
                tab.classList.remove("animate-fade")
            })
            btn.classList.add("active")

            const tab = document.getElementById(`tab-${btn.dataset.tab}`)
            tab.style.display = "block"

            // Força reset da animação e aplica
            void tab.offsetWidth
            tab.classList.add("animate-fade")
        }
    })

    buttons[0].click()
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    initTransitions()
    const { user, profile } = await initNavbar({ redirectIfLoggedOut: true });
    if (!user) {
        hideSpinner()  // ← esconde se não há user
        return;
    }

    setupTabs();
    await loadClub(user.id, profile?.is_admin);

    hideSpinner()  // ← esconde quando o clube carregar
});

