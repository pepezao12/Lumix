import { supabase } from "./supabase.js";
import { initTransitions, navigateTo } from "./spinner-trans.js";


// Cria um elemento <img> de forma segura, sem concatenação de HTML (evita XSS)
function createBadgeElement(badgeEl, badgeValue) {
    if (badgeValue.startsWith("http")) {
        const img = document.createElement("img");
        img.src = badgeValue;
        img.alt = "club badge";
        badgeEl.innerHTML = "";
        badgeEl.appendChild(img);
    } else {
        badgeEl.textContent = badgeValue;
    }
}

async function loadClubInfo(userId) {
    const { data: membership, error } = await supabase
        .from("club_members")
        .select("club_id, clubs(name, badge)")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

    if (error) console.error("Erro ao carregar clube:", error);

    const clubInfoEl = document.getElementById("club-info");
    if (!membership) {
        clubInfoEl.style.display = "none";
        return;
    }

    createBadgeElement(document.getElementById("club-badge"), membership.clubs.badge);
    document.getElementById("club-name").textContent = membership.clubs.name;
    clubInfoEl.style.display = "block";
}

// Inicializa a navbar em qualquer página.
// redirectIfLoggedOut: se true, redireciona para index.html quando não há sessão.
// Devolve { user, profile } para a página usar se necessário.
export async function initNavbar({ redirectIfLoggedOut = false } = {}) {
    const loginBtn  = document.getElementById("loginBtn");
    const userBtn   = document.getElementById("userBtn");
    const userMenu  = document.getElementById("userMenu");
    const helloUser = document.getElementById("helloUser");
    const logoutBtn = document.getElementById("logoutBtn");

    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("index.html")
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        if (redirectIfLoggedOut) navigateTo("index.html");
        loginBtn.hidden = false;
        userBtn.hidden  = true;
        userMenu.classList.remove("active");
        return { user: null, profile: null };
    }

    loginBtn.hidden = true;
    userBtn.hidden  = false;

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, is_admin")
        .eq("id", user.id)
        .maybeSingle();

    if (error) console.error("Erro ao carregar perfil:", error);

    helloUser.textContent = `Olá, ${profile?.username ?? ""}`;

    await loadClubInfo(user.id);

    userBtn.addEventListener("click", () => {
        userMenu.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
            userMenu.classList.remove("active");
        }
    });

    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        navigateTo("index.html")
    });

    return { user, profile };
}