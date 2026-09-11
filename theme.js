const THEMES = {
    dark: "🌑 Тёмная",
    monet: "🎨 Monet",
    light: "☀️ Светлая",
    pink: "🌸 Розовая",
};

function getTheme() {
    return localStorage.getItem("site_theme") || "dark";
}

function setTheme(theme) {
    localStorage.setItem("site_theme", theme);
    applyTheme();
}

function applyTheme() {
    const theme = getTheme();
    document.documentElement.classList.remove(...Object.keys(THEMES).map(k => "theme-" + k));
    document.documentElement.classList.add("theme-" + theme);
    document.querySelectorAll(".theme-select").forEach(sel => sel.value = theme);
}

function renderThemeSwitcher(parent) {
    const select = document.createElement("select");
    select.className = "theme-select";
    Object.entries(THEMES).forEach(([key, label]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        select.appendChild(opt);
    });
    select.value = getTheme();
    select.onchange = () => setTheme(select.value);
    parent.appendChild(select);
    return select;
}

document.addEventListener("DOMContentLoaded", applyTheme);
