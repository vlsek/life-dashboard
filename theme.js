const THEME_KEYS = {
    dark: "theme_dark",
    monet: "theme_monet",
    light: "theme_light",
    pink: "theme_pink",
};

// Цвета фона по темам — держим в синхронизации с --bg из style.css
const THEME_BG_COLORS = {
    dark: "#121212",
    monet: "#0d0703",
    light: "#f7f4ef",
    pink: "#fff0f5",
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
    document.documentElement.classList.remove(...Object.keys(THEME_KEYS).map(k => "theme-" + k));
    document.documentElement.classList.add("theme-" + theme);
    document.querySelectorAll(".theme-select").forEach(sel => sel.value = theme);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && THEME_BG_COLORS[theme]) {
        themeColorMeta.setAttribute("content", THEME_BG_COLORS[theme]);
    }
}

function renderThemeSwitcher(parent) {
    const select = document.createElement("select");
    select.className = "theme-select";
    Object.entries(THEME_KEYS).forEach(([key, i18nKey]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = t(i18nKey);
        select.appendChild(opt);
    });
    select.value = getTheme();
    select.onchange = () => setTheme(select.value);
    parent.appendChild(select);
    return select;
}

document.addEventListener("DOMContentLoaded", applyTheme);
