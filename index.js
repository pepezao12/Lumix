import { supabase } from "./supabase.js";

function showLogin() {
    document.getElementById("registerForm").hidden = true;
    document.getElementById("loginForm").hidden    = false;
}

function showRegister() {
    document.getElementById("loginForm").hidden    = true;
    document.getElementById("registerForm").hidden = false;
}

document.addEventListener("DOMContentLoaded", async () => {

    // Se já tem sessão, vai directo para home
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = "home.html";
        return;
    }

    document.getElementById("goLogin").addEventListener("click", (e) => {
        e.preventDefault();
        showLogin();
    });

    document.getElementById("goRegister").addEventListener("click", (e) => {
        e.preventDefault();
        showRegister();
    });

    // REGISTER
    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            alert("Erro: " + error.message);
            return;
        }

        if (data.user) {
            const { error: profileError } = await supabase
                .from("profiles")
                .insert([{ id: data.user.id, username }]);

            if (profileError) console.error("Erro ao criar perfil:", profileError);
        }

        if (!data.session) {
            alert("Conta criada! Confirma o teu email e depois faz login.");
            showLogin();
            return;
        }

        window.location.href = "home.html";
    });

    // LOGIN
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email    = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            alert("Erro: " + error.message);
            return;
        }

        window.location.href = "home.html";
    });
});
