const THEME_KEYS = {
    dark: "theme_dark",
    monet: "theme_monet",
    light: "theme_light",
    pink: "theme_pink",
    mint: "theme_mint",
    sepia: "theme_sepia",
    solarlight: "theme_solarlight",
    nord: "theme_nord",
    mocha: "theme_mocha",
    amoled: "theme_amoled",
    contrast: "theme_contrast",
    dracula: "theme_dracula",
    gruvbox: "theme_gruvbox",
    tokyonight: "theme_tokyonight",
    forest: "theme_forest",
    ocean: "theme_ocean",
    sunset: "theme_sunset",
    twilight: "theme_twilight",
    neon: "theme_neon",
    lavender: "theme_lavender",
    sky: "theme_sky",
    peach: "theme_peach",
    graphite: "theme_graphite",
    emerald: "theme_emerald",
};

// Цвета фона по темам — держим в синхронизации с --bg из style.css
const THEME_BG_COLORS = {
    dark: "#121212",
    monet: "#0d0703",
    light: "#f7f4ef",
    pink: "#fff0f5",
    mint: "#effaf4",
    sepia: "#f4ecd8",
    solarlight: "#fdf6e3",
    nord: "#2e3440",
    mocha: "#1e1e2e",
    amoled: "#000000",
    contrast: "#000000",
    dracula: "#282a36",
    gruvbox: "#282828",
    tokyonight: "#1a1b26",
    forest: "#0f1a14",
    ocean: "#0a1622",
    sunset: "#1c1014",
    twilight: "#150f25",
    neon: "#0b0f14",
    lavender: "#f5f0ff",
    sky: "#eef6fd",
    peach: "#fff3ea",
    graphite: "#eceff1",
    emerald: "#0b0f12",
};

function getTheme() {
    return localStorage.getItem("site_theme") || "light";
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
