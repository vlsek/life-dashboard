let mode = "login";

async function redirectAfterAuth() {
    const session = await getSession();
    if (!session) { window.location.href = "login.html"; return; }
    const { data: profile } = await sb.from("profiles").select("onboarded").eq("user_id", session.user.id).maybeSingle();
    window.location.href = profile?.onboarded ? "dashboard.html" : "onboarding.html";
}

function describeError(e) {
    if (!e) return t("login_unknown_error");
    const parts = [];
    if (e.message) parts.push(e.message);
    if (e.error_description) parts.push(e.error_description);
    if (e.status) parts.push(`${t("login_error_code")}${e.status})`);
    if (parts.length === 0) {
        try { parts.push(JSON.stringify(e)); } catch { parts.push(String(e)); }
    }
    return parts.join(" ") || t("login_unknown_error_console");
}

function renderForm() {
    const area = document.getElementById("form-area");
    area.innerHTML = "";

    const emailLabel = document.createElement("label");
    emailLabel.textContent = t("email_label");
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.style.width = "100%";
    emailInput.style.marginTop = "4px";
    emailLabel.appendChild(emailInput);

    const passLabel = document.createElement("label");
    passLabel.textContent = t("password_label");
    passLabel.style.marginTop = "12px";
    passLabel.style.display = "block";
    const passInput = document.createElement("input");
    passInput.type = "password";
    passInput.style.width = "100%";
    passInput.style.marginTop = "4px";
    passLabel.appendChild(passInput);
    attachPasswordToggle(passInput);

    area.appendChild(emailLabel);
    area.appendChild(passLabel);

    const submitBtn = document.createElement("button");
    submitBtn.style.width = "100%";
    submitBtn.style.marginTop = "16px";
    submitBtn.textContent = mode === "login" ? t("login_btn") : t("register_btn");
    submitBtn.onclick = () => submit();

    // Enter в любом из полей — тоже сабмит (раньше формы не было, Enter никак не обрабатывался)
    [emailInput, passInput].forEach(input => {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
        });
    });

    async function submit() {
        const msg = document.getElementById("msg");
        msg.textContent = t("login_please_wait");
        const email = emailInput.value.trim();
        const password = passInput.value;
        if (!email || !password) { msg.textContent = t("login_fill_fields"); return; }

        if (mode === "login") {
            try {
                const { error } = await sb.auth.signInWithPassword({ email, password });
                if (error) { msg.textContent = t("login_error_prefix") + describeError(error); console.error(error); return; }
                await redirectAfterAuth();
            } catch (e) {
                msg.textContent = t("login_network_error_prefix") + describeError(e);
                console.error(e);
            }
        } else {
            try {
                const { data, error } = await sb.auth.signUp({ email, password });
                if (error) { msg.textContent = t("login_error_prefix") + describeError(error); console.error(error); return; }
                if (data.session) {
                    window.location.href = "onboarding.html";
                } else {
                    msg.textContent = t("login_signup_check_email");
                }
            } catch (e) {
                msg.textContent = t("login_network_error_prefix") + describeError(e);
                console.error(e);
            }
        }
    }
    area.appendChild(submitBtn);
}

document.getElementById("tab-login").onclick = () => {
    mode = "login";
    document.getElementById("tab-login").classList.add("active");
    document.getElementById("tab-register").classList.remove("active");
    document.getElementById("msg").textContent = "";
    renderForm();
};
document.getElementById("tab-register").onclick = () => {
    mode = "register";
    document.getElementById("tab-register").classList.add("active");
    document.getElementById("tab-login").classList.remove("active");
    document.getElementById("msg").textContent = "";
    renderForm();
};

(async () => {
    const session = await getSession();
    if (session) await redirectAfterAuth();
})();

const langSwitchSlot = document.getElementById("lang-switch-slot");
const langSwitch = renderLangSwitcher(langSwitchSlot);
renderThemeSwitcher(langSwitchSlot);
langSwitch.querySelectorAll(".lang-btn").forEach(btn => {
    const original = btn.onclick;
    btn.onclick = () => { original(); renderForm(); };
});

renderForm();

document.getElementById("google-signin-btn").onclick = async () => {
    const msg = document.getElementById("msg");
    msg.textContent = t("login_please_wait");
    const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/login.html" },
    });
    if (error) {
        msg.textContent = t("login_error_prefix") + describeError(error);
        console.error(error);
    }
    // при успехе браузер сразу уводит на Google — обработка возврата происходит выше,
    // в IIFE, которая проверяет сессию и сама решает, на онбординг вести или на дашборд
};
