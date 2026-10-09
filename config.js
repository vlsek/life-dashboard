// ==== НАСТРОЙ ЭТИ ДВЕ СТРОКИ ПОСЛЕ СОЗДАНИЯ ПРОЕКТА В SUPABASE ====
const SUPABASE_URL = "https://haxmgtflegsfpxieaydv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jvg_Y0JtOC66Edj1WbAgqg_n0LfjWAF";
// ===================================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Офлайн-кэш для чтения (C3, вариант 3): регистрация service worker'а, который кэширует
// статическую оболочку сайта (HTML/JS/CSS/иконки). Сами данные страниц кэширует offline-cache.js.
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("sw register failed", e));
    });
}

// ---- PWA: установка приложения ----
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
});

// ==== Единый набор SVG-иконок (вместо эмодзи в элементах интерфейса) ====
// Линейный стиль, рисуются цветом текста (currentColor), размер по умолчанию = размеру шрифта
// вокруг (1em), поэтому сами подстраиваются под кнопку/заголовок и тему.
// Иконки пользовательских метрик (💧, 🏃 и т.п.) остаются эмодзи — это данные пользователя.
const ICON_PATHS = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    skills: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',
    workouts: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    challenges: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    english: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18"/><path d="M12 3c-3 3-3 15 0 18"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    shop: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    community: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M17 14.5c2.4 0 4 1.7 4 4"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
    edit: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z"/><path d="M14.5 6.5l3 3"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    coin: '<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.2"/><circle cx="12" cy="12" r="5"/>',
    flame: '<g transform="scale(0.75)" stroke-width="2.4"><path d="M16 2c1 5-3 6-3 10a3 3 0 0 0 6 0c2 1 3 4 3 7a9 9 0 1 1-18 0c0-6 4-9 6-13 1-2 2-3 6-4z" fill="currentColor" fill-opacity="0.25"/></g>',
    droplet: '<path d="M12 3.5c3.5 4.5 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10.5z"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
    milestones: '<path d="M12 3v18"/><path d="M12 5h7l2 2.5-2 2.5h-7"/><path d="M12 12H5l-2 2.5L5 17h7"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6a9 9 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a16 16 0 0 1-3 3.6M6.6 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.4-.7"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4"/>',
    cake: '<path d="M4 20h16v-6H4z"/><path d="M4 16.5c2 1.3 4 1.3 6 0s4-1.3 6 0c1.4.9 2.7 1 4 .3"/><path d="M12 9.5V13"/><path d="M12 5c1.1 1 1.1 2.2 0 3.2-1.1-1-1.1-2.2 0-3.2z"/>',
    alert: '<path d="M12 4l9.5 16.5h-19L12 4z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 7.5V12l3 2"/>',
    chevron_left: '<path d="M15 5l-7 7 7 7"/>',
    chevron_right: '<path d="M9 5l7 7-7 7"/>',
    pushup: '<circle cx="19" cy="8.2" r="1.7"/><path d="M17.2 10.8L6.5 15.2"/><path d="M16.2 11.4V18.5"/><path d="M6.5 15.2L4.8 18.5"/><path d="M2.5 19.5h19"/>',
    pullup: '<path d="M3 4.5h18"/><path d="M8 4.5l1.8 6.5"/><path d="M16 4.5l-1.8 6.5"/><circle cx="12" cy="8.3" r="1.6"/><path d="M12 10.6v6.2"/><path d="M12 16.8l-2.2 4.2"/><path d="M12 16.8l2.2 4.2"/>',
    squat: '<circle cx="9.8" cy="4.3" r="1.7"/><path d="M10.4 6.9L8.6 12.4"/><path d="M8.6 12.4h7v6.6"/><path d="M15.6 19h3.6"/><path d="M10 9.2l7.4-.6"/>',
    run: '<circle cx="15.5" cy="4.3" r="1.7"/><path d="M14 7.6l-3.2 5 3.4 2.6-1.2 5.2"/><path d="M10.8 12.6L7.2 16"/><path d="M13.6 9.6l3.6 1.6"/><path d="M12.4 10.4L8.8 9"/>',
    walk: '<circle cx="12" cy="4.3" r="1.7"/><path d="M12 7.5V13"/><path d="M12 13l-2.6 7"/><path d="M12 13l2.6 2.4.8 4.6"/><path d="M12 9.2l-3 3"/><path d="M12 9.2l3 2.6"/>',
    bike: '<circle cx="6" cy="16.5" r="3.6"/><circle cx="18" cy="16.5" r="3.6"/><path d="M6 16.5l4.3-7h4.6l3.1 7"/><path d="M10.3 9.5l2.6 7H6"/><path d="M14.9 9.5L14 7h2.2"/><path d="M8.6 7.3h3"/>',
    swim: '<circle cx="16.5" cy="7" r="1.7"/><path d="M4.5 12l4-2.4 4.4 2.2 2.6-2.6"/><path d="M2.8 16.2q2.3-1.9 4.6 0t4.6 0 4.6 0 4.6 0"/><path d="M2.8 20q2.3-1.9 4.6 0t4.6 0 4.6 0 4.6 0"/>',
    yoga: '<circle cx="12" cy="5" r="1.8"/><path d="M12 7.6v4.6"/><path d="M12 9.4L8 12.4 5.8 10.6"/><path d="M12 9.4l4 3 2.2-1.8"/><path d="M4.5 17.6c3.4 2.6 11.6 2.6 15 0"/><path d="M8 15.2c2.4 1.6 5.6 1.6 8 0"/>',
    sleep: '<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1z"/><path d="M15 4.5h3.2L15 8h3.2"/>',
    apple: '<path d="M12 8C9.4 6 5 7.6 5.3 12.4c.3 4 2.8 7.8 5.2 7.8.9 0 1.1-.5 1.5-.5s.6.5 1.5.5c2.4 0 4.9-3.8 5.2-7.8C18.9 7.6 14.6 6 12 8z"/><path d="M12 8c0-2.2 1-3.7 2.8-4.3"/>',
    meal: '<path d="M6.5 3v7.5"/><path d="M4 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M6.5 10.5V21"/><path d="M17 3c-2.2 1.6-3.2 4-3.2 7 0 2 1 3 3.2 3V21"/>',
    coffee: '<path d="M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9.5z"/><path d="M16 10.8h1.4a2.4 2.4 0 0 1 0 4.8H16"/><path d="M9 3.6c-.8 1 .8 1.6 0 2.8M12.6 3.6c-.8 1 .8 1.6 0 2.8"/>',
    study: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z"/><path d="M6.5 11.9V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.1"/><path d="M21.5 9.5V15"/>',
    code: '<path d="M8.5 7l-5 5 5 5"/><path d="M15.5 7l5 5-5 5"/><path d="M13.6 5.5l-3.2 13"/>',
    pill: '<g transform="rotate(-40 12 12)"><rect x="2.8" y="8.4" width="18.4" height="7.2" rx="3.6"/><path d="M12 8.4v7.2"/></g>',
    scale: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><path d="M8 10.5a4.6 4.2 0 0 1 8 0"/><path d="M12 12.6l1.8-2.2"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
    pulse: '<path d="M2.5 12H7l2.2-5.5 4.2 11 2.3-5.5h5.8"/>',
    music: '<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
    wallet: '<path d="M17 6.5H5A2 2 0 0 0 3 8.5v9a2 2 0 0 0 2 2h14a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 19 8.5H5.5"/><path d="M17 6.5V5A1.5 1.5 0 0 0 15.5 3.5H6"/><circle cx="16.2" cy="13.8" r="1.1" fill="currentColor"/>',
    sparkles: '<path d="M11 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9 1.9-5z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M11 18h2"/>',
    leaf: '<path d="M5 19C5 10.5 9.5 5.5 19.5 4.5 19.5 14.5 14.5 19.5 6.5 19.5"/><path d="M5 19.5L13 11.5"/>',
    tooth: '<path d="M8 4.5c-2.6 0-4 2-4 4.3 0 2.5 1.5 3.7 1.7 6.2.2 2.3.6 4.5 2.1 4.5 1.4 0 1.4-3.5 4.2-3.5s2.8 3.5 4.2 3.5c1.5 0 1.9-2.2 2.1-4.5.2-2.5 1.7-3.7 1.7-6.2 0-2.3-1.4-4.3-4-4.3-1.7 0-2.6.9-4 .9S9.7 4.5 8 4.5z"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 8.8V13l2.6 1.6"/><path d="M9.5 2.8h5"/>',
    mountain: '<path d="M3 19.5l6.2-11 4 6.6 2.5-3.8 5.3 8.2H3z"/>',
    car: '<rect x="3.2" y="12.8" width="17.6" height="5.2" rx="1.6"/><path d="M5.2 12.8l1.6-4.3a2 2 0 0 1 1.9-1.3h6.6a2 2 0 0 1 1.9 1.3l1.6 4.3"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>',
    zap: '<path d="M13.2 2.5L5 13.5h6.2l-1 8 8.3-11h-6.3l1-8z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.3 14.2c1 1.6 2.3 2.4 3.7 2.4s2.7-.8 3.7-2.4"/><path d="M9 9.6h.01M15 9.6h.01"/>',
    ruler: '<path d="M3.5 15.5L15.5 3.5l5 5-12 12-5-5z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
    pin: '<path d="M9 3.5h6l-1 5 3 3.5H7l3-3.5-1-5z"/><path d="M12 12v8.5"/>',
    medical: '<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2"/><path d="M18 3.5V7h-3.5"/><path d="M6 20.5V17h3.5"/>',
    link: '<path d="M9.5 14.5L14.5 9.5"/><path d="M11 6.5l1.4-1.4a3.5 3.5 0 0 1 5 5L16 11.5"/><path d="M13 17.5l-1.4 1.4a3.5 3.5 0 0 1-5-5L8 12.5"/>',
    brain: '<path d="M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 2.8 3 3 0 0 0 1.2 2.4 3 3 0 0 0 .8 4.3 3 3 0 0 0 5 1.5V5.5a2 2 0 0 0-2-1z"/><path d="M14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 2.8 3 3 0 0 1-1.2 2.4 3 3 0 0 1-.8 4.3 3 3 0 0 1-5 1.5V5.5a2 2 0 0 1 2-1z"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    stretch: '<circle cx="12" cy="4" r="1.7"/><path d="M12 6.6v6"/><path d="M12 8.5l-6 2.5"/><path d="M12 8.5l6 2.5"/><path d="M12 12.6l-3 7"/><path d="M12 12.6l3 7"/>',
    boxing: '<path d="M13.5 4.5c2.5 0 4.5 2 4.5 4.5 0 1-.3 1.8-.9 2.6l-3.4 4.4a2 2 0 0 1-1.6.8H8.5a2.5 2.5 0 0 1-2.5-2.5v-3A6.5 6.5 0 0 1 13.5 4.5z"/><path d="M8.5 9.2v5.1"/><path d="M6 19.5c1-2 2.5-2.5 4-2.5"/>',
    jumprope: '<path d="M4 20c3-8 6-14 8-16M20 20c-3-8-6-14-8-16"/><circle cx="5" cy="20.5" r="1.3"/><circle cx="19" cy="20.5" r="1.3"/><circle cx="12" cy="3.5" r="1.6"/>',
    plate: '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="4"/>',
    treadmill: '<rect x="3" y="15" width="14" height="3.2" rx="1.4"/><path d="M17 12.5V19"/><path d="M17 12.5l3.5-1.5"/><circle cx="8.5" cy="6" r="1.7"/><path d="M8.5 8.5v4l-2.5 3"/><path d="M8.5 10.5l3 1.5 1 4"/>',
    ski: '<path d="M2.5 20l6-13.5"/><path d="M11.5 20l6-13.5"/><path d="M4 16.5h4.5M13 16.5h4.5"/><path d="M4.5 5.5l14 5"/>',
    bandage: '<rect x="3.5" y="9.5" width="17" height="5" rx="2.5" transform="rotate(-30 12 12)"/><path d="M9.5 8l1.6 3.2M14.6 12.6l1.6 3.2" transform="rotate(-30 12 12)"/>',
    thermometer: '<path d="M12 3.5a2 2 0 0 0-2 2v9.6a4 4 0 1 0 4 0V5.5a2 2 0 0 0-2-2z"/><path d="M12 8.5v6.6"/><circle cx="12" cy="17.5" r="1.6" fill="currentColor"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    lungs: '<path d="M12 3v9"/><path d="M12 9c-1-2-2.5-2.5-4-2-2 .6-3.5 2.8-3.5 6 0 3 1.5 5 3 5 1.3 0 1.8-1 2-2.3l1.5-6.7"/><path d="M12 9c1-2 2.5-2.5 4-2 2 .6 3.5 2.8 3.5 6 0 3-1.5 5-3 5-1.3 0-1.8-1-2-2.3L12.5 9"/>',
    tea: '<path d="M4.5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9.5z"/><path d="M15.5 10.8h1.4a2.4 2.4 0 0 1 0 4.8h-1.4"/><path d="M7 5.5c1.3.8 1.3 1.7 0 2.5M11 5.5c1.3.8 1.3 1.7 0 2.5"/>',
    bottle: '<path d="M10 2.5h4v2.8l1.5 2V19a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7.3l1.5-2V2.5z"/><path d="M8.5 12.5h7"/>',
    pizza: '<path d="M12 3.5l9 16.5H3l9-16.5z"/><circle cx="12" cy="11" r="1" fill="currentColor"/><circle cx="9.5" cy="15" r="1" fill="currentColor"/><circle cx="14.5" cy="15.5" r="1" fill="currentColor"/>',
    salad: '<path d="M3.5 12.5a8.5 6.5 0 0 0 17 0z"/><path d="M12 12.5V7"/><path d="M12 7c-1.5-1.5-1.5-3-1-4.5 1.8.3 2.8 1.6 3 3"/><path d="M8 12.2l-1-3M16 12.2l1-3"/>',
    bread: '<path d="M4 12.5c0-4.5 3.5-8 8-8s8 3.5 8 8-1 6-8 6-8-1.5-8-6z"/><path d="M8 9.5v5M12 8.5v6.5M16 9.5v5"/>',
    bed: '<path d="M2.5 19.5V9.5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v10"/><path d="M2.5 15.5h19"/><path d="M6 13v-3.2A1.3 1.3 0 0 1 7.3 8.5h3.4A1.3 1.3 0 0 1 12 9.8V13"/>',
    broom: '<path d="M13 3l7 7-2.5 2.5L10 5z"/><path d="M10.5 5.5l-8 8"/><path d="M2 21c1-4 3-5.5 6-6.5"/><path d="M2 21c2-2 3-1 5-2.5"/><path d="M2 21c1.5-2.5 1-4 3-6"/>',
    laundry: '<circle cx="12" cy="13" r="6"/><path d="M9 13a3 3 0 0 0 5 2.2"/><path d="M6 4.5h.01M9 4.5h.01"/><rect x="3.5" y="2.5" width="17" height="19" rx="2.5"/>',
    trash2: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
    wrench: '<path d="M14.5 3a5 5 0 0 0-6.8 5.9L3 13.6l2.4 2.4 4.7-4.7A5 5 0 0 0 16 8.5l-3-.5-.5-3z"/>',
    piggybank: '<path d="M4.5 13a6 5 0 0 1 6-5.2h4a4.5 4.5 0 0 1 4 2.4l2 .3v3l-2 .5a5 5 0 0 1-1.2 2l.4 2.5h-2.7l-.3-1.5h-3.4l-.3 1.5H8.3l.4-2.5A6 5 0 0 1 4.5 13z"/><path d="M8 9.3V7.5M15.5 10h.01"/>',
    card: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>',
    receipt: '<path d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5v-17z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
    gift: '<rect x="3.5" y="9.5" width="17" height="10" rx="1.6"/><path d="M3.5 9.5h17v3.5h-17z"/><path d="M12 9.5v10"/><path d="M12 9.5C10.5 6 7 6.2 7 8.3c0 1 1 1.2 2 1.2h3zM12 9.5c1.5-3.5 5-3.3 5-1.2 0 1-1 1.2-2 1.2h-3z"/>',
    party: '<path d="M4 20.5L14.5 3.5l5 5-17 11z"/><path d="M9.5 12.5l3 3"/><circle cx="18" cy="4" r="1" fill="currentColor"/><circle cx="21" cy="8" r="1" fill="currentColor"/><circle cx="15" cy="2.5" r="1" fill="currentColor"/>',
    tree: '<path d="M12 21v-7"/><path d="M12 14c-3 0-5.5-2.2-5.5-5S9 4 12 4s5.5 2.2 5.5 5-2.5 5-5.5 5z"/><path d="M12 4c-1.6 0-3 1.4-3 3.5"/>',
    cloud: '<path d="M7 18.5a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.6-2 4 4 0 0 1 1.4 7.8"/><path d="M7 18.5h11"/>',
    rain: '<path d="M7 14.5a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.6-2 4 4 0 0 1 1.4 7.8"/><path d="M8 17.5l-1.2 3M12 17.5l-1.2 3M16 17.5l-1.2 3"/>',
    snow: '<path d="M7 12.5a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.6-2 4 4 0 0 1 1.4 7.8"/><path d="M12 15v6M9.5 17l5 2M14.5 17l-5 2"/>',
    flower: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="6.5" r="2.4"/><circle cx="17.5" cy="12" r="2.4"/><circle cx="12" cy="17.5" r="2.4"/><circle cx="6.5" cy="12" r="2.4"/><path d="M12 19.5V22"/>',
    plane: '<path d="M2.5 13.5l19-6.5-6.5 19-2.5-8-8-2.5z"/><path d="M12.5 13.5l-4 4"/>',
    suitcase: '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5"/><path d="M3 13h18"/>',
    train: '<rect x="5.5" y="3.5" width="13" height="13" rx="4"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><path d="M8 20.5l2-3M16 20.5l-2-3"/><path d="M5.5 8.5h13"/>',
    laptop: '<rect x="3.5" y="4.5" width="17" height="11" rx="1.5"/><path d="M2 19.5h20"/><path d="M9 19.5l1-4h4l1 4"/>',
    camera: '<rect x="2.5" y="7" width="19" height="13" rx="2.2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="4"/>',
    headphones: '<path d="M4 15v-2.5a8 8 0 0 1 16 0V15"/><rect x="2.5" y="13.5" width="4" height="6" rx="1.6"/><rect x="17.5" y="13.5" width="4" height="6" rx="1.6"/>',
    gamepad: '<rect x="2.5" y="8" width="19" height="10" rx="5"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="18.5" cy="14.5" r="1" fill="currentColor"/>',
    tv: '<rect x="3" y="5" width="18" height="12.5" rx="1.8"/><path d="M8 20.5h8"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M7.5 3.5v3.2a4.5 4.5 0 0 0 2.2 3.9L12 12l2.3-1.4a4.5 4.5 0 0 0 2.2-3.9V3.5"/><path d="M7.5 20.5v-3.2a4.5 4.5 0 0 1 2.2-3.9L12 12l2.3 1.4a4.5 4.5 0 0 1 2.2 3.9v3.2"/>',
    paintbrush: '<path d="M4.5 19.5c-1.5-3 0-5 2-5s3 1.7 2 3.5-2.5 2.5-4 1.5z"/><path d="M8.5 14L18 4.5a1.8 1.8 0 0 1 2.5 2.5L11 16.5"/>',
    guitar: '<circle cx="8" cy="16" r="4.5"/><circle cx="8" cy="16" r="1.6"/><path d="M10.5 12.5L18 5"/><path d="M17 4l3 3-1.5 1.5-3-3z"/>',
    paw: '<circle cx="7" cy="8.5" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="8.5" r="1.8"/><path d="M12 11.5c-3.3 0-5.5 2.2-5.5 4.5s2 3.5 5.5 3.5 5.5-1.2 5.5-3.5-2.2-4.5-5.5-4.5z"/>',
    fish: '<path d="M2.5 12c3.5-4.5 9-5.5 13-3.8 2 .9 4 2.3 6 3.8-2 1.5-4 2.9-6 3.8-4 1.7-9.5.7-13-3.8z"/><circle cx="7.5" cy="11" r="0.9" fill="currentColor"/><path d="M21.5 12l-2.3-2.7M21.5 12l-2.3 2.7"/>',
    bird: '<path d="M2.5 13.5c2.7-5 8-6.5 12-4.8 1.2.5 2.2 1.3 3 2.3-1 .2-1.9.1-2.7-.3-.5 3.5-3.5 6-7.3 6.3.9-1.2 1.3-2.2 1.2-3.1-2.4.3-4.7-.1-6.2-.4z"/><circle cx="14.5" cy="10" r="0.8" fill="currentColor"/>',
    briefcase: '<rect x="2.5" y="7.5" width="19" height="12" rx="2"/><path d="M8.5 7.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v2"/><path d="M2.5 13h19"/>',
    checklist: '<path d="M4 6.5l1.5 1.5L8 5.5"/><path d="M4 12.5l1.5 1.5L8 11.5"/><path d="M4 18.5l1.5 1.5L8 17.5"/><path d="M11 6.5h9M11 12.5h9M11 18.5h9"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z"/>',
    book: '<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z"/><path d="M12 6v13"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
    chart: '<path d="M4 4v16h16"/><path d="M8 15l4-5 3 3 5-6"/>',
    note: '<path d="M6 3.5h9l4 4V20.5H6z"/><path d="M14.5 3.5V8H19"/><path d="M9 12.5h6M9 16h6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3"/><path d="M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
    medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 10L7 3.5h4l1 3 1-3h4L15.5 10"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};

function iconSvg(name, extraStyle = "") {
    const body = ICON_PATHS[name];
    if (!body) return "";
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extraStyle ? ` style="${extraStyle}"` : ""}>${body}</svg>`;
}


// ==== Иконки метрик и параметров тела ====
// В поле icon хранится либо эмодзи (как раньше), либо "svg:<имя>" из ICON_PATHS. Известные эмодзи
// рисуются их SVG-аналогом сразу, без правки данных; неизвестные остаются как есть.
const EMOJI_TO_SVG = {
    "💧": "droplet",
    "💦": "droplet",
    "💪": "dumbbell",
    "🏋": "dumbbell",
    "🚶": "walk",
    "🏃": "run",
    "🚴": "bike",
    "🚲": "bike",
    "🏊": "swim",
    "🧘": "yoga",
    "😴": "sleep",
    "💤": "sleep",
    "🛌": "sleep",
    "🌙": "sleep",
    "🍎": "apple",
    "🍏": "apple",
    "🥗": "apple",
    "🍽": "meal",
    "🍴": "meal",
    "🥩": "meal",
    "🍗": "meal",
    "☕": "coffee",
    "📚": "book",
    "📖": "book",
    "🎓": "study",
    "💻": "code",
    "💊": "pill",
    "⚖": "scale",
    "❤": "heart",
    "♥": "heart",
    "🫀": "heart",
    "💓": "pulse",
    "💗": "pulse",
    "🎵": "music",
    "🎧": "music",
    "☀": "sun",
    "🌞": "sun",
    "💰": "wallet",
    "💵": "wallet",
    "✨": "sparkles",
    "📱": "phone",
    "🌿": "leaf",
    "🌱": "leaf",
    "🦷": "tooth",
    "⏱": "clock",
    "⏰": "clock",
    "🕐": "clock",
    "🏔": "mountain",
    "⛰": "mountain",
    "🚗": "car",
    "⚡": "zap",
    "😊": "smile",
    "🙂": "smile",
    "😀": "smile",
    "📏": "ruler",
    "📌": "pin",
    "🔥": "flame",
    "🎯": "goals",
    "✅": "done",
    "📈": "chart",
    "📊": "chart",
    "🗓": "calendar",
    "📅": "calendar",
    "⭐": "star",
    "🏆": "trophy",
    "🧠": "brain",
    "✏": "edit",
    "📝": "note",
    "🏠": "home",
    "🩺": "medical",
};

// Ключевые слова для поиска иконки метрики (рус/eng), включая синонимы вроде "цель"→goals,
// "карандаш"→note, чтобы не плодить визуально дублирующиеся значки.
const ICON_KEYWORDS = {
    pushup: "отжимания push up press",
    pullup: "подтягивания pull up bar",
    squat: "приседания squat legs",
    dumbbell: "гантели вес силовая strength weight gym",
    run: "бег running jog cardio",
    walk: "ходьба прогулка walking steps",
    bike: "велосипед cycling bicycle",
    swim: "плавание swimming pool",
    yoga: "йога растяжка stretching",
    mountain: "горы поход hiking trekking outdoors",
    heart: "сердце любовь health love",
    pulse: "пульс давление heart rate cardio",
    droplet: "вода капля water hydration",
    scale: "весы вес взвешивание weight measure",
    apple: "яблоко еда фрукт food fruit diet",
    meal: "еда обед ужин завтрак food meal dinner lunch",
    coffee: "кофе напиток drink caffeine",
    sleep: "сон отдых спать rest nap",
    pill: "таблетки лекарство medicine drug supplement",
    medical: "медицина аптечка врач health cross",
    tooth: "зубы стоматолог dental teeth",
    book: "книга чтение reading learn",
    study: "учёба образование study school university",
    brain: "мозг мышление ум mind think memory",
    code: "код программирование programming dev",
    note: "заметка текст note write",
    music: "музыка песня music song",
    sun: "солнце свет утро sun light morning",
    leaf: "растение природа зелёный plant nature eco",
    smile: "улыбка настроение happy mood",
    zap: "энергия молния скорость energy speed fast",
    flame: "огонь стрик fire streak",
    clock: "время часы time",
    wallet: "деньги финансы кошелёк money finance budget",
    car: "машина авто транспорт car drive",
    phone: "телефон звонок phone call",
    sparkles: "блеск магия sparkle special",
    goals: "цель мишень target aim",
    star: "звезда баллы бонус star points bonus",
    trophy: "кубок победа приз trophy win award",
    ruler: "линейка измерение measure size",
    pin: "метка место pin location marker",
    calendar: "календарь дата calendar date",
    home: "дом квартира home house apartment",
    stretch: "растяжка гибкость stretching flexibility",
    boxing: "бокс единоборства boxing fight punch",
    jumprope: "скакалка прыжки jump rope skipping",
    plate: "блин штанга диск plate barbell",
    treadmill: "беговая дорожка treadmill",
    ski: "лыжи зимний спорт skiing winter",
    bandage: "пластырь травма первая помощь bandage injury first aid",
    thermometer: "температура градусник fever thermometer",
    eye: "глаза зрение eye vision sight",
    lungs: "дыхание лёгкие breathing breath lungs",
    tea: "чай напиток tea drink",
    bottle: "бутылка вода питьё bottle drink water",
    pizza: "пицца еда fastfood pizza food",
    salad: "салат овощи здоровое питание salad veggies healthy",
    bread: "хлеб выпечка bread bakery",
    bed: "кровать постель сон bed sleep",
    broom: "уборка чистота cleaning chores broom",
    laundry: "стирка бельё laundry washing",
    trash2: "мусор выброс trash garbage bin",
    wrench: "ремонт инструмент repair tool fix",
    piggybank: "копилка сбережения savings piggy bank",
    card: "карта оплата банк card payment bank",
    receipt: "чек квитанция receipt bill",
    gift: "подарок праздник gift present",
    party: "праздник вечеринка party celebration",
    tree: "дерево природа tree nature",
    cloud: "облако погода cloud weather",
    rain: "дождь погода rain weather",
    snow: "снег зима winter snow",
    flower: "цветок растение flower plant",
    plane: "самолёт путешествие полёт plane travel flight",
    suitcase: "чемодан путешествие багаж suitcase travel luggage",
    train: "поезд транспорт train",
    laptop: "ноутбук работа компьютер laptop work computer",
    camera: "камера фото photo camera",
    headphones: "наушники музыка звук headphones audio",
    gamepad: "игры геймпад games controller",
    tv: "телевизор экран tv screen",
    hourglass: "песочные часы время ожидание hourglass time wait",
    paintbrush: "рисование творчество art painting brush",
    guitar: "гитара музыка инструмент guitar music instrument",
    paw: "питомец животное pet animal paw",
    fish: "рыба аквариум fish",
    bird: "птица bird",
    briefcase: "работа офис карьера work office career job",
    checklist: "список задачи todo checklist tasks",
};
function iconSearchMatches(name, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return name.includes(q) || (ICON_KEYWORDS[name] || "").toLowerCase().includes(q);
}
const METRIC_ICON_CHOICES = ['pushup', 'pullup', 'squat', 'dumbbell', 'run', 'walk', 'bike', 'swim', 'yoga', 'mountain', 'heart', 'pulse', 'droplet', 'scale', 'apple', 'meal', 'coffee', 'sleep', 'pill', 'medical', 'tooth', 'book', 'study', 'brain', 'code', 'note', 'music', 'sun', 'leaf', 'smile', 'zap', 'flame', 'clock', 'wallet', 'car', 'phone', 'sparkles', 'goals', 'star', 'trophy', 'ruler', 'pin', 'calendar', 'home', 'stretch', 'boxing', 'jumprope', 'plate', 'treadmill', 'ski', 'bandage', 'thermometer', 'eye', 'lungs', 'tea', 'bottle', 'pizza', 'salad', 'bread', 'bed', 'broom', 'laundry', 'trash2', 'wrench', 'piggybank', 'card', 'receipt', 'gift', 'party', 'tree', 'cloud', 'rain', 'snow', 'flower', 'plane', 'suitcase', 'train', 'laptop', 'camera', 'headphones', 'gamepad', 'tv', 'hourglass', 'paintbrush', 'guitar', 'paw', 'fish', 'bird', 'briefcase', 'checklist'];
function metricIconKey(icon) {
    if (!icon || typeof icon !== "string") return null;
    if (icon.startsWith("svg:")) { const k = icon.slice(4); return ICON_PATHS[k] ? k : null; }
    const norm = icon.replace(/\uFE0F/g, "").replace(/\u200D[\u2640\u2642]/g, "").trim();
    return EMOJI_TO_SVG[norm] || null;
}
// HTML иконки: SVG, если есть, иначе сам эмодзи (экранированный)
function iconHtml(icon, style = "") {
    const k = metricIconKey(icon);
    return k ? iconSvg(k, style) : escapeHtmlText(icon || "");
}
// Текст для мест, где SVG не нарисовать (пункты списков, подписи графиков): эмодзи как есть, "svg:" — пусто
function iconText(icon) {
    if (!icon || String(icon).startsWith("svg:")) return "";
    return icon;
}
function iconLabelText(icon, name) { return `${iconText(icon)} ${name}`.trim(); }
// Иконка + название как HTML (название экранируется)
function labelHtml(icon, name) {
    const ic = iconHtml(icon, "margin-right:0.35em;");
    return `${ic}${escapeHtmlText(name)}`;
}

// Выбор иконки: сетка SVG + поле для своего эмодзи. getValue() отдаёт "svg:<имя>" или эмодзи.
function buildIconPicker(current) {
    let value = current || "";
    const wrap = document.createElement("div");
    wrap.className = "icon-picker";

    // Поиск по названию и ключевым словам (рус/eng) — библиотека большая, пролистывать всю
    // неудобно, а искать "бег" или "run" быстрее
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = t("icon_picker_search");
    searchInput.className = "icon-picker-search";

    const grid = document.createElement("div");
    grid.className = "icon-picker-grid";
    const buttons = {};
    const emptyMsg = document.createElement("p");
    emptyMsg.className = "dim";
    emptyMsg.style.cssText = "font-size:0.85em; text-align:center; padding:10px 0; display:none;";
    emptyMsg.textContent = t("icon_picker_no_results");

    const emojiInput = document.createElement("input");
    emojiInput.type = "text";
    emojiInput.maxLength = 8;
    emojiInput.placeholder = t("icon_picker_custom");

    function paint() {
        const k = metricIconKey(value);
        for (const [name, b] of Object.entries(buttons)) b.classList.toggle("selected", name === k);
    }
    function applyFilter() {
        const q = searchInput.value;
        let visible = 0;
        for (const [name, b] of Object.entries(buttons)) {
            const show = iconSearchMatches(name, q);
            b.style.display = show ? "" : "none";
            if (show) visible++;
        }
        emptyMsg.style.display = visible === 0 ? "" : "none";
    }
    METRIC_ICON_CHOICES.forEach(name => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "icon-choice";
        b.title = name;
        b.innerHTML = iconSvg(name);
        b.onclick = () => { value = "svg:" + name; emojiInput.value = ""; paint(); };
        buttons[name] = b;
        grid.appendChild(b);
    });
    searchInput.oninput = applyFilter;
    // своё эмодзи, которого нет среди аналогов, подставляем в поле
    if (value && !value.startsWith("svg:") && !metricIconKey(value)) emojiInput.value = value;
    emojiInput.oninput = () => {
        const v = emojiInput.value.trim();
        if (v) value = v;
        paint();
    };
    wrap.appendChild(searchInput);
    wrap.appendChild(grid);
    wrap.appendChild(emptyMsg);
    wrap.appendChild(emojiInput);
    paint();
    return { el: wrap, getValue: () => value };
}

// Иконка звезды (баллы навыков/лидерборд)
function starIcon(style = "color:#e0a93b; fill:#e0a93b;") {
    return iconSvg("star", style);
}

// Иконка баллов (золотая монетка)
function coinIcon() {
    return iconSvg("coin").replace('class="icon"', 'class="icon icon-coin"');
}

// Кладёт иконку внутрь элемента (например, кнопки) вместо текста/эмодзи
function setIcon(el, name, extraStyle = "") {
    el.innerHTML = iconSvg(name, extraStyle);
    return el;
}

function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function showInstallInstructionsModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${tIcon("install_title")}</h3>`;

    const p = document.createElement("p");
    p.style.cssText = "margin-top:12px; line-height:1.6;";
    p.textContent = isIOSDevice() ? t("install_ios_steps") : t("install_generic_steps");
    modal.appendChild(p);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

async function handleInstallClick() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
    } else {
        showInstallInstructionsModal();
    }
}

const SITE_VERSION = "3.92";

// ==== История обновлений — короткая заметка на каждую версию, показывается по клику
// на номер версии в сайдбаре. Добавлять новую запись сверху на RU и EN при каждом бампе версии. ====
const CHANGELOG_RU = [
    { version: "3.92", date: "2026-10-09 11:10", changes: [
        "Тур «Как пользоваться» (Аккаунт, Языки): шаги теперь листаются с анимацией — при свайпе или кнопках «Далее»/«Назад» текст плавно выезжает с той стороны, в которую листаешь. При включённом «уменьшении движения» в системе анимации нет. Без миграций."
    ]},
    { version: "3.91", date: "2026-10-09 10:25", changes: [
        "Монетки за достижения теперь выдаёт сервер: сумму и список значков он берёт из собственного каталога и платит только за открытые значки, так что придумать себе монеты нельзя. Для вас ничего не меняется: монеты за открытые значки приходят один раз, повторная загрузка страницы их не удваивает (нужна миграция 062 — применяет владелец; до её применения всё работает как раньше)",
    ]},
    { version: "3.90", date: "2026-10-09 10:55", changes: [
        "Тренировки → «Деревья прогрессии»: цепочки ступеней теперь нарисованы деревом — у каждой ступени круглый узел (✓ пройдено, ▶ текущая, ◐ в процессе, 🔒 закрыта), узлы соединены линией: зелёная между пройденными, цветная к текущей ступени, пунктирная там, где путь ещё закрыт. Карточки ступеней, полоски и кнопки «Добавить запись» прежние. Без миграций."
    ]},
    { version: "3.89", date: "2026-10-09 10:40", changes: [
        "Метрики дня: при создании метрики «Подходы» или «Число» можно сразу связать её с упражнением из «Тренировок» — выбрать уже заведённое или создать новое упражнение с тем же названием. Тогда подходы вводятся один раз, в «Тренировках», а метрика на Дашборде заполняется сама. У уже связанной метрики в форме показано, с каким она упражнением. ТРЕБУЕТ миграцию 054 (без неё выбор не показывается или сохранение подскажет про миграцию)."
    ]},
    { version: "3.88", date: "2026-10-09 05:04", changes: [
        "Вода: в настройках (⚙️) появился выключатель «Отслеживать воду» — для тех, кто не хочет отмечать, сколько пьёт. Если выключить: пропадают стакан в шапке, блок воды в правой панели, окно воды и блок «Вода» на главной, перестают приходить напоминания о воде, а вода больше не учитывается в кольцах дня и недели, «идеальных днях», сериях и «баллах за день». Ничего не удаляется: прошлые записи воды, баллы за неё в балансе и достижения остаются, а при включении всё возвращается. Выбор хранится в профиле (нужна миграция 055; без неё всё работает как раньше, а при попытке выключить покажется понятная ошибка)."
    ]},
    { version: "3.87", date: "2026-10-09 01:59", changes: [
        "Покупки в «Кастомизации» стали надёжнее: покупка и выдача наград теперь выполняются на сервере одной операцией, цена и баланс проверяются там же, а повторное нажатие или вторая вкладка не спишут баллы дважды (нужна миграция 060 — применяет владелец; до её применения всё работает как раньше)",
    ]},
    { version: "3.86", date: "2026-10-09 04:55", changes: [
        "Тренировки: при добавлении упражнения выбор «Типового упражнения» теперь сам заполняет остальные поля. Например, для «Приседаний» ставится «Низ», «Вес — да», «Что считаем — повторения», а для «Планки» «Фулбади», «Вес — нет», «Секунды». Если выбрать разновидность «с отягощением» или «со штангой», включится вес, а у «на одной руке» и «на одной ноге» отметка Л/П. Всё, что вы изменили сами, не перезаписывается, и любое поле можно поправить после подстановки. У уже созданных упражнений при правке ничего не меняется. Группы мышц подбираются по названию, как и раньше",
    ]},
    { version: "3.85", date: "2026-10-08 11:14", changes: [
        "Усилена защита прав доступа: добавлена серверная проверка, из-за которой изменить свои права в приложении больше нельзя (нужна миграция 059 — применяет владелец). Также составлен аудит безопасности покупок в Кастомизации и Магазине с планом следующих шагов",
    ]},
    { version: "3.84", date: "2026-10-08 10:34", changes: [
        "Метрики: у метрики-галочки появилась необязательная заметка. В форме метрики (тип «галочка») есть переключатель «Спрашивать, что делал(а)»: когда метрика отмечена, под ней появляется поле «Что делал(а)?» (например, что учил), текст сохраняется по Enter или при выходе из поля и не влияет на баллы и серии. Новая «Учёба» при первом входе теперь создаётся не с минутами, а простой галочкой «Учёба» с заметкой. У уже заведённых метрик ничего не меняется, включить заметку можно вручную. Нужна миграция 058 (колонки заметки); без неё всё работает как раньше, поле просто скрыто",
    ]},
    { version: "3.83", date: "2026-10-08 10:29", changes: [
        "Вода: новая анимация «записалось». Вместо плоского прямоугольника в большом стакане теперь стеклянный стакан, в котором поднимается живая вода с бегущей волной и пузырьками, а в углу появляется галочка. Есть три варианта: «Волна» (спокойная, по умолчанию), «Капли» и «Рябь». Выбрать и сразу посмотреть можно в «Настройках» (шестерёнка в шапке) → «Анимация воды». При «Отключить анимации» или системном «уменьшить движение» показывается готовая картинка без движения",
    ]},
    { version: "3.82", date: "2026-10-08 10:05", changes: [
        "Магазин: новая валюта — «огоньки стриков». За каждую выполненную в день метрику с включённой серией даётся +1 огонёк (не больше 10 в день), огоньки не сгорают, счёт начинается с нуля. Вещи-желания в Магазине покупаются за огоньки, цену можно посчитать из рублей. Старые вещи с ценой в монетах не пропали — они в «Архиве» Магазина: задайте цену в огоньках, и вещь вернётся в магазин. Баланс огоньков виден в профиле на Дашборде рядом с монетами. Кастомизация, как и раньше, — за монеты и достижения",
    ]},
    { version: "3.81", date: "2026-10-08 06:45", changes: [
        "Сообщество: клик по другу (и по себе) открывает сводку, а не только достижения. Видно: с какой даты человек с нами и сколько дней, с какой даты вы друзья, баллы за неделю и за всё время, серия идеальных дней, сколько целей выполнено, сколько дней из последних 30 были активными, любимое упражнение, а ниже — все открытые достижения. Если человек скрыл себя из сообщества, показаны только имя, аватар и даты. ТРЕБУЕТ миграцию 056 (без неё окно работает как раньше)."
    ]},
    { version: "3.80", date: "2026-10-08 06:12", changes: [
        "Страница проверки установки приложения (/pwa-check): открой её в браузере, где не появляется значок «Установить» в адресной строке, подожди несколько секунд — она сама проверит безопасное соединение, манифест, иконки, стартовую страницу и service worker, дождётся ответа браузера и покажет, что именно мешает (например, приложение уже установлено, установка была отклонена или открыт гостевой режим). Если браузер разрешит установку, появится кнопка «Установить приложение». Результат копируется одной кнопкой — его можно прислать нам",
    ]},
    { version: "3.79", date: "2026-10-08 04:57", changes: [
        "Цели: уведомление о скорой просрочке. Если у цели срок сегодня и она ещё не выполнена, то с 19:00 (за 5 часов до конца дня) при открытии Дашборда появляется плашка «Скоро просрочка цели» с названиями (до трёх, остальные «и ещё N»), ссылкой «К целям» и кнопкой закрыть на день. Кнопка «Не напоминать» отключает плашку, а включить её обратно можно галочкой «Напоминать о целях со сроком сегодня» на странице «Цели». Пока это только плашка в приложении, без push-уведомлений на телефон. Миграция не нужна",
    ]},
    { version: "3.78", date: "2026-10-08 05:30", changes: [
        "Сердечки в шапке разведены: «Избранное» (круглая кнопка с сердцем, открывает список быстрых ссылок) теперь ТОЛЬКО на главной, а сердечко «добавить эту страницу в избранное» — на всех остальных страницах и не на главной (раньше на каждой странице было по два). На главную страницу в избранное добавить нельзя — она и есть вход в избранное.",
        "Прогресс недели семиугольником переделан: снова цельный аккуратный контур со скруглёнными углами, как был раньше, но заливается ПО ГРАНЯМ — каждая из 7 граней показывает выполненность своего дня (пн…вс). Сегодняшняя грань на дорожке светлее, будущие дни — пустая дорожка, бонус ⭐ дня — тонкая золотая линия (на мелком значке в шапке не рисуется). Один вид в шапке, профиле Дашборда и правой шторке. Без миграций."
    ]},
    { version: "3.77", date: "2026-10-07 08:40", changes: [
        "Календарь: вкладка «Календарь» теперь рисует ту же сетку, что и «История» — день залит по выполненному прогрессу, внизу ячейки процент, справа колонка недели с её процентом, сверху статистика месяца (средний процент, идеальные дни, дни с данными). Планы и сроки целей остались: на дне — значок плана («сделано/всего» или галочка, если всё выполнено) и число целей со сроком; нажатие на день по-прежнему открывает форму планов. Листать месяцы вперёд можно, как раньше. Вкладка «История» не изменилась. Миграция не нужна."
    ]},
    { version: "3.76", date: "2026-10-08 00:57", changes: [
        "В «Кастомизации» появился переключатель видимости: над витриной три кнопки — «Получено», «За достижения», «За монеты». Включай и выключай их как удобно: например, скрой всё, что уже получено, и смотри только то, к чему ещё стремиться, или оставь только предметы за монеты. Рядом с названием каждой кнопки — сколько в группе предметов и тем. Выбор запоминается на этом устройстве. Счётчики «открыто/всего» у групп редкости не меняются, чтобы прогресс оставался честным",
    ]},
    { version: "3.75", date: "2026-10-08 00:48", changes: [
        "Вес можно менять прямо в блоке «Профиль»: рядом с весом появился карандаш. Нажми, впиши новое значение за сегодня (подойдут и запятая, и точка) и жми Enter или ✓; Esc или ✕ — отмена. Второй раз за тот же день значение просто заменяется, дублей не будет. После сохранения пересчитываются график, норма воды и калории тренировок. Если параметр «Вес» уже заведён, но значений ещё нет, внести первое можно там же",
    ]},
    { version: "3.74", date: "2026-10-07 14:12", changes: [
        "Кастомизация: новый товар «Карточка со сводкой» (250 баллов) — вид сворачивания блоков. Свёрнутый блок показывает справа от заголовка короткую строку итога: у «Метрик за день» — «Баллы 4 / 9», у «Планов» — «Выполнено 2 из 5», у «Виджетов» — сколько их показано, в «Тренировках» у категории — «Упражнений: N», у упражнения — его рекорд. Выбирается в «Кастомизации» вместо «Аккордеона» (одновременно один вид), снять — вернуться к базовому шеврону. Блоки без осмысленного итога выглядят как обычно",
    ]},
    { version: "3.73", date: "2026-10-07 13:57", changes: [
        "Рамки-награды: появились десять новых рамок аватарки, которые выдаются за достижения. За третью ступень каждой лесенки: «Чернильная» (слова), «Нейрон» (выученное), «Мишень» (цели), «Шестерёнка» (навыки), «Закладка» (книги), «Сталь» (тренировки), «Кубок» (челленджи), «Маяк» (вехи). За финал челленджей и вех, «Неудержимый» и «Всё по плану», две редкие анимированные рамки: «Победная» и «Курс». Рамка откроется сама, когда вы зайдёте в «Кастомизацию» после получения достижения; в «Достижениях» награда теперь без пометки «скоро». Новые рамки видны и в боковом меню, и в Сообществе, и вокруг кольца прогресса дня на Дашборде. В группах редкости они стоят среди редких и эпических",
    ]},
    { version: "3.72", date: "2026-10-07 13:37", changes: [
        "Магазин: (1) подсказка о том, как устроен магазин, переименована в «Лавку наград», а её текст переписан под настоящую механику: баллы за привычки, тренировки, цели и серии, бонусные монетки за достижения; темы и рамки аватарки продаются отдельно, в «Кастомизации». (2) В списке «Мои покупки» больше не показываются предметы, купленные в «Кастомизации» (например, рамка «Аврора»): в магазине только магазинные покупки. Баланс по-прежнему учитывает все покупки, поэтому баллы не меняются. Миграция не нужна",
    ]},
    { version: "3.71", date: "2026-10-07 13:26", changes: [
        "Ошибки: при сбое в анкете первого входа (сохранение анкеты, профиля, создание метрик) и при загрузке данных для шапки теперь показывается понятный текст вместо технической строки с адресом сервера и именами таблиц. Подсказки про применение миграций остаются отдельной строкой. На этом пункт про технические ошибки закрыт для всех страниц сайта. Миграция не нужна",
    ]},
    { version: "3.70", date: "2026-10-07 13:16", changes: [
        "Ошибки: на странице «Сообщество» при сбое (рейтинг, лента, подписка, заявка в друзья, привязка и выбор категорий) теперь показывается понятный текст («Нет связи с сервером…», «Нет доступа…», «Не получилось сохранить…») вместо технической строки с адресом сервера и именами функций базы. Остались шапка, вход и регистрация. Миграция не нужна",
    ]},
    { version: "3.69", date: "2026-10-07 00:20", changes: [
        "Тренировки ↔ метрики дня: упражнение можно связать с метрикой дня — подходы вводятся ОДИН раз, в «Тренировках», а значение метрики на Дашборде заполняется само (баллы, серии и цели считаются как обычно). В карточке упражнения появилась кнопка-ссылка «Связать с метрикой дня»: выбрать уже заведённую метрику (типа «Подходы» или «Число») или создать новую, можно отвязать. Подходы, уже введённые в метрику сегодня, переносятся в запись тренировки — ничего не теряется, прошлые дни остаются как были. В карточке упражнения видно «В метриках дня · сегодня: N из цели». На Дашборде связанная метрика — только для чтения со ссылкой «Открыть «Тренировки»». ТРЕБУЕТ миграцию 054 (без неё всё работает как раньше, кнопки связи нет)."
    ]},
    { version: "3.68", date: "2026-10-07 12:51", changes: [
        "Метрики, форма создания и правки: оставлено только основное — название, иконка, тип, «просто записывать значение», цель и единица (для типа «Выбор» ещё и варианты). Всё остальное убрано в сворачиваемый блок «Дополнительно»: направление цели, как вводить значения, расписание, категория, серия и её импорт, план подходов в день и особенности для «Подходов». Блок по умолчанию свёрнут; рядом с названием показано, сколько настроек в нём изменено, а при правке метрики с нестандартными настройками он раскрывается сам. Подписи сокращены (убрали длинные пояснения «только для …»). Всё работает как раньше — свёрнутые настройки просто остаются по умолчанию. Миграция не нужна."
    ]},
    { version: "3.67", date: "2026-10-07 12:31", changes: [
        "Метрики, форма метрики: варианты для типа «Выбор» и особенности для типа «Подходы» теперь вводятся списком, а не одной строкой «ключ:Метка, ключ:Метка». У каждого варианта своё поле «Название», кнопки ↑/↓ и ✕, перетаскивание за ручку ☰ и кнопка «+ Вариант» (в новой строке можно нажать Enter, чтобы сразу добавить следующий). Ключи придумывать не нужно, а подписи теперь могут содержать запятые и двоеточия. У уже сохранённых вариантов ключ не меняется, поэтому прежние отметки остаются на месте. Миграция не нужна."
    ]},
    { version: "3.66", date: "2026-10-07 09:14", changes: [
        "Рекорд за подход у карточки метрики: в «Дневных метриках» под карточкой метрики-подходов появилась строка «Рекорд за подход» — наибольшее число повторений в одном подходе по каждой особенности за всё время (например, «Алмазные 10 · Классика 25»). Если у метрики нет особенностей, показывается одно число. Наведи на значение — увидишь дату рекорда. Под графиком такой рекорд уже был. Строку можно скрыть тем же выключателем «Показывать рекорды у метрик»",
    ]},
    { version: "3.65", date: "2026-10-07 09:02", changes: [
        "Понятные ошибки в шапке и на странице входа: вместо технического текста (адрес сервера, имена таблиц, «TypeError: Failed to fetch», «(код 400)») показывается понятная фраза, например «Нет связи с сервером. Проверь интернет и попробуй ещё раз». Это окно воды (сохранение нормы, роста и значения за день), окно «Настройки» (сохранение раскладки), вход и регистрация. Понятные ответы входа вроде «Invalid login credentials» остаются как были. Сообщество и онбординг доделают отдельно",
    ]},
    { version: "3.64", date: "2026-10-07 07:36", changes: [
        "Достижения: бонусные монетки теперь выдаются. За первые две ступени каждой лесенки (например, «Десять выучено» и «Двадцать пять выучено») на баланс приходит 20 и 50 монет, один раз за значок. Если значки были открыты раньше, монетки за них начислятся при ближайшем заходе на страницу «Достижения». Баланс в Дашборде, Магазине и Кастомизации уже учитывает такие монеты; на счётчик баллов и рейтинг они не влияют",
    ]},
    { version: "3.63", date: "2026-10-07 07:30", changes: [
        "Темы-награды: шесть тем (Mint, Sepia, Solarized Light, Nord, Орхидея, AMOLED) теперь открываются наградой за достижение: Человек-оркестр, Сотня слов, Полсотни целей, Сотня в голове, Своя библиотека, Атлет. Пока достижения нет, на странице «Кастомизация» у темы виден образец, замок и подсказка «Награда за …», а в списках тем меню и настроек её нет. Если такая тема у вас уже включена, она остаётся включённой. Пять остальных тем открыты всегда",
        "Тема Catppuccin Mocha переименована в «Орхидея» (Orchid): у неё сиреневые и розово-фиолетовые цвета, прежнее имя вводило в заблуждение. Ваш выбор не слетит",
    ]},
    { version: "3.62", date: "2026-10-07 07:01", changes: [
        "Порядок: выключатели «Поздравления за серии» и «Отключить все анимации» убраны из окна «Настроить Дашборд» — они остаются в «Глобальных настройках», где их и стоит искать (одна настройка в одном месте). В окне раскладки вместо них короткая подсказка",
    ]},
    { version: "3.61", date: "2026-10-07 06:53", changes: [
        "Тренировки: «Аккордеон» из Кастомизации теперь работает и здесь. Раскрываете категорию — остальные категории, карта мышц и деревья прогрессии сворачиваются; раскрываете упражнение — сворачиваются другие упражнения этой же категории, сама категория остаётся открытой. С базовым шевроном всё как раньше",
    ]},
    { version: "3.60", date: "2026-10-07 06:31", changes: [
        "Ошибки: на страницах «Магазин», «Изучение языков», «Навыки», «Тренировки» и «Аккаунт» при сбое загрузки, сохранения или удаления теперь показывается понятный текст («Нет связи с сервером…», «Нет доступа…», «Не получилось сохранить…») вместо технической строки с адресом сервера и именами таблиц. В «Аккаунте» понятные сообщения входа (например, про совпадение нового пароля со старым) остаются как были. Остальные страницы (Сообщество, шапка, вход, регистрация) будут следующими. Миграция не нужна",
    ]},
    { version: "3.59", date: "2026-10-07 06:15", changes: [
        "Ошибки: на страницах «Календарь», «История», «Челленджи», «Вехи», «Достижения» и «Кастомизация» при сбое загрузки, покупки или сохранения выбора теперь показывается понятный текст («Нет связи с сервером…», «Нет доступа…», «Не получилось загрузить данные…») вместо технической строки с адресом сервера и именами таблиц. Подробности по-прежнему пишутся в консоль браузера. Остальные страницы (Сообщество, Магазин, Навыки, Языки, Тренировки, Аккаунт и др.) будут следующими. Миграция не нужна",
    ]},
    { version: "3.58", date: "2026-10-07 05:50", changes: [
        "Челленджи: когда вы отмечаете челлендж завершённым, открывается поздравляющее окно: кубок с анимацией, итог (сколько дней выполнено или сколько собрано) и номер завершённого челленджа по счёту. Если число завершённых дошло до 1, 5, 10 или 25, окно сообщает об открытом достижении из группы «Челленджи» со ссылкой на страницу «Достижения». Если отметить не получилось, показывается сообщение об ошибке, окна нет. При выключенных анимациях и «уменьшении движения» окно статичное. Миграция не нужна",
    ]},
    { version: "3.57", date: "2026-10-06 21:55", changes: [
        "Шапка: сердечко «добавить страницу в избранное» теперь есть на ВСЕХ страницах бокового меню — раньше его не было на главной, в «Достижениях» и в «Кастомизации». Эти страницы теперь можно добавить в избранное и открыть из списка избранного. «История» (убранная из меню) больше не числится среди страниц избранного. Без миграций."
    ]},
    { version: "3.56", date: "2026-10-07 05:22", changes: [
        "Вода: (1) в правой шторке (на всех страницах) в блоке воды появляется кнопка «Отменить последнее» — она видна, когда есть что отменять (например, после нажатия «+ 200»), и убирает последнее добавление так же, как в окне воды. (2) В окне воды в журнале «Записи за день» у каждой записи есть крестик ✕ — можно удалить любую запись, не только последнюю: сумма за день уменьшится на её значение, а остальные записи и кнопка «Отменить» продолжат работать по порядку. Сумма не уходит ниже нуля. Миграция не нужна."
    ]},
    { version: "3.55", date: "2026-10-07 02:10", changes: [
        "Меню: пункт «История» убран из бокового меню на всех страницах — история теперь внутри раздела «Календарь» (переключатель «Календарь / История»). Старая ссылка /history/ по-прежнему ведёт туда. Нижний блок меню теперь: «Кастомизация» и «Аккаунт». Миграция не нужна."
    ]},
    { version: "3.54", date: "2026-10-07 04:32", changes: [
        "Бонусные монетки за достижения (подготовка): баланс в Профиле, Магазине и Кастомизации теперь умеет учитывать монетки-награды — они прибавляются к балансу и покрывают покупки, но не входят в «накоплено баллов» и в таблицу лидеров. В журнале баллов награда показывается отдельной строкой «Награда за достижение». Сами награды начнут выдаваться за значки в следующих версиях; пока ничего не меняется. Для работы нужна миграция 051",
    ]},
    { version: "3.53", date: "2026-10-07 00:43", changes: [
        "Кастомизация: новый товар «Аккордеон» (150 баллов) — вид сворачивания блоков. Раскрываете один блок на Дашборде — остальные сворачиваются сами. Базовый шеврон остаётся бесплатным у всех, вернуть его можно кнопкой «Выбрано · снять». В «Кастомизации» появился раздел «Вид сворачивания блоков» с картинкой-превью. Пока работает на Дашборде, Workouts — следующим обновлением",
    ]},
    { version: "3.52", date: "2026-10-07 00:26", changes: [
        "Сообщество: новая «Лента достижений» — кто и какое достижение недавно открыл. Каждый сам выбирает, какие из своих достижений показывать в ленте (не больше 5): окно профиля → «Что показывать в ленте». Нажмите на человека в ленте, на подиуме, в списке или среди друзей — раскроется его профиль со всеми открытыми достижениями (если профиль публичный). Заодно в Сообществе теперь видны значки всех лесенок достижений (цели, навыки, книги, вехи, слова, идеальные дни и др.) — раньше часть значков там не показывалась",
    ]},
    { version: "3.51", date: "2026-10-07 00:20", changes: [
        "Дашборд, блок «Планы»: когда запись подтвердилась (добавили или убрали пункт плана, отметили пункт или цель выполненной), в углу карточки на секунду появляется галочка «Сохранено». Если сохранить не вышло, галочки нет. При выключенных анимациях и «уменьшении движения» галочка просто стоит без движения. Миграция не нужна",
    ]},
    { version: "3.50", date: "2026-10-07 00:14", changes: [
        "Дашборд: у анимированных рамок («Огонь», «Радуга», «Инферно», «Пульс», «Королевская») кольцо прогресса дня вокруг аватарки теперь тоже анимировано: огонь мерцает, радуга переливается, инферно пышет, пульс пульсирует, королевская переливается золотом и фиолетовым. При «уменьшить движение» и «отключить все анимации» кольцо остаётся статичным. Миграция не нужна",
    ]},
    { version: "3.49", date: "2026-10-07 00:06", changes: [
        "Рамка аватарки: (1) на Дашборде кольцо прогресса дня вокруг аватарки теперь рисуется стилем выбранной рамки: цветом рамки, со свечением, а у «Авроры» и «Радуги» градиентом. Без выбранной рамки кольцо прежнее. (2) Надеть или снять рамку на странице «Кастомизация» теперь можно без обновления страницы: рамка сразу меняется в левом меню, а на Дашборде (в том числе в другой открытой вкладке) сразу перекрашивается кольцо. Миграция не нужна",
    ]},
    { version: "3.48", date: "2026-10-06 20:40", changes: [
        "Кнопка «Избранное» в шапке больше не пустой круг: сердечко снова видно. Причина — внутренние отступы кнопки сжимали значок почти до нуля; убрали отступы, сделали значок крупнее (20 px) и контур ярче (цветом текста, а не приглушённым). Исправлено на всех страницах сразу. Без миграций."
    ]},
    { version: "3.47", date: "2026-10-06 23:10", changes: [
        "Дашборд, «Графики»: порядок графиков в окне настройки теперь можно менять перетаскиванием — берёте график за ручку ☰ и тянете вверх или вниз (пальцем или мышью), остальные расступаются. Кнопки ↑/↓ остались (удобно с клавиатуры и когда нужен точный сдвиг на одну позицию) и стали в том же оформлении, что в «Раскладке» блоков; на краях списка недоступная стрелка затемнена. Цели у графиков при перестановке остаются со своими графиками. Порядок сохраняется кнопкой «Сохранить», как и остальные настройки окна."
    ]},
    { version: "3.46", date: "2026-10-06 22:30", changes: [
        "Регистрация: можно выбрать аватарку из 20 нарисованных животных (кот, лиса, панда, сова, пингвин и другие — один стиль, два цвета). Если вошли через Google, можно оставить фото из аккаунта или выбрать животное; можно не выбирать — будет круг с инициалами. Выбранное животное видно везде, где показывается ваша аватарка. Миграция не нужна."
    ]},
    { version: "3.45", date: "2026-10-06 20:20", changes: [
        "В карточке упражнения появилась ориентировочная оценка потраченных калорий. Расчёт использует последний вес из Профиля и длительность подходов либо оценочное время по повторениям.",
    ]},
    { version: "3.44", date: "2026-10-06 19:40", changes: [
        "Карта мышц перерисована в более анатомичном стиле: вместо простых прямоугольников и эллипсов используются лёгкие SVG-контуры групп мышц, при этом подсветка и выбор мышц сохранены.",
    ]},
    { version: "3.43", date: "2026-10-06 19:20", changes: [
        "На карте мышц голова теперь подсвечивается зелёным, если за последние 4 дня выполнена учебная метрика из категории study.",
    ]},
    { version: "3.42", date: "2026-10-06 18:45", changes: [
        "Календарь и История объединены в один раздел: на странице /calendar/ появился переключатель «Календарь / История», а старый адрес /history/ теперь открывает Историю в этом же разделе. Без миграции.",
    ]},
    { version: "3.41", date: "2026-10-06 15:35", changes: [
        "Редкость наград: добавлен пятый уровень «необычные» (обычные, необычные, редкие, эпические, легендарные). В «Достижениях» у награды за ступень теперь видна её редкость: цветная полоска сверху карточки и метка под строкой награды, то же в окне «Новое достижение»",
    ]},
    { version: "3.40", date: "2026-10-06 15:08", changes: [
        "Дашборд, подходы: у каждого параметра подхода — время, повторы, особенность — теперь своя подложка-плашка с зазором между ними (раньше все три сливались в одну общую плашку без разделителей); номер подхода и кнопка «удалить» без плашки, при вводе рамка плашки в цвет акцента.",
        "Дашборд, окна и формы: у ВСЕХ полей ввода и списков появилась подложка (фон и рамка) — раньше она была только у текстовых полей, а «Значение цели X», «Подходов в день по плану», время, дата, выпадающие списки и многострочные поля сливались с фоном окна и не читались как редактируемые. Без миграций."
    ]},
    { version: "3.39", date: "2026-10-06 14:42", changes: [
        "Исправлено: окно «серия уже N дней» больше не всплывает снова на каждом новом устройстве или браузере. Раньше сайт помнил, какие поздравления уже показаны, только на самом устройстве, и при первом запуске на новом поздравлял с лучшей серией заново. Теперь на новом устройстве (и после очистки данных браузера) уже достигнутые серии запоминаются молча, а поздравление приходит только за следующий новый порог. В приватном режиме поздравлений нет совсем, чтобы они не повторялись при каждом визите. Миграция не нужна."
    ]},
    { version: "3.38", date: "2026-10-06 14:28", changes: [
        "Цели: баллы за цель больше не вводятся вручную — их задаёт сложность: лёгкая 5, средняя 10, сложная 15 (если сложность не задана — 5). В форме цели, в разделе «Цели» и в окне «Новая цель» на главной поля «Баллы» нет, под сложностью показано, сколько баллов получится. Уже созданные цели с другими баллами не пересчитываются: при правке их баллы остаются, пока вы не смените сложность. Миграция не нужна."
    ]},
    { version: "3.37", date: "2026-10-06 11:50", changes: [
        "Серии: у метрики «не чаще N раз в неделю» серия теперь считается с недели её создания (или первой записи), а не с первых данных аккаунта. Раньше только что добавленная метрика сразу показывала «12 недель подряд», потому что недели до её появления засчитывались как «лимит не превышен». Миграция не нужна."
    ]},
    { version: "3.36", date: "2026-10-06 10:39", changes: [
        "Кастомизация: темы и рамки аватарки разложены по редкости, как в играх: обычные, редкие, эпические, легендарные. Чем сложнее получить предмет и чем он эффектнее, тем выше редкость; у карточки сверху цветная полоска редкости. Каждую группу можно свернуть нажатием на её название, свёрнутое запоминается. У рамок в заголовке группы видно, сколько уже открыто (например, 1/3). Темы пока по-прежнему все бесплатные",
    ]},
    { version: "3.35", date: "2026-10-06 10:26", changes: [
        "Шапка и боковая панель: выпадающие списки, галочки и числовые поля в окнах настроек, прогресса и воды оформлены так же, как на остальных страницах (стрелка списка в цвете темы, галочка в цвете акцента, у числовых полей нет родных стрелок). Раньше шапка полагалась на стили страницы, теперь эти правила есть и в самой шапке",
    ]},
    { version: "3.34", date: "2026-10-06 10:10", changes: [
        "Оформление: поля даты и времени (дата рождения, период в истории, срок цели, дата отметки в вехах и тренировках, время подхода и напоминания) на всех страницах получили единый вид — значок календаря/часов спокойный, при наведении подсвечивается акцентом темы. На тёмных темах всплывающий выбор даты и значок теперь тёмные (раньше были светлыми и плохо читались), на светлых — светлые. Шапка (вода) пока не затронута",
    ]},
    { version: "3.33", date: "2026-10-06 09:45", changes: [
        "Дашборд: новый виджет «Календарь». Он показывает текущий месяц и отмечает дни, в которых есть план (●, пустой кружок ○, если всё выполнено) и сроки целей (◆). Стрелками можно листать месяцы, ссылка «Открыть календарь» ведёт в раздел «Календарь». Включается галочкой «Календарь» в окне настройки дашборда, в блоке виджетов, рядом с «Изучением языков» и «Навыками». Миграция не нужна",
    ]},
    { version: "3.32", date: "2026-10-06 09:37", changes: [
        "Календарь: срок цели теперь виден в календаре. В ячейке дня, на который выпадает срок цели, появляется значок мишени с числом целей (если все они выполнены, значок бледнее), а в окне дня сверху показан список «Цели со сроком на этот день» (выполненные зачёркнуты). Менять цели по-прежнему нужно в разделе «Цели». Виджет календаря на главной ждёт вашего решения. Миграция не нужна",
    ]},
    { version: "3.31", date: "2026-10-06 09:31", changes: [
        "Дашборд, блок «Планы»: цели, которые вы отметили выполненными в этот день, но которых не было в плане, теперь не пропадают с главной. Под списком плана показывается строка «Цели, выполненные в этот день (их не было в плане)». Цель, уже стоящая в плане, не дублируется. Миграция не нужна",
    ]},
    { version: "3.30", date: "2026-10-06 09:12", changes: [
        "Дашборд, профиль: неделя тоже семиугольник по дням — каждая из 7 сторон заливается по выполненности СВОЕГО дня (пн…вс), как в шапке: прошлые дни своей датой, будущие тусклые, сегодняшний толще, золотая полоска — бонус ⭐ дня, общий процент внутри. Скринридер читает «Пн 100 %, Вт 60 % …». В настройках прогресса появился выбор «Вид недели»: семиугольник по дням (по умолчанию) или прежний круг. Выбор общий с шапкой. Без миграций."
    ]},
    { version: "3.29", date: "2026-10-06 09:05", changes: [
        "Шапка: неделя теперь семиугольник — у каждой из 7 сторон своя заливка по выполненности СВОЕГО дня (пн…вс). Прошлые дни считаются своей датой, будущие тусклые, сегодняшний толще, золотая полоска — бонус ⭐ того дня. Общий процент недели остаётся числом внутри. Так и в значке шапки, и в меню слева, и в правой шторке. Скринридер читает «Пн 100 %, Вт 60 % …». Прежний вид (квадрат и дуга) сохранён: переключатель «Вид недели» в настройках прогресса (шестерёнка в правой шторке), по умолчанию семиугольник. Дашборд сохраняет этот выбор. Без миграций."
    ]},
    { version: "3.28", date: "2026-10-06 08:33", changes: [
        "Планы: кнопка «Новая цель» рядом с «Добавить из целей». Открывается то же окно, что в разделе «Цели»: название, баллы, категория (из ваших категорий или новая), число этапов, сложность и дедлайн. Цель создаётся в «Целях» и сразу встаёт в план открытого дня; если рядом с «Добавить» задано время — оно уйдёт в пункт плана. Если записать цель не вышло, окно остаётся открытым с понятным текстом, введённое не пропадает. Миграция не нужна (список категорий использует таблицу из 050, если она есть)."
    ]},
    { version: "3.27", date: "2026-10-06 10:25", changes: [
        "Дашборд: новые метрики теперь появляются сразу. После добавления, правки или удаления метрики через шестерёнку блок «Ежедневные метрики», блок «Подходы» и графики сами перечитывают список — обновлять страницу не нужно (раньше новая метрика была видна только после перезагрузки). Миграция не нужна."
    ]},
    { version: "3.26", date: "2026-10-06 08:55", changes: [
        "Планы: если нажать «Добавить» с пустым полем плана, поле подсвечивается красной рамкой, получает фокус и слегка «встряхивается» — как у незаполненного обязательного поля. Подсветка уходит, как только начнёте печатать. При «уменьшить движение» в системе и выключенных анимациях встряски нет, остаётся подсветка. Enter в пустом поле ведёт себя так же. Миграция не нужна."
    ]},
    { version: "3.25", date: "2026-10-06 02:38", changes: [
        "Цели и профиль: после того как запись подтвердилась, в углу появляется маленькая галочка «Сохранено» и рамка мягко вспыхивает (меньше секунды). Это на карточке цели (выполнить, этап, правка), в строке выполненной цели и в блоке профиля (фото, дата рождения, параметры тела). Если сохранить не вышло, галочки нет. При выключенных анимациях и «уменьшении движения» галочка просто стоит без движения. Миграция не нужна",
    ]},
    { version: "3.24", date: "2026-10-06 02:35", changes: [
        "Вода: анимация «записалось» (стакан наполняется) снова видна. Она рисовалась внутри прокручиваемого окна воды и при нажатии «+200 / +1000» ниже по окну оказывалась за пределами видимого; теперь показывается по центру экрана поверх окна и не мешает нажатиям. При выключенных анимациях стакан сразу показывается наполненным, а галочка видна",
    ]},
    { version: "3.23", date: "2026-10-06 02:17", changes: [
        "Цели: список ваших категорий теперь запоминается и не пропадает, даже если вы удалили или закрыли все цели с этой категорией. Новая категория сохраняется в список при сохранении цели. Нужна миграция 050 в Supabase (без неё всё работает как раньше: список берётся из ваших целей)",
    ]},
    { version: "3.22", date: "2026-10-06 02:12", changes: [
        "Дашборд: больше нет системных окон браузера. Удаление метрики и параметра тела теперь спрашивает окно в стиле сайта. Название новой категории метрики вводится в поле прямо в форме метрики (если категорию создать не получилось, метрика не сохраняется и показана ошибка, а не молча без категории). «Поправить итог» у метрики-счётчика открывает поле в самой карточке: Enter сохраняет, Esc закрывает",
    ]},
    { version: "3.21", date: "2026-10-05 15:50", changes: [
        "Дашборд: настройки метрик теперь значком-шестерёнкой справа от заголовка «Ежедневные метрики» — нажмите, чтобы добавить, изменить или убрать метрику. Отдельная кнопка «Метрики дня» над блоком убрана; ручка перетаскивания блока стоит рядом с шестерёнкой, как у остальных блоков. Миграция не нужна."
    ]},
    { version: "3.20", date: "2026-10-05 13:34", changes: [
        "Желания в Магазине: фото теперь загружается надёжнее. Перед отправкой оно уменьшается и сжимается (фото с телефона в несколько мегабайт превращается примерно в 200–500 КБ), при обрыве связи загрузка автоматически повторяется один раз, а если всё же не вышло — вместо «Failed to fetch» с адресом сервера показывается понятная фраза «Нет связи с сервером, проверь интернет». Пока идёт загрузка, видно «Загружаю…»",
    ]},
    { version: "3.19", date: "2026-10-05 13:29", changes: [
        "Понятные сообщения об ошибках на Дашборде: когда что-то не удалось (удаление метрики, сохранение, загрузка, фото), вместо технического текста с адресом сервера теперь короткая фраза — «Нет связи с сервером, проверь интернет», «Это нельзя изменить, пока оно используется», «Не получилось удалить, попробуй ещё раз» и т. п. Подробности остались только в консоли для разработчика",
    ]},
    { version: "3.18", date: "2026-10-05 12:13", changes: [
        "Вода: в окне воды (на Дашборде и в шапке) большая кнопка «Отменить последнее добавление» стала компактной иконкой-стрелкой, а широкая кнопка «Сохранить рост» — маленькой иконкой-галочкой рядом с полем. Названия остались в подсказках при наведении и для экранных читалок; работают кнопки как прежде",
    ]},
    { version: "3.17", date: "2026-10-05 12:06", changes: [
        "Календарь: план, написанный в поле и сохранённый кнопкой «Сохранить», теперь добавляется — раньше он попадал в день только после нажатия «+». Пустое поле по-прежнему ничего не добавляет, «Отмена» ничего не сохраняет",
    ]},
    { version: "3.16", date: "2026-10-05 12:10", changes: [
        "«Достижения»: на каждом значке теперь видно, что полагается за ступень. Первые две ступени лесенки — монетки (20 и 50), третья — рамка аватарки своего раздела, четвёртая — тема оформления (за слова — «Сепия» и «Nord», за книги — «Catppuccin Mocha», за тренировки — «AMOLED», за цели — «Solarized Light», за навыки — «Mint»; у челленджей и вех пока редкая анимированная рамка). Строка видна на карточке значка и в окне-поздравлении. Пока награды не выдаются, подпись честная — «Награда (скоро)»; выдача монеток, рамок и закрытых тем подключается следующими шагами. Исходные темы и «Высокий контраст» за достижения закрываться не будут",
    ]},
    { version: "3.15", date: "2026-10-05 07:20", changes: [
        "«Достижения» побуждают пользоваться всеми разделами: у каждого теперь лесенка из четырёх ступеней. Цели — 1 / 10 / 25 / 50, навыки — 1 / 5 / 10 / 25, книги — 1 / 5 / 10 / 25, челленджи — 1 / 5 / 10 / 25, тренировки — 10 / 50 / 100 / 250 дней (и первая тренировка), новые «Вехи» — 1 / 5 / 10 / 25 отмеченных, «Языки» — как раньше. Всего 47 значков вместе с сериями, идеальными днями и баллами. Уже открытые значки остались как были. Награды за ступени (монетки, предметы, а за самую трудную ступень — тема) — следующими шагами",
    ]},
    { version: "3.14", date: "2026-10-05 11:45", changes: [
        "Дашборд, блок «Подходы»: после того как подходы сохранились, карточка метрики коротко вспыхивает мягкой зелёной рамкой, а рядом с кнопкой сворачивания появляется маленькая галочка и гаснет — так же, как в «Ежедневных метриках». Если запись не удалась, галочки не будет. При «уменьшить движение» и выключенных анимациях вспышка не двигается",
    ]},
    { version: "3.13", date: "2026-10-05 11:29", changes: [
        "Дашборд, «Ежедневные метрики»: после того как значение сохранилось, плашка метрики коротко вспыхивает мягкой зелёной рамкой, а в её углу появляется маленькая галочка и гаснет — так понятно, что внесено. Раньше сигнал был только у числовых полей (зеленела рамка), теперь он есть и у флажков, и у метрик с выбором. Если запись не удалась, галочки не будет. При «уменьшить движение» и выключенных анимациях вспышка не двигается, остаётся статичная зелёная рамка",
    ]},
    { version: "3.12", date: "2026-10-05 11:21", changes: [
        "Графики метрик с подходами: цвета особенностей теперь зависят от темы оформления. У каждой из 11 тем своя палитра из восьми цветов: первая особенность — оттенок акцента темы, остальные подобраны так, чтобы различаться между собой (в том числе для дальтоников) и хорошо читаться на карточке именно этой темы; «без особенности» и «остальные» — нейтральные серые. При смене темы цвета на графиках и в легенде меняются сразу, а у конкретной особенности цвет по-прежнему не прыгает между днями",
    ]},
    { version: "3.11", date: "2026-10-05 10:56", changes: [
        "Цели: категорию теперь не нужно каждый раз печатать — в форме цели есть список ваших категорий (самые частые сверху), пункт «Без категории» и «+ Новая категория…». Список собирается из ваших целей, в том числе выполненных, так что всё, что вы вводили раньше, уже в нём",
    ]},
    { version: "3.10", date: "2026-10-05 10:48", changes: [
        "Профиль: число заработанных монет теперь меняется сразу, как только вы отметили метрику, добавили воду или сделали подход, — без обновления страницы. Через секунду-другую оно сверяется с базой и при необходимости уточняется",
    ]},
    { version: "3.09", date: "2026-10-05 10:36", changes: [
        "Дашборд: окно «Идеальный день!». Когда сегодняшний день становится идеальным (выполнено всё, что нужно на сегодня), один раз в день появляется окно-поздравление. Оно показывает, сколько идеальных дней у вас всего, выдаёт достижение, если такого ещё нет, а если следующее достижение ещё копится, пишет прогресс: сколько идеальных дней осталось и полоса. В «Достижениях» появилась группа «Идеальные дни»: «Идеальный старт» (1 день), «Идеальный десяток» (10), «Идеальный месяц» (30) и «Идеальная сотня» (100); считаются все идеальные дни, не обязательно подряд. Окно выключается так же, как поздравления за серии (кнопка «Больше не показывать»), и не мешает им: если в этот день вы получаете поздравление за серию, сначала оно, затем это",
    ]},
    { version: "3.08", date: "2026-10-05 01:55", changes: [
        "Подходы: подсказка в поле «особенность» сокращена до «Особенность» (раньше «особенность (необязательно) — напр. положение рук» не влезала в поле). В английской версии — «Variation». Миграция не нужна."
    ]},
    { version: "3.07", date: "2026-10-05 01:30", changes: [
        "Достижения: категории теперь по умолчанию свёрнуты — видны названия и счётчики «получено / всего», общий счётчик сверху остался. Нажмите на категорию, чтобы развернуть, ещё раз — свернуть. Раскрытое не запоминается: при следующем заходе снова свёрнуто. Миграция не нужна."
    ]},
    { version: "3.06", date: "2026-10-05 00:40", changes: [
        "Сообщество: если у вас не указано имя (регистрировались раньше), сверху появляется мягкая плашка «Укажите имя» — друзья видят имя вместо «Пользователь …». Имя обязательно и в окне «Публичный профиль»: пустое больше не сохраняется (до 40 символов, лишние пробелы убираются). Миграция не нужна."
    ]},
    { version: "3.05", date: "2026-10-05 07:22", changes: [
        "Цели: кнопка «Сохранить» в форме цели больше не молчит. Если не введено название — под полем появляется подсказка; если запись не удалась (нет интернета, сбой сервера) — в форме остаётся понятный текст, а введённое не пропадает; повторный тап пока идёт запись не создаёт вторую цель. Технические подробности ошибки (адрес сервера, названия таблиц) пользователю больше не показываются",
    ]},
    { version: "3.04", date: "2026-10-05 05:01", changes: [
        "Сообщество, «Друзья»: исправлена подпись «Пока ни на кого не подписан», которая появлялась, хотя подписки и друзья есть. Если профиль друга не удалось прочитать, у него теперь всё равно есть карточка — с именем и аватаром из лидерборда, а при их отсутствии — «Без имени» с крестиком, чтобы убрать. Подпись показывается, только когда подписок и друзей действительно нет",
    ]},
    { version: "3.03", date: "2026-10-05 05:00", changes: [
        "«Достижения» побуждают пользоваться «Языками»: две новые лесенки по четыре ступени — «Добавлено слов» (10, 25, 50, 100) и «Выучено слов» (10, 25, 50, 100). Слова считаются по всем языкам вместе, «выучено» — по отметке у слова. У каждой ступени есть прогресс-полоска, при открытии — окно-поздравление. Это первый срез: награды за ступени (монетки для «Кастомизации», предметы, а за самую трудную — тема) и такие же лесенки для остальных разделов — следующими шагами, как только владелец подтвердит, какие награды за какие ступени",
    ]},
    { version: "3.02", date: "2026-10-05 03:51", changes: [
        "Темы переехали в «Кастомизацию»: там все 11 тем с образцом-диаграммой в их цветах, кнопкой «Применить» и сердечком «любимая». Отметьте до 4 любимых — только они остаются в выпадающем списке тем бокового меню (по умолчанию прежние четыре; текущая тема в списке есть всегда). Сам раздел «Кастомизация» теперь в самом низу бокового меню, под чертой, после «Истории»",
    ]},
    { version: "3.01", date: "2026-10-05 02:08", changes: [
        "Графики подходов: в легенде под графиком рядом с каждым типом подхода (например, «широкий хват») теперь написан «рекорд» — сколько максимум повторений вы сделали в одном подходе этого типа за всё время. Суммы за период и за сегодня остались. Рекорд скрывается тем же выключателем «Показывать рекорды у графиков»",
    ]},
    { version: "3.00", date: "2026-10-05 02:01", changes: [
        "Рекорды: теперь два отдельных выключателя. «Показывать рекорды у графиков» — в окне «Настроить графики», «Показывать рекорды у метрик» — в окне «Управление метриками». Общая галочка из «Настроить Дашборд» убрана. Если вы раньше выключили рекорды, они остаются выключенными в обоих местах, пока вы сами не включите нужное",
    ]},
    { version: "2.99", date: "2026-10-04 21:10", changes: [
        "Кастомизация: три анимированные рамки аватарки в награду за достижения (не продаются). «Инферно» — за «Сотню дней» (100 идеальных дней подряд), «Импульс» — за «Мега продуктивность» (неделя выше 100%), «Королевская» — за «Тысячу» (1000 баллов). Открываются сами, когда получено достижение, и двигаются на аватаре в левом меню и в «Сообществе»; при «уменьшить движение» и выключенных анимациях остаётся статичный вид. Миграция не нужна."
    ]},
    { version: "2.98", date: "2026-10-04 20:40", changes: [
        "Кастомизация: две анимированные рамки аватарки — «Огненная» (пламя пульсирует) и «Радужная» (цвет плавно переливается), по 250 баллов. Рамка движется на вашем аватаре в левом меню и в «Сообществе» у всех, кто её увидит; при «уменьшить движение» в системе или выключенных анимациях в настройках остаётся спокойный статичный вид. Заодно в значки «Сообщества» добавлено достижение «Мега продуктивность». Миграция не нужна."
    ]},
    { version: "2.97", date: "2026-10-04 19:05", changes: [
        "Дашборд, «Дневные метрики»: кнопка «Сохранить день» и итог дня («Баллы») перенесены в самый низ блока — после последней метрики (после «Подходов»), а не посередине. Теперь очевидно, что это последний шаг",
    ]},
    { version: "2.96", date: "2026-10-04 18:57", changes: [
        "Достижения: новое достижение «Мега продуктивность» (группа «Недели») — закончить неделю больше чем на 100%. Считаются закончившиеся недели (пн–вс) по тем же правилам, что кольцо недели: все пункты недели выполнены и сверху набран бонус за ⭐-пункты плана. Текущая неделя в зачёт не идёт — достижение откроется, когда неделя закончится. Если показ прогресса выключен в настройках, недели не считаются",
    ]},
    { version: "2.95", date: "2026-10-04 18:53", changes: [
        "Цели: если случайно отметили цель выполненной, теперь можно вернуть её обратно — у каждой цели в списке «Выполненные цели» галочка стала кнопкой «Снять отметку». Простая цель сразу возвращается в активные; многоэтапная откатывается на один этап назад",
    ]},
    { version: "2.94", date: "2026-10-04 18:55", changes: [
        "Выбор периода графика и выбор даты оформлены в цвет акцента темы: рамки сегмента «7Д · 30Д · 90Д · 1Г · Всё», чипов «Неделя / Месяц / Свой период» и пилюли со стрелками — одного цвета вместо «чёрных»; выбранный чип отличается заливкой и цветом текста. То же — у переключателя даты в «Планах» и «Ежедневных метриках» (пилюля «‹ дата ›» общая). Если «чёрной» была другая рамка — пришлите скриншот, поправим точечно",
    ]},
    { version: "2.93", date: "2026-10-04 18:40", changes: [
        "Галочки в чекбоксах читаются на всех темах: на светлых акцентах (Светлая, Monet, Nord, Mocha, AMOLED, High contrast) галочка теперь тёмная — белая на них почти не была видна. Для будущих тем это проверяет тест: если у новой темы светлый акцент, а тёмной галочки нет, он подскажет. «Достижения»: накопленные баллы теперь считаются с дробными долями за подходы (как в Магазине и на Дашборде), поэтому значки «Первая сотня», «Пятьсот» и «Тысяча» открываются по тому же числу баллов, которое видно в шапке",
    ]},
    { version: "2.92", date: "2026-10-04 18:10", changes: [
        "Новые темы оформления: теперь их 11. К прежним Dark, Monet, Light и Pink добавились «Mint» (мятно-зелёная светлая), «Sepia» (тёплая бумага), «Solarized Light», «Nord», «Catppuccin Mocha», «AMOLED» (чисто чёрная, экономит батарею на OLED) и «Высокий контраст» (для лучшей читаемости). Выбор — в списке тем в боковой панели на любой странице. Цвета подобраны с проверкой контраста текста, акцента и воды; огонёк, вода и золотой стакан подстраиваются под выбранную тему",
    ]},
    { version: "2.91", date: "2026-10-04 17:52", changes: [
        "Дашборд: плашка «Итоги недели на подходе» стала нажимаемой — клик по ней открывает итог недели («сделано / не сделано» по метрикам). Ссылка «Сделай что-то из целей» по-прежнему ведёт в цели, а крестик закрывает плашку",
    ]},
    { version: "2.90", date: "2026-10-04 17:44", changes: [
        "Тренировки, карта мышц: под картой появился список «Когда тренировали каждую мышцу» — по каждой группе написано «сегодня», «вчера» или «N дн. назад» и дата, либо «ещё не тренировали». Давно не тренированные мышцы стоят сверху. В карточке выбранной мышцы то же самое: «Последний раз: вчера (29.09.2026)»",
    ]},
    { version: "2.89", date: "2026-10-04 17:41", changes: [
        "Цели: раздел теперь называется просто «Цели», а кнопка — «Добавить». То же слово «цели» в коротком туре по сайту",
        "Графики: «общий период» переименован в «Период для всех графиков», под выбором периода в окне «Настроить графики» появилась подсказка, что у любого графика можно задать свой период. В окне периода отдельного графика кнопка теперь «Как у всех графиков»",
    ]},
    { version: "2.88", date: "2026-10-04 17:30", changes: [
        "Вода: «+ Своё» больше не открывает системное окно браузера. Поле для своего количества появляется прямо в окне воды, на Дашборде и в шапке любой страницы: введите миллилитры и нажмите «Добавить» (или Enter), Esc закрывает поле. Если число не подходит (меньше 1 или больше 20000), под полем появляется подсказка и ничего не записывается",
    ]},
    { version: "2.87", date: "2026-10-04 17:18", changes: [
        "Исправлено: в Тренировках, Языках и Истории при ошибке сохранения или загрузки вместо непонятной надписи «[object Object]» теперь показывается настоящий текст ошибки, например «new row violates row-level security policy». Так проще понять, что пошло не так, и сообщить об этом",
    ]},
    { version: "2.86", date: "2026-10-04 05:05", changes: [
        "Имя профиля теперь обязательно. На первом шаге знакомства появилось поле «Как вас зовут» (без имени нельзя пойти дальше и нельзя нажать «Пропустить»): друзья видят имя в «Сообществе» вместо «Пользователь …». Если вы вошли через Google, имя подставляется из аккаунта (можно изменить), а аватарка берётся оттуда же, если своей ещё нет. У тех, кто зарегистрирован раньше и имени не задал, при входе через Google имя и аватарка подставятся один раз сами; своё имя и свою аватарку не перезаписываем. Правки только в приложении, миграция не нужна."
    ]},
    { version: "2.85", date: "2026-10-04 04:20", changes: [
        "Сообщество: рамки аватарок других людей. Купленную в «Кастомизации» рамку теперь видят в подиуме, списке лидерборда, карточках друзей и блоке «Сегодня» — у тех, кто виден в лидерборде. Рамка показывается, только если предмет действительно открыт. Нужна миграция 049; без неё чужих рамок нет, остальное работает."
    ]},
    { version: "2.84", date: "2026-10-04 03:55", changes: [
        "Новый раздел «Кастомизация» (первый срез, адрес /customization/, пункт меню на всех страницах после «Достижений»): рамки аватарки. «За баллы» — неоновая (100) и «Аврора» (150): покупаются с баланса, цена списывается как покупка в магазине; «За достижения» — золотая рамка в награду за 30 идеальных дней подряд. Купленное можно надеть и снять; рамка видна на аватаре в левом меню и в шапке «Сообщества». Нужна миграция 048; без неё страница открывается как витрина с подсказкой, покупок нет."
    ]},
    { version: "2.83", date: "2026-10-04 16:23", changes: [
        "Дробные баллы за подходы: у метрики-подходов с «Подходов в день по плану» каждый подход теперь приносит долю балла (при плане 4: 1 подход = 0,3, 2 = 0,5, 3 = 0,8), целый балл — когда метрика выполнена полностью. Работает в балансе, журнале баллов, графике, всплывающем «+0,3», Магазине и (после миграции 045) в лидерборде и очках категорий. Правило действует только для записей плана, сохранённых с этой версии; прошлые дни и уже набранные баллы не пересчитываются. Остальные метрики считаются по-прежнему целыми баллами",
    ]},
    { version: "2.82", date: "2026-10-04 12:38", changes: [
        "Дашборд: рекорды. Под названием каждого графика метрики и графика «баллы за день», а также у числовых метрик и метрик-подходов в «Дневных метриках» теперь строка «Рекорд: лучшее значение · дата» — наибольшее значение за один день за всё время (для подходов — сумма повторений). Рекорд обновляется сразу, как только вы его побили. У параметров тела (вес, талия и т. п.) рекорда нет — там непонятно, что считать лучшим",
        "Рекорды включены по умолчанию; выключаются галочкой «Показывать рекорды» в окне «Настроить Дашборд» (применяется сразу)",
    ]},
    { version: "2.81", date: "2026-10-04 12:20", changes: [
        "Аудит оформления, третий срез: чекбоксы (галочки в формах и настройках) на всех страницах стали такими же, как на Дашборде, вместо родного белого квадрата — тёмный фон и рамка в цвет текста, отмеченный заливается цветом темы с галочкой (для темы Monet — тёмная галочка, чтобы читалась на светлом акценте), у выбранного с клавиатуры — контур, у недоступного — приглушённый. Только оформление, поведение и размеры прежние",
    ]},
    { version: "2.80", date: "2026-10-04 12:10", changes: [
        "Аудит оформления, второй срез. (1) Выпадающие списки (язык и тема в меню, категории, разновидности упражнений, периоды и др.) получили единую аккуратную стрелку в цветах темы вместо системной «из 2000-х» — на 15 страницах; цвета, рамки и размеры списков остались прежними. (2) Удаление упражнения и записи в «Тренировках» теперь спрашивает подтверждение тем же окном в стиле сайта, а не системным окном браузера. Системные окна остались только при вводе своего количества воды — следующим срезом",
    ]},
    { version: "2.79", date: "2026-10-04 05:40", changes: [
        "Аудит оформления, первый срез. (1) В числовых полях (подходы, вес, цели, нормы и т. д.) пропали стрелки вверх/вниз «как из 2000-х» — вводить по-прежнему можно с клавиатуры, стрелками клавиатуры и колёсиком; на 15 страницах. (2) Вопросы «Удалить?» больше не выглядят как системное окно браузера: теперь это аккуратное окно в цветах темы с кнопками «Отмена» и «Удалить», Esc и нажатие на фон — отмена, фокус сразу на «Отмене», чтобы случайный Enter ничего не удалил. Сделано на страницах «Цели», «Навыки», «Вехи», «Английский», «Магазин», «Челленджи» (там же сообщение об ошибке сохранения вместо системного alert; подтверждение отказа от челленджа подписано «Бросить»). Удаление в «Тренировках» и ввод своего количества воды пока по-старому — следующим срезом",
    ]},
    { version: "2.78", date: "2026-10-04 11:31", changes: [
        "Огонёк при загрузке теперь держится, пока страница не загрузится целиком: раньше он пропадал в момент появления первого каркаса, и блоки выползали один за другим. Теперь на всех страницах заставка висит, пока страница не смонтирована, нет незавершённых запросов и прошло полсекунды тишины (но не дольше 8 секунд, если что-то зависло). Затухание плавное; при выключенных анимациях заставка просто исчезает",
    ]},
    { version: "2.77", date: "2026-10-04 11:02", changes: [
        "Пока на экране открыто всплывающее окно, левое и правое боковые меню не открываются ни свайпом, ни кнопкой — раньше меню можно было вытянуть поверх окна. Уже открытое меню закрывается как обычно",
    ]},
    { version: "2.76", date: "2026-10-04 10:39", changes: [
        "Графики метрик с подходами: в легенде под графиком у каждой особенности подхода теперь два числа — сколько повторений за показанный период и сколько за сегодня («· 60 · сегодня 20»). Если сегодня подходов не было, у особенности будет «сегодня 0»",
    ]},
    { version: "2.75", date: "2026-10-04 10:34", changes: [
        "Дашборд, «Планы»: если вернуться в прошлый день и отметить цель выполненной, дата выполнения ставится именно того дня, а не сегодняшняя. На сегодняшнем дне всё как раньше; несделанное с прошлых дней по-прежнему подтягивается кнопкой переноса",
    ]},
    { version: "2.74", date: "2026-10-04 10:13", changes: [
        "Напоминание «выпить воды» теперь не появляется раньше чем через 3 часа после того, как вы в последний раз добавили воду (время берётся из журнала воды в аккаунте, а если его нет — из записей на этом устройстве). Прежние правила остаются: не чаще раза в 3 часа, не ночью, не при выполненной норме",
    ]},
    { version: "2.73", date: "2026-10-04 10:08", changes: [
        "Тренировки: подходы можно добавлять прямо из таблицы записей, не открывая окон. После первого подхода в сегодняшней записи появляется кнопка «+ подход»: новый подход копирует значения предыдущего (для упражнений с левой и правой стороной копируется вся пара), время ставится текущее. Рядом кнопка «− подход» убирает последний, если их больше одного. Первый подход по-прежнему вносится окном записи",
    ]},
    { version: "2.72", date: "2026-10-04 09:59", changes: [
        "Тренировки: типовые упражнения и их разновидности выбираются из списка. В форме упражнения для нового упражнения можно выбрать типовое (отжимания, подтягивания, приседания, выпады, планка, скручивания, жим лёжа, становая тяга и другие), а ниже появляется список разновидностей: у отжиманий, например, алмазные, широкие, обычным хватом, лучника, с хлопком. Разновидность дописывается к названию. Если нужной нет, допишите свою в название руками; при смене разновидности остальное написанное не стирается",
    ]},
    { version: "2.71", date: "2026-10-04 09:52", changes: [
        "Дашборд: виджет «Изучение языков» в блоке «Виджеты» на главной. Включается галочкой в окне «Настроить дашборд», там же выбирается язык или «Все языки». На главной всегда перед глазами первые 5 слов, которые вы ещё не выучили, дальше список прокручивается внутри виджета. Нажмите на слово, чтобы увидеть перевод и пример. «Знаю» уводит слово вниз очереди (на этом устройстве), «Выучил» отмечает слово выученным в разделе «Языки»",
    ]},
    { version: "2.70", date: "2026-10-04 03:10", changes: [
        "Сообщество: значки достижений рядом с именем — в шапке (до 5), на подиуме, в списке лидерборда и в карточках друзей (до 2–3 самых ценных и «+N»). Показываются свои значки и значки тех, кто виден в лидерборде (нужна миграция 047; без неё значков просто нет, остальное работает). Починена вёрстка на телефоне: кнопка профиля стала компактной, у заявки в друзья «Принять» и «Отклонить» помещаются в строку, карточки переносят кнопки вниз на узком экране."
    ]},
    { version: "2.69", date: "2026-10-04 02:58", changes: [
        "Вода, записанная из окна шапки (на любой странице, кроме Дашборда), теперь тоже показывает анимацию «+1 / −1» с монетой у места нажатия — когда набрана норма воды или снята отметка. На Дашборде анимация не задвоилась: там слой остался один."
    ]},
    { version: "2.68", date: "2026-10-04 04:41", changes: [
        "Дашборд, блок «Графики»: кнопка «Настроить графики» и выбор периода первого графика теперь в одной строке — настройка слева, период справа (раньше каждая занимала свою строку). Пока графиков нет, кнопка настройки стоит одна, слева. У остальных графиков период по-прежнему справа",
    ]},
    { version: "2.67", date: "2026-10-04 04:38", changes: [
        "История: свайп по месяцу и сетке дней больше не выдвигает боковые плашки — как в Календаре, защищены и левое меню, и правая панель (раньше правая панель всё равно выезжала). Смена месяца свайпом по сетке работает как прежде",
    ]},
    { version: "2.66", date: "2026-10-04 04:35", changes: [
        "Страница входа: «Войти» (и «Зарегистрироваться») теперь выглядит как кнопка — залита цветом темы, подсвечивается при наведении, а пока идёт вход, приглушена. У вкладок «Войти/Регистрация», выбора языка, показа пароля и кнопки Google на компьютере теперь курсор-рука",
    ]},
    { version: "2.65", date: "2026-10-04 04:33", changes: [
        "Подпись «День сделан» заменена на «Прогресс дня» — в кольце дня в шапке и правой панели, в подсказке на Дашборде и в заголовке окна со сводкой дня",
    ]},
    { version: "2.64", date: "2026-10-04 04:25", changes: [
        "Тренировки: у прогрессивных программ («Отжимания: 6 недель», «Подтягивания: 6 недель») появилась кнопка «Начать программу» — она добавляет упражнения и запускает программу с сегодняшнего дня. На странице появляется карточка активной программы: «Неделя N из M» и нагрузка этой недели (считается по дате старта), список недель с отметкой «пройдена», полоска прогресса и завершение программы (в два шага, без системного окна). Новая программа заменяет текущую — окно шаблонов предупреждает об этом",
        "Активная программа запоминается в профиле и подтягивается на другое устройство; завершённая на одном устройстве не «воскресает» на другом. Для синхронизации нужна миграция 040 (владелец применяет в Supabase SQL Editor); до неё программа работает, но только на этом устройстве",
    ]},
    { version: "2.63", date: "2026-10-04 04:30", changes: [
        "Магазин: объяснена идея. При первом заходе над товарами появляется плашка «Магазин заслуженного» — здесь не тратят деньги, а тратят сделанное: баллы зарабатываются привычками, тренировками, целями и сериями, а магазин нужен, чтобы позволять себе вещи, которые и хочется, и как будто лишние, без чувства вины. После «Понятно» остаётся короткая строка под заголовком со значком ⓘ, который открывает тот же текст. Запоминается на устройстве",
    ]},
    { version: "2.62", date: "2026-10-04 04:20", changes: [
        "«Достижения»: при открытии нового значка появляется окно-поздравление — крупный значок, название, за что он дан и тёплая строка по теме (серии, баллы, тренировки, цели, книги). Если открылось сразу несколько — они листаются кнопкой «Дальше» («1 из 3»). Окно закрывается кнопкой, нажатием на фон или Esc; анимация отключается общим выключателем и системной настройкой «уменьшить движение». Достижения, выполненные до появления раздела, молча открываются без окна. Окно показывается при заходе на страницу «Достижения»",
    ]},
    { version: "2.61", date: "2026-10-04 04:05", changes: [
        "«Достижения» появились в боковом меню всех страниц (после «Магазина»): теперь раздел открывается одним нажатием, а не только по адресу /achievements/. Таблица значков уже применена владельцем, так что открытые значки сохраняются в аккаунте",
    ]},
    { version: "2.60", date: "2026-10-04 03:46", changes: [
        "Дашборд: в блоке «Планы» появился переключатель дня «‹ дата ›» с чипом «Сегодня» — как у «Дневных метрик». Можно посмотреть и поправить, что было в планах вчера и раньше. Дата общая с «Дневными метриками»: листаете в одном блоке — день меняется в обоих. Напоминания о планах по прошлым дням не срабатывают, перенос незавершённого доступен только на сегодняшнем дне",
    ]},
    { version: "2.59", date: "2026-10-04 03:39", changes: [
        "Дашборд: «Что полезного сделал за день» теперь по умолчанию свёрнут и стоит в самом низу блока «Ежедневные метрики» (после «Подходов»). В заголовке видно, сколько пунктов за выбранный день; нажмите на заголовок, чтобы раскрыть. Выбор «раскрыт/свёрнут» запоминается. Пункты по-прежнему сохраняются сразу при добавлении",
    ]},
    { version: "2.58", date: "2026-10-04 03:34", changes: [
        "Огонёк слева сверху теперь живой на всех страницах, а не только на Дашборде: те же языки пламени, цвет берётся от акцента выбранной темы, анимация гаснет при «уменьшить движение» и при общем выключателе анимаций. В окне входа над заголовком тоже горит живое пламя в цвете темы",
    ]},
    { version: "2.57", date: "2026-10-04 03:18", changes: [
        "Магазин: два вида на выбор. «Витрина» — закреплённый баланс с итогами, чипы-фильтры «Все / Можно купить / Копится / Мои покупки» с количеством и сетка карточек с картинкой, ценой, прогрессом и кнопкой. «Список с копилкой» — баланс с полосой прогресса к ближайшей цели («Копите на: …»), разделы «Можно купить сейчас» и «Копится» и свёрнутые «Мои покупки». Переключатель вида — над балансом, выбор запоминается на устройстве. Покупка, правка и удаление работают в обоих видах как раньше",
    ]},
    { version: "2.56", date: "2026-10-04 03:11", changes: [
        "Вода: когда норма выполнена на 100% и больше, стакан в шапке сайта (на всех страницах) и стакан на странице Дашборда становятся золотыми: золотой контур, мягкое свечение и блик, который проходит по воде. Если вы выключили анимации или в системе включено «уменьшить движение», остаётся только золотой контур",
    ]},
    { version: "2.55", date: "2026-10-04 03:04", changes: [
        "Подходы в Дневных метриках: исправлено «то есть, то нет» с подсказками-вариантами (например, «широкий хват»). Если в поле уже выбран вариант, тап по нему теперь показывает весь список сохранённых вариантов, а не только выбранный, а при вводе список по-прежнему фильтруется. Быстрый повторный тап в поле больше не закрывает только что открытый список",
    ]},
    { version: "2.54", date: "2026-10-04 02:51", changes: [
        "Дашборд: блок «Виджеты» на главной. В окне «Настроить дашборд» появился раздел «Виджеты на главной» с галочками. Виджет «Навыки»: отметьте нужные навыки, и на главной у каждого будет полоса прогресса и кнопка «+шаг» (как в разделе Навыков); на 100% навык освоен, очки начисляются с анимацией «+N». Виджет «Коплю на товар»: выберите товар магазина, и на главной появится полоса «баллы / цена» с подсказкой, сколько баллов не хватает, и ссылкой в магазин. Если ни один виджет не выбран, блока нет вообще; блок можно переставлять, как остальные",
    ]},
    { version: "2.53", date: "2026-10-04 02:33", changes: [
        "Сообщество: друзья и подписки теперь карточками (аватар, имя, серия и баллы за выбранный период, кнопки действий справа), заявки в друзья — тем же видом. Данные берутся из лидерборда, SQL не нужен; скрытым из лидерборда баллы не показываются."
    ]},
    { version: "2.52", date: "2026-10-04 02:28", changes: [
        "Сообщество переоформлено: сверху карточка с вашим местом, баллами и серией, лидерборд с подиумом топ-3 и списком с 4-го места, аватары-заглушки с инициалами. Переключатель периода «Неделя / Месяц / Всё время» (нужна миграция 046; без неё остаётся «Всё время» и всё работает как раньше). Блок «Сегодня» поднят выше, друзья и поиск — ниже, сравнение по активности без изменений. За период считаются только баллы за дни; цели, навыки и книги входят в «Всё время»."
    ]},
    { version: "2.51", date: "2026-10-04 02:15", changes: [
        "Подходы в день по плану: серверные серии, баллы и лидерборд теперь считают «выполнено» по тому же правилу, что и страницы (миграция 044), поэтому серии, очки категорий и баланс совпадают везде. Каждый день считается по правилу, действовавшему в этот день: прошлые дни и уже набранные очки не меняются. После применения миграций 041 и 044 параметр «Подходов в день по плану» в форме метрики-подходов можно заполнять. Без миграций всё работает как раньше",
    ]},
    { version: "2.50", date: "2026-10-04 02:07", changes: [
        "Подходы в день по плану: правило «N подходов» теперь учитывается не только на Дашборде, но и в шапке, Истории, Магазине и в балансе и журнале баллов профиля — кольца, баллы и История не расходятся. Каждый день считается по правилу, действовавшему в этот день: прошлые дни и уже начисленные баллы не пересчитываются. Поле в форме метрики по-прежнему появляется после применения миграции 041; серии и баллы на сервере — следующим шагом",
    ]},
    { version: "2.49", date: "2026-10-03 21:02", changes: [
        "Вода: норма стала нормой ПИТЬЯ — вода из еды (супы, фрукты, овощи) в неё не входит, около 20% суточной воды человек получает с едой, и эта доля вычтена. Автоматическая норма пересчитана одной формулой: с ростом — площадь поверхности тела × 1000 мл/м² (было 1200), без роста — вес × 26 мл (было 30), без веса — 1800 мл (было 2000). Например, 70 кг и 175 см: было 2210, стало 1840 мл. Норма, заданная вручную, не меняется",
        "Справка «i» у дневной нормы воды (окно воды на Дашборде и в шапке) теперь встроенная плашка под подписью, а не системное окно браузера: показывает расчёт и во всех случаях объясняет, что вода из еды не считается; повторный клик скрывает её",
        "Для баллов и серий в базе нужна миграция 043 (владелец применяет в Supabase SQL Editor): до неё сайт считает по новой норме, а база — по старой, кольца и баллы могут ненадолго расходиться",
    ]},
    { version: "2.48", date: "2026-10-03 20:31", changes: [
        "Новый раздел «Достижения» (первый срез, адрес /achievements/): 19 стартовых значков — первые шаги (галочка, вес, цель, навык, книга, тренировка), серии «идеальных дней» 5/10/30/100, накопленные баллы 100/500/1000, 10 и 50 дней с тренировкой, 1 и 5 завершённых челленджей, 10 целей, 5 книг. Открытые — цветные с датой, закрытые — тусклые с условием и полоской прогресса. Открытое остаётся открытым, даже если число потом уменьшилось; достижения, выполненные до появления раздела, открываются без даты. Пока владелец не применил миграцию 039, открытые значки хранятся на устройстве — ничего не ломается. Пункт в боковом меню, окно-поздравление и награды-предметы из «Кастомизации» — следующими шагами",
    ]},
    { version: "2.47", date: "2026-10-03 20:12", changes: [
        "Челленджи: значения дней можно брать из тренировок. В «Источнике значений» (форма челленджа) теперь есть группа «Упражнения из тренировок»: выберите упражнение — для каждого дня без ручной записи будет подставлена сумма повторов по всем подходам этого упражнения (несколько записей за день складываются). Ручная запись за день всегда главнее, дни до старта челленджа не меняются. На карточке появилась пометка «из тренировок». Нужна миграция 042: пока владелец её не применил, выбор упражнений скрыт и всё работает как раньше",
    ]},
    { version: "2.46", date: "2026-10-03 20:01", changes: [
        "Тренировки, «Прогрессии упражнений»: новая цепочка «Планка (на время)» — на коленях, обычная, боковая, с подъёмом ноги. Ступень проходится, когда в одном подходе вы продержались нужное число секунд (30, 60, 45 и 30). Секунды записывайте так же, как раньше: в поле подхода, где у других упражнений повторения. В цели и в лучшем подходе теперь стоит «сек» вместо «повт.»",
    ]},
    { version: "2.45", date: "2026-10-03 19:54", changes: [
        "Правая панель и окна шапки: вместо эмодзи (капля, шестерёнка, гантель, звезда бонуса, «Отменить», карандаш) теперь те же аккуратные иконки, что и на страницах сайта, — в цвет темы. В подсказках при наведении на стакан и кольца эмодзи убраны, остались только числа",
    ]},
    { version: "2.44", date: "2026-10-03 19:32", changes: [
        "Дашборд: блоки можно перетаскивать прямо на главной, как на телефоне. В заголовке каждого блока (Профиль, Дневные метрики, Графики) есть ручка из трёх полосок: возьмите её и потяните вверх или вниз. Пока тянете, поверх страницы показываются компактные карточки блоков: ваша идёт за пальцем, остальные расступаются; отпустили, и порядок сразу сохранён. С клавиатуры блок двигают стрелки вверх и вниз на ручке. Отдельный режим «Изменить порядок» убран; в окне настройки дашборда по-прежнему можно скрывать и показывать блоки",
    ]},
    { version: "2.43", date: "2026-10-03 19:24", changes: [
        "Метрики-подходы: новый параметр «Подходов в день по плану» (первый срез, только Дашборд). Если он задан, метрика считается выполненной, когда внесено не меньше этого числа подходов (и достигнут общий объём цели, если он задан). Правило действует с того дня, когда параметр задан или изменён; прошлые дни не пересчитываются, баланс и серии не «прыгают». Поле в форме метрики появится после применения миграции 041 в Supabase; без неё всё работает как раньше. Остальные страницы, баллы за каждый подход и серии на сервере — следующими шагами",
    ]},
    { version: "2.42", date: "2026-10-03 19:17", changes: [
        "Вода: исправлено добавление по кнопке «+200» / «+500» из правой шторки и из окна воды. Раньше число и анимация менялись только после ответа сервера, и при нескольких быстрых нажатиях записи затирали друг друга, а в журнал попадала «куча нажатий». Теперь значение растёт сразу при нажатии, все нажатия записываются по очереди и дают ровно сумму; если запись не удалась, добавка откатывается. Отмена и правка суммы тоже встают в эту очередь",
    ]},
    { version: "2.41", date: "2026-10-03 10:27", changes: [
        "Календарь: свайп по сетке месяца и по строке выбора месяца больше не выдвигает боковые плашки (левое меню и правую панель). Жесты у самого края страницы, вне календаря, работают как раньше",
    ]},
    { version: "2.40", date: "2026-10-03 10:24", changes: [
        "Дашборд: в плашке «Установите приложение» заголовок и пояснение больше не слипаются в одну строку — теперь это два отдельных блока, пояснение под заголовком (и на русском, и на английском)",
    ]},
    { version: "2.39", date: "2026-10-03 12:57", changes: [
        "Эмодзи → иконки: значки шаблонов челленджей (каталог, карточки и список), предложенных навыков и подсказок в онбординге теперь рисуются единым набором иконок, а не цветными эмодзи. Для «Холодного душа», «Без сахара», «Выучить слов», «Слепой печати», «Мостика», «Свиста», «Шпагата», «Жонглирования», «Стойки на руках» и дыхания подобраны близкие по смыслу иконки. Всё, что уже сохранено у тебя, не меняется",
    ]},
    { version: "2.38", date: "2026-10-03 12:45", changes: [
        "Тренировки: группы мышц, которые ты отметил у упражнения, теперь синхронизируются между устройствами. Отметил на телефоне — на компьютере упражнение уже на карте мышц; сброс на одном устройстве действует на всех. Привязки, отмеченные раньше на этом устройстве, один раз загрузятся автоматически. Работает после обновления базы данных, до этого всё остаётся как раньше — на одном устройстве",
    ]},
    { version: "2.37", date: "2026-10-03 12:33", changes: [
        "Дашборд: в блоке «Дневные метрики» каждый параметр (число, галочка, выбор из вариантов) теперь лежит в своей мини-плашке с тонкой рамкой — несколько параметров подряд больше не сливаются. На графиках метрик рядом с названием появился огонёк серии с числом дней (приглушённый, если сегодня серия ещё не засчитана) — такой же, как у метрики в дневных метриках",
    ]},
    { version: "2.36", date: "2026-10-03 06:44", changes: [
        "Дашборд: режим «Изменить порядок блоков» прямо на главной. Новая кнопка рядом с ⚙️ в заголовке сворачивает тяжёлые блоки в компактный список карточек — Профиль, Графики, Дневные метрики и планы. Блок берётся за ручку ☰ и переносится пальцем или мышью (стрелки ↑/↓ и переключатель видимости рядом); порядок сохраняется сразу, «Готово» возвращает обычный вид страницы. Тот же код перетаскивания, что в окне раскладки и в «Глобальных настройках»",
    ]},
    { version: "2.35", date: "2026-10-03 06:33", changes: [
        "Правая панель: свайп справа налево теперь можно начинать не только у самого края, а с правой половины экрана — вплоть до середины. Чтобы не мешать обычным касаниям и прокрутке, вне узкой зоны у края жест строже: нужно провести дальше и почти строго горизонтально; на графиках, ползунках, полях ввода и горизонтально прокручиваемых блоках он не срабатывает",
        "Исправлено: пока открыто левое боковое меню или правая панель, страница под ними больше не прокручивается вверх-вниз. Прокрутка возвращается, когда закрыты обе шторки",
    ]},
    { version: "2.34", date: "2026-10-03 03:12", changes: [
        "Заставка загрузки с горящим огоньком теперь на всех страницах нового сайта (Цели, Навыки, История, Календарь, Магазин, Челленджи, Сообщество, Вехи, Языки, Аккаунт, Тренировки, вход и онбординг), а не только на Дашборде. Раньше, пока страница грузилась, был пустой экран — теперь огонёк в цвете вашей темы виден с первого кадра и сам сменяется страницей. Вариант заставки (живое пламя, огненный круг, классика) общий и берётся из того же выбора, что на Дашборде; движение выключается «уменьшением движения» в системе и переключателем «Отключить все анимации»",
    ]},
    { version: "2.33", date: "2026-10-03 05:49", changes: [
        "Избранное: круглая кнопка наверху страницы, которая открывает быстрые ссылки на избранные разделы, теперь с сердечком (раньше в ней была только маленькая стрелка и она выглядела пустым кружком). Сердечко пустое, пока список закрыт, и заливается цветом темы, когда открыт; подпись кнопки — «Избранное». Сердечко «добавить страницу в избранное» тоже стало контрастнее: его контур больше не теряется на тёмных и тёплых темах",
    ]},
    { version: "2.32", date: "2026-10-03 05:38", changes: [
        "Тренировки: в форме упражнения появился выбор групп мышц. Если упражнения нет в справочнике (например, «Wall angels»), отметь нужные группы — и оно попадёт на карту мышц, в статистику и перестанет висеть в списке «не привязанных». Под названием видно, распознано ли упражнение автоматически, а кнопка «Сбросить на автоматическую» возвращает прежнее поведение. Привязка хранится на этом устройстве и переживает переименование упражнения",
    ]},
    { version: "2.31", date: "2026-10-03 05:27", changes: [
        "Вода: плашка-напоминалка «Пора выпить воды» теперь пропадает сразу, как только вы добавили воду (раньше — только когда была выпита вся норма), а числа в ней обновляются мгновенно из записи воды в шапке или правой панели. Вода, добавленная за другую дату, сегодняшнюю плашку не гасит. Числа в плашке стали защищены: вместо пустых, отрицательных или нечисловых значений показывается 0, а «осталось» никогда не уходит в минус",
    ]},
    { version: "2.30", date: "2026-10-03 01:49", changes: [
        "Серия в Сообществе и лидерборде больше не обнуляется из-за незавершённого сегодняшнего дня: если вчера всё было сделано, а сегодня внесена лишь часть метрик, серия считается со вчерашнего дня, а не показывается как 0. Нужна миграция 037 в Supabase; без неё всё работает как раньше",
    ]},
    { version: "2.29", date: "2026-10-02 20:07", changes: [
        "Вода: каждое добавление воды теперь сохраняется с точным временем в вашем аккаунте — журнал «Записи за день» виден на всех устройствах. В окне воды появилось необязательное поле «Время»: можно указать, когда вы выпили (или внести воду за прошлый день с нужным временем); если оставить пустым — берётся «сейчас», а для прошлого дня 12:00. «Отменить последнее добавление» убирает и строку журнала. Пока обновление базы данных не применено, журнал показывает записи только этого устройства",
    ]},
    { version: "2.28", date: "2026-10-02 22:58", changes: [
        "Левое боковое меню: наверху теперь блок профиля — аватар (или буква на цвете темы), имя и почта; клик ведёт в Аккаунт. «История» перенесена в самый низ списка страниц: отделена чертой и стоит сразу перед «Аккаунтом». Новая опция в «Глобальных настройках» (правая панель): «Показывать прогресс дня и недели вверху бокового меню» — кольца дня и недели прямо в меню, клик открывает сводку. По умолчанию опция выключена",
    ]},
    { version: "2.27", date: "2026-10-02 19:41", changes: [
        "Дашборд (пилот): в окне воды эмодзи заменены на SVG-иконки — капля в заголовке, стрелка «Отменить последнее добавление» (новая иконка), карандаш правки суммы за день; из подсказок над стаканом убрана капля-эмодзи (остался текст «выпито / норма»). Остальные эмодзи в шапке и правой панели — следующим шагом",
    ]},
    { version: "2.26", date: "2026-10-02 22:29", changes: [
        "Графики: выбор периода стал понятнее. Вместо шести длинных кнопок в несколько рядов — одна строка коротких вариантов 7Д · 30Д · 90Д · 1Г · Всё и кнопка «Свой период» с календарём. Неделю и месяц теперь можно листать стрелками назад и вперёд (отдельной «Прошлой недели» больше нет), а под выбором всегда подписаны даты выбранного периода. У каждого графика рядом с календарём теперь видно, какой период он показывает, а если у него свой — кнопка подсвечена. Ранее сохранённые периоды продолжают работать",
    ]},
    { version: "2.25", date: "2026-10-02 22:16", changes: [
        "Эмодзи в интерфейсе заменены на единые SVG-иконки на всех страницах: заголовки окон («Что нового», «Установка», «О приложении»), кнопки («Добавить», «Готово»), значки «Предложить», «Завершено» и др., кнопка меню-«гамбургер», окно знакомства с приложением, выбор периода, календарь, вехи, история дня, магазин. Исправлено: в «Метриках дня» рядом с иконкой-шестерёнкой оставалась ещё и настоящая эмодзи-шестерёнка. Добавлено 11 новых иконок (меню, колокольчик, ключ, письмо, корзина и др.). Оставшиеся места (вода, шапка, пресеты шаблонов) — в очереди",
    ]},
    { version: "2.24", date: "2026-10-02 21:53", changes: [
        "Серии: исправлено — пунктирный огонёк «серия идёт, но сегодня ещё не готово» снова показывается. Раньше стоило внести за сегодня любую запись (например, воду), и все ещё не выполненные сегодня серии (идеальный день, метрики) обнулялись и пропадали из списка, а огонёк горел сплошным. Теперь незавершённая серия сохраняется и помечается как требующая внимания. Заодно: серия «заметка дня» больше не недосчитывается на один день",
    ]},
    { version: "2.23", date: "2026-10-02 14:33", changes: [
        "Избранное: вместо дублирующего списка страниц по шеврону вверху теперь «Избранное». На каждой странице меню (Цели, Навыки, Тренировки, Челленджи, Языки, Календарь, Вехи, Магазин, Сообщество, История) вверху появилось сердечко: пустое — страницы нет в избранном, залито цветом темы — есть. Список по шеврону показывает только избранные страницы; пока ничего не выбрано, там подсказка. Все страницы по-прежнему в боковом меню. Избранное запоминается на устройстве сразу, а для синхронизации между устройствами нужна миграция 035 (владельцу применить в Supabase)",
    ]},
    { version: "2.22", date: "2026-10-02 11:10", changes: [
        "Дашборд (пилот): кольцо прогресса недели в профиле теперь семиугольник — семь сторон по числу дней недели, линия толще, чем у круга дня, так что день и неделя отличаются с первого взгляда. Прогресс идёт по периметру, бонус ⭐ показывается второй дугой, как и раньше. Кольцо дня вокруг аватара и значок недели в шапке не менялись",
    ]},
    { version: "2.21", date: "2026-10-02 11:03", changes: [
        "Дашборд (пилот): стакан воды в шапке при достижении 100% нормы становится золотым — контур и ободок окрашиваются в золото (на светлых темах — более тёмный оттенок, чтобы читался), вокруг мягкое свечение, а по воде время от времени проходит блик. Если норма снова не выполнена (например, отменили последнее добавление), стакан возвращается к обычному виду. Анимация выключается при «уменьшении движения» в системе и выключателем «Отключить все анимации». Стакан на других страницах (в правой панели) пока прежний",
    ]},
    { version: "2.20", date: "2026-10-02 13:53", changes: [
        "Баллы на страницах Целей и Навыков: когда закрываешь цель, осваиваешь навык или отмечаешь книгу прочитанной, у места нажатия появляется «+N» с монеткой и плавно уплывает вверх; если снять отметку — «−N». Сумма — столько, сколько цель, навык или книга приносят в баланс. Анимация показывается только после того, как отметка сохранилась, и отключается общим выключателем анимаций",
    ]},
    { version: "2.19", date: "2026-10-02 13:33", changes: [
        "Цели и Навыки: старые монетки и прогресс-бары заменены на современные. Баллы теперь везде показываются иконкой-монетой с огоньком (в целях, навыках и книгах вместо эмодзи). Навыки — карточки: скруглённый прогресс-бар цвета темы с плавным заполнением и процентом, шаги «−/+», круглая отметка «освоено» и иконки правки и удаления вместо символов ✎ ✕",
    ]},
    { version: "2.18", date: "2026-10-02 13:25", changes: [
        "Русский язык: слово «стрик/стрейк» заменено на «серия» везде, где пользователь его видит (Дашборд, вечернее напоминание, настройки метрики, тур по сайту, старые записи в списке изменений). Английский текст («streak») без изменений",
    ]},
    { version: "2.17", date: "2026-10-02 13:10", changes: [
        "Дашборд (пилот): метрики с подходами теперь тоже показывают огонёк и число дней серии рядом с названием (как остальные метрики). Каждый подход в таблице подходов лежит на собственной подложке-карточке, а не голой строкой",
    ]},
    { version: "2.16", date: "2026-10-02 04:36", changes: [
        "Вода: в окне воды появился блок «Записи за день» — время каждого добавления и на сколько изменилась сумма (например, 08:05 +250 мл; уменьшение показывается красным). Блок есть и на главной, и в окне воды в шапке на остальных страницах. Пока записи хранятся только на этом устройстве и на другие не передаются; отмена последнего добавления убирает и его строку из журнала",
    ]},
    { version: "2.15", date: "2026-10-02 07:27", changes: [
        "Правая панель: свайп стал надёжнее. Жест можно начинать не только у самого края экрана, а в правой части (примерно пятая часть ширины) — на Android край занят системным жестом «назад», поэтому раньше свайп мог не срабатывать. Панель открывается, как только палец ушёл влево, не дожидаясь отпускания. Жест не срабатывает, если палец лёг на ползунок, поле ввода или горизонтально прокручиваемый блок. Кнопка в шапке работает по-прежнему",
    ]},
    { version: "2.14", date: "2026-10-02 07:12", changes: [
        "Раскладка блоков Дашборда: окно «Отображение и порядок» переделано. Блоки теперь карточки с названием и коротким описанием; порядок меняется перетаскиванием за ручку ☰ (пальцем или мышью — соседние карточки уступают место) либо стрелками ↑/↓; видимость — понятным переключателем вместо глаза. Тот же список в «Глобальных настройках» (правая панель, любая страница) — изменения сохраняются сразу. Ручка ☰ доступна и с клавиатуры: стрелки вверх/вниз двигают блок",
    ]},
    { version: "2.13", date: "2026-10-02 04:00", changes: [
        "Дашборд (пилот): эмодзи на кнопках и в подписях блоков тоже заменены на единые SVG-иконки — «Добавить», «Добавить подход», «Добавить метрику», «Баллы за день», «Включить уведомления», «Настроить графики», «Изменить значения», «Добавить из целей», «Бонус» в итогах, предупреждение о серии и др. Иконки берут цвет текста и темы. Добавлен тест-страж: новый текст с эмодзи в шаблоне, у которого есть SVG, не пройдёт проверку",
    ]},
    { version: "2.12", date: "2026-10-02 03:56", changes: [
        "Дашборд (пилот): эмодзи в заголовках секций и окон (Профиль, Планы, Графики, Серии, Ежедневные метрики, «Что нового», настройки и др.) заменены на единый набор SVG-иконок — они берут цвет текста и темы, не зависят от системного набора эмодзи и выглядят одинаково на всех устройствах. Эмодзи, для которых иконки пока нет (например, луна в названии тёмной темы), остаются как были. Тексты в словаре не менялись, классическая версия не затронута",
    ]},
    { version: "2.11", date: "2026-10-02 06:46", changes: [
        "Вода без заданной нормы теперь честно отображается на графиках: на графике воды линия-ориентир показывает твою расчётную норму (по весу и росту, а без них — 2000 мл), а в сравнении в Сообществе она входит в «сумму целей» категории. Раньше там было пусто или ноль",
    ]},
    { version: "2.10", date: "2026-10-02 06:41", changes: [
        "Вода во всех разделах: в окне воды из шапки (на любой странице и в правой панели) тоже появились «Отменить последнее добавление» и карандашик для правки всей суммы за день — как в Дашборде. Отмена откатывает записанное шаг за шагом, пока значение дня не изменили в другом месте; правку суммы тоже можно отменить. После отмены и правки показывается «сохранилось»",
    ]},
    { version: "2.09", date: "2026-10-02 06:27", changes: [
        "Дашборд: блок «Профиль» (аватар, возраст, параметры тела) теперь появляется сразу, как только загружены его собственные данные, и не ждёт подсчёта баллов — раньше он задерживался, пока считался баланс по всей истории. Монета с баллами подгружается следом. Заодно ускорено чтение больших историй данных: страницы после первой загружаются несколькими запросами одновременно",
    ]},
    { version: "2.08", date: "2026-10-02 06:18", changes: [
        "Цели: страница целей в современном виде — вместо таблицы с текстовой полоской и кнопками «−/+» теперь карточки. Простая цель — круглая галочка; многоэтапная — прогресс по этапам (сегмент на каждый этап, а при многих этапах — полоса), «2/5» и процент, кнопка «+» для следующего этапа и раскрывающийся список этапов: тап по этапу отмечает прогресс до него, повторный тап по последнему выполненному откатывает его. Выполненные цели — компактные карточки",
    ]},
    { version: "2.07", date: "2026-10-02 06:11", changes: [
        "Дашборд (пилот): напоминание выпить воды. Если при открытии приложения дневная норма воды ещё не выпита, на главной появляется мягкая плашка «Пора выпить воды» с тем, сколько выпито и сколько осталось. Не чаще раза в 3 часа, только при открытии (без уведомлений и фоновых таймеров) и не ночью, с 22:00 до 08:00. Выключается в «Настройках» (правая панель): «Напоминать выпить воды»",
    ]},
    { version: "2.06", date: "2026-10-01 20:12", changes: [
        "Выбор иконки для метрик и параметров тела стал удобнее: по умолчанию показываются только популярные иконки, а редкие спрятаны во вкладки по темам (Спорт, Здоровье, Еда, Учёба и работа, Дом и деньги, Природа и путешествия, Творчество и разное) и во вкладку «Все». Поиск работает по всему набору иконок и понимает несколько слов (например, «бег лёгкая»), «ё» и «е» не различаются. Выбранная иконка всегда видна отдельной строкой с названием, а у каждой иконки есть подсказка с названием на вашем языке",
    ]},
    { version: "2.05", date: "2026-10-01 19:57", changes: [
        "Выключатель «отключить все анимации» теперь действует на всех страницах: в Календаре, Магазине, Тренировках, Челленджах, Целях, Навыках, Истории, Языках, Сообществе, Аккаунте, а также на страницах входа и онбординга — раньше он гасил анимации только в Дашборде и в виджетах шапки. Флаг применяется до первой отрисовки страницы, поэтому с первого кадра ничего не мерцает и не движется; плавное сворачивание блоков в Тренировках тоже его учитывает",
    ]},
    { version: "2.04", date: "2026-10-01 22:48", changes: [
        "Вода: в автоматической норме теперь учитывается рост. Если в профиле указан рост, норма считается по площади поверхности тела (формула Мостеллера: √(рост × вес / 3600)) × 1200 мл/м² — это обычная потребность в жидкости 1500 мл/м² в сутки, из которых около 20% приходит с едой. Пример: 70 кг и 175 см дают 2210 мл. Без роста расчёт прежний — вес × 30 мл. В окне воды (на Дашборде и в шапке на всех страницах) появилось поле «Рост, см», а справка (i) подробно объясняет, как получена норма. Рост берётся из профиля, который вы заполняли при онбординге",
    ]},
    { version: "2.03", date: "2026-10-01 19:35", changes: [
        "Установка приложения (PWA): на всех страницах нового сайта теперь регистрируется service worker (раньше его регистрировали только страницы старой версии, и новый пользователь, открывший сайт на новой странице, не получал его — браузер не считал сайт устанавливаемым и не показывал значок установки в адресной строке). На Дашборде появилась закрывающаяся плашка «Установите приложение» с кнопкой «Установить» (на iPhone — подсказка «Поделиться → На экран Домой»); закрытая плашка не появляется 14 дней. Установленное приложение плашку не видит",
    ]},
    { version: "2.02", date: "2026-10-01 19:16", changes: [
        "Иконка приложения на Android: на всех страницах нового сайта (Дашборд, Цели, Навыки, История, Календарь, Магазин, Челленджи, Сообщество, Вехи, Языки, Аккаунт, Тренировки, вход и онбординг) подключены манифест приложения и иконка для iOS. Раньше они были только в старой версии, поэтому при установке с новых страниц Android не видел монохромную иконку и оставлял стандартную. Чтобы иконка обновилась, приложение нужно удалить с экрана и установить заново; перекраска под тему системы работает на Android 13+ при включённых «Тематических значках»",
    ]},
    { version: "2.01", date: "2026-10-01 22:02", changes: [
        "Дашборд (пилот): рядом с названием каждой метрики, по которой идёт серия, теперь виден огонёк и число дней подряд (у недельных расписаний — недели). Если сегодня ещё не засчитано, огонёк приглушён с подсказкой «сегодня не сделано». У метрик с выключенным «считать серию» огонька нет",
    ]},
    { version: "2.00", date: "2026-10-01 21:51", changes: [
        "Дашборд (пилот), графики: в выборе периода появился вариант «Последние 30 дней», и он стал периодом по умолчанию вместо «Последних 10 дней» (у кого период уже выбран вручную, он сохраняется). Из-за короткого периода по умолчанию графики казались пустыми, хотя данные за месяц были",
    ]},
    { version: "1.99", date: "2026-10-01 20:02", changes: [
        "Тренировки: в форме упражнения поле «Что считаем?» теперь выпадающий список — повторения, секунды, минуты, км, метры, раунды — вместо ручного ввода. Если нужного варианта нет, выбери «Другое…» и впиши своё слово. У уже созданных упражнений значение сохраняется как было, в том числе своё",
    ]},
    { version: "1.98", date: "2026-10-01 14:54", changes: [
        "Вода: справка (i) у дневной нормы больше не пишет «задана вручную», когда это не так. Теперь она честно объясняет источник: если норма автоматическая — «рассчитана автоматически по вашему последнему весу (вес × 30 мл)», если зафиксирована — что она держится на показанном значении (вы поменяли её сами или она осталась от шаблона) и что дал бы расчёт по весу. Появилась кнопка «Считать автоматически (N мл)», чтобы снова считать норму по весу. Новые пользователи после онбординга сразу получают автоматическую норму, а не предустановленные 2500 мл. Работает и в окне воды в шапке на всех страницах",
        "Дашборд: блок «Графики» свёрнут по умолчанию, пока ни один график не построен (нет данных или меньше двух точек) — не занимает место впустую; как только данные появляются, разворачивается сам. Если вы сами развернули или свернули блок, ваш выбор всегда сильнее",
    ]},
    { version: "1.97", date: "2026-10-01 11:43", changes: [
        "«Выйти» теперь с подтверждением на всех страницах нового сайта (Аккаунт, Календарь, Челленджи, Сообщество, Цели, История, Языки, Вехи, Магазин, Навыки, Тренировки; Дашборд — с v1.95): по нажатию в боковом меню появляется окно «Точно выйти?» с кнопками «Выйти» и «Отмена». Esc и клик по фону отменяют, фокус сразу на «Отмене» — защита от случайного нажатия. В правой панели пока по-старому",
    ]},
    { version: "1.96", date: "2026-10-01 11:33", changes: [
        "Дашборд (пилот): исправлено «пропадает фон внизу экрана при прокрутке». Причина — в заставке загрузки (v1.70) фон страницы был зафиксирован цветом темы на момент загрузки, и после смены темы без перезагрузки область ниже первого экрана оставалась прежнего цвета. Теперь фон следует за текущей темой",
    ]},
    { version: "1.95", date: "2026-10-01 11:30", changes: [
        "Дашборд (пилот): «Выйти» теперь с подтверждением — по нажатию в боковом меню появляется окно «Точно выйти?» с кнопками «Выйти» и «Отмена» (защита от случайного нажатия). Esc и клик по фону отменяют, фокус сразу на «Отмене». На остальных страницах и в правой панели пока по-старому",
    ]},
    { version: "1.94", date: "2026-10-01 11:24", changes: [
        "Дашборд (пилот): логотип слева сверху в шапке теперь «горит» — вместо статичной картинки там живое пламя в цвете текущей темы, с отдельными языками, у каждого свой ритм (как на заставке загрузки, но компактнее и без искр). Движение выключается при «уменьшении движения» в системе и выключателем «Отключить все анимации»",
    ]},
    { version: "1.93", date: "2026-10-01 14:17", changes: [
        "Вода (Дашборд): в окне воды появились кнопка «Отменить последнее добавление» — откатывает записанное шаг за шагом, пока значение дня не изменили в другом месте, — и карандашик, которым можно поправить всю сумму выпитого за выбранный день. Правку суммы тоже можно отменить. После отмены и правки показывается «сохранилось», а «+1»/«−1» с монеткой — если из-за этого дневная норма стала набранной или перестала ею быть. Если записал лишнее, теперь не нужно считать обратное вручную",
    ]},
    { version: "1.92", date: "2026-10-01 14:05", changes: [
        "Вода и баллы: вода теперь считается выполненной по реальной норме — заданной тобой, а если её нет, то по весу (вес × 30 мл), а без веса — 2000 мл. Раньше при незаданной норме балл за воду давало любое записанное значение, даже 100 мл. Исправлено везде: в балансе и журнале баллов, кольцах дня и недели, сериях, вечернем напоминании, Магазине, Истории и в шапке, а также на сервере — в баллах дня и категории, лидерборде и сериях Сообщества. При добавлении воды «+1»/«−1» с монеткой появляется, когда норма набрана или перестала быть набранной. Если норма воды у тебя не задана, баллы за прошлые дни с малым количеством воды пересчитаются; чтобы зафиксировать норму, задай её вручную («Изменить дневную норму»)",
    ]},
    { version: "1.91", date: "2026-10-01 13:50", changes: [
        "Тренировки: у упражнений «просто повторения» больше нет лишних «кг». Раньше при добавлении отжиманий «просто раз» в подходах и рекордах всё равно дописывалось «кг» — теперь пишется только число повторений, и это исправлено и для упражнений, созданных раньше. В форме упражнения без веса единица веса не спрашивается. Если вес ведётся, единица по умолчанию «кг» показана текстом, а сменить её (lb или своя) можно карандашиком; выбранная единица запоминается и подставляется в следующие упражнения",
    ]},
    { version: "1.90", date: "2026-10-01 13:32", changes: [
        "Дашборд: огонёк серии на главной теперь «горит по-настоящему». Когда серия достигает 7 дней, вместо обычного огонька появляется живое пламя: три языка и светлая сердцевина качаются и мерцают, как на заставке загрузки. Чем длиннее серия, тем ярче: от 30 дней свечение сильнее, пламя быстрее и над ним летят две искры, от 100 дней — самое яркое свечение и четыре искры. Если сегодня серия ещё не засчитана, огонёк остаётся тусклым контуром. При включённом «уменьшить движение» или «отключить все анимации» пламя горит, но не двигается",
    ]},
    { version: "1.89", date: "2026-10-01 13:20", changes: [
        "Дашборд, графики подходов (отжимания и т. п.): точка дня теперь мини-круг из долей по особенностям подхода — например, из 100 отжиманий 50 классических, 30 алмазных и 20 на бицепс; если особенность одна, точка сплошная её цвета. Под графиком появилась легенда «цвет — особенность — сумма повторений за период», у точки — подсказка с разбивкой. Цвета особенностей постоянные и не меняются при смене периода. Если у подходов нет названий особенностей, график выглядит как раньше",
    ]},
    { version: "1.88", date: "2026-10-01 13:13", changes: [
        "Дашборд, окно «Баллы» (клик по баллам в профиле): теперь по умолчанию — компактный список из последних 5 источников прибытка (метрики, цели, книги; новые сверху, с датой), а кнопка «Показать ещё» плавно разворачивает остальные начисления за 7 дней и отдельный список покупок. Минус в списках теперь типографский («−100»)",
    ]},
    { version: "1.87", date: "2026-10-01 11:35", changes: [
        "Дашборд (пилот), графики: если в выбранном периоде (например, «последние 10 дней» или «эта неделя» в понедельник) меньше двух значений, а за более широкий срок записи есть, график больше не остаётся пустым с надписью «маловато данных». Показываются последние записи с пометкой «За выбранный период мало данных — показаны последние записи». Для периода «Всё» и когда данных правда нет, ничего не меняется",
    ]},
    { version: "1.86", date: "2026-10-01 11:27", changes: [
        "Онбординг (пилот): вместо длинной формы — пошаговая настройка: сценарий → о себе → приоритет → метрики, с индикатором шагов и кнопками «Назад / Далее». Новому пользователю больше не создаются все метрики подряд: под выбранную цель заранее отмечены только подходящие (например, для «похудеть» — вода, калории, тренировка, шаги), остальные спрятаны за «Ещё метрики» и добавляются по желанию",
        "Онбординг: «Пропустить, настрою сам» создаёт две стартовые метрики (вода и тренировка) вместо шести; параметры тела создаются только нужные по цели (вес; для «похудеть» и «набрать» ещё % жира и мышечная масса), «ежедневнику» — ни одного; для «ежедневника» на главной сразу скрыт блок графиков метрик",
    ]},
    { version: "1.85", date: "2026-10-01 04:46", changes: [
        "Верхняя панель на всех Vue-страницах: вместо текстовых стрелочек «>>>» — аккуратная круглая кнопка с шевроном, который поворачивается при раскрытии. Быстрые ссылки на разделы стали «пилюлями», плавно появляются и мягко затухают у правого края; закрыть их можно повторным нажатием или клавишей Esc. Анимации отключаются настройкой «уменьшить движение» в системе и общим выключателем анимаций",
    ]},
    { version: "1.84", date: "2026-10-01 07:35", changes: [
        "Глобальные настройки: в правой панели (кнопка ⚙️) открывается единое окно со всеми настройками — язык, тема, «выключить все анимации», поздравления за серии, прогресс дня/недели, порядок и видимость блоков Дашборда, вода, ссылка на Аккаунт. Работает на любой странице; то, что можно применить сразу, применяется сразу",
    ]},
    { version: "1.83", date: "2026-10-01 07:32", changes: [
        "Правая панель: добавлена карта мышц — тело спереди и сзади, зелёным подсвечены мышцы, которые тренировались за последние 4 дня, серым — остальные. Нажатие на мышцу показывает, когда её тренировали в последний раз; есть быстрая ссылка на «Тренировки». Данные подходов подгружаются только при открытии панели, а блок виден, если у вас есть хотя бы одно упражнение",
    ]},
    { version: "1.82", date: "2026-10-01 07:29", changes: [
        "Правая выдвижная панель на всех страницах (включая Дашборд): открывается свайпом от правого края экрана или кнопкой в шапке справа. Внутри — «спидометры» прогресса дня и недели (клик открывает сводку) и стакан воды с быстрым добавлением +200 / +500 мл. Закрывается свайпом вправо, касанием по затемнению, Esc или крестиком. Учитывает выключатель анимаций из настроек",
    ]},
    { version: "1.81", date: "2026-10-01 04:22", changes: [
        "Дашборд (пилот): появился выключатель «Отключить все анимации» — в окне «Настроить Дашборд», рядом с поздравлениями за серии. Одним переключателем гасит всё движение: пламя и заставку, всплывающие баллы, плавное сворачивание блоков, поздравления, анимацию воды. Применяется сразу, запоминается и работает с первой отрисовки страницы. Если на устройстве уже включено «уменьшить движение», переключатель отмечен и заблокирован с пояснением, где это менять. На остальных страницах пилота пока не подключён",
    ]},
    { version: "1.80", date: "2026-10-01 04:17", changes: [
        "Дашборд (пилот): заставка загрузки теперь «прям горит». Три варианта: «Живое пламя» (по умолчанию) — отдельные языки пламени, у каждого своя скорость и фаза, плюс поднимающиеся искры; «Огненный круг» — вращающееся кольцо с хвостом и огоньком в центре; «Классика» — прежний контур с мерцанием (оставлен). Предпросмотр: добавьте ?splash=ring, ?splash=flame или ?splash=classic к адресу Дашборда (выбор запоминается). Заставка видна ещё до загрузки скриптов и повторяет выбранный вариант. Анимации выключаются при «уменьшении движения» в системе. Выбор варианта из интерфейса — позже, в «Кастомизации»",
    ]},
    { version: "1.79", date: "2026-10-01 04:09", changes: [
        "Дашборд (пилот), «Дневные метрики»: переключатель дня переделан — вместо трёх кнопок-текстов «Пред. / Сегодня / След.» теперь капсула «‹ вт, 1 октября ›» (тап по дате открывает календарь для выбора дня) и отдельный чип «Сегодня», который активен только когда выбран не сегодняшний день; кнопки крупнее для пальца. «›» не блокируется на сегодня — планы на завтра по-прежнему доступны. Блок «Подходы» (и другие вложенные карточки) снова с собственной подложкой — раньше сливался с фоном блока метрик",
    ]},
    { version: "1.78", date: "2026-10-01 06:44", changes: [
        "Дашборд и Магазин: иконка баллов перерисована, чтобы читалась как монета — круглый диск на всю клетку с ребристым кантом, внутренним бортиком и бликом; огонёк цвета темы теперь горит по центру монеты, как тиснение, и по-прежнему слегка мерцает. В блоке «Профиль» сокращён промежуток между огоньком серии и монетой с баллами",
    ]},
    { version: "1.77", date: "2026-10-01 06:37", changes: [
        "Дашборд: анимация баллов — когда ты отмечаешь метрику выполненной (или набираешь цель по числу, подходам, вариантам), у места нажатия появляется «+1» с монеткой, плавно уплывает вверх и растворяется. Если снимаешь отметку и метрика перестаёт быть выполненной — то же самое, но «−1». Подпись показывается только после того, как значение реально сохранилось, и только когда балл правда начислился или снялся (например, число 3 → 5 при цели 10 баллов не меняет). Если в системе включено «уменьшить движение», подпись не плывёт, а коротко проявляется и гаснет на месте",
    ]},
    { version: "1.76", date: "2026-10-01 06:24", changes: [
        "Дашборд: поздравления за серии — когда серия набирает 5, 10, 30, 50, 100, 200 или 365 дней (у недельных метрик 4, 12, 26 или 52 недели), появляется анимированная плашка: разгорающийся огонёк, крупное число, подпись, за что серия, и тёплые слова (несколько вариантов, чтобы не приедалось). Показывается один раз на порог; при первом запуске — только самая высокая из уже набранных серий. Отключается кнопкой «Больше не показывать» в плашке или галочкой «Поздравлять за серии» в окне ⚙ «Настроить Дашборд». Если в системе включено «уменьшить движение», анимация отключена",
    ]},
    { version: "1.75", date: "2026-10-01 06:15", changes: [
        "Дашборд, настройки метрики: появился переключатель «Просто записывать значение (вес, замеры и т.п.)» — при нём цель, расписание, серия и импорт серии отключаются, остаётся название, иконка, тип и единица; такая метрика не даёт серии и не мешает «идеальному дню». А для обычных метрик есть галочка «Считать серию по этой метрике» — выключи, если серия не нужна. В списке метрик такая метрика подписана «только значение». Нужна миграция 031 (metrics.count_streak) в Supabase",
    ]},
    { version: "1.74", date: "2026-10-01 06:04", changes: [
        "Челленджи (пилот): значения дней можно брать из метрики. В форме челленджа появился «Источник значений» — выберите свою метрику (например, «Отжимания»), и дни без ручной записи сами подтянут значение с Дашборда: число, сумма повторений по подходам или «сделано» для галочки. Ручная запись за день всегда главнее. На карточке видна пометка «из метрики» и подсказка, как заменить значение. Нужна миграция 032 в Supabase; без неё всё работает как раньше",
    ]},
    { version: "1.73", date: "2026-09-30 20:33", changes: [
        "Языки (пилот): вкладки словарей — у каждого языка своя вкладка со счётчиком слов, вкладка «Все» появляется, когда словарей больше одного. Кнопка «＋» создаёт новый словарь (можно пустой и заполнить позже), пустой словарь можно удалить. Порядок вкладок запоминается и не прыгает, новое слово добавляется в открытый словарь. Слова и их данные не менялись, миграция не нужна",
    ]},
    { version: "1.72", date: "2026-09-30 15:32", changes: [
        "Вход и регистрация: при первом заходе язык теперь выбирается по языку устройства (русский — если он первый из поддерживаемых в настройках устройства, иначе английский). Раньше новому пользователю почти всегда показывался английский. Дальше язык переключается вручную, выбор не перезаписывается",
    ]},
    { version: "1.71", date: "2026-09-30 15:11", changes: [
        "Дашборд: блок «Профиль» на телефоне больше не «едет» — теперь две чёткие строки: сверху аватар с кольцом дня, кольцо недели и возраст, справа серия и баллы; ниже параметры тела (вес, рост и т.д.), которые переносятся по ширине, а длинные названия не выталкивают вёрстку",
    ]},
    { version: "1.70", date: "2026-09-30 12:05", changes: [
        "Дашборд (пилот): вместо сухого «Загрузка…» — заставка с горящим огоньком серии в цвете текущей темы (мерцание и мягкое свечение; при включённом «уменьшении движения» в системе анимация выключается). Огонёк виден ещё до загрузки скриптов страницы, так что пустого экрана при медленной сети больше нет. Остальные страницы — отдельным шагом",
    ]},
    { version: "1.69", date: "2026-09-30 14:44", changes: [
        "Глобальная шапка: стакан воды и кольца прогресса дня/недели теперь есть на всех страницах (Цели, Навыки, Тренировки, Челленджи, Языки, Календарь, Вехи, Магазин, Сообщество, История, Аккаунт), а не только на Дашборде. Клик по стакану — окно воды (добавить выпитое, сменить норму), клик по кольцу — сводка «что сделано / что осталось» с настройками. Показываются по тем же настройкам прогресса, что и на Дашборде; страница Дашборда осталась со своей шапкой",
    ]},
    { version: "1.68", date: "2026-09-30 13:20", changes: [
        "Иконка баллов («монета») стала живой: полупрозрачная монета с небольшим горящим огоньком цвета темы, огонёк слегка мерцает (при включённом в системе «уменьшении движения» — статичный). Показывается у баланса в профиле на главной, в окне «откуда баллы» и у цен в магазине",
    ]},
    { version: "1.67", date: "2026-09-30 13:13", changes: [
        "Сворачивание блоков стало современным: вместо стрелок ▼/▶ — шеврон, который плавно поворачивается; нажимать можно на всю шапку блока (в том числе с клавиатуры), а само содержимое сворачивается и разворачивается с плавной анимацией высоты. Сделано в Дашборде (Профиль, Ежедневные метрики, Планы, Графики, карточки подходов) и в Тренировках (группы и карточки упражнений, карта мышц, деревья прогрессии). При включённом «уменьшении движения» в системе анимация отключается",
    ]},
    { version: "1.66", date: "2026-09-30 13:05", changes: [
        "Дашборд (новая версия), «Планы»: между чекбоксом и текстом плана появился отступ; неотмеченный чекбокс больше не белый квадрат — у него рамка и фон в цвет темы, а отмеченный заливается акцентом с галочкой (это касается всех чекбоксов на Дашборде)",
        "Дашборд (новая версия), «Планы»: время теперь подтягивается — оно из поля рядом с «Добавить» попадает и в цель, выбранную из списка, а при переносе незавершённого сохраняется время исходного пункта",
    ]},
    { version: "1.65", date: "2026-09-30 12:52", changes: [
        "Дашборд (новая версия): вода в стакане теперь всегда голубая или синяя, а не цвета темы; оттенок подобран отдельно для каждой темы (на светлых — темнее), чтобы вода хорошо читалась на фоне карточки. Это касается стакана в шапке, блока «Вода» и анимации «выпитое сохранилось»",
    ]},
    { version: "1.64", date: "2026-09-30 12:48", changes: [
        "Классическая версия: на главной появилась закрывающаяся плашка «Проект переехал на новую версию» с кратким описанием преимуществ и кнопкой «Открыть новую версию»; после закрытия крестиком она больше не показывается",
    ]},
    { version: "1.63", date: "2026-09-30 12:44", changes: [
        "Магазин (новая версия): под каждым товаром появился прогресс-бар накопления — сколько процентов цены уже набрано; когда баллов хватает, надпись меняется на «Хватает на покупку»",
    ]},
    { version: "1.62", date: "2026-09-30 12:40", changes: [
        "Дашборд: часть кольца прогресса сверх 100% теперь светлый оттенок цвета выбранной темы вместо жёстко заданного малинового — хорошо видна поверх основной дуги в любой теме (новая и классическая версии)",
    ]},
    { version: "1.61", date: "2026-09-30 09:35", changes: [
        "Челленджи: теперь можно вносить и править значения за прошедшие дни. Нажмите на кружок нужного дня в карточке ежедневного челленджа — под ним появится его дата, цель и поле ввода, значение сохранится именно за этот день (будущие дни недоступны). Поле ввода стало заметным: акцентная рамка и фон, отличающийся от карточки, — раньше оно сливалось с фоном",
    ]},
    { version: "1.60", date: "2026-09-30 09:30", changes: [
        "Челленджи: теперь можно редактировать уже добавленные челленджи. На карточке появилась кнопка-карандаш: откроется та же форма, что и для своего челленджа, с заполненными значениями — можно поменять название, иконку, единицу, длительность, цели и количество. Тип челленджа и дата старта не меняются (иначе поменялся бы смысл уже внесённых записей), уже внесённый прогресс сохраняется",
    ]},
    { version: "1.59", date: "2026-09-30 09:22", changes: [
        "Тренировки: новый блок «Прогрессии упражнений» (свёрнут по умолчанию). Пять цепочек ступеней от лёгкого к сложному: отжимания (с колен → обычные → на кулаках → алмазные → лучника), подтягивания, приседания и ноги, пресс, брусья. Ступень пройдена, когда в одном подходе набрано нужное число повторений; для текущей ступени видно лучший подход и кнопку «Добавить запись». Ступени сопоставляются с вашими упражнениями по названию (русские и английские)",
    ]},
    { version: "1.58", date: "2026-09-30 10:48", changes: [
        "Часовой пояс в сериях и Сообществе: сервер теперь считает «сегодня» по часовому поясу пользователя, а не по UTC. Раньше у жителей Москвы и Вильнюса между полуночью и 2–3 часами ночи серия и очки дня в Сообществе отставали на день. Нужна миграция 030 в Supabase; без неё всё работает как раньше",
        "Дашборд (пилот): при входе тихо записывает часовой пояс браузера в профиль (например, Europe/Moscow — переход на летнее время учитывается сам). Ничего не показывает и ничего не ломает, если миграция ещё не применена",
    ]},
    { version: "1.57", date: "2026-09-30 10:36", changes: [
        "Аудит часовых поясов и перехода на летнее время (Москва — без DST, Вильнюс и Нью-Йорк — с DST, плюс Окленд): арифметика дат в пилотах уже календарная и не ломается в сутки перехода. Найдено и исправлено два места, где локальная дата бралась из UTC",
        "Дашборд (пилот): при создании метрики с «импортом серии» дата импорта записывалась по UTC — у пользователей восточнее Гринвича между полуночью и несколькими часами ночи это был вчерашний день, и импортированные дни могли не засчитаться. Теперь берётся локальная дата",
        "Челленджи (пилот): дата завершения выполненного челленджа брались из UTC-метки — вечером или ночью она показывалась на день раньше или позже. Теперь показывается локальная дата пользователя",
    ]},
    { version: "1.56", date: "2026-09-30 07:33", changes: [
        "Дашборд (пилот), блок «Планы»: при добавлении своего пункта можно поставить галочку «Уже сделано» — пункт сразу создаётся выполненным и идёт в прогресс дня и недели. Это способ занести то, что вы сделали не из списка целей, не отмечая потом галочкой (первый шаг к объединению «Что полезного сделал за день» и «Планов»)",
    ]},
    { version: "1.55", date: "2026-09-30 10:29", changes: [
        "Дашборд: клик по баллам в профиле теперь открывает окно «Баллы» — за что начислено сегодня и за последние 7 дней (выполненные метрики, цели, книги, покупки в магазине), с итогами за день и неделю и текущим балансом. В магазин ведёт кнопка внутри окна, а не сам клик по балансу. Баллы за навыки в список по дням не попадают (у навыков нет даты), но входят в баланс",
    ]},
    { version: "1.54", date: "2026-09-30 07:27", changes: [
        "Дашборд (пилот): бонус ⭐ в кольце НЕДЕЛИ стал пропорциональным — один выполненный бонусный пункт даёт неделе +20%/7 ≈ +2,9% вместо +20% (в дне без изменений: +20%). Так бонус, сделанный каждый день, добавляет неделе те же +20%, что дню. Сводка по клику на кольцо недели считает так же",
    ]},
    { version: "1.53", date: "2026-09-30 10:25", changes: [
        "Дашборд: «Вода» убрана из списка «Управление метриками» — у неё свой блок в правом верхнем углу, и настраивать её как обычную метрику дня не нужно",
    ]},
    { version: "1.52", date: "2026-09-30 07:23", changes: [
        "Тренировки (пилот), карта мышц: статистика стала гибче — переключатель периода 7 / 30 / 90 дней (выбор запоминается), вместо топ-6 выводятся все группы мышц, которые были в работе за период, а под ними строка «Не тренировалось за период» со списком остальных групп",
    ]},
    { version: "1.51", date: "2026-09-30 10:10", changes: [
        "Дашборд, «Подходы»: список сохранённых «особенностей подхода» больше не обрезается на телефоне — теперь он открывается поверх страницы под полем (или над ним, если снизу мало места из-за клавиатуры), как в классике. Выбор варианта тапом и крестик «убрать вариант» работают на сенсорных экранах; список закрывается тапом мимо",
    ]},
    { version: "1.50", date: "2026-09-30 09:53", changes: [
        "Вода: кнопка «Сохранить норму» переименована в «Изменить дневную норму» и вынесена под поле нормы — теперь её не спутать с добавлением выпитого; после смены нормы показывается подтверждение. После добавления выпитого появляется анимация: стакан наполняется, поверх рисуется галочка — она запускается только когда значение действительно записано, а при ошибке записи в окне показывается сообщение. Кнопка переименована и в классическом Дашборде",
    ]},
    { version: "1.49", date: "2026-09-30 09:49", changes: [
        "Дашборд: по клику на прогресс дня или недели сначала открывается сводка — что уже сделано, что осталось и сколько процентов даёт каждый пункт (плюс бонус ⭐). Значок настроек прогресса теперь внутри сводки, настройки открываются оттуда",
    ]},
    { version: "1.48", date: "2026-09-30 09:45", changes: [
        "Аккаунт: смена пароля теперь в отдельном окне и спрашивает текущий пароль — без него пароль не меняется. Если аккаунт создан через Google и пароля ещё нет, окно предложит просто задать первый пароль",
    ]},
    { version: "1.47", date: "2026-09-30 08:34", changes: [
        "Дашборд (новая версия): в теме Monet у огонька серии появилась тонкая обводка акцентным цветом, чтобы он не терялся на тёмном фоне — как в классической версии",
    ]},
    { version: "1.46", date: "2026-09-30 08:24", changes: [
        "Вход: с экрана входа убрана ссылка «Вернуться на портфолио» — и в новой, и в классической версии",
    ]},
    { version: "1.45", date: "2026-09-30 08:17", changes: [
        "Тренировки (новая версия): в «Типовых программах» появились прогрессивные программы с постепенным ростом нагрузки — «Отжимания: 6 недель» и «Подтягивания: 6 недель». В предпросмотре есть таблица нагрузки по неделям, в упражнение сохраняется схема первой недели",
    ]},
    { version: "1.44", date: "2026-09-30 08:14", changes: [
        "Аккаунт (новая версия): ссылка для администраторов теперь называется «Панель администратора» (раньше «Админка»)",
    ]},
    { version: "1.43", date: "2026-09-30 08:04", changes: [
        "Графики на главной: у метрик с SVG-иконкой (например «Отжимания») иконка теперь показывается в заголовке графика и в списке настройки графиков — раньше терялась, показывались только эмодзи-иконки. Исправлено и в новой версии, и в классической",
        "Фаза 2, этап B: выход из аккаунта и переходы «не вошёл → вход» и «не прошёл онбординг → онбординг» теперь ведут сразу на /login/ и /onboarding/, без лишней пересылки через старые адреса",
        "Страницы входа и онбординга: внизу неприметная ссылка на классическую версию (legacy-login / legacy-onboarding), а в классической версии — «Попробовать новый дизайн»",
    ]},
    { version: "1.42", date: "2026-09-30 05:10", changes: [
        "Фаза 2: «Вход» и «Онбординг» теперь на коротких адресах /login/ и /onboarding/ вместо /login-vue/ и /onboarding-vue/, а классические версии — в /legacy/login.html и /legacy/onboarding.html. Старые адреса /login.html и /onboarding.html перенаправляют на новые (с сохранением параметров возврата из Google), корень сайта ведёт на /login/",
    ]},
    { version: "1.41", date: "2026-09-30 04:44", changes: [
        "Тренировки: новый блок «Карта мышц» (свёрнут по умолчанию). Схема тела спереди и сзади: зелёным подсвечены мышцы, задействованные за последние 4 дня, серым — остальные. Клик по мышце показывает ваши упражнения на неё (с кнопкой «Добавить запись») и подсказки, что ещё можно делать. Ниже — какие группы мышц вы тренировали чаще всего за 30 дней. Мышцы определяются по названию упражнения (русские и английские названия); упражнения, которые не удалось привязать, перечислены отдельно",
    ]},
    { version: "1.40", date: "2026-09-30 07:34", changes: [
        "Аккаунт (новая версия): у администраторов внизу страницы появилась ссылка «Админка»; у обычных пользователей её нет",
    ]},
    { version: "1.39", date: "2026-09-30 04:29", changes: [
        "Убрана плашка «Пилот на Vue» из бокового меню всех Vue-страниц. Ссылка на классическую версию страницы теперь одна и всегда в одном месте — внизу выдвижного меню, неприметным шрифтом (legacy-dashboard, legacy-goals и т. д.). Ссылка «Попробовать новый дизайн» в классических страницах тоже переехала вниз меню, вместо места под активным пунктом",
    ]},
    { version: "1.38", date: "2026-09-30 00:52", changes: [
        "Новая версия: галочки и переключатели на всех страницах (Календарь, Челленджи, Цели, Языки, Навыки, Сообщество, Тренировки и др.) теперь в цвет выбранной темы, как в классической версии, а не серые/белые",
    ]},
    { version: "1.37", date: "2026-09-30 00:49", changes: [
        "Тренировки (новая версия): каждое упражнение теперь можно свернуть стрелкой ▼/▶ рядом с названием — остаётся только заголовок с кнопками; состояние запоминается для каждого упражнения отдельно (категории сворачиваются, как и раньше)",
    ]},
    { version: "1.36", date: "2026-09-30 00:44", changes: [
        "Тренировки (новая версия): в форме записи упражнения с левой и правой стороной теперь один блок на подход — две ячейки «Левая» и «Правая» с общим временем, вместо двух отдельных подходов. В базе по-прежнему два подхода со стороной, так что рекорды по сторонам, графики и классическая версия работают как раньше",
        "Тренировки (новая версия): вверху страницы появилось напоминание о разминке — показывается, пока сегодня нет записей, кнопка «Понятно» скрывает его до завтра",
    ]},
    { version: "1.35", date: "2026-09-30 00:40", changes: [
        "Дашборд (пилот): в вечернем напоминании заголовок «Остались невыполненные метрики!» и текст «Сделайте их, чтобы не потерять серию» теперь на разных строках, между ними есть отступ",
        "Сообщество (пилот): кнопки «Подписаться» и «В друзья» больше не молчат. Если поле пустое — появляется подсказка «Сначала введите email или ник». Если поиск пользователя упал из-за ошибки (нет прав, нет функции в базе, сеть), показывается настоящая ошибка, а не ложное «не найден», и кнопки не остаются заблокированными",
    ]},
    { version: "1.34", date: "2026-09-30 00:38", changes: [
        "Тренировки (новая версия): у упражнений с собственным весом (отжимания, подтягивания, приседания) в форме записи появилась галочка «Утяжеление» — можно указать дополнительный вес для каждого подхода; он показывается в записях как «15 (+5кг)» и учитывается в рекордах при равных повторениях",
        "Тренировки (новая версия): время подхода теперь проставляется сразу и у первого подхода новой записи, а не только у добавленных следом",
    ]},
    { version: "1.33", date: "2026-09-30 01:10", changes: [
        "Онбординг: сверху появился переключатель языка (RU/EN) и выбор темы — как на странице входа, чтобы после регистрации или первого входа через Google можно было сменить язык до заполнения анкеты",
        "Значок-огонёк во вкладке браузера у всех Vue-страниц теперь такой же, как на классическом сайте (без синего акцента в сердцевине)",
    ]},
    { version: "1.32", date: "2026-09-30 00:40", changes: [
        "Фаза 2: «Аккаунт» теперь на коротком адресе /account/ вместо /account-vue/, а классическая версия — в /legacy/account.html; старый адрес /account.html перенаправляет на новый. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны, возврат после привязки Google ведёт на актуальную страницу",
    ]},
    { version: "1.31", date: "2026-09-30 00:16", changes: [
        "Пилот Дашборда: секции «Профиль», «Ежедневные метрики», «Планы» и «Графики» сворачиваются стрелкой ▼/▶ у заголовка, как в классической версии. Состояние запоминается в браузере (тот же ключ, что в классике — свёрнутое там остаётся свёрнутым и здесь). У «Профиля» появился заголовок",
    ]},
    { version: "1.30", date: "2026-09-30 00:13", changes: [
        "Фаза 2, финал: старые адреса переехавших страниц (/dashboard.html, /goals.html, /english.html и остальные) больше не дают 404 — там лежат маленькие заглушки, которые переводят на новый адрес (/dashboard/, /goals/, /languages/ ...) с сохранением параметров и якоря. Закладки и старые ссылки продолжают работать",
    ]},
    { version: "1.29", date: "2026-09-30 00:12", changes: [
        "Фаза 2, Дашборд: пилот теперь на коротком адресе /dashboard/ вместо /dashboard-vue/, а классическая версия — в /legacy/dashboard.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны; после входа и после онбординга (классика и Vue) открывается /dashboard/",
    ]},
    { version: "1.28", date: "2026-09-30 00:04", changes: [
        "Пилот Дашборда: кастомизация раскладки блоков. Кнопка ⚙️ рядом с заголовком открывает окно, где блоки «Профиль», «Графики» и «Дневные метрики и планы» можно переставлять (↑/↓) и скрывать; скрытые блоки не подгружают данные. Раскладка хранится в profiles.dashboard_layout — общая с классическим Дашбордом (миграция 015, новой не нужно). Если скрыт «Профиль», кольца дня/недели показываются бейджем в шапке",
    ]},
    { version: "1.27", date: "2026-09-30 00:10", changes: [
        "Фаза 2: «Цели» теперь на коротком адресе /goals/ вместо /goals-vue/, а классическая версия — в /legacy/goals.html. Ссылки в боковом меню всех Vue-страниц и ссылка в недельном напоминании обновлены и пересобраны",
    ]},
    { version: "1.26", date: "2026-09-29 23:50", changes: [
        "Фаза 2: «Сообщество» теперь на коротком адресе /community/ вместо /community-vue/, а классическая версия — в /legacy/community.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны",
    ]},
    { version: "1.25", date: "2026-09-29 23:35", changes: [
        "Фаза 2, четвёртая страница: «Вехи» теперь на коротком адресе /milestones/ вместо /milestones-vue/, а классическая версия — в /legacy/milestones.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны, ссылка «открыть вехи» в напоминании классического Дашборда ведёт в /legacy/milestones.html, а в пилоте Дашборда — на /milestones/",
    ]},
    { version: "1.24", date: "2026-09-29 23:24", changes: [
        "Фаза 2, девятая страница: «Языки» теперь на коротком адресе /languages/ вместо /languages-vue/, а классическая версия — в /legacy/english.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны",
    ]},
    { version: "1.23", date: "2026-09-29 23:18", changes: [
        "Исправление после переезда страниц в /legacy/: выход из аккаунта и редирект «не залогинен → вход» / «не прошёл онбординг → онбординг» на классических страницах вели на несуществующий /legacy/login.html и /legacy/onboarding.html. Теперь адреса абсолютные",
    ]},
    { version: "1.22", date: "2026-09-29 23:14", changes: [
        "Фаза 2, первая страница: «Навыки» теперь на коротком адресе /skills/ вместо /skills-vue/, а классическая версия — в /legacy/skills.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны",
    ]},
    { version: "1.21", date: "2026-09-29 19:19", changes: [
        "Дашборд (пилот): убран баннер «ранняя версия пилота» с описанием и ссылкой на классику — по просьбе владельца ссылка на классическую версию будет одна, в самом низу бокового меню",
    ]},
    { version: "1.20", date: "2026-09-29 19:15", changes: [
        "Дашборд (пилот): блок «Цели на сегодня» переименован в «Планы», у пункта плана можно задать время напоминания (поле рядом с пунктом или при добавлении). Когда время наступает, а пункт не выполнен, вверху страницы появляется плашка «Пора по плану» (крестик закрывает её до конца дня); если в блоке нажать «Включить уведомления» и разрешить их в браузере, приходит ещё и системное уведомление — по одному на пункт в день, без повторов после перезагрузки. Работает, пока Дашборд открыт: пуш при закрытой странице пока не делается. Время хранится внутри пункта плана, миграция не нужна, классика поле не трогает",
    ]},
    { version: "1.19", date: "2026-09-29 19:08", changes: [
        "Дашборд (пилот): вечернее напоминание. С 21:00 по местному времени, если на сегодня остались невыполненные метрики по расписанию, вверху страницы появляется плашка «Остались невыполненные метрики! Сделайте их, чтобы не потерять серию». По клику она раскрывается и показывает, что именно осталось (у числовых метрик и подходов — сделано / цель). Плашка появляется сама в 21:00 без перезагрузки, исчезает, когда всё сделано, а крестик прячет её до конца дня",
    ]},
    { version: "1.18", date: "2026-09-29 18:48", changes: [
        "Фаза 2, восьмая страница: «Тренировки» теперь на коротком адресе /workouts/ вместо /workouts-vue/, а классическая версия — в /legacy/workouts.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны",
    ]},
    { version: "1.17", date: "2026-09-29 18:39", changes: [
        "Фаза 2, седьмая страница: «Челленджи» теперь на коротком адресе /challenges/ вместо /challenges-vue/, а классическая версия — в /legacy/challenges.html. Ссылки в боковом меню всех Vue-страниц обновлены и пересобраны",
    ]},
    { version: "1.16", date: "2026-09-29 18:31", changes: [
        "Фаза 2, шестая страница: «Магазин» теперь на коротком адресе /shop/ вместо /shop-vue/, а классическая версия — в /legacy/shop.html. Заодно починены ссылки в боковом меню Vue-страниц: после переезда Календаря в 1.15 они не были пересобраны и на части страниц пункт «Календарь» вёл на удалённый адрес /calendar-vue/",
    ]},
    { version: "1.15", date: "2026-09-29 18:23", changes: [
        "Фаза 2 (переезд на Vue как основной сайт), пятая страница: «Календарь» теперь на коротком адресе /calendar/ вместо /calendar-vue/, а классическая версия — в /legacy/calendar.html. Ссылки в боковом меню и на других страницах обновлены",
    ]},
    { version: "1.14", date: "2026-09-29 12:05", changes: [
        "Фаза 2 (переезд на Vue как основной сайт), первая полностью переехавшая страница: «История» теперь живёт на коротком адресе /history/ вместо /history-vue/, а классическая версия — в /legacy/history.html. Ссылки в боковом меню и на других страницах обновлены автоматически в обе стороны",
    ]},
    { version: "1.13", date: "2026-09-29 05:13", changes: [
        "Вход и регистрация на Vue 3 + Vite + TS + Tailwind (/login-vue/): email/пароль, регистрация, вход через Google, переключатель RU/EN и темы прямо на странице (сайдбара тут нет)",
        "Онбординг на том же стеке (/onboarding-vue/): анкета «как планируешь использовать» (цели/ежедневник/и то и другое) со скрытием ненужных полей, выбор стартовых метрик под цель, кнопка «пропустить», заполнение параметров тела и базовых метрик — 1:1 с оригинальным onboarding.js",
        "22 теста (в т.ч. UI-тесты форм с подменой Supabase) сверены с login.js/onboarding.js; ванильные страницы login.html/onboarding.html пока остаются рабочими. Этим закрывается фаза 1 (миграция всех страниц на Vue) — см. COORDINATION.md",
    ]},
    { version: "1.12", date: "2026-09-29 07:06", changes: [
        "Дашборд-пилот: визуальный паритет с обычным сайтом по нескольким пунктам. Чекбоксы и радиокнопки теперь в цвете темы, а не браузерном синем — акцентного цвета не было вообще ни у одного поля пилота. Значок воды переехал из отдельного блока в теле страницы в шапку рядом с кольцами прогресса — как на обычном сайте, кликабельная иконка без подписи. У блоков «Дневные метрики», «Цели на сегодня» и «Графики» появился фон-карточка — раньше класса для него не было вовсе, хотя разметка кое-где уже на него ссылалась. Серия переехала из отдельного раздела внизу страницы в строку профиля рядом с аватаром, как в оригинале, и огонёк теперь по-настоящему «горит»: два разных значка (тёплый мерцающий, когда день засчитан, и тусклый пунктирный контур, когда ещё нет) вместо одной приглушённой иконки",
        "Плашка «это пилот, данные могут быть неактуальны» пока осталась — уберём вместе с кастомизацией раскладки блоков",
    ]},
    { version: "1.11", date: "2026-09-29 09:15", changes: [
        "Первый лёгкий шаг фазы 2 (полный переезд адресов делается отдельно, постранично): в сайдбаре классического сайта под текущим разделом появилась ссылка «✨ Попробовать новый дизайн», если у раздела уже есть готовый Vue-пилот — Дашборд, Цели, Тренировки, Челленджи, Языки, Календарь, Вехи, Магазин, Сообщество, История, Аккаунт. У Навыков ссылки пока нет — туда переезжает полный адрес без -vue отдельным заходом. Обратная ссылка (из пилотов на классику) пока не сделана — сначала для неё нужно решить общий вид «бейджа пилота» во всех 12 AppShell",
    ]},
    { version: "1.10", date: "2026-09-29 14:10", changes: [
        "Во всех 12 Vue-пилотах пункт «Дашборд» в сайдбаре теперь открывает пилот Дашборда (/dashboard-vue/) вместо классического dashboard.html — включено заранее, не дожидаясь двух оставшихся пунктов пилота (кастомизация раскладки блоков, визуальный паритет с классикой), которые продолжаются отдельно",
        "Навигация между классическими страницами не изменилась: они по-прежнему ссылаются друг на друга через .html",
    ]},
    { version: "1.09", date: "2026-09-29 03:40", changes: [
        "Во всех 12 Vue-пилотах в сайдбаре появился номер версии, по тапу на который открывается история обновлений — как на классическом сайте. История читается из одного version.json, сгенерированного из этого ченджлога (scripts/gen_version_json.py), а не дублируется в каждом пилоте",
        "45 новых тестов на 12 пилотов (по 5 на модалку ченджлога + 1 на кнопку в сайдбаре)",
    ]},
    { version: "1.08", date: "2026-09-29 00:20", changes: [
        "Пилот Дашборда: карточка дня «Дневные метрики» — boolean/number (два режима: заменять и прибавлять, с «Итого сегодня» и ручной правкой итога)/multiselect, автосохранение каждого поля, «Что полезного сделал за день», кнопка «Сохранить день», «Баллы за день»",
        "«Подходы» и «Цели на сегодня» встроены в ту же карточку с общей выбранной датой (раньше были отдельными блоками без листания дней). Пересчёт серий/колец/графиков — через уже существующую событийную шину (notifyDataChanged), без прямых вызовов между блоками",
        "36 новых тестов (чистая логика + composable с мок-сетью), билд и весь набор пилота (319 тестов) проверены после мержа с фазой 2 (Skills), Логином и офлайн-кэшем Календаря",
    ]},
    { version: "1.07", date: "2026-09-28 20:35", changes: [
        "Расширен офлайн-кэш чтения (C3) на Календарь — раньше был только у Истории и Вех. Заметки месяца кэшируются под своим ключом при каждом переключении месяца, так что уже открытые месяцы остаются доступны офлайн (не только текущий); без сети и без сохранённой копии — как раньше, ошибка загрузки. Запись (план на день) по-прежнему требует сеть, как и везде в этом варианте офлайн-кэша",
    ]},
    { version: "1.06", date: "2026-09-28 19:40", changes: [
        "Фикс перехода времени (DST) в напоминании о вехах: срок «ближайшая неделя» считался как Date.now()+7×86400000 — в сутки перехода на летнее/зимнее время эта арифметика на час короче/длиннее суток и в редких случаях не перевалит за полночь. Заменено на календарные +7 дней (addDaysIso) — в ванильном dashboard.js и в пилоте (lib/reminders.ts, новая функция soonDateFor + 2 регресс-теста)",
    ]},
    { version: "1.05", date: "2026-09-28 21:20", changes: [
        "Пилот Тренировок: итерация 2 из 2 — мини-график прогресса на карточке каждого упражнения (максимальный вес по дням для упражнений с весом, суммарные повторения по дням для остальных) и общий график объёма тренировок (число подходов за день, со своим выбором периода). Инфраструктура графиков скопирована из пилота Дашборда по принятому правилу «копировать, не импортировать» (lib/chart.ts, ChartBlock/PeriodPicker/CustomPeriodModal); 14 новых тестов",
        "Этим закрывается пересборка пилота Тренировок — /workouts-vue/ теперь покрывает всё, что было в классической странице workouts.js",
    ]},
    { version: "1.04", date: "2026-09-28 13:54", changes: [
        "Значок Vue-страниц (вкладка браузера и шапка) переделан: теперь это наш оранжевый огонёк с небольшим голубым акцентом в сердцевине — вместо прежнего голубого пламени из v0.89",
        "Проверил проблему с аватаркой в профиле Дашборда (вытянутый овал вместо круга): причина была в общем правиле для кнопок, которое перебивало размеры внутри кнопки-обёртки, — оно уже исправлено в v0.94 (сейчас аватарка 44×44 и круглая на всех ширинах экрана и с любыми пропорциями фото). Если у тебя ещё овал — это закэшированная старая версия, поможет жёсткое обновление",
    ]},
    { version: "1.03", date: "2026-09-28 21:15", changes: [
        "Пилот «Сообщество»: взаимная дружба с заявками, как в классической версии (1.02) — заявки (принять / отклонить входящие, отменить исходящие), список друзей отдельно от подписок, кнопка «В друзья» рядом с поиском; встречная заявка принимается сразу. Фильтр «Только друзья» показывает друзей и подписки. Нужна миграция 029_friendships.sql — без неё новый блок скрыт. Своя логика (lib/friends.ts), компонент PersonChip и 17 новых тестов, в том числе на сам интерфейс",
    ]},
    { version: "1.02", date: "2026-09-28 21:12", changes: [
        "Сообщество (классическая версия): взаимная дружба с заявками. В блоке «Друзья» появились заявки (принять / отклонить входящие, отменить исходящие), список друзей и кнопка «В друзья» рядом с поиском по email или нику; встречная заявка принимается сразу. Подписки остаются как были, а фильтр «Только друзья» теперь показывает и друзей, и тех, на кого ты подписан. Нужна миграция 029_friendships.sql — без неё новый блок скрыт, и раздел работает как раньше",
    ]},
    { version: "1.01", date: "2026-09-28 21:02", changes: [
        "Исправлено: в классическом Дашборде возраст считался от даты рождения, разобранной как UTC-полночь, — в часовых поясах западнее UTC накануне дня рождения возраст показывался на год больше. Теперь дата рождения разбирается как локальная. В Европе поведение не менялось",
    ]},
    { version: "1.00", date: "2026-09-28 12:48", changes: [
        "Исправлено: в разделе «Челленджи» (классическая версия и пилот) даты дней челленджа считались от UTC-полуночи, из-за чего в часовых поясах западнее UTC все дни сдвигались на сутки назад. Теперь даты считаются по календарю; в Европе поведение не менялось. Добавлен регресс-тест на 400 дней, проверен в четырёх часовых поясах",
    ]},
    { version: "0.99", date: "2026-09-28 12:05", changes: [
        "Пилот Дашборда: добавлен блок «Цели на сегодня» — план на день (пункты из целей и свои), отметка ★ «доп. пункт», перенос незавершённого за последние 7 дней одним нажатием и отметка одноэтапных целей прямо из плана. Любое изменение сразу обновляет кольца дня/недели и серии. Свои компоненты и composable, 44 теста (lib/planned.ts, usePlanned.ts, PlannedSection.vue)",
        "План принимает дату, поэтому его можно встроить в карточку дня вместе с дневными метриками; перенос предлагается только для сегодняшнего дня, как на классическом сайте",
        "Сохранения плана идут по очереди — две быстрые правки не приходят на сервер в перепутанном порядке, а при ошибке план откатывается к последнему сохранённому состоянию",
    ]},
    { version: "0.98", date: "2026-09-28 11:10", changes: [
        "Исправлено: история длиннее 1000 записей обрезалась там, где читалась одним запросом, — серии и дневной/недельный прогресс в пилоте Дашборда и баланс баллов в пилоте Магазина могли считаться по неполным данным. Теперь читаются постранично в стабильном порядке (дата, метрика)",
        "Исправлено: в ночь перевода часов (в Европе — последнее воскресенье марта/октября) серия считалась со сдвигом на день («вчера» вычислялось как минус 24 часа), а на оси дат графика одна дата дублировалась и одна пропадала. Исправлено в классическом Дашборде и графиках, в пилоте Дашборда и в графике Сообщества",
        "Пилот Дашборда: серии, кольца дневного/недельного прогресса и график метрики обновляются сразу после добавления воды, записи подхода или правки значения на графике — без перезагрузки страницы",
        "Добавлен COORDINATION.md — общая доска для агентов (кто что делает сейчас, свободные задачи, журнал). 27 новых тестов",
    ]},
    { version: "0.97", date: "2026-09-28 09:03", changes: [
        "Пилот «Сообщество»: вернулся раздел «Сравнение по активности» — выбор категории, таблица сравнения (по сумме / баллам / streak, за неделю / прошлую неделю / месяц / всё время, все или только друзья) и личный график прогресса в этой категории с выбором периода и линией-целью",
        "Если своей метрики в категории нет — можно привязать любую числовую метрику прямо на странице; график построен на той же общей инфраструктуре, что и графики Дашборда",
        "Сортировка и фильтр таблицы, сумма значений по дням и линия-цель покрыты тестами, сверенными с оригинальным community.js",
    ]},
    { version: "0.96", date: "2026-09-28 17:20", changes: [
        "Пилот Дашборда: остаток блока «Профиль» — кольцо прогресса дня теперь вокруг аватарки (процент под ней и шестерёнка настроек в углу, как на обычном сайте), кольцо недели стоит в строке профиля, а в режиме «в шапке» дневной круг и недельный скруглённый квадрат появляются бейджами в правой части шапки. Шестерёнка на аватарке есть всегда, так что настройки доступны и когда кольца выключены или уехали в шапку",
        "Отдельное кольцо-блок из App.vue убран; ProfileSection получает данные колец пропсами. Новые файлы: lib/ringPlacement.ts (куда рисовать кольцо, геометрия), AvatarProgress.vue, HeaderProgressBadge.vue (через Teleport в #topbar-right), 16 новых тестов. Бейдж серии в строку профиля пока не переносился — им занимается другой агент",
    ]},
    { version: "0.95", date: "2026-09-28 16:05", changes: [
        "Доводка после починки сайдбара (v0.94): у значка серии и значка воды на Дашборде и у подсказок навыков на странице Навыков задан явный прозрачный фон и цвет текста — иначе после выноса общего правила кнопок в слой base они выглядели бы синими кнопками с рамкой. Остальные кнопки на страницах проверены: у них фон уже задан или они используют классы secondary/danger",
    ]},
    { version: "0.94", date: "2026-09-28 15:40", changes: [
        "Починен левый сайдбар на всех страницах пилота. Причина в двух вещах: кнопка «Выйти» сжималась по высоте до 12–18px (элементы меню сжимались вместо прокрутки) — теперь меню прокручивается, а элементы не сжимаются; и общее правило `button {}` в style.css перебивало все Tailwind-классы на кнопках (на Целях/Навыках/Календаре/Магазине и др. кнопка выхода и EN/RU выглядели «чепухой») — теперь оно вынесено в слой base и не мешает",
        "Ссылки в меню приведены в порядок: Тренировки, Сообщество, Языки, Челленджи и Аккаунт везде ведут на новые *-vue/ страницы (раньше часть страниц ещё вела на старые .html, а Аккаунт — на /account.html). Дашборд намеренно остаётся на старом /dashboard.html, пока в пилоте не перенесены дневные метрики и план. У пункта «Аккаунт» в меню добавлена иконка",
    ]},
    { version: "0.93", date: "2026-09-28 09:50", changes: [
        "Пилот Дашборда: графики теперь включают параметры тела и числовые метрики/подходы (с целью самой метрики как линией-ориентиром), а не только «баллы за день». «Настроить графики»: какие графики показывать, их порядок, линия-ориентир для каждого и общий период; выбор сохраняется в профиле (то же поле dashboard_charts, что и на классическом сайте). У каждого графика можно задать свой период, а значения — править прямо из графика (кроме баллов и подходов, как и раньше)",
        "Профиль и графики синхронизируются: добавление/изменение/удаление параметра тела или правка значения из графика обновляют соседний блок. Графики читают историю постранично, поэтому длинная история больше не обрезается на 1000 строках",
        "33 новых теста (построение серий сверено вручную с оригиналом: порядок серий, баллы за день, суммы подходов, форматы сохранённого выбора)",
    ]},
    { version: "0.92", date: "2026-09-28 09:25", changes: [
        "Пилот Дашборда: добавлен блок «Профиль» — аватар (загрузка фото), возраст с редактированием даты рождения, последние значения параметров тела с изменением с первой записи (цвет зависит от цели: например, вес вниз — зелёный при похудении), баланс баллов со ссылкой в магазин и управление параметрами тела (добавить / изменить / удалить, выбор иконки). Свои компоненты, composable и 36 тестов (lib/profile.ts, balance.ts, useProfile.ts, ProfileSection.vue)",
        "Баланс баллов и история параметров тела читаются постранично, поэтому больше не обрезаются на 1000 строках",
        "Пока не перенесено: ввод значений параметров тела в карточке дня (ждёт блок дневных метрик; для него в useProfile есть saveBodyValue) и графики параметров тела",
    ]},
    { version: "0.91", date: "2026-09-28 10:20", changes: [
        "Пилот Дашборда: добавлены баннеры-напоминания — «Вехи» (сколько просрочено и сколько со сроком в ближайшую неделю, с закрытием до конца дня) и «Итоги недели на подходе» по субботам/воскресеньям, если неделя ещё не на 100%. Отдельный компонент, composable и тесты (lib/reminders.ts, useReminders.ts, ReminderBanners.vue), чтобы не пересекаться с блоками других агентов",
        "Смерджено с графиками, управлением метриками и подходами, которые переехали параллельно (v0.86–v0.90): конфликт только в App.vue, оба варианта сохранены, все 148 тестов и билд проверены",
    ]},
    { version: "0.90", date: "2026-09-28 04:01", changes: [
        "Пилот «Дашборд»: блок графиков — общая инфраструктура (заполнение пропущенных дней пунктиром, укрупнение длинной истории, линия-цель, выбор периода: 10 дней / неделя / прошлая неделя / месяц / всё время / свой период, период запоминается) и первый график — «баллы за день»",
        "Логика (prepareChartSeries, periodBounds, серия баллов) покрыта тестами, сверенными с оригинальным config.js/dashboard.js; ChartBlock и PeriodPicker — самостоятельные компоненты, их можно переиспользовать на других страницах пилота (Сообщество, Тренировки)",
        "Пока не перенесено: графики параметров тела и отдельных метрик с выбором серий и правкой значений прямо из графика — ждут блок «Профиль»",
    ]},
    { version: "0.89", date: "2026-09-28 03:57", changes: [
        "Оформление: на всех страницах-пилотах на Vue вместо стандартного синего логотипа Vite (молния) — вкладка браузера и значок в шапке — теперь наш огонёк, но в голубо-оранжевом цвете, чтобы Vue-версии сразу отличались от старых страниц с оранжевым огоньком. Убраны неиспользуемые шаблонные логотипы Vite/Vue из папок пилотов",
        "Если в браузере всё ещё видна молния — значок во вкладке кэшируется, помогает жёсткое обновление страницы",
    ]},
    { version: "0.88", date: "2026-09-28 03:52", changes: [
        "Пилотная пересборка «Тренировок» на Vite + Vue 3 + TypeScript + Tailwind по адресу /workouts-vue/, итерация 1 из 2: добавление/изменение/удаление упражнений (категории, вес, длительность, левая/правая сторона), записи с подходами, личные рекорды (по весу и по темпу, отдельно по сторонам), группировка по категориям со сворачиванием, каталог типовых программ",
        "Графики (мини-график прогресса у каждого упражнения и общий график объёма тренировок) пока остаются на старой странице — это итерация 2",
    ]},
    { version: "0.87", date: "2026-09-28 12:30", changes: [
        "Пилот Дашборда: добавлен блок «Подходы» (метрики типа sets, например отжимания) — сворачиваемая карточка со списком подходов: время (проставляется само при добавлении, можно поправить), количество раз и «особенность» с выпадашкой сохранённых вариантов (у каждого ✕, чтобы убрать неверный). Сводка «N подходов · M повторений всего», автосохранение на каждую правку",
        "Блок не привязан к навигации по дням: SetsSection принимает date (по умолчанию сегодня), а SetsCard — чисто презентационный, так что блок «дневные метрики» сможет вставить его в свой список. Отдельные файлы (lib/setsBlock.ts, lib/useSets.ts, SetsCard/SetsSection/VariationCombo, свои тесты — 20 новых), в App.vue только импорт и одна строка",
    ]},
    { version: "0.86", date: "2026-09-28 11:10", changes: [
        "Пилот Дашборда: добавлен блок «Управление метриками» (web-dashboard/) — кнопка ⚙️ открывает список метрик с правкой и удалением, форма создания/правки со всеми полями обычного сайта: тип (число/галочка/выбор/подходы), цель и её направление, единица, варианты, режим ввода, расписание (каждый день / дни недели / не менее N раз / не более N раз в неделю), категория (с созданием новой), импорт серии и выбор иконки с поиском",
        "Отдельные файлы (lib/metricsManager.ts, lib/useMetricsManager.ts, три компонента, свои тесты — 34 новых), в App.vue только импорт и одна строка. Тип Metric дополнен необязательными полями options/input_mode. Расписание и импорт серии по-прежнему не пишутся, если миграции 021/026 ещё не применены",
    ]},
    { version: "0.85", date: "2026-09-28 09:55", changes: [
        "Пилот Дашборда: перенесён дневной/недельный прогресс (кольца вокруг темы + настройки — что учитывать, где показывать) поверх серий, перенесённых раньше — lib/progress.ts/progressSettings.ts, 17 новых тестов",
        "Смерджено с параллельно переехавшим блоком «Вода» (агент 4, v0.84) — оба блока писали в web-dashboard/src/App.vue и i18n.ts одновременно, разрешил конфликт вручную (взял обе стороны, ничего не потеряно), все 80 тестов и билд проверены после слияния",
    ]},
    { version: "0.84", date: "2026-09-28 09:50", changes: [
        "Пилот Дашборда: добавлен блок «Вода» (web-dashboard/, параллельно с блоком дневного/недельного прогресса, который переносит другой агент, — см. ROADMAP.md) — стакан-бейдж с той же волновой анимацией по проценту от нормы, что и на обычном сайте, модалка с быстрым добавлением (+200мл/+1л/своё), выбор даты задним числом, дневная норма (ручная или авто по последнему весу ≈30мл/кг — 17 тестов на lib/water.ts)",
        "Сделан отдельным композаблом (lib/useWater.ts) и отдельным файлом тестов, не трогающими lib/useDashboard.ts и общий smoke.test.ts, — чтобы не пересекаться с другими блоками Дашборда, которые переносятся тем же заходом",
    ]},
    { version: "0.83", date: "2026-09-28 09:15", changes: [
        "Пилот «Челленджи»: web-challenges/ → challenges-vue/ на Vite + Vue 3 + TypeScript + Tailwind. Каталог из 6 готовых пресетов и свой челлендж 4 типов — фиксированная дневная цель (100 отжиманий/день), растущая дневная цель (+5 в день), ежедневная привычка-галочка (без сахара) и накопительный счётчик со списком (100 книг)",
        "Точечные дневные отметки — 30 кружков прогресса за весь срок челленджа, сегодняшний день подсвечен; для накопительных — прогресс-бар и список записей с заметками и удалением. Кнопка «завершить», когда цель или срок достигнуты. 19 тестов бизнес-логики (lib/challenges.ts) + 8 smoke-тестов на компоненты",
        "Заодно продолжение B-nav-fix: ссылки на /challenges.html поправлены на /challenges-vue/ во всех уже перенесённых страницах (History, Calendar, Community, Goals, Account, Languages, Milestones, Shop, Skills) — кроме Дашборда, он сейчас активно дорабатывается отдельно",
    ]},
    { version: "0.82", date: "2026-09-28 08:20", changes: [
        "Начат перенос Дашборда на Vite + Vue 3 + TypeScript + Tailwind (самая большая и сложная страница, переносится в несколько итераций — см. ROADMAP.md, тикет B-dashboard). Пилот честно помечен как незаконченный: сверху баннер и ссылка на обычный Дашборд для всего, чего пока нет",
        "Первая итерация — блок серий (streaks): идеальные дни подряд, серии по каждой метрике (включая «не менее/не чаще N раз в неделю» и импортированные до переезда серии), заполнение заметки дня. Бизнес-логика (lib/metrics.ts + lib/streaks.ts) перенесена дословно из dashboard.js и покрыта 41 тестом до какой-либо разметки — риск разъехаться с оригиналом в расчётах сведён к минимуму",
        "Следующие итерации: дневной/недельный прогресс, графики (от них, как выяснилось при переносе Сообщества, зависит ещё и раздел сравнения с друзьями), дневные метрики и вода",
    ]},
    { version: "0.81", date: "2026-09-27 17:32", changes: [
        "Шестой шаг постепенного переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка «Сообщества», отдельно от рабочего сайта, по адресу /community-vue/",
        "Друзья (поиск по email/нику, подписка/отписка), лидерборд (все / только друзья, медали за топ-3, streak), лента «что сделали сегодня», публичный профиль (имя + видимость в лидербордах)",
        "Раздел «Сравнение по активностям» (сравнение с друзьями по конкретной метрике + личный график) в этот заход НЕ перенесён — зависит от инфраструктуры графиков дашборда, которой ещё нет ни в одном пилоте; ссылка на ванильную страницу пока остаётся рабочим способом посмотреть его",
    ]},
    { version: "0.80", date: "2026-09-27 17:27", changes: [
        "Шестой шаг переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка «Языков» (бывшая english.js/html) по адресу /languages-vue/ — словарь слов с фильтром по языку, добавление/редактирование с автопереводом (MyMemory), отметка «выучено»",
        "Ссылка на эту страницу в меню всех остальных пилотов (История, Вехи, Календарь, Цели, Навыки, Аккаунт, Магазин) обновлена на /languages-vue/ вместо /english.html — сама ванильная страница пока называется по-старому, переименование её файлов на будущее, отдельной задачей",
    ]},
    { version: "0.79", date: "2026-09-27 13:05", changes: [
        "Пилот-мелочи, не связанные с новой страницей: почищены ссылки в меню, которые ещё вели на /skills.html и /shop.html вместо актуальных /skills-vue/ и /shop-vue/ (История, Календарь, Вехи, Цели, Навыки, Аккаунт), а также догнал /goals-vue/ и /calendar-vue/ в меню Аккаунта",
        "В пилоте «Вехи» появились стили для кнопок (обычная/secondary/danger) и модалок — раньше ссылались в разметке, но не были заведены в CSS, из-за чего кнопки выглядели неоформленными браузерными",
    ]},
    { version: "0.78", date: "2026-09-27 12:37", changes: [
        "Пятый шаг постепенного переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка «Магазина за баллы», отдельно от рабочего сайта, по адресу /shop-vue/",
        "Карточка баланса (заработано/потрачено/остаток) считается той же формулой, что и на дашборде — метрики по всем дням, выполненные цели, освоенные навыки, дочитанные книги; сетка товаров с картинкой (вставить ссылку или загрузить файл), покупкой, редактированием и удалением",
        "Тот же вход, тема, шапка и меню, что и у остальных пилотных страниц; расчёт баланса проверен тестами против оригинального config.js",
    ]},
    { version: "0.77", date: "2026-09-27 12:27", changes: [
        "Починен баг: service worker (офлайн-режим, v0.72) ронял навигацию по ссылкам вида /goals.html, /shop.html и т.п. с ошибкой «не удаётся получить доступ к сайту» — Cloudflare редиректит такие адреса на их короткую форму без .html, а браузер запрещает отвечать на переход по ссылке уже редиректнутым ответом. Раньше (до появления service worker) редирект просто тихо обрабатывался браузером",
        "Пилот «Аккаунт» (web-account/ → /account-vue/): смена пароля, смена почты, привязка Google-аккаунта — пятая перенесённая страница",
        "Иконки в шапке/меню (модуль из v0.73) были только у пилота «История» — дособрал в Вехах, Календаре, Целях и Навыках, теперь везде иконки вместо голого текста",
        "Заодно поправил несколько ссылок в меню (Цели/Календарь/Вехи), которые в некоторых пилотах ещё вели на старые ванильные страницы вместо актуальных *-vue/ адресов",
    ]},
    { version: "0.76", date: "2026-09-28 07:55", changes: [
        "Ещё один шаг переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка «Навыков», отдельно от рабочего сайта, по адресу /skills-vue/",
        "Навыки: прогресс-бар с шагом ±N% на клик, отметка «освоено», карточки быстрых идей (подсказки с иконкой), форма добавления/редактирования; отдельно — книги (хочу прочитать/прочитано, отметка «готово», форма с автором и баллами)",
        "Тот же вход, тема, шапка и меню, что и у остальных пилотных страниц; прогресс-бар и список подсказок проверены тестами против оригинального skills.js",
    ]},
    { version: "0.75", date: "2026-09-27 07:44", changes: [
        "Четвёртый шаг постепенного переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка «Целей», отдельно от рабочего сайта, по адресу /goals-vue/",
        "Активные цели сгруппированы по категориям (с прогресс-баром для многоэтапных, чипами сложности и срочности дедлайна), сумма баллов, выполненные — отдельным списком; форма добавления/редактирования со всеми полями",
        "Тот же вход, тема, шапка и меню, что и у остальных пилотных страниц; расчёт прогресса и срочности дедлайна проверен тестами против оригинального goals.js",
    ]},
    { version: "0.74", date: "2026-09-27 07:20", changes: [
        "Третий шаг постепенного переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка «Календаря», отдельно от рабочего сайта, по адресу /calendar-vue/",
        "Сетка месяца с бейджами прогресса (план на день выполнен/частично), навигация по месяцам, модалка плана дня — добавление пунктов, отметка выполнения, удаление, сохранение",
        "Тот же вход, тема, шапка и меню, что и у остальных пилотных страниц; раскладка сетки месяца проверена тестами против реальных дней недели",
    ]},
    { version: "0.73", date: "2026-09-27 03:15", changes: [
        "Пилот «История»: общий модуль иконок (src/lib/icons.ts, все 120 иконок + ключевые слова поиска, сверены побайтово с config.js) плюс компоненты Icon.vue/MetricIcon.vue/IconPicker.vue — та же сетка, поиск и поле для своего эмодзи, что и в buildIconPicker()",
        "Заодно починен реальный баг отображения в пилоте: метрика с иконкой svg: показывала буквальный текст «svg:dumbbell» вместо иконки (DayDetailModal теперь использует MetricIcon); навигация (сайдбар и быстрые ссылки) тоже получила настоящие иконки вместо текстовых подписей",
        "Модуль иконок пока по-прежнему дублируется в каждом пилоте (сейчас только web-history/), а не вынесен в общий npm-воркспейс — вопрос ещё открыт, см. B2 в роадмапе",
    ]},
    { version: "0.72", date: "2026-09-27 23:20", changes: [
        "Первый шаг офлайн-режима (вариант «локально, без синка»): страницы «История» и «Вехи» теперь показывают последние сохранённые данные, если сеть пропала — раньше просто падала ошибка загрузки. Плюс service worker кэширует саму оболочку сайта (HTML/JS/CSS/иконки), так что страницы открываются и без сети",
        "Заодно защитил вход на сайт офлайн: раньше при пропавшей сети во время проверки «прошёл ли онбординг» пользователя ошибочно перекидывало на экран онбординга",
    ]},
    { version: "0.71", date: "2026-09-27 02:43", changes: [
        "Починил баг: массивы с текстом истории обновлений (RU/EN) были перепутаны местами для версий 0.60–0.70 — русский текст показывался при английском языке интерфейса и наоборот. Сами тексты не менялись, только расставлены по нужным массивам",
        "Версии 0.59 и старше багом не затронуты",
    ]},
    { version: "0.70", date: "2026-09-27 02:27", changes: [
        "Пилот «История» (/history-vue/): установка приложения, приветственный тур (7 шагов) и модалка «О проекте» перенесены в AppShell.vue — те же самые модалки, что и на ванильном сайте",
        "Примечание: содержимое CHANGELOG_RU/CHANGELOG_EN всё ещё перепутано (см. C-changelog-bug) — эта запись сознательно сохраняет ту же путаницу до момента фикса",
    ]},
    { version: "0.69", date: "2026-09-27 22:50", changes: [
        "Пилот «Вехи»: достигнут полный паритет отображения с ванильной страницей — под каждой вехой теперь показывается метка интервала («каждые N месяцев»), чип «в последний раз» (с пробегом) и чип следующего пробега, как в milestones.js",
    ]},
    { version: "0.68", date: "2026-09-27 22:35", changes: [
        "Пилот «Вехи»: модалка истории по каждой вехе — прошлые отметки (дата, пробег, заметка), новые сверху, как кнопка «История» на ванильной странице",
    ]},
    { version: "0.67", date: "2026-09-27 22:15", changes: [
        "Пилот «Вехи»: форма добавления/редактирования со всеми полями (категория, дата последнего раза, интервал и единица повтора, срок, пробег в последний раз / интервал в км, заметка) — те же правила, что и на ванильной странице, при заданном интервале срок пересчитывается сам",
        "Отметка «сделано» теперь спрашивает дату, пробег и заметку (раньше было мгновенное подтверждение в один клик), а редактирование/удаление стали доступны и для уже выполненных разовых вех, а не только для активных",
    ]},
    { version: "0.66", date: "2026-09-27 21:40", changes: [
        "Второй шаг постепенного переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка раздела «Вехи», отдельно от рабочего сайта, по адресу /milestones-vue/",
        "Активные вехи сгруппированы по категориям с чипом статуса (просрочено/сегодня/скоро), выполненные разовые — отдельным списком, отметка «готово» и удаление; формы добавления/редактирования всех полей (интервал, км, история) — в одной из следующих итераций",
        "Тот же вход, тема, шапка и меню, что и у пилота Истории; расчёт срока проверен тестами против цифр оригинальной страницы",
    ]},
    { version: "0.65", date: "2026-09-26 12:40", changes: [
        "У Vue-пилота (/history-vue/) появились своя шапка и выезжающее по свайпу боковое меню, как на остальном сайте — меню ведёт на все остальные (пока ванильные) страницы, плюс переключатели языка и темы, выход из аккаунта",
        "Установка приложения / обучающий тур / «о проекте» в пилот пока сознательно не перенесены — сделаю следующей итерацией, если пилот приживётся",
    ]},
    { version: "0.64", date: "2026-09-26 11:15", changes: [
        "Первый шаг постепенного переезда на Vite + Vue 3 + TypeScript + Tailwind: пилотная пересборка раздела «История», отдельно от рабочего сайта, по адресу /history-vue/, пока идёт обкатка — на текущем сайте ничего не изменилось",
        "Пилот использует тот же вход (тот же проект Supabase, та же сессия браузера) и те же 4 темы, а расчёт процентов дня/недели проверен тестами против цифр оригинальной страницы",
        "Коммиты по переезду на новый стек будут поднимать версию только на 0,01, независимо от объёма работы в них",
    ]},
    { version: "0.63", date: "2026-09-25 18:20", changes: [
        "Выбор иконки метрики вырос с 44 до 90: добавлены растяжка, бокс, скакалка, блин штанги, беговая дорожка, лыжи, здоровье (пластырь, градусник, глаз, лёгкие), еда и напитки (чай, бутылка воды, пицца, салат, хлеб), дом и быт, финансы, подарки, погода и природа, путешествия, техника, хобби, питомцы и другое",
        "Над сеткой — поиск иконки по названию на русском или английском («бег» или «run»), включая синонимы — не нужно листать весь список",
        "Миграция не нужна — меняется только набор в выборе иконки",
    ]},
    { version: "0.62", date: "2026-09-25 17:35", changes: [
        "Упражнения, которые делаются поочерёдно одной стороной, теперь можно разделить на левую/правую (⚙️ упражнения → «Разделять левую и правую сторону»): у каждого подхода — переключатель Л/П, новые подходы по умолчанию чередуют сторону",
        "Личные рекорды для таких упражнений делятся по сторонам — лучший подход и лучший темп отдельно для левой и правой, а не одна смешанная цифра",
        "Нужна миграция migrations/028_exercise_bilateral.sql; без неё всё работает как раньше, просто переключатель не предлагается",
    ]},
    { version: "0.61", date: "2026-09-25 17:05", changes: [
        "У упражнений можно включить учёт длительности подхода (⚙️ упражнения → «Также фиксировать длительность»): подход становится «5 км за 30 мин», и приложение показывает темп (значение в час — км/ч для бега и т.п.)",
        "Там, где это применимо, теперь две строки рекорда вместо одной: лучший отдельный подход (самая длинная дистанция, самый большой вес) и, для упражнений с длительностью, лучший темп — они почти всегда из разных тренировок",
        "Нужна миграция migrations/027_exercise_duration.sql; без неё всё работает как раньше, просто длительность не предлагается",
    ]},
    { version: "0.60", date: "2026-09-25 16:20", changes: [
        "Импорт существующего серии: у метрики можно указать «уже была серия N дней» (в её ⚙️) — он продолжает считаться с сегодняшнего дня и перестаёт применяться в первый пропущенный день",
        "Языки: явный выбор «переводить на», отдельно от языка самого слова",
        "Тренировки: строка личного рекорда под каждым упражнением — лучший отдельный подход по весу (или по повторениям для упражнений без веса)",
        "Кнопка «↺ Незавершённое с прошлых дней» в плане на сегодня: можно выбрать из невыполненного за последние 7 дней, вместо того чтобы это терялось после смены дня",
        "Тонкая полоса цвета темы подсвечивает метрики, ещё нужные сегодня — видно, что осталось до 100%",
        "Чекбоксы и переключатели везде в цвет темы, а не только в модалках",
        "Цвет шторки/строки состояния на телефоне теперь совпадает с темой с первого кадра — раньше на загрузке на миг мелькал неверный цвет",
        "У огонька серии в теме Monet — слабая обводка, чтобы не терялся в тёмном углу",
        "Ещё эмодзи заменены на SVG: значок дня в мини-календаре, звёзды баллов в навыках и лидерборде, медали лидерборда (золото/серебро/бронза), иконка ссылки у товара в магазине, кнопка перевода в словаре, галочка администратора",
        "У сайта-визитки своя иконка («VK») вместо переиспользованного огонька дашборда",
        "В истории изменений теперь указывается и время, не только дата",
    ]},
    { version: "0.59", date: "2026-09-24", changes: [
        "SVG-иконки для метрик и параметров тела: в формах вместо текстового поля — сетка из 44 иконок (отжимания, подтягивания, приседания, бег, ходьба, велосипед, плавание, йога, сон, вода, еда, кофе, книга, код, пульс и другие); при желании можно вписать свой эмодзи",
        "Известные эмодзи (💧, 💪, 🏋️, 🚶, 🏃, 📚, ⚖️, ❤️ и др.) уже сейчас рисуются их SVG-аналогом — без правки твоих данных; неизвестные остаются как есть",
    ]},
    { version: "0.58", date: "2026-09-24", changes: [
        "Новый раздел «История»: календарь месяца, где каждый день закрашен снизу вверх по проценту выполнения (100% — сплошной зелёный, перевыполнение с бонусами — золотая рамка). Справа в каждой строке процент недели, над календарём — средний процент месяца, число идеальных дней и дней с данными",
        "По нажатию на день — подробности: процент, значения каждой метрики (подходы со временем, числа с целью, выбранные варианты), выполнение планов, заметки. Месяцы листаются кнопками и свайпом; ниже — недели списком (последние 8) с полосами прогресса",
        "Проценты считаются так же, как кружки на дашборде: те же настройки, расписание метрик и бонусы. Миграции не нужны",
    ]},
    { version: "0.57", date: "2026-09-24", changes: [
        "Прогресс дня и недели — в одном окне («⚙️» у аватарки или клик по любому из кружков): отдельно выбираешь, где показывать кружок дня (у аватарки / в шапке / скрыть) и где кружок недели (рядом с профилем / в шапке / скрыть). Прежняя настройка переносится сама",
        "Лидерборд и сравнение по категориям в Сообществе учитывают расписание метрик: метрики «только по дням» и «N раз в неделю» не рвут серию в нерасчётные дни. Нужна миграция migrations/023_leaderboard_schedule.sql",
        "В разделе «Языки» у каждого слова есть язык (20 языков), список фильтруется по языку, автоперевод идёт с выбранного языка на язык интерфейса. Нужна миграция migrations/024_vocabulary_language.sql, все прежние слова остаются английскими",
        "Ещё больше SVG-иконок на главной: скрыть/показать блок, период графика, аватарка-заглушка, баланс, возраст, звезда бонуса, предупреждение и капля в окне воды",
    ]},
    { version: "0.56", date: "2026-09-24", changes: [
        "Ускорение загрузки: список метрик и вся история значений/заметок теперь загружаются один раз и хранятся в кэше; после записи обновляются только затронутые дни. Раньше каждая галочка и каждый подход заново скачивали всю историю",
        "Историю читаем постранично: у Supabase лимит ответа 1000 строк, и без этого серии и графики у давних пользователей могли считаться по обрезанным данным",
        "Скрипты загружаются с defer, а к серверам подключаемся заранее (preconnect): страницы показываются раньше",
    ]},
    { version: "0.55", date: "2026-09-24", changes: [
        "Огонёк серии теперь горит цветами выбранной темы и слегка мерцает; если серия на сегодня ещё не засчитана — тусклый пунктирный контур. Исправлен баг с дублированием огонька при вводе нового подхода",
        "Шестерёнка у аватарки стала контрастной и видна на любом фоне",
        "Стакан воды перерисован: стекло с бликом, вода с градиентом и волной, при 100% золотой",
        "Вода убрана из списка ежедневных метрик — её ведёт только стакан в шапке",
        "Поле времени подхода и выпадашки даты/времени оформлены под тему (раньше были белыми)",
        "«Как пользоваться» листается свайпами (и стрелками на клавиатуре) с плавной сменой шагов",
        "Раздел «English» переименован в «Языки»: можно вести не только английский",
    ]},
    { version: "0.54", date: "2026-09-24", changes: [
        "Новый раздел «Вехи»: регулярные дела с датой — замена масла и расходников в машине, визит к врачу и т.п. Записываешь, когда сделал в последний раз и как часто повторять (дни/недели/месяцы/годы), необязательно пробег; раздел считает срок следующего раза, подсвечивает просроченное и скоро наступающее, ведёт историю выполнений. Кнопка «сделано» переносит веху на следующий срок",
        "На дашборде появляется баннер, если есть просроченные вехи или срок в ближайшую неделю (можно скрыть до завтра)",
        "Нужна миграция migrations/022_milestones.sql (один раз в Supabase → SQL Editor)",
    ]},
    { version: "0.53", date: "2026-09-24", changes: [
        "Вторая волна SVG-иконок: заголовки страниц и блоков, названия окон и подписи кнопок («Добавить», «Настроить» и т.п.) теперь тоже с иконками вместо эмодзи. Добавлены новые иконки: галочка, звезда, книга, список, график, заметка, кубок, медаль, замок",
        "Пользовательские названия, категории и эмодзи метрик по-прежнему показываются как введены",
    ]},
    { version: "0.52", date: "2026-09-24", changes: [
        "«Рваные» ежедневные метрики: у метрики появилось расписание — каждый день, только в выбранные дни недели или не менее N раз в неделю (настраивается в ⚙️ метрики)",
        "Серия метрики по дням недели не рвётся в дни, когда её делать не нужно; «идеальный день» учитывает только метрики, нужные в этот день. Метрики «N раз в неделю» считают серию в неделях (нед.), а если добрать норму можно только каждый оставшийся день, серия помечается как под угрозой",
        "Проценты дня и недели не штрафуют за метрики вне расписания: они учитываются только если сделаны, а «N раз в неделю» идёт в неделю как N пунктов",
        "Нужна миграция migrations/021_metric_schedule.sql (один раз в Supabase → SQL Editor); серия в лидерборде считается как раньше",
    ]},
    { version: "0.51", date: "2026-09-24", changes: [
        "Единый набор SVG-иконок вместо эмодзи в интерфейсе: навигация (шапка и боковое меню), кнопки «изменить», «удалить», «настройки», «закрыть», «добавить», баллы, огонёк серии и капля воды. Иконки берут цвет темы и масштабируются вместе с текстом",
        "Иконки, которые ты сам выбираешь для метрик и параметров тела, остаются эмодзи — это твои данные",
    ]},
    { version: "0.50", date: "2026-09-24", changes: [
        "У целей появились дедлайн и сложность (лёгкая/средняя/сложная). Под названием цели показываются метки: сколько дней осталось до срока (жёлтая — 3 дня и меньше, красная — срок сегодня или просрочено) и сложность",
        "Цели внутри категории сортируются по ближайшему дедлайну, без срока — в конце",
        "Нужна миграция migrations/020_goal_deadline_difficulty.sql (выполнить один раз в Supabase → SQL Editor); без неё всё остальное работает как раньше",
    ]},
    { version: "0.49", date: "2026-09-24", changes: [
        "Приветственный тур для новых пользователей: 7 коротких шагов про дашборд, цели, навыки, тренировки, челленджи, магазин, сообщество и календарь. Показывается один раз сразу после онбординга",
        "Тур можно открыть снова в любой момент: в боковом меню появился пункт «Как пользоваться»",
    ]},
    { version: "0.48", date: "2026-09-24", changes: [
        "Воду можно вносить за прошлые дни: в окошке воды появился выбор даты. Кружок, серия, графики и неделя обновляются сразу, без перезагрузки",
        "У каждого подхода теперь фиксируется время: проставляется само, когда вписываешь повторения, и его можно поправить руками (дашборд и раздел «Тренировки»)",
        "Раздел «О проекте» превратился в «О создателе»: короткая информация об авторе и ссылка на портфолио",
        "Монохромная иконка для тем Android пересобрана: силуэт теперь целиком внутри безопасной зоны, добавлен размер 192 и явный id приложения. Чтобы иконка подхватилась, приложение нужно удалить с экрана и добавить заново",
        "Мелочь: цель воды в окошке теперь сразу пересчитывает полосу, а при 100% полоса золотая",
    ]},
    { version: "0.47", date: "2026-09-24", changes: [
        "Кружок недели теперь можно вынести в шапку: в настройке прогресса (⚙️) новый вариант «Кружок недели в шапке». Он отличается от дневного пунктирной дорожкой и подписью «нед»",
        "Напоминание по выходным больше не подбирает случайную цель: просто показывает текущий процент и ссылку «Сделай что-то из целей, чтобы добить до 100%», ведущую в цели",
    ]},
    { version: "0.46", date: "2026-09-24", changes: [
        "Иконка выхода (дверь) убрана из шапки — выход снова только в боковом меню. Выход теперь ведёт на страницу входа, а не на визитку",
        "Кружок прогресса и стакан воды закреплены у правого края шапки в фиксированном порядке и больше не прыгают",
        "Стакан воды при 100% нормы становится золотым",
        "Огонёк серии теперь сплошной, если серия на сегодня уже засчитана (пунктир остаётся только как предупреждение)",
        "Шестерёнка у аватарки снова круглая, а не вытянутый овал",
        "Ссылка «Назад к портфолио» на странице входа оформлена как остальные элементы",
    ]},
    { version: "0.45", date: "2026-09-22", changes: [
        "Неделя теперь считается пн-вс, а не сб-пт",
        "Подсказка про незакрытую неделю убрана из постоянного кружка — вместо этого баннер-напоминание, который появляется только по субботам/воскресеньям, если неделя ещё не на 100%",
        "Иконка выхода (дверь) в правом углу шапки — теперь не обязательно лезть в боковое меню",
        "Клик по баллам (💰) в профиле уводит в магазин",
        "Иконка серии — контурная/пунктирная SVG вместо заливного эмодзи; если сегодня ещё не засчитано — подсвечивается малиновым, а при клике прямым текстом предупреждает, что серия под угрозой. Плюс починили баг: серия не обновлялась без перезагрузки страницы",
        "Новый виджет — вода в шапке: стакан заполняется по ходу дня, кнопки +200мл/+1л/+своё, дневная норма считается по весу автоматически или задаётся вручную",
    ]},
    { version: "0.44", date: "2026-09-22", changes: [
        "Иконка приложения: добавили monochrome-вариант — на Android с системной тёмной/цветной темой (Material You) иконка теперь встраивается в общий стиль, как у остальных приложений, а не остаётся всегда со своим фоном",
        "У прогресса дня теперь два режима отображения (настраивается через ⚙️): кольцом вокруг аватарки (как раньше) или отдельным заполняемым кружком с процентом в шапке страницы",
        "Добавили прогресс недели — отдельный кружок рядом с аватаркой, по той же логике, что и день, но за 7 дней. Неделя считается с субботы по пятницу. Если неделя не закрыта — рядом подсказка с незавершённой целью, которую можно доделать",
    ]},
    { version: "0.43", date: "2026-09-22", changes: [
        "Отметка пункта плана / звёздочки / метрики за сегодня больше не перерисовывает всю карточку «Профиль» — обновляется только само кольцо прогресса дня, без исчезновения и появления всего блока",
    ]},
    { version: "0.42", date: "2026-09-21", changes: [
        "Починили размножение блока профиля при быстрых подряд изменениях (например, несколько раз подряд жмёшь звёздочку) — теперь параллельные вызовы обновления схлопываются в один, вместо того чтобы плодить копии друг под другом",
        "Бонусное кольцо теперь рисуется поверх основного тем же радиусом (не отдельным маленьким кольцом внутри), цвет — малиновый вместо зелёного",
        "В «Запланировано на сегодня» добавили подсказку прямо на странице про то, что делает звёздочка ⭐ — раньше это можно было узнать только из всплывающей подсказки при наведении",
    ]},
    { version: "0.41", date: "2026-09-21", changes: [
        "«Запланировано на сегодня» больше не пересобирает весь список при отметке пункта или звёздочки — меняется только конкретная строка, без дёрганья всего блока",
    ]},
    { version: "0.40", date: "2026-09-21", changes: [
        "Починили бонусные ⭐-пункты — раньше они считались только если план на сегодня включён в базовые 100% настроек диаграммы дня, из-за чего при сценарии «трекер целей» (только метрики) бонус вообще не срабатывал и было не перевыполнить 100%. Теперь бонус считается всегда, независимо от этой настройки",
    ]},
    { version: "0.39", date: "2026-09-21", changes: [
        "Лого: вернул плоские цвета вместо градиента, поправил — иконка была смещена от центра, теперь по центру и лучше заполняет форму",
        "Кольцо прогресса дня теперь обновляется сразу, без перезагрузки страницы — при сохранении метрики или отметке пункта плана",
        "Под аватаркой появился процент дня текстом, шестерёнка настройки стала аккуратнее (эмодзи по центру)",
        "У пунктов «Запланировано на сегодня» — звёздочка ⭐ «доп. пункт»: не входит в базовые 100%, а при выполнении добавляет +20% сверху отдельным кольцом другого цвета — так можно перевыполнить день",
        "У каждого графика теперь свой период (кнопка 🗓️ рядом с графиком) — можно оставить общий из «Настроить графики» или задать свой только для этого графика",
    ]},
    { version: "0.38", date: "2026-09-20", changes: [
        "Починили баг с NaN% в диаграмме дня — в коде осталось два определения одной функции, побеждала старая, отсюда и NaN, и невидимая шестерёнка настроек",
        "Диаграмма дня переехала с отдельного блока прямо на кольцо вокруг аватарки — при 100% полная рамка вокруг фото, при 50% половина и т.д. Шестерёнка настройки — маленький значок в углу кольца",
    ]},
    { version: "0.37", date: "2026-09-20", changes: [
        "Выпадающие списки (select и особенность подхода) переделаны на позиционирование относительно экрана, а не блока — раньше в тесных местах не хватало места ни вверху, ни внизу и список было не проскроллить с телефона. Теперь высота списка всегда подгоняется под реально доступное место и скроллится нормально",
    ]},
    { version: "0.36", date: "2026-09-20", changes: [
        "Форма огонька в лого стала стройнее — убрал «шарообразность» снизу, теперь больше похоже на живое пламя",
        "Диаграмма дня переехала в блок «Профиль» (была в «Запланировано на сегодня») — теперь складывается и из дневных метрик, и из плана на день, можно настроить через ⚙️ рядом с ней (в т.ч. вообще скрыть)",
        "В онбординге новый первый вопрос — «Как планируешь использовать?» (трекер целей / ежедневник / и то и другое). Для «ежедневника» форма сразу прячет фитнес-поля (рост/вес/цель/метрики) — они не нужны, если человеку нужен просто список дел",
    ]},
    { version: "0.35", date: "2026-09-20", changes: [
        "Новый логотип — тот же огонёк, но с градиентом и объёмом вместо плоской заливки (иконка, favicon, PWA — везде обновилось)",
        "В тренировках теперь можно добавить свою категорию с любым названием — кроме пресетов Верх/Низ/Фулбади/Кастом появился пункт «➕ Добавить свою категорию…»",
        "На дашборде в блоке «Запланировано на сегодня» — круглая диаграмма: сколько % из запланированного на сегодня уже сделано",
    ]},
    { version: "0.34", date: "2026-09-19", changes: [
        "Категория упражнения в тренировках стала выбором из фиксированных вариантов: Верх / Низ / Фулбади / Кастом (плюс «без категории») — вместо свободного текста, чтобы группы не расходились из-за опечаток и регистра",
        "Порядок групп в тренировках теперь фиксированный (Верх → Низ → Фулбади → Кастом → старые категории → без категории), а не по порядку добавления",
        "Все select-поля в модалках (не только «Тип» метрики) теперь используют свою выпадашку вместо нативного пикера",
    ]},
    { version: "0.33", date: "2026-09-19", changes: [
        "Починили обрезанный и некликабельный список «особенность подхода» у последней строки в таблице — теперь список сам открывается вверх, если снизу не хватает места внутри прокручиваемой таблицы",
    ]},
    { version: "0.32", date: "2026-09-19", changes: [
        "У поля «особенность подхода» появилась стрелка ▾ справа — по клику сразу показывает полный список запомненных вариантов, не дожидаясь ввода текста",
    ]},
    { version: "0.31", date: "2026-09-19", changes: [
        "Сократили строку профиля, чтобы влезала в одну строку: «💰 Баланс: 120» → «💰 120», у изменений тела в скобках убрали «с начала» — просто «(+1.0кг)», возраст теперь «29 лет» с правильным склонением вместо «Возраст: 29»",
    ]},
    { version: "0.30", date: "2026-09-19", changes: [
        "Страница «Аккаунт» — убрали лишнее ограничение ширины блоков, теперь как на остальных страницах",
        "Глазик показать/скрыть пароль — вместо эмодзи обычная SVG-иконка, как везде",
        "Починили сломанный CSS: чекбоксы (видимость профиля в сообществе, отметки в плане календаря) больше не растягиваются на полблока",
        "Тренировки: упражнения теперь группируются по категории (то самое поле «Категория» при создании упражнения — можно писать «Верх», «Низ», «Фулбади» и т.п.), каждая группа сворачивается независимо",
    ]},
    { version: "0.29", date: "2026-09-18", changes: [
        "Вход через Google на странице логина (кнопка под формой) — работает после настройки Google-провайдера в Supabase, см. README",
        "Привязка Google к уже существующему аккаунту — в «Аккаунте», если регистрировался по почте, а теперь хочет заодно входить через Google",
        "Глазик показать/скрыть пароль — на входе, регистрации и смене пароля в аккаунте",
        "Графики без данных больше не показываются пустыми — секция сама сворачивается, если данных нет вообще, и разворачивается, как только они появляются (если раздел не трогали руками)",
        "Домик в быстрой навигации заменили на лого (тот самый огонёк)",
        "Кнопка быстрой навигации — простой текст >>> вместо спецсимволов",
        "Выпадающий список «Тип» в форме метрики (включая «Подходы») переделан со стандартного select на свой рендер — на случай если системный пикер плохо ведёт себя в установленном PWA",
        "«О проекте» переехал в самый низ бокового меню, ссылки внутри модалок стали нормального акцентного цвета вместо стандартного синего",
    ]},
    { version: "0.28", date: "2026-09-18", changes: [
        "В сайдбаре появился пункт «📲 Установить приложение» — на Android/desktop Chrome сразу открывает системный диалог установки, на iPhone/iPad и остальных браузерах показывает понятную инструкцию (нативного диалога на iOS не бывает вообще — это ограничение самого iOS)",
        "Добавили iOS-мета-теги, чтобы установленное на iPhone приложение открывалось в полноэкранном режиме и с нормальной иконкой",
    ]},
    { version: "0.27", date: "2026-09-18", changes: [
        "Дашборд теперь PWA — можно установить на Android как приложение («Установить» / «На главный экран» в Chrome): своя иконка, запуск в полноэкранном режиме без адресной строки, цвет статус-бара подстраивается под выбранную тему",
    ]},
    { version: "0.26", date: "2026-09-18", changes: [
        "Убрали ссылку «← Портфолио» из сайдбара (раз проекты разделены — смысла в ней больше нет), вместо неё — «О проекте»: ссылка на визитку + контакт для обратной связи",
    ]},
    { version: "0.25", date: "2026-09-18", changes: [
        "Починили деплой: без index.html в корне Cloudflare Workers не мог найти статику и падал со сборкой. Вернули index.html — теперь это лёгкая заглушка с мгновенным редиректом на /login.html",
    ]},
    { version: "0.24", date: "2026-09-18", changes: [
        "Подключили реальный URL визитки вместо заглушки, добавили редирект с корня сайта на страницу входа",
    ]},
    { version: "0.23", date: "2026-09-18", changes: [
        "Визитка вынесена в отдельный репозиторий и будет жить на отдельном деплое — из этого репо убраны index.html/portfolio.css, ссылки на визитку временно указывают на заглушку до подключения реального URL",
    ]},
    { version: "0.22", date: "2026-09-17", changes: [
        "Выпадающий список «особенность подхода» в метрике-раскладушке (например «Отжимания») переделан со стандартного нативного datalist на свою выпадашку — теперь у каждого варианта есть ✕, чтобы сразу удалить случайно/неверно введённое значение, не заходя в настройки метрики",
    ]},
    { version: "0.21", date: "2026-09-17", changes: [
        "Убрал перенос строк у быстрой навигации — при раскрытии все иконки остаются в одной строке рядом с кнопкой »»»",
    ]},
    { version: "0.20", date: "2026-09-17", changes: [
        "Быстрая навигация снова скрыта за кнопкой »»», но теперь по нажатию раскрываются сразу все иконки (новой строкой), без частичного показа и скролла",
    ]},
    { version: "0.19", date: "2026-09-17", changes: [
        "Верхняя навигация больше не сворачивается — все иконки разделов сразу видны, переносятся на вторую строку при нехватке места вместо скролла",
        "Почистили README в репозитории и убрали служебный файл для переноса контекста между чатами",
    ]},
    { version: "0.18", date: "2026-09-17", changes: [
        "Кнопка быстрой навигации теперь «»»» вместо многоточия",
        "Полный проход по переводу сайта: переключатель темы, сообщения входа/регистрации, единица веса по умолчанию в тренировках — теперь на двух языках",
        "История обновлений в сайдбаре тоже переведена на английский",
    ]},
    { version: "0.17", date: "2026-09-17", changes: [
        "Верхняя навигация переделана: в строке остался только домик, остальные разделы — в выезжающей вправо панели по кнопке »»»",
    ]},
    { version: "0.16", date: "2026-09-17", changes: [
        "Иконка ⚙️ вместо кнопки «Настроить дашборд» — просто рядом с заголовком, без фона",
        "Смена email в разделе «Аккаунт»",
        "Быстрая навигация эмодзи-иконками в верхней строке (🏠 — на главную, крупнее остальных)",
        "История обновлений по клику на номер версии в сайдбаре",
    ]},
];
const CHANGELOG_EN = [
    { version: "3.92", date: "2026-10-09 11:10", changes: [
        "“How to use” tour (Account, Languages): steps now slide in with an animation — on swipe or Next/Back the text glides in from the side you are paging towards. No animation when the system “reduce motion” setting is on. No migrations."
    ]},
    { version: "3.91", date: "2026-10-09 10:25", changes: [
        "Coins for achievements are now issued by the server: it takes the amount and the list of badges from its own catalog and pays only for badges you have unlocked, so you can no longer make up coins. Nothing changes for you: coins for unlocked badges arrive once, and reloading the page does not double them (needs migration 062 — applied by the owner; until then everything works as before)",
    ]},
    { version: "3.90", date: "2026-10-09 10:55", changes: [
        "Workouts → “Exercise progressions”: step chains are now drawn as a tree — each step has a round node (✓ done, ▶ current, ◐ in progress, 🔒 locked) joined by a line: green between completed steps, accent towards the current step, dashed where the path is still locked. Step cards, progress bars and “Add record” buttons are unchanged. No migrations."
    ]},
    { version: "3.89", date: "2026-10-09 10:40", changes: [
        "Daily metrics: when creating a Sets or Number metric you can now link it right away to an exercise from Workouts - pick an existing one or create a new exercise with the same name. Then sets are entered once, in Workouts, and the metric on the Dashboard fills in by itself. For an already linked metric the form shows which exercise it follows. REQUIRES migration 054 (without it the choice is hidden or saving hints at the migration)."
    ]},
    { version: "3.88", date: "2026-10-09 05:04", changes: [
        "Water: the settings window now has a \"Track water\" switch for people who do not want to log what they drink. When it is off: the glass in the header, the water block in the right panel, the water window and the Water block on the home page disappear, water reminders stop, and water no longer counts in the day and week rings, perfect days, streaks and daily points. Nothing is deleted: past water entries, the points for them in your balance and achievements stay, and everything comes back when you turn it on again. The choice is stored in your profile (migration 055 is needed; without it everything works as before and trying to turn it off shows a clear error)."
    ]},
    { version: "3.87", date: "2026-10-09 01:59", changes: [
        "Purchases in “Customization” are more reliable: buying and receiving rewards now run on the server as a single operation, the price and balance are checked there, and a double tap or a second tab will not charge you twice (needs migration 060 — applied by the owner; until then everything works as before)",
    ]},
    { version: "3.86", date: "2026-10-09 04:55", changes: [
        "Workouts: when you add an exercise, picking a “Typical exercise” now fills in the other fields for you. For example, “Squats” sets Lower body, Weight — yes, Count — repetitions, and “Plank” sets Full body, Weight — no, Seconds. Choosing a variant like “Weighted” or “Barbell” turns weight on, and “One-arm” or “Single-leg” turns on the Left/Right option. Anything you changed yourself is not overwritten, and every field can still be edited after it is filled. Existing exercises are not changed when you edit them. Muscle groups are matched by name, as before",
    ]},
    { version: "3.85", date: "2026-10-08 11:14", changes: [
        "Stronger access protection: a server-side check now stops anyone from changing their own permissions inside the app (needs migration 059 — applied by the owner). A security audit of purchases in Customization and the Shop was also written, with a plan for the next steps",
    ]},
    { version: "3.84", date: "2026-10-08 10:34", changes: [
        "Metrics: a tick-box metric can now have an optional note. In the metric form (tick type) there is an \"Ask what I did\" switch: when the metric is ticked, a \"What did you do?\" field appears under it (for example what you studied); the text is saved on Enter or when you leave the field and does not affect points or streaks. The new \"Study\" metric created at first sign-in is now a plain tick with a note instead of minutes. Existing metrics are unchanged; you can turn the note on by hand. Migration 058 is needed (the note columns); without it everything works as before and the field is simply hidden",
    ]},
    { version: "3.83", date: "2026-10-08 10:29", changes: [
        "Water: a new “saved” animation. Instead of a flat rectangle in a big glass there is now a glassy tumbler where live water rises with a drifting wave and bubbles, and a checkmark badge pops in at the corner. Three variants: Wave (calm, the default), Drops and Ripples. You can pick one and preview it right away in Settings (the gear in the header) → Water animation. With “Turn off animations” or the system “reduce motion” the finished picture is shown without movement",
    ]},
    { version: "3.82", date: "2026-10-08 10:05", changes: [
        "Shop: a new currency — “streak sparks”. Every streak metric you complete in a day earns +1 spark (up to 10 a day); sparks never expire and counting starts from zero. Shop wishes are now bought with sparks, and you can work out the price from rubles. Old items priced in coins are not gone — they are in the Shop “Archive”: set a price in sparks and the item returns to the shop. Your sparks balance is shown in the Dashboard profile next to coins. Customization is still bought with coins and achievements",
    ]},
    { version: "3.81", date: "2026-10-08 06:45", changes: [
        "Community: clicking a friend (or yourself) opens a summary, not just achievements. You can see: since when the person has been with us and for how many days, since when you have been friends, points for the week and in total, the perfect-day streak, how many goals are done, how many of the last 30 days were active, the favorite exercise, and below all unlocked achievements. If a person hid themselves from the community, only the name, avatar and dates are shown. REQUIRES migration 056 (without it the window works as before)."
    ]},
    { version: "3.80", date: "2026-10-08 06:12", changes: [
        "App install check page (/pwa-check): open it in a browser where the “Install” icon does not appear in the address bar and wait a few seconds — it checks the secure connection, manifest, icons, start page and service worker, waits for the browser’s answer and shows what exactly is in the way (for example, the app is already installed, the install prompt was dismissed, or a guest window is open). If the browser allows installing, an “Install the app” button appears. The result can be copied with one button and sent to us",
    ]},
    { version: "3.79", date: "2026-10-08 04:57", changes: [
        "Goals: a notice about an almost overdue goal. If a goal is due today and not done yet, from 7 pm (5 hours before the end of the day) a \"A goal is almost overdue\" banner appears when you open the Dashboard, with the goal names (up to three, the rest as \"and more\"), an \"Open goals\" link and a button to dismiss it for the day. \"Don't remind me\" turns the banner off, and you can turn it back on with the \"Remind me about goals due today\" checkbox on the Goals page. For now it is only an in-app banner, with no phone push notifications. No migration needed",
    ]},
    { version: "3.78", date: "2026-10-08 05:30", changes: [
        "Header hearts separated: \"Favorites\" (the round button with a heart that opens the quick links list) is now ONLY on the main page, while the \"add this page to favorites\" heart is on every other page and not on the main one (there used to be two on every page). The main page cannot be added to favorites - it is the entry to them.",
        "The weekly progress heptagon is redone: again a solid, neat outline with rounded corners like before, but it fills BY FACE - each of the 7 faces shows how complete its own day is (Mon to Sun). Today's face is lighter on the track, future days are an empty track, a day's bonus star is a thin gold line (not drawn on the small header badge). One look in the header, the Dashboard profile and the right drawer. No migration needed."
    ]},
    { version: "3.77", date: "2026-10-07 08:40", changes: [
        "Calendar: the Calendar tab now draws the same grid as History - a day is filled by its progress, the percentage sits at the bottom of the cell, a week column with its percentage is on the right, and month statistics (average, perfect days, days with data) are on top. Plans and goal deadlines stay: a day shows a plan badge (done/total, or a tick when everything is done) and the number of goals due; tapping a day still opens the plans form. You can still browse months ahead. The History tab is unchanged. No migration needed."
    ]},
    { version: "3.76", date: "2026-10-08 00:57", changes: [
        "“Customization” now has a visibility switch: three buttons above the showcase — “Owned”, “For achievements” and “For coins”. Turn them on and off as you like: for example, hide everything you already have and look only at what is still ahead, or keep just the items you buy with coins. Next to each button’s name is how many items and themes are in that group. Your choice is remembered on this device. The “unlocked/total” counters on the rarity groups do not change, so your progress stays honest"
    ]},
    { version: "3.75", date: "2026-10-08 00:48", changes: [
        "You can now change your weight right in the Profile block: there is a pencil next to the weight. Tap it, type today’s new value (a comma or a dot both work) and press Enter or ✓; Esc or ✕ cancels. Saving a second time on the same day simply replaces the value, so there are no duplicates. After saving, the chart, the water goal and workout calories are recalculated. If the “Weight” parameter exists but has no values yet, you can enter the first one in the same place"
    ]},
    { version: "3.74", date: "2026-10-07 14:12", changes: [
        "Customization: new “Summary card” item (250 points) — a block collapse style. A folded block shows a short summary line to the right of its title: “Points 4 / 9” for Daily metrics, “Done 2 of 5” for Plans, the number of shown Widgets, in Workouts “Exercises: N” for a category and the record for an exercise. Pick it in Customization instead of “Accordion” (one style at a time); unselect to return to the basic chevron. Blocks without a meaningful summary look as usual",
    ]},
    { version: "3.73", date: "2026-10-07 13:57", changes: [
        "Reward frames: ten new avatar frames are awarded for achievements. For the third step of each ladder: Ink (words), Neuron (learned), Target (goals), Gear (skills), Bookmark (books), Steel (workouts), Cup (challenges), Beacon (milestones). For the final step of challenges and milestones, “Unstoppable” and “On schedule”, two rare animated frames: Victory and Course. A frame unlocks by itself when you open Customization after earning the achievement; in Achievements the reward no longer says “coming soon”. The new frames also show in the side menu, in the Community and around the day-progress ring on the Dashboard. In the rarity groups they sit among the rare and epic ones",
    ]},
    { version: "3.72", date: "2026-10-07 13:37", changes: [
        "Shop: (1) the hint about how the shop works is renamed to \"The Rewards Stall\" and its text is rewritten to match the real mechanics: points for habits, workouts, goals and streaks, bonus coins for achievements; themes and avatar frames are sold separately, in Customization. (2) The \"My purchases\" list no longer shows items bought in Customization (for example the Aurora frame): the shop shows only shop purchases. The balance still counts every purchase, so your points do not change. No migration needed",
    ]},
    { version: "3.71", date: "2026-10-07 13:26", changes: [
        "Errors: when something fails in the first-sign-in questionnaire (saving the form, the profile, creating metrics) and when loading data for the header, a clear message is now shown instead of a technical line with the server address and table names. Migration hints stay as a separate line. This closes the item about technical errors for every page of the site. No migration needed",
    ]},
    { version: "3.70", date: "2026-10-07 13:16", changes: [
        "Errors: on the Community page a failure (leaderboard, feed, follow, friend request, linking and choosing categories) now shows a clear message (\"No connection to the server…\", \"No access…\", \"Could not save…\") instead of a technical line with the server address and database function names. The header, sign-in and sign-up are left. No migration needed",
    ]},
    { version: "3.69", date: "2026-10-07 00:20", changes: [
        "Workouts and daily metrics: an exercise can now be linked to a daily metric - sets are entered ONCE, in Workouts, and the metric value on the Dashboard fills in automatically (points, streaks and goals count as usual). The exercise card has a new link button \"Link to a daily metric\": pick an existing metric (type Sets or Number) or create a new one, and you can unlink it. Sets already entered in the metric today are moved into a workout entry - nothing is lost, past days stay as they were. The exercise card shows \"In daily metrics - today: N of goal\". On the Dashboard a linked metric is read-only with an \"Open Workouts\" link. REQUIRES migration 054 (without it everything works as before and the link button is hidden)."
    ]},
    { version: "3.68", date: "2026-10-07 12:51", changes: [
        "Metrics, create/edit form: only the essentials stay in view - name, icon, type, \"just record a value\", goal and unit (plus the options for the Choice type). Everything else moved into a collapsible \"More options\" block: goal direction, how values are entered, schedule, category, streak and its import, planned sets per day and variations for Sets. The block is collapsed by default; next to its title you see how many settings inside are changed, and when you edit a metric with non-default settings it opens by itself. Labels are shorter (long \"only for ...\" explanations are gone). Everything works as before - collapsed settings simply keep their defaults. No migration needed."
    ]},
    { version: "3.67", date: "2026-10-07 12:31", changes: [
        "Metrics, metric form: options for the Choice type and variations for the Sets type are now entered as a list instead of a single \"key:Label, key:Label\" line. Every option has its own Name field, up/down and remove buttons, drag by the handle and a \"+ Option\" button (press Enter in a row to add the next one right away). You no longer have to invent keys, and names may now contain commas and colons. The key of an already saved option does not change, so earlier entries stay in place. No migration needed."
    ]},
    { version: "3.66", date: "2026-10-07 09:14", changes: [
        "Best single set on the metric card: in “Daily metrics”, under a sets metric, there is now a “Best single set” line — the most reps in one set for each variation, all time (for example, “Diamond 10 · Classic 25”). If the metric has no variations, one number is shown. Hover a value to see the date of the record. The same record already appeared under the chart. You can hide the line with the same “Show records on metrics” switch"
    ]},
    { version: "3.65", date: "2026-10-07 09:02", changes: [
        "Plain error messages in the header and on the sign-in page: instead of technical text (server address, table names, “TypeError: Failed to fetch”, “(code 400)”) you now see a clear sentence, for example “No connection to the server. Check your internet and try again”. This covers the water window (saving the goal, height and the day’s value), the Settings window (saving the layout), sign-in and sign-up. Clear sign-in replies such as “Invalid login credentials” stay as they were. Community and onboarding will follow separately",
    ]},
    { version: "3.64", date: "2026-10-07 07:36", changes: [
        "Achievements: bonus coins are now awarded. The first two steps of each ladder (for example, “Ten learned” and “Twenty-five learned”) give 20 and 50 coins to your balance, once per badge. If you unlocked badges earlier, the coins for them are added the next time you open the Achievements page. The balance in the Dashboard, Shop and Customization already includes these coins; they do not affect the points counter or the leaderboard",
    ]},
    { version: "3.63", date: "2026-10-07 07:30", changes: [
        "Reward themes: six themes (Mint, Sepia, Solarized Light, Nord, Orchid, AMOLED) now unlock as a reward for an achievement: One-person band, A hundred words, Fifty goals, A hundred in the head, Own library, Athlete. Until you earn it, the theme shows a preview, a lock and a “Reward for …” hint on the Customization page, and is absent from the theme lists in the menu and settings. If you already use such a theme, it stays on. The other five themes are always open",
        "The Catppuccin Mocha theme is now called Orchid: its colours are lilac and pink-violet, so the old name was misleading. Your choice is kept",
    ]},
    { version: "3.62", date: "2026-10-07 07:01", changes: [
        "Tidy-up: the “Streak celebrations” and “Turn off all animations” switches are removed from the “Customize Dashboard” window — they stay in “Global settings”, where they belong (one setting, one place). The layout window now shows a short hint instead",
    ]},
    { version: "3.61", date: "2026-10-07 06:53", changes: [
        "Workouts: the “Accordion” from Customization now works here too. Open a category and the other categories, the muscle map and the progression trees fold up; open an exercise and the other exercises of the same category fold up while the category stays open. With the basic chevron nothing changes",
    ]},
    { version: "3.60", date: "2026-10-07 06:31", changes: [
        "Errors: on the Shop, Language learning, Skills, Workouts and Account pages a failed load, save or delete now shows a clear message (\"No connection to the server…\", \"No access…\", \"Could not save…\") instead of a technical line with the server address and table names. On Account the readable sign-in messages (for example, the new password matching the old one) stay as they were. The other pages (Community, header, sign-in, sign-up) come next. No migration needed",
    ]},
    { version: "3.59", date: "2026-10-07 06:15", changes: [
        "Errors: on the Calendar, History, Challenges, Milestones, Achievements and Customization pages a failed load, purchase or saving of a choice now shows a clear message (\"No connection to the server…\", \"No access…\", \"Could not load the data…\") instead of a technical line with the server address and table names. Details are still written to the browser console. The other pages (Community, Shop, Skills, Languages, Workouts, Account and others) come next. No migration needed",
    ]},
    { version: "3.58", date: "2026-10-07 05:50", changes: [
        "Challenges: when you mark a challenge as completed, a congratulation window opens: an animated trophy, the result (days done or amount collected) and the number of the completed challenge. When the number of completed challenges reaches 1, 5, 10 or 25, the window tells you about the unlocked achievement from the Challenges group, with a link to the Achievements page. If marking failed, an error message is shown and there is no window. With animations turned off or reduced motion the window is static. No migration needed",
    ]},
    { version: "3.57", date: "2026-10-06 21:55", changes: [
        "Header: the \"add this page to favorites\" heart is now on ALL pages of the side menu - it used to be missing on the main page, Achievements and Customization. These pages can now be added to favorites and opened from the favorites list. History (removed from the menu) is no longer among the favorites pages. No migration needed."
    ]},
    { version: "3.56", date: "2026-10-07 05:22", changes: [
        "Water: (1) the right-hand panel (on every page) now has an \"Undo last\" button in the water block - it shows up when there is something to undo (for example right after tapping \"+ 200\") and removes the last addition just like in the water window. (2) In the water window, every entry in the \"Entries for the day\" log has a cross - you can delete any entry, not only the last one: the day total goes down by its amount, and the remaining entries and the Undo button keep working in order. The total never goes below zero. No migration needed."
    ]},
    { version: "3.55", date: "2026-10-07 02:10", changes: [
        "Menu: the History item is removed from the side menu on every page - history now lives inside the Calendar section (the Calendar / History switch). The old /history/ link still leads there. The bottom block of the menu is now: Customization and Account. No migration needed."
    ]},
    { version: "3.54", date: "2026-10-07 04:32", changes: [
        "Bonus coins for achievements (groundwork): the balance in Profile, Shop and Customization can now include coin rewards — they are added to the balance and cover purchases, but are not part of \"points earned\" or the leaderboard. The points log shows a reward as a separate \"Achievement reward\" row. The rewards themselves will start being granted for badges in following versions; nothing changes yet. Migration 051 is required",
    ]},
    { version: "3.53", date: "2026-10-07 00:43", changes: [
        "Customization: new “Accordion” item (150 points) — a block collapse style. Open one block on the Dashboard and the others fold up on their own. The basic chevron stays free for everyone; you can go back to it with “Selected · unselect”. Customization now has a “Block collapse style” section with a preview picture. It works on the Dashboard for now, Workouts comes in the next update",
    ]},
    { version: "3.52", date: "2026-10-07 00:26", changes: [
        "Community: new “Achievements feed” — who unlocked which achievement recently. Everyone chooses which of their achievements appear in the feed (up to 5): profile window → “Show in the feed”. Tap a person in the feed, on the podium, in the list or among friends to open their profile with all unlocked achievements (if the profile is public). Community now also shows badges from every achievement ladder (goals, skills, books, milestones, words, perfect days and more) — some badges were missing there before",
    ]},
    { version: "3.51", date: "2026-10-07 00:20", changes: [
        "Dashboard, Plans block: once a save is confirmed (a plan item was added or removed, an item or goal was marked as done), a small \"Saved\" tick appears in the corner of the card for a second. If saving failed, there is no tick. With animations turned off or reduced motion, the tick just stays still. No migration needed",
    ]},
    { version: "3.50", date: "2026-10-07 00:14", changes: [
        "Dashboard: for animated frames (Flame, Rainbow, Inferno, Pulse, Royal) the day progress ring around the avatar is now animated too: flame flickers, rainbow shimmers through its colours, inferno blazes, pulse pulses, royal shifts between gold and violet. With reduced motion or all animations turned off the ring stays static. No migration needed",
    ]},
    { version: "3.49", date: "2026-10-07 00:06", changes: [
        "Avatar frame: (1) on the Dashboard, the day progress ring around the avatar is now drawn in the style of the selected frame: its colour, with a glow, and as a gradient for Aurora and Rainbow. Without a selected frame the ring stays as before. (2) Putting on or taking off a frame on the Customization page no longer needs a page refresh: the frame changes at once in the left menu, and on the Dashboard (including another open tab) the ring is recoloured at once. No migration needed",
    ]},
    { version: "3.48", date: "2026-10-06 20:40", changes: [
        "The Favorites button in the header is no longer an empty circle: the heart is visible again. The cause was the button's inner padding squeezing the icon to almost nothing; the padding is gone, the icon is larger (20 px) and the outline brighter (text color instead of muted). Fixed on all pages at once. No migration needed."
    ]},
    { version: "3.47", date: "2026-10-06 23:10", changes: [
        "Dashboard, Charts: you can now reorder charts in the settings window by dragging - grab a chart by its handle and move it up or down (finger or mouse), the others make room. The up/down buttons stay (handy with a keyboard and for an exact one-step move) and now look the same as in the block Layout; a disabled arrow at the end of the list is dimmed. A chart keeps its own goal when you move it. The order is saved with the Save button like the rest of the window."
    ]},
    { version: "3.46", date: "2026-10-06 22:30", changes: [
        "Sign-up: you can pick an avatar from 20 drawn animals (cat, fox, panda, owl, penguin and more - one style, two colours). If you signed in with Google you can keep your account photo or pick an animal; you can also skip it - you get a circle with your initials. The chosen animal shows everywhere your avatar is shown. No migration needed."
    ]},
    { version: "3.45", date: "2026-10-06 20:20", changes: [
        "Exercise cards now show an estimated calorie burn using the latest Profile weight and recorded duration, or estimated time from repetitions.",
    ]},
    { version: "3.44", date: "2026-10-06 19:40", changes: [
        "The muscle map has been redrawn in a more anatomical style using lightweight SVG contours while preserving muscle highlighting and selection.",
    ]},
    { version: "3.43", date: "2026-10-06 19:20", changes: [
        "The muscle map head now lights green when a study metric from the study category was completed within the last 4 days.",
    ]},
    { version: "3.42", date: "2026-10-06 18:45", changes: [
        "Calendar and History are now one section: /calendar/ has a Calendar / History switch, while the old /history/ address opens History in the same section. No migration.",
    ]},
    { version: "3.41", date: "2026-10-06 15:35", changes: [
        "Reward rarity: a fifth level, uncommon, was added (common, uncommon, rare, epic, legendary). In Achievements, a step reward now shows its rarity: a coloured stripe on top of the card and a label under the reward line, also in the New achievement window",
    ]},
    { version: "3.40", date: "2026-10-06 15:08", changes: [
        "Dashboard, sets: each parameter of a set - time, reps, variation - now has its own plate with a gap between them (they used to merge into one shared plate with no dividers); the set number and the delete button have no plate, and the plate border turns accent-colored while typing.",
        "Dashboard, windows and forms: ALL input fields and dropdowns now have a plate (background and border) - it used to exist only for text fields, so \"Goal value X\", \"Sets per day planned\", time, date, dropdowns and multi-line fields blended into the window background and did not look editable. No migration needed."
    ]},
    { version: "3.39", date: "2026-10-06 14:42", changes: [
        "Fixed: the \"streak of N days\" pop-up no longer comes back on every new device or browser. The site only remembered which congratulations were already shown on the device itself, and on the first launch on a new one it congratulated your best streak again. Now on a new device (or after clearing browser data) streaks you already reached are remembered silently, and a pop-up appears only for the next new threshold. In private mode there are no pop-ups at all, so they do not repeat on every visit. No migration needed."
    ]},
    { version: "3.38", date: "2026-10-06 14:28", changes: [
        "Goals: points for a goal are no longer typed in by hand - difficulty sets them: easy 5, medium 10, hard 15 (5 when difficulty is not set). The goal form on the Goals page and the New goal window on the home page have no Points field; under Difficulty you see how many points the goal will give. Goals you already created with other points are not recalculated: when you edit one, its points stay until you change the difficulty. No migration needed."
    ]},
    { version: "3.37", date: "2026-10-06 11:50", changes: [
        "Streaks: for an \"at most N times a week\" metric the streak is now counted from the week the metric was created (or its first entry), not from the account's first data. Before, a freshly added metric instantly showed \"12 weeks in a row\" because the weeks before it existed counted as \"limit not exceeded\". No migration needed."
    ]},
    { version: "3.36", date: "2026-10-06 10:39", changes: [
        "Customization: themes and avatar frames are now sorted by rarity, like in games: common, rare, epic, legendary. The harder an item is to get and the more striking it is, the rarer it is; each card has a coloured rarity stripe on top. Tap a group title to collapse it; collapsed groups are remembered. For frames the group title shows how many you have already unlocked (for example 1/3). All themes are still free for now",
    ]},
    { version: "3.35", date: "2026-10-06 10:26", changes: [
        "Header and side panel: dropdowns, checkboxes and number fields in the settings, progress and water windows now look like everywhere else on the site (theme-coloured dropdown arrow, accent-coloured check, no native spinner arrows on number fields). The header used to rely on the page's styles; the rules are now part of the header itself",
    ]},
    { version: "3.34", date: "2026-10-06 10:10", changes: [
        "Look and feel: date and time fields (birth date, history period, goal deadline, check-in date in milestones and workouts, set time and reminder time) now share one style on every page — a calm calendar/clock icon that lights up in the theme accent on hover. On dark themes the date picker popup and icon are now dark (they used to be light and hard to read), on light themes they stay light. The header (water) is not covered yet",
    ]},
    { version: "3.33", date: "2026-10-06 09:45", changes: [
        "Dashboard: a new \"Calendar\" widget. It shows the current month and marks the days that have a plan (●, an empty circle ○ when everything is done) and goal deadlines (◆). Use the arrows to browse months; the \"Open calendar\" link leads to the Calendar section. Turn it on with the \"Calendar\" checkbox in the dashboard settings window, in the widgets block, next to \"Learning languages\" and \"Skills\". No migration needed",
    ]},
    { version: "3.32", date: "2026-10-06 09:37", changes: [
        "Calendar: a goal's deadline now shows up in the calendar. The day cell with a deadline gets a target icon with the number of goals (paler when all of them are done), and the day window lists \"Goals due this day\" at the top (completed ones struck through). Goals are still edited in the Goals section. The calendar widget for the home page is waiting for your decision. No migration needed",
    ]},
    { version: "3.31", date: "2026-10-06 09:31", changes: [
        "Dashboard, Plans block: goals you marked as completed on that day but that were not in the plan no longer disappear from the home page. A \"Goals completed this day (not in the plan)\" list is shown under the plan. A goal already in the plan is not duplicated. No migration needed",
    ]},
    { version: "3.30", date: "2026-10-06 09:12", changes: [
        "Dashboard profile: the week is a per-day heptagon too - each of the 7 sides fills by how complete ITS OWN day is (Mon to Sun), like in the header: past days by their own date, future days dimmed, today thicker, a gold line for that day's bonus star, the overall percentage inside. Screen readers hear \"Mon 100 %, Tue 60 % ...\". The progress settings got a \"Week shape\" choice: per-day heptagon (default) or the old circle. The choice is shared with the header. No migration needed."
    ]},
    { version: "3.29", date: "2026-10-06 09:05", changes: [
        "Header: the week is now a heptagon - each of the 7 sides fills by how complete ITS OWN day is (Mon to Sun). Past days are counted by their own date, future days are dimmed, today is thicker, and a gold line shows that day's bonus star. The overall week percentage stays as the number inside. Same in the header badge, the left menu and the right drawer. Screen readers hear \"Mon 100 %, Tue 60 % ...\". The old look (square and arc) is kept: a \"Week shape\" switch in the progress settings (gear in the right drawer), heptagon by default. The Dashboard keeps this choice. No migration needed."
    ]},
    { version: "3.28", date: "2026-10-06 08:33", changes: [
        "Plans: a \"New goal\" button next to \"Add from goals\". It opens the same window as the Goals page: name, points, category (one of yours or a new one), number of stages, difficulty and deadline. The goal is created in Goals and goes straight into the plan of the open day; if a time is set next to \"Add\", it goes into the plan item. If the goal could not be saved, the window stays open with a clear message and nothing you typed is lost. No migration needed (the category list uses the table from 050 when it exists)."
    ]},
    { version: "3.27", date: "2026-10-06 10:25", changes: [
        "Dashboard: new metrics now appear right away. After you add, edit or delete a metric through the gear, the Daily metrics block, the Sets block and the charts re-read their list by themselves - no page refresh needed (before, a new metric showed up only after a reload). No migration needed."
    ]},
    { version: "3.26", date: "2026-10-06 08:55", changes: [
        "Plans: pressing \"Add\" with an empty plan field highlights the field with a red border, focuses it and gives it a short shake - like a required field left empty. The highlight goes away as soon as you start typing. With reduced motion in the system or animations turned off there is no shake, only the highlight. Enter in an empty field behaves the same. No migration needed."
    ]},
    { version: "3.25", date: "2026-10-06 02:38", changes: [
        "Goals and profile: once a save is confirmed, a small \"Saved\" tick appears in the corner and the border flashes softly (under a second). It shows on a goal card (complete, stage, edit), on a completed-goal row and in the profile block (photo, birthdate, body parameters). If saving failed, there is no tick. With animations turned off or reduced motion, the tick just stays still. No migration needed",
    ]},
    { version: "3.24", date: "2026-10-06 02:35", changes: [
        "Water: the \"saved\" animation (the glass filling up) is visible again. It was drawn inside the scrollable water window and, after pressing \"+200 / +1000\" further down, ended up outside the visible area; it now appears at the centre of the screen above the window and does not block taps. With animations switched off the glass shows already filled and the tick is visible",
    ]},
    { version: "3.23", date: "2026-10-06 02:17", changes: [
        "Goals: your list of categories is now remembered and no longer disappears when you delete or complete every goal with that category. A new category is added to the list when you save a goal. Needs migration 050 in Supabase (without it everything works as before: the list comes from your goals)",
    ]},
    { version: "3.22", date: "2026-10-06 02:12", changes: [
        "Dashboard: no more system browser dialogs. Deleting a metric or a body parameter now asks with a window in the site style. The name of a new metric category is typed in a field right in the metric form (if the category cannot be created, the metric is not saved and an error is shown instead of silently saving it without a category). \"Fix the total\" on a counter metric opens a field in the card itself: Enter saves, Esc closes",
    ]},
    { version: "3.21", date: "2026-10-05 15:50", changes: [
        "Dashboard: metric settings are now a gear icon to the right of the \"Daily metrics\" heading - tap it to add, edit or remove a metric. The separate \"Daily metrics\" button above the block is gone; the block drag handle sits next to the gear, like on the other blocks. No migration needed."
    ]},
    { version: "3.20", date: "2026-10-05 13:34", changes: [
        "Shop wishes: photo upload is now more reliable. Before sending, the photo is downscaled and compressed (a multi-megabyte phone photo becomes roughly 200–500 KB), the upload is retried once automatically if the connection drops, and if it still fails a clear sentence — \"No connection to the server, check your internet\" — is shown instead of \"Failed to fetch\" with the server address. \"Uploading…\" is shown while it works",
    ]},
    { version: "3.19", date: "2026-10-05 13:29", changes: [
        "Clear error messages on the Dashboard: when something fails (deleting a metric, saving, loading, uploading a photo), a short plain sentence is shown instead of technical text with the server address — \"No connection to the server, check your internet\", \"This can't be changed while it is in use\", \"Could not delete, please try again\", and so on. Details stay in the developer console only",
    ]},
    { version: "3.18", date: "2026-10-05 12:13", changes: [
        "Water: in the water window (on the Dashboard and in the header) the large \"Undo last add\" button is now a compact arrow icon, and the wide \"Save height\" button is a small tick icon next to the field. The names stay in the hover tooltips and for screen readers; the buttons work as before",
    ]},
    { version: "3.17", date: "2026-10-05 12:06", changes: [
        "Calendar: a plan typed into the field and saved with \"Save\" is now added — it used to land in the day only after pressing \"+\". An empty field still adds nothing and \"Cancel\" saves nothing",
    ]},
    { version: "3.16", date: "2026-10-05 12:10", changes: [
        "Achievements: every badge now shows what the step gives. The first two steps of a ladder give coins (20 and 50), the third an avatar frame of its section, the fourth a theme (words - Sepia and Nord, books - Catppuccin Mocha, workouts - AMOLED, goals - Solarized Light, skills - Mint; challenges and milestones get a rare animated frame for now). The line shows on the badge card and in the congratulation window. While rewards are not given out yet, the label is honest - Reward (coming soon); handing out coins, frames and locked themes is connected in the next steps. The original themes and High contrast will never be locked behind achievements",
    ]},
    { version: "3.15", date: "2026-10-05 07:20", changes: [
        "Achievements now encourage using every section: each has a four-step ladder. Goals - 1 / 10 / 25 / 50, skills - 1 / 5 / 10 / 25, books - 1 / 5 / 10 / 25, challenges - 1 / 5 / 10 / 25, workouts - 10 / 50 / 100 / 250 days (plus the first workout), the new Milestones - 1 / 5 / 10 / 25 marked, Languages - as before. 47 badges in total with the streaks, perfect days and points. Badges you already unlocked stay as they were. Rewards for the steps (coins, items, and a theme for the hardest step) come next",
    ]},
    { version: "3.14", date: "2026-10-05 11:45", changes: [
        "Dashboard, Sets block: once your sets are saved, the metric card briefly flashes a soft green border and a small check mark appears next to the collapse button and fades, just like in Daily metrics. If saving fails there is no check mark. With reduced motion or animations switched off nothing moves",
    ]},
    { version: "3.13", date: "2026-10-05 11:29", changes: [
        "Dashboard, Daily metrics: once a value is saved, its plate briefly flashes a soft green border and a small check mark appears in the corner and fades, so you can tell it went through. Before, only number fields gave a signal (the border turned green); now checkboxes and choice metrics do too. If saving fails there is no check mark. With reduced motion or animations switched off nothing moves, you just get a static green border",
    ]},
    { version: "3.12", date: "2026-10-05 11:21", changes: [
        "Charts of set metrics: variation colours now follow the colour theme. Each of the 11 themes has its own palette of eight colours: the first variation is a shade of the theme accent, the rest are picked to stay apart from each other (also for colour-blind people) and to read well on that theme's card; no variation and other are neutral greys. Switching the theme recolours the charts and the legend at once, while a given variation keeps its colour across days",
    ]},
    { version: "3.11", date: "2026-10-05 10:56", changes: [
        "Goals: you no longer have to type a category each time — the goal form has a list of your categories (most used first), a \"No category\" item and \"+ New category…\". The list is built from your goals, including completed ones, so everything you typed before is already in it",
    ]},
    { version: "3.10", date: "2026-10-05 10:48", changes: [
        "Profile: the number of earned coins now changes right away when you tick a metric, add water or do a set — no page refresh needed. A second or two later it is checked against the database and corrected if needed",
    ]},
    { version: "3.09", date: "2026-10-05 10:36", changes: [
        "Dashboard: a \"Perfect day!\" window. When today becomes a perfect day (everything you had to do today is done), a congratulation window appears once a day. It shows how many perfect days you have in total, gives you the achievement if you do not have it yet, and if the next achievement is still being collected it shows the progress: how many perfect days are left and a bar. Achievements has a new \"Perfect days\" group: \"Perfect start\" (1 day), \"Perfect ten\" (10), \"Perfect month\" (30) and \"Perfect hundred\" (100); all perfect days count, not only in a row. The window is turned off the same way as the streak congratulations (the \"Don't show these again\" button) and does not get in their way: if you also get a streak congratulation that day, it comes first, then this one",
    ]},
    { version: "3.08", date: "2026-10-05 01:55", changes: [
        "Sets: the hint in the variation field is shortened to \"Variation\" (it used to read \"variation (optional) - e.g. hand position\" and did not fit the field). Russian version: \"Особенность\". No migration needed."
    ]},
    { version: "3.07", date: "2026-10-05 01:30", changes: [
        "Achievements: categories are now collapsed by default - you see the names and the \"earned / total\" counters, the overall counter on top stays. Tap a category to expand it, tap again to collapse. What you expand is not remembered: next time it is collapsed again. No migration needed."
    ]},
    { version: "3.06", date: "2026-10-05 00:40", changes: [
        "Community: if you have no name set (you registered earlier), a soft \"Add your name\" card appears at the top - friends see the name instead of \"User ...\". The name is also required in the \"Public profile\" window: an empty one is no longer saved (up to 40 characters, extra spaces are trimmed). No migration needed."
    ]},
    { version: "3.05", date: "2026-10-05 07:22", changes: [
        "Goals: the Save button in the goal form no longer stays silent. If the name is empty, a hint appears under the field; if saving fails (no internet, server error), a clear message stays in the form and what you typed is kept; tapping again while saving does not create a second goal. Technical error details (server address, table names) are no longer shown to the user",
    ]},
    { version: "3.04", date: "2026-10-05 05:01", changes: [
        "Community, Friends: fixed the \"Not following anyone yet\" line that appeared even though you have follows and friends. If a friend's profile could not be read, they now still get a card — with the name and avatar from the leaderboard, or \"No name\" with a remove button if those are missing. The line only shows when there really are no follows and friends",
    ]},
    { version: "3.03", date: "2026-10-05 05:00", changes: [
        "Achievements now encourage using Languages: two new four-step ladders - Words added (10, 25, 50, 100) and Words learned (10, 25, 50, 100). Words are counted across all languages together, learned by the mark on the word. Every step has a progress bar and a congratulation window when it unlocks. This is the first slice: rewards for the steps (coins for Customization, items, and a theme for the hardest) and the same ladders for the other sections come next, once the owner confirms which rewards go to which steps",
    ]},
    { version: "3.02", date: "2026-10-05 03:51", changes: [
        "Themes moved into Customization: all 11 themes are there with a mini-chart sample in their colors, an Apply button and a favorite heart. Mark up to 4 favorites: only they stay in the theme dropdown of the side menu (the previous four by default; the current theme is always listed). The Customization section itself now sits at the very bottom of the side menu, below the divider, after History",
    ]},
    { version: "3.01", date: "2026-10-05 02:08", changes: [
        "Sets charts: the legend under a chart now shows a \"record\" next to each set type (for example \"wide grip\") — the most reps you have done in a single set of that type, all time. The totals for the period and for today stay. The record hides with the same \"Show records on charts\" switch",
    ]},
    { version: "3.00", date: "2026-10-05 02:01", changes: [
        "Records: there are now two separate switches. \"Show records on charts\" is in the \"Configure charts\" window and \"Show records on metrics\" is in the \"Manage metrics\" window. The shared checkbox in \"Customize dashboard\" is gone. If you had turned records off before, they stay off in both places until you switch the one you want back on",
    ]},
    { version: "2.99", date: "2026-10-04 21:10", changes: [
        "Customization: three animated avatar frames as achievement rewards (not for sale). Inferno - for 100 Days (100 perfect days in a row), Pulse - for Mega productivity (a week above 100%), Royal - for A thousand (1000 points). They unlock by themselves once the achievement is earned and move on your avatar in the side menu and in Community; with reduced motion or animations off they stay static. No migration needed."
    ]},
    { version: "2.98", date: "2026-10-04 20:40", changes: [
        "Customization: two animated avatar frames - Flame (the fire pulses) and Rainbow (the colour smoothly cycles), 250 points each. The frame moves on your avatar in the side menu and in Community for everyone who sees it; with reduced motion in the system or animations turned off in settings it stays a calm static look. Also the Mega productivity achievement is added to Community badges. No migration needed."
    ]},
    { version: "2.97", date: "2026-10-04 19:05", changes: [
        "Dashboard, Daily metrics: the \"Save day\" button and the day score are moved to the very bottom of the block — after the last metric (after \"Sets\") instead of the middle. It is now clear that it is the final step",
    ]},
    { version: "2.96", date: "2026-10-04 18:57", changes: [
        "Achievements: a new achievement \"Mega productivity\" (group \"Weeks\") — finish a week above 100%. Finished weeks (Mon–Sun) count, by the same rules as the week ring: every item of the week done plus a bonus from the starred (⭐) plan items on top. The current week does not count — the achievement unlocks once the week is over. If progress display is switched off in settings, weeks are not counted",
    ]},
    { version: "2.95", date: "2026-10-04 18:53", changes: [
        "Goals: if you marked a goal as completed by accident, you can now undo it — the tick on every goal in the \"Completed goals\" list is now an \"Undo completion\" button. A simple goal goes straight back to the active ones; a multi-stage goal steps back by one stage",
    ]},
    { version: "2.94", date: "2026-10-04 18:55", changes: [
        "The chart period picker and the date picker now use the theme accent colour: the frames of the 7D / 30D / 90D / 1Y / All segment, the Week / Month / Custom period chips and the arrow pill are one colour instead of black; the selected chip differs by a fill and text colour. The same goes for the date switcher in Plans and Daily metrics (the date pill is shared). If a different frame was the black one, send a screenshot and we will adjust it precisely",
    ]},
    { version: "2.93", date: "2026-10-04 18:40", changes: [
        "Checkbox ticks are readable on every theme: on light accents (Light, Monet, Nord, Mocha, AMOLED, High contrast) the tick is now dark - white was barely visible on them. A test now checks this for future themes: if a new theme has a light accent and no dark tick, it will say so. Achievements: total points now include the fractional shares for sets (as in the Shop and on the Dashboard), so the First hundred, Five hundred and The thousand badges unlock at the same points number you see in the header",
    ]},
    { version: "2.92", date: "2026-10-04 18:10", changes: [
        "New color themes: there are now 11. Besides Dark, Monet, Light and Pink you can pick Mint (light green), Sepia (warm paper), Solarized Light, Nord, Catppuccin Mocha, AMOLED (pure black, saves battery on OLED screens) and High contrast (easier to read). Choose in the theme list in the side panel on any page. Colors were checked for text, accent and water contrast; the flame, water and the golden glass follow the selected theme",
    ]},
    { version: "2.91", date: "2026-10-04 17:52", changes: [
        "Dashboard: the \"Weekend check-in\" banner is now clickable — a click opens the weekly summary (done / not done by metric). The \"Do something from your goals\" link still goes to Goals, and the cross closes the banner",
    ]},
    { version: "2.90", date: "2026-10-04 17:44", changes: [
        "Workouts, muscle map: below the map there is a new list, \"When each muscle was last worked\" — every group shows \"today\", \"yesterday\" or \"N d ago\" with the date, or \"not yet\". Muscles you have not trained for the longest are at the top. The card of a selected muscle says the same: \"Last worked: yesterday (29.09.2026)\"",
    ]},
    { version: "2.89", date: "2026-10-04 17:41", changes: [
        "Goals: the section is now simply called \"Goals\" and the button says \"Add\". The short site tour uses the same word",
        "Charts: the \"shared period\" is now called \"Period for all charts\", and the \"Configure charts\" window has a hint under the period picker that any chart can have its own period. In a single chart's period window the button now reads \"Same as all charts\"",
    ]},
    { version: "2.88", date: "2026-10-04 17:30", changes: [
        "Water: \"+ Custom\" no longer opens the browser's system dialog. The field for your own amount appears right in the water window, on the Dashboard and in the header of any page: type the millilitres and press \"Add\" (or Enter), Esc closes the field. If the number does not fit (below 1 or above 20000), a hint appears under the field and nothing is saved",
    ]},
    { version: "2.87", date: "2026-10-04 17:18", changes: [
        "Fixed: in Workouts, Languages and History, when saving or loading fails, the real error text is now shown instead of the unhelpful \"[object Object]\", for example \"new row violates row-level security policy\". It is easier to tell what went wrong and to report it",
    ]},
    { version: "2.86", date: "2026-10-04 05:05", changes: [
        "A profile name is now required. The first onboarding step has a new \"What is your name\" field (you cannot continue or press Skip without it): friends see the name in Community instead of \"User ...\". If you signed in with Google, the name is filled in from the account (you can change it) and the avatar is taken from there too if you have none. For people who registered earlier without a name, signing in with Google fills in the name and avatar once; your own name and avatar are never overwritten. App-only change, no migration needed."
    ]},
    { version: "2.85", date: "2026-10-04 04:20", changes: [
        "Community: avatar frames of other people. A frame bought in Customization is now seen on the podium, in the leaderboard list, on friend cards and in the Today block - for people visible on the leaderboard. A frame shows only if the item is really unlocked. Needs migration 049; without it other people's frames are not shown and everything else works."
    ]},
    { version: "2.84", date: "2026-10-04 03:55", changes: [
        "New Customization section (first slice, at /customization/, a menu item on every page after Achievements): avatar frames. For points - Neon (100) and Aurora (150): bought from your balance, the price is deducted like a shop purchase; for achievements - the Golden frame as a reward for 30 perfect days in a row. Bought frames can be worn and taken off; the frame shows on your avatar in the side menu and in the Community header. Needs migration 048; without it the page opens as a showcase with a hint and no purchases."
    ]},
    { version: "2.83", date: "2026-10-04 16:23", changes: [
        "Fractional points for sets: for a sets metric with \"Planned sets per day\" every set now earns a share of a point (with a plan of 4: 1 set = 0.3, 2 = 0.5, 3 = 0.8), and the whole point comes once the metric is fully done. It works in the balance, the points log, the chart, the floating \"+0.3\", the Shop and (after migration 045) in the leaderboard and category points. The rule only applies to plans saved from this version on; past days and points already earned are not recalculated. Other metrics still use whole points",
    ]},
    { version: "2.82", date: "2026-10-04 12:38", changes: [
        "Dashboard: records. Under the title of every metric chart and the \"points per day\" chart, and on number metrics and sets metrics in the Daily metrics, there is now a \"Record: best value · date\" line — the highest value for a single day of all time (for sets, the total reps). A record updates the moment you beat it. Body parameters (weight, waist and so on) have no record — it is unclear which value counts as the best",
        "Records are on by default; switch them off with the \"Show records\" checkbox in the \"Customize Dashboard\" window (applies at once)",
    ]},
    { version: "2.81", date: "2026-10-04 12:20", changes: [
        "Look audit, third slice: checkboxes (the ticks in forms and settings) on every page now match the Dashboard instead of the native white square - dark background and a border in the text color, the checked one is filled with the theme color and a tick (a dark tick on the Monet theme so it reads on the light accent), a keyboard-focused one gets an outline, a disabled one is dimmed. Look only; behavior and sizes are unchanged",
    ]},
    { version: "2.80", date: "2026-10-04 12:10", changes: [
        "Look audit, second slice. (1) Drop-down lists (language and theme in the menu, categories, exercise variations, periods and others) now have one neat arrow in the theme colors instead of the old system one, on 15 pages; the colors, borders and sizes of the lists stay as they were. (2) Deleting an exercise or an entry in Workouts now asks for confirmation with the same site-styled window instead of the browser system box. System boxes remain only when typing a custom water amount - next slice",
    ]},
    { version: "2.79", date: "2026-10-04 05:40", changes: [
        "Look audit, first slice. (1) Number fields (sets, weight, goals, norms and so on) no longer show the old up/down arrows - you can still type, use the keyboard arrows and the mouse wheel; on 15 pages. (2) Delete questions no longer look like the browser system box: it is now a neat window in the theme colors with Cancel and Delete buttons, Esc or a tap on the backdrop cancels, and focus starts on Cancel so a stray Enter deletes nothing. Done on Goals, Skills, Milestones, English, Shop and Challenges (which also gets an in-page save-error message instead of the system alert; abandoning a challenge is labelled Abandon). Deleting in Workouts and typing a custom water amount still work the old way - next slice",
    ]},
    { version: "2.78", date: "2026-10-04 11:31", changes: [
        "The loading flame now stays until the page has fully loaded: before, it vanished as soon as the first frame appeared and blocks popped in one by one. On every page the splash now stays until the page is mounted, no requests are pending and half a second of quiet has passed (never longer than 8 seconds if something hangs). It fades out smoothly, or just disappears when animations are off",
    ]},
    { version: "2.77", date: "2026-10-04 11:02", changes: [
        "While a pop-up window is open, the left and right side menus no longer open, neither by swipe nor by button — before, a menu could be pulled out over the window. An already open menu closes as usual",
    ]},
    { version: "2.76", date: "2026-10-04 10:39", changes: [
        "Charts of set metrics: the legend under a chart now shows two numbers for each set variation — reps over the shown period and reps today (60 · today 20). If you did no sets today, the variation shows today 0",
    ]},
    { version: "2.75", date: "2026-10-04 10:34", changes: [
        "Dashboard, Plans: if you go back to a past day and tick a goal as done, its completion date is that day, not today. Today works as before, and unfinished items from earlier days are still carried over with the carry-over button",
    ]},
    { version: "2.74", date: "2026-10-04 10:13", changes: [
        "The \"drink water\" reminder no longer shows up sooner than 3 hours after you last added water (the time comes from the water log in your account, or from entries on this device if there is none). The old rules stay: at most once every 3 hours, not at night, not once the goal is reached",
    ]},
    { version: "2.73", date: "2026-10-04 10:08", changes: [
        "Workouts: sets can be added right from the entries table without opening any window. Once today's entry has a first set, a \"+ set\" button appears: the new set copies the values of the previous one (for exercises with a left and a right side the whole pair is copied) and gets the current time. Next to it a \"− set\" button removes the last set when there is more than one. The first set is still entered in the entry window",
    ]},
    { version: "2.72", date: "2026-10-04 09:59", changes: [
        "Workouts: typical exercises and their variations are picked from a list. For a new exercise the form lets you choose a typical one (push-ups, pull-ups, squats, lunges, plank, crunches, bench press, deadlift and more), and a list of variations appears below: for push-ups, for example, diamond, wide, standard, archer, clap. The variation is added to the name. If the one you need is missing, type your own word into the name; changing the variation does not erase anything else you wrote",
    ]},
    { version: "2.71", date: "2026-10-04 09:52", changes: [
        "Dashboard: a Learning languages widget in the Widgets block on the main page. Turn it on with a tick box in the \"Customize dashboard\" window, where you also pick a language or \"All languages\". The main page always keeps the first 5 words you have not learned yet in front of you, and the list scrolls inside the widget. Tap a word to see its translation and example. \"Know it\" moves the word down the queue (on this device); \"Learned\" marks it learned in the Languages section",
    ]},
    { version: "2.70", date: "2026-10-04 03:10", changes: [
        "Community: achievement badges next to names \u2014 in the profile header (up to 5), on the podium, in the leaderboard list and on friend cards (the 2\u20133 most valuable plus \"+N\"). You see your own badges and those of people visible on the leaderboard (needs migration 047; without it there are simply no badges and everything else works). Phone layout fixed: the profile button is compact, \"Accept\" and \"Decline\" on a friend request fit on the line, cards wrap their buttons on narrow screens."
    ]},
    { version: "2.69", date: "2026-10-04 02:58", changes: [
        "Water logged from the header window (on any page except the Dashboard) now shows the \"+1 / \u22121\" coin animation at the tap point when the water norm is reached or taken back. On the Dashboard it is not doubled: there is still a single layer."
    ]},
    { version: "2.68", date: "2026-10-04 04:41", changes: [
        "Dashboard, Charts block: the \"Configure charts\" button and the period picker of the first chart now share one row — settings on the left, period on the right (each used to take its own row). While there are no charts, the settings button sits alone on the left. The other charts keep their period on the right",
    ]},
    { version: "2.67", date: "2026-10-04 04:38", changes: [
        "History: swiping across the month and the day grid no longer pulls out the side panels — as in the Calendar, both the left menu and the right panel are protected (the right panel used to slide out anyway). Changing the month by swiping the grid works as before",
    ]},
    { version: "2.66", date: "2026-10-04 04:35", changes: [
        "Login page: the sign-in (and sign-up) button now looks like a button — filled with the theme colour, highlighted on hover and dimmed while signing in. The login/sign-up tabs, language picker, password reveal and the Google button now show a hand cursor on desktop",
    ]},
    { version: "2.65", date: "2026-10-04 04:33", changes: [
        "The \"Day done\" label is now \"Day progress\" — on the day ring in the header and right panel, in the Dashboard tooltip and in the title of the day summary window",
    ]},
    { version: "2.64", date: "2026-10-04 04:25", changes: [
        "Workouts: progressive programs (\"Push-ups: 6 weeks\", \"Pull-ups: 6 weeks\") now have a \"Start program\" button — it adds the exercises and starts the program from today. The page shows an active program card: \"Week N of M\" with this week's load (worked out from the start date), the list of weeks with a \"completed\" mark, a progress bar and an end-program action (two steps, no system dialog). A new program replaces the current one — the templates window warns about it",
        "The active program is saved in your profile and follows you to another device; a program ended on one device does not come back on another. Syncing needs migration 040 (the owner applies it in the Supabase SQL Editor); until then the program works on this device only",
    ]},
    { version: "2.63", date: "2026-10-04 04:30", changes: [
        "Shop: the idea is now explained. On the first visit a card called The Earned Shop appears above the items - you do not spend money here, you spend what you have done: points are earned by habits, workouts, goals and streaks, and the shop lets you have things you want but feel you shouldn't, guilt-free. After Got it, a short line with an info icon stays under the heading and opens the same text. Remembered on the device",
    ]},
    { version: "2.62", date: "2026-10-04 04:20", changes: [
        "Achievements: a congratulation window now appears when a new badge unlocks - a large badge, its name, what it was given for and a warm line by topic (streaks, points, workouts, goals, books). If several unlock at once they are paged with the Next button (1 of 3). The window closes with the button, a tap on the backdrop or Esc; the animation is turned off by the global switch and by the system reduce-motion setting. Achievements already met before the section appeared unlock silently without the window. The window is shown when you open the Achievements page",
    ]},
    { version: "2.61", date: "2026-10-04 04:05", changes: [
        "Achievements now appear in the side menu of every page (after Shop): the section opens with one tap instead of only by the /achievements/ address. The badges table has been applied by the owner, so unlocked badges are saved in the account",
    ]},
    { version: "2.60", date: "2026-10-04 03:46", changes: [
        "Dashboard: the Plans block now has a day switcher with a Today chip, like Daily metrics. You can look at and edit what was planned yesterday and earlier. The date is shared with Daily metrics: flip it in one block and both change. Plan reminders never fire for past days, and carrying over unfinished items is only offered on today",
    ]},
    { version: "2.59", date: "2026-10-04 03:39", changes: [
        "Dashboard: What you got done today is now collapsed by default and sits at the very bottom of the Daily metrics block (after Sets). The title shows how many items the selected day has; tap it to expand. Your expanded/collapsed choice is remembered. Items are still saved right when you add them",
    ]},
    { version: "2.58", date: "2026-10-04 03:34", changes: [
        "The flame in the top-left corner is now alive on every page, not just the Dashboard: the same flame tongues, coloured by the accent of the selected theme, and it stops with reduced motion or the global animations switch. The sign-in window also shows a living flame in the theme colour above the title",
    ]},
    { version: "2.57", date: "2026-10-04 03:18", changes: [
        "Shop: two views to choose from. Showcase has a pinned balance with totals, filter chips (All / Can buy / Saving up / My purchases) with counts and a grid of cards with picture, price, progress and a button. List with piggy bank shows the balance with a progress bar toward the nearest goal (Saving for: ...), sections Can buy now and Saving up, and a collapsed My purchases. The view switch sits above the balance and your choice is remembered on this device. Buying, editing and deleting work in both views as before",
    ]},
    { version: "2.56", date: "2026-10-04 03:11", changes: [
        "Water: once you reach 100% of your goal or more, the glass in the site header (on every page) and the glass on the Dashboard page turn gold: a golden outline, a soft glow and a shine passing over the water. If you turned animations off or your system asks for reduced motion, only the golden outline stays",
    ]},
    { version: "2.55", date: "2026-10-04 03:04", changes: [
        "Sets in Daily metrics: fixed the on-and-off variation hints (e.g. \"wide grip\"). When the field already holds a variation, tapping it now shows the whole list of saved variations instead of just the selected one, and the list still filters as you type. A quick second tap into the field no longer closes the list that just opened",
    ]},
    { version: "2.54", date: "2026-10-04 02:51", changes: [
        "Dashboard: a Widgets block on the main page. The \"Customize dashboard\" window has a new \"Widgets on the main page\" section with tick boxes. The Skills widget: tick the skills you want and each one gets a progress bar and a step button on the main page, like in the Skills section; at 100% the skill is mastered and the points arrive with the +N animation. The Saving for an item widget: pick a shop item and the main page shows a points-to-price bar, how many points are still missing and a link to the shop. With no widget picked the block does not appear at all; it can be reordered like the other blocks",
    ]},
    { version: "2.53", date: "2026-10-04 02:33", changes: [
        "Community: friends and follows are now cards (avatar, name, streak and points for the selected period, action buttons on the right); friend requests use the same look. Data comes from the leaderboard, no SQL needed; people hidden from the leaderboard show no points."
    ]},
    { version: "2.52", date: "2026-10-04 02:28", changes: [
        "Community redesigned: your place, points and streak on top, a leaderboard with a top-3 podium and a list from 4th place, initials avatars as fallback. A \"Week / Month / All time\" period switch (needs migration 046; without it only \"All time\" is shown and everything works as before). The \"Today\" block moved up, friends and search moved down, activity comparison unchanged. Period points count only daily points; goals, skills and books are part of \"All time\"."
    ]},
    { version: "2.51", date: "2026-10-04 02:15", changes: [
        "Planned sets per day: server-side streaks, points and the leaderboard now judge \"done\" by the same rule as the pages (migration 044), so streaks, category points and the balance agree everywhere. Each day is judged by the rule in force that day: past days and points already earned do not change. Once migrations 041 and 044 are applied, the \"Planned sets per day\" field in the sets metric form can be filled in. Without the migrations everything works as before",
    ]},
    { version: "2.50", date: "2026-10-04 02:07", changes: [
        "Planned sets per day: the \"N sets\" rule now applies not only on the Dashboard but also in the header, History, Shop and in the profile balance and points log, so rings, points and History agree. Each day is judged by the rule that was in force that day: past days and points already earned are not recalculated. The metric form field still appears once migration 041 is applied; server-side streaks and points come next",
    ]},
    { version: "2.49", date: "2026-10-03 21:02", changes: [
        "Water: the goal is now a DRINKING goal — water from food (soup, fruit, vegetables) is not included; people get about 20% of their daily water with food and that share is taken off. The automatic goal uses one formula: with height — body surface area × 1000 ml/m² (was 1200), without height — weight × 26 ml (was 30), without weight — 1800 ml (was 2000). For example 70 kg and 175 cm: was 2210, now 1840 ml. A goal you set by hand does not change",
        "The «i» help next to the daily water goal (the water window on the Dashboard and in the header) is now an inline plate under the label instead of a system browser dialog: it shows the calculation, always explains that water from food does not count, and a second click hides it",
        "Points and streaks in the database need migration 043 (the owner applies it in the Supabase SQL Editor): until then the site uses the new goal and the database the old one, so rings and points may briefly disagree",
    ]},
    { version: "2.48", date: "2026-10-03 20:31", changes: [
        "New Achievements section (first slice, at /achievements/): 19 starter badges - first steps (tick, weight, goal, skill, book, workout), perfect-days streaks of 5/10/30/100, total points 100/500/1000, 10 and 50 workout days, 1 and 5 completed challenges, 10 goals, 5 books. Unlocked ones are colored with a date, locked ones are dimmed with the condition and a progress bar. An unlocked badge stays unlocked even if the number later drops; achievements already met before the section appeared unlock without a date. Until the owner applies migration 039, unlocked badges are kept on the device - nothing breaks. The side-menu entry, the congratulation window and reward items from Customization come in the next steps",
    ]},
    { version: "2.47", date: "2026-10-03 20:12", changes: [
        "Challenges: daily values can now come from your workouts. The \"Source of values\" field in the challenge form has a new \"Workout exercises\" group: pick an exercise and every day without a manual entry takes the sum of reps over all sets of that exercise (several entries on one day add up). A manual entry for a day always wins, and days before the challenge start are not touched. Cards show a \"from workouts\" badge. Needs migration 042; until the owner applies it the exercise choice stays hidden and everything works as before",
    ]},
    { version: "2.46", date: "2026-10-03 20:01", changes: [
        "Workouts, \"Exercise progressions\": a new \"Plank (hold time)\" chain: knee, regular, side and with a leg lift. A step is done when you hold for the target number of seconds in a single set (30, 60, 45 and 30). Log seconds the same way as before, in the set field where other exercises take reps. The goal and best set now read \"sec\" instead of \"reps\"",
    ]},
    { version: "2.45", date: "2026-10-03 19:54", changes: [
        "Right panel and header windows: emoji (drop, gear, dumbbell, bonus star, Undo, pencil) are replaced by the same clean icons used across the site, in the theme colour. Hover tips on the glass and rings no longer contain emoji, only the numbers",
    ]},
    { version: "2.44", date: "2026-10-03 19:32", changes: [
        "Dashboard: blocks can now be dragged right on the main page, like on a phone. Every block heading (Profile, Daily metrics, Charts) has a three-bar handle: grab it and pull up or down. While you drag, compact block cards appear over the page: yours follows your finger and the others make room; let go and the order is saved at once. From the keyboard, the up and down arrows on the handle move a block. The separate \"Reorder blocks\" mode is gone; the dashboard settings window still lets you hide and show blocks",
    ]},
    { version: "2.43", date: "2026-10-03 19:24", changes: [
        "Sets metrics: new \"Planned sets per day\" parameter (first slice, Dashboard only). When it is set, the metric counts as done once at least that many sets are logged (and the total goal is reached, if one is set). The rule applies from the day the parameter is set or changed; past days are not recalculated, so the balance and streaks do not jump. The field appears in the metric form after migration 041 is applied in Supabase; without it everything works as before. Other pages, points per set and server-side streaks come in the next steps",
    ]},
    { version: "2.42", date: "2026-10-03 19:17", changes: [
        "Water: fixed adding water with the \"+200\" / \"+500\" buttons from the right panel and the water window. Before, the number and the animation changed only after the server replied, and with several quick taps the writes overwrote each other and the log got a \"pile of taps\". Now the value grows right at the tap, all taps are written in order and add up exactly; if a write fails, the addition is rolled back. Undo and total edits join the same queue",
    ]},
    { version: "2.41", date: "2026-10-03 10:27", changes: [
        "Calendar: swiping over the month grid and the month selector row no longer pulls out the side panels (the left menu and the right panel). Gestures at the very edge of the page, outside the calendar, work as before",
    ]},
    { version: "2.40", date: "2026-10-03 10:24", changes: [
        "Dashboard: in the \"Install the app\" banner the title and the explanation no longer run together on one line — they are now two separate blocks, with the explanation under the title (in both Russian and English)",
    ]},
    { version: "2.39", date: "2026-10-03 12:57", changes: [
        "Emoji → icons: the icons of challenge templates (catalog, cards and list), suggested skills and onboarding hints are now drawn with the single icon set instead of colourful emoji. Close-in-meaning icons were picked for Cold shower, No sugar, Learn words, Touch typing, Bridge, Whistling, Splits, Juggling, Handstand and breathing. Nothing you already saved changes",
    ]},
    { version: "2.38", date: "2026-10-03 12:45", changes: [
        "Workouts: the muscle groups you mark on an exercise now sync between devices. Mark them on your phone and the exercise is already on the muscle map on your computer; resetting on one device applies everywhere. Links marked earlier on this device are uploaded once automatically. Works after the database update; until then everything stays as before — on one device",
    ]},
    { version: "2.37", date: "2026-10-03 12:33", changes: [
        "Dashboard: in the \"Daily metrics\" block every parameter (number, checkbox, choice of options) now sits in its own mini plate with a thin border — several parameters in a row no longer blend together. Metric charts now show the streak flame with the day count next to the title (dimmed if today is not counted yet), the same as the metric in daily metrics",
    ]},
    { version: "2.36", date: "2026-10-03 06:44", changes: [
        "Dashboard: a Reorder blocks mode right on the main page. A new button next to the ⚙️ in the header folds the heavy blocks into a compact list of cards — Profile, Charts, Daily metrics and plans. Take a block by the ☰ handle and move it with a finger or the mouse (the ↑/↓ arrows and the visibility switch are next to it); the order is saved at once, and Done brings back the normal page. The same drag code as in the layout window and in Global settings",
    ]},
    { version: "2.35", date: "2026-10-03 06:33", changes: [
        "Right panel: the right-to-left swipe can now start not only at the very edge but from the right half of the screen, up to the middle. So it does not interfere with ordinary taps and scrolling, the gesture is stricter outside the narrow edge zone: you need to swipe further and almost strictly horizontally; it is ignored on charts, sliders, inputs and horizontally scrollable blocks",
        "Fixed: while the left side menu or the right panel is open, the page underneath no longer scrolls up and down. Scrolling comes back once both drawers are closed",
    ]},
    { version: "2.34", date: "2026-10-03 03:12", changes: [
        "The loading splash with the burning flame is now on every page of the new site (Goals, Skills, History, Calendar, Shop, Challenges, Community, Milestones, Languages, Account, Workouts, login and onboarding), not only on the Dashboard. Before, there was a blank screen while a page was loading — now a flame in your theme colour is visible from the first frame and is replaced by the page by itself. The splash variant (living flame, fire ring, classic) is shared with the Dashboard choice; motion is switched off by the system \"reduce motion\" setting and by the \"Turn off all animations\" switch",
    ]},
    { version: "2.33", date: "2026-10-03 05:49", changes: [
        "Favorites: the round button at the top of a page that opens the quick links to your favourite sections now shows a heart (before it had just a small arrow and looked like an empty circle). The heart is an outline while the list is closed and fills with the theme colour when it is open; the button is labelled 'Favorites'. The 'add this page to favorites' heart is also more visible: its outline no longer gets lost on the dark and warm themes",
    ]},
    { version: "2.32", date: "2026-10-03 05:38", changes: [
        "Workouts: the exercise form now lets you pick muscle groups. If an exercise is not in the reference (for example \"Wall angels\"), mark the groups and it shows up on the muscle map and in the stats, and stops sitting in the \"unlinked\" list. Under the name you can see whether the exercise was recognised automatically, and \"Reset to automatic\" brings the old behaviour back. The link is stored on this device and survives renaming the exercise",
    ]},
    { version: "2.31", date: "2026-10-03 05:27", changes: [
        "Water: the \"Time for some water\" reminder now disappears as soon as you add water (before, only when the whole goal was reached), and its numbers update instantly from the water entry in the header or the right panel. Water added for another date does not dismiss today's reminder. The numbers are now guarded: empty, negative or non-numeric values show as 0, and \"left\" never goes negative",
    ]},
    { version: "2.30", date: "2026-10-03 01:49", changes: [
        "The streak in Community and the leaderboard no longer resets because of today being unfinished: if everything was done yesterday and only some metrics are filled in today, the streak is counted from yesterday instead of showing 0. Requires migration 037 in Supabase; without it everything works as before",
    ]},
    { version: "2.29", date: "2026-10-02 20:07", changes: [
        "Water: every water addition is now saved with its exact time in your account — the \"Entries today\" log is visible on all your devices. The water window has an optional \"Time\" field: you can say when you drank (or add water for a past day with the right time); if left empty, \"now\" is used, and 12:00 for a past day. \"Undo last add\" also removes the log row. Until the database update is applied, the log shows only this device's entries",
    ]},
    { version: "2.28", date: "2026-10-02 22:58", changes: [
        "Left side menu: the top now has a profile block — avatar (or a letter on the theme colour), name and email; a click opens Account. History moved to the very bottom of the page list: separated by a line and placed right before Account. A new option in Global settings (the right panel): Show day and week progress at the top of the side menu — the day and week rings right in the menu, a click opens the summary. The option is off by default",
    ]},
    { version: "2.27", date: "2026-10-02 19:41", changes: [
        "Dashboard (pilot): emoji in the water window are replaced by SVG icons — the drop in the heading, the \"Undo last addition\" arrow (a new icon) and the pencil for editing the day total; the drop emoji was removed from the glass tooltips (the \"drunk / goal\" text stays). The remaining emoji in the header and the right panel come in a later step",
    ]},
    { version: "2.26", date: "2026-10-02 22:29", changes: [
        "Charts: choosing the period is clearer. Instead of six long buttons wrapping onto several rows there is one row of short options — 7D · 30D · 90D · 1Y · All — plus a 'Custom period' button with a calendar. You can now flip the week and the month back and forth with arrows (no separate 'Last week' any more), and the chosen period is always labelled with its dates. Each chart now shows next to its calendar button which period it uses, highlighted when it has its own. Previously saved periods keep working",
    ]},
    { version: "2.25", date: "2026-10-02 22:16", changes: [
        "Emoji in the interface are replaced by the unified SVG icons on all pages: dialog titles (\"What's new\", \"Install\", \"About\"), buttons (\"Add\", \"Done\"), badges, the menu hamburger button, the welcome tour, the period picker, calendar, milestones, day details and the shop. Fixed: in \"Daily metrics\" a real emoji gear was shown next to the gear icon. 11 new icons added (menu, bell, key, mail, cart and others). Remaining places (water, header, template presets) are queued",
    ]},
    { version: "2.24", date: "2026-10-02 21:53", changes: [
        "Streaks: fixed — the dashed flame meaning \"the streak is going but today is not done yet\" is shown again. Previously, as soon as you entered anything for today (for example water), all series not yet completed today (perfect day, metrics) were reset and disappeared from the list while the flame stayed solid. Now an unfinished series is kept and marked as needing attention. Also: the \"daily note\" streak no longer comes up one day short",
    ]},
    { version: "2.23", date: "2026-10-02 14:33", changes: [
        "Favorites: instead of the duplicate page list behind the chevron at the top there is now Favorites. Every menu page (Goals, Skills, Workouts, Challenges, Languages, Calendar, Milestones, Shop, Community, History) has a heart at the top: empty — the page is not a favorite, filled with the theme colour — it is. The chevron list shows only favorite pages; until you pick some it shows a hint. All pages stay in the side menu. Favorites are remembered on the device at once; syncing between devices needs migration 035 (the owner applies it in Supabase)",
    ]},
    { version: "2.22", date: "2026-10-02 11:10", changes: [
        "Dashboard (pilot): the weekly progress ring in the profile is now a heptagon — seven sides for the seven days of the week and a thicker line than the day circle, so day and week look different at a glance. Progress runs along the perimeter and the ⭐ bonus is still shown as a second arc. The day ring around the avatar and the week badge in the header were not changed",
    ]},
    { version: "2.21", date: "2026-10-02 11:03", changes: [
        "Dashboard (pilot): the water glass in the header turns golden when you reach 100% of your goal — the outline and rim become gold (a darker shade on light themes so it stays readable), there is a soft glow around it and a highlight sweeps across the water from time to time. If the goal is no longer met (for example you undid the last addition), the glass goes back to its normal look. The animation is switched off by the system \"reduce motion\" setting and by the \"Turn off all animations\" switch. The glass on other pages (in the right panel) is unchanged for now",
    ]},
    { version: "2.20", date: "2026-10-02 13:53", changes: [
        "Points on the Goals and Skills pages: when you complete a goal, master a skill or mark a book as read, a coin '+N' appears where you tapped and floats up; if you undo it — '−N'. The amount is exactly what that goal, skill or book adds to your balance. It shows only after the change is saved and respects the global animations switch",
    ]},
    { version: "2.19", date: "2026-10-02 13:33", changes: [
        "Goals and Skills: the old coins and progress bars are replaced with modern ones. Points are now shown with the coin-with-flame icon everywhere (goals, skills and books instead of emoji). Skills are cards: a rounded theme-coloured progress bar that fills smoothly with a percentage, \"−/+\" steps, a round \"mastered\" mark and edit/delete icons instead of the ✎ ✕ symbols",
    ]},
    { version: "2.18", date: "2026-10-02 13:25", changes: [
        "Russian language: the word \"стрик/стрейк\" was replaced with \"серия\" everywhere the user sees it (Dashboard, evening reminder, metric settings, site tour, older entries in the changelog). English text (\"streak\") is unchanged",
    ]},
    { version: "2.17", date: "2026-10-02 13:10", changes: [
        "Dashboard (pilot): metrics with sets now also show the flame and the streak days next to the name (like the other metrics). Every set in the sets table sits on its own plate card instead of a bare row",
    ]},
    { version: "2.16", date: "2026-10-02 04:36", changes: [
        "Water: the water window now has an \"Entries today\" block — the time of each addition and how much the total changed (for example, 08:05 +250 ml; decreases are shown in red). It is available both on the main page and in the header water window on the other pages. For now the entries are kept only on this device and are not synced to others; undoing the last addition also removes its row from the log",
    ]},
    { version: "2.15", date: "2026-10-02 07:27", changes: [
        "Right panel: the swipe is more reliable. You can start the gesture not only at the very screen edge but in the right part of the screen (about a fifth of the width) — on Android the edge is taken by the system back gesture, so the swipe could fail before. The panel opens as soon as the finger moves left, without waiting for release. The gesture is ignored when the finger lands on a slider, an input or a horizontally scrollable block. The header button works as before",
    ]},
    { version: "2.14", date: "2026-10-02 07:12", changes: [
        "Dashboard block layout: the Display and order window was redesigned. Blocks are now cards with a title and a short description; change the order by dragging the ☰ handle (finger or mouse — neighbouring cards make room) or with the ↑/↓ arrows; visibility is a clear switch instead of an eye. The same list is in Global settings (right panel, any page) — changes are saved at once. The ☰ handle also works from the keyboard: the up/down arrows move the block",
    ]},
    { version: "2.13", date: "2026-10-02 04:00", changes: [
        "Dashboard (pilot): emoji on buttons and block labels are now replaced by the single SVG icon set too — \"Add\", \"Add set\", \"Add metric\", \"Daily score\", \"Enable notifications\", \"Configure charts\", \"Edit values\", \"Add from goals\", the summary \"Bonus\", the streak warning and more. The icons take the text and theme colour. A guard test was added: new template text with an emoji that has an SVG will not pass the check",
    ]},
    { version: "2.12", date: "2026-10-02 03:56", changes: [
        "Dashboard (pilot): emoji in section and window headings (Profile, Plans, Charts, Streaks, Daily metrics, \"What's new\", settings and others) are replaced by a single set of SVG icons — they take the text and theme colour, do not depend on the system emoji set and look the same on every device. Emoji that have no icon yet (for example the moon in the dark theme name) stay as they were. The dictionary texts were not changed and the classic version is not affected",
    ]},
    { version: "2.11", date: "2026-10-02 06:46", changes: [
        "Water without a set goal is now shown correctly in charts: the water chart's guideline shows your calculated goal (from weight and height, or 2000 ml without them), and in the Community comparison it counts toward the category's goal total. Before, it was empty or zero there",
    ]},
    { version: "2.10", date: "2026-10-02 06:41", changes: [
        "Water everywhere: the water window opened from the header (on any page and in the right panel) now also has 'Undo last add' and a pencil to correct the whole amount for the day — just like on the Dashboard. Undo rolls back what you logged step by step, as long as the day's value has not been changed elsewhere; a total correction can be undone too. After undoing or editing you get the 'saved' confirmation",
    ]},
    { version: "2.09", date: "2026-10-02 06:27", changes: [
        "Dashboard: the \"Profile\" block (avatar, age, body parameters) now appears as soon as its own data is loaded and no longer waits for the points to be calculated — it used to be held back while the balance was computed over the whole history. The coin with the points appears right after. Reading of large data histories is also faster: pages after the first are loaded with several requests at once",
    ]},
    { version: "2.08", date: "2026-10-02 06:18", changes: [
        "Goals: the goals page has a modern look — cards instead of a table with a text bar and \"−/+\" buttons. A simple goal is a round checkmark; a multi-stage goal shows progress per stage (a segment for each stage, or a bar when there are many), \"2/5\" and a percentage, a \"+\" button for the next stage and an expandable stage list: tapping a stage marks progress up to it, tapping the last completed one again undoes it. Completed goals are compact cards",
    ]},
    { version: "2.07", date: "2026-10-02 06:11", changes: [
        "Dashboard (pilot): water reminder. If the daily water goal is not reached when you open the app, a soft \"Time for some water\" note appears on the main page showing how much you drank and how much is left. At most once every 3 hours, only on open (no notifications or background timers) and not at night, 22:00–08:00. Switch it off in Settings (right panel): \"Remind me to drink water\"",
    ]},
    { version: "2.06", date: "2026-10-01 20:12", changes: [
        "Picking an icon for metrics and body parameters is easier now: only popular icons are shown by default, while rare ones are tucked into topic tabs (Sport, Health, Food, Study & work, Home & money, Nature & travel, Creative & other) and an \"All\" tab. Search covers the whole icon set and understands several words (for example, \"run light\"), and every icon has a tooltip with its name in your language. The selected icon is always shown on its own line with its name",
    ]},
    { version: "2.05", date: "2026-10-01 19:57", changes: [
        "The \"turn off all animations\" switch now works on every page: Calendar, Shop, Workouts, Challenges, Goals, Skills, History, Languages, Community, Account, as well as the sign-in and onboarding pages — before, it only silenced animations on the Dashboard and in the header widgets. The flag is applied before the page is first drawn, so nothing flickers or moves from the very first frame; the smooth block collapsing in Workouts respects it too",
    ]},
    { version: "2.04", date: "2026-10-01 22:48", changes: [
        "Water: the automatic goal now takes height into account. When your profile has a height, the goal is based on body surface area (Mosteller formula: √(height × weight / 3600)) × 1200 ml/m² — the usual fluid need of 1500 ml/m² a day, about 20% of which comes with food. Example: 70 kg and 175 cm give 2210 ml. Without height the calculation stays as before — weight × 30 ml. The water window (on the Dashboard and in the header on every page) has a new Height, cm field, and the (i) help explains in detail how the goal was obtained. The height comes from the profile you filled in during onboarding",
    ]},
    { version: "2.03", date: "2026-10-01 19:35", changes: [
        "App installation (PWA): the service worker is now registered on every page of the new site (before, only the old-version pages registered it, so a new user who opened the site on a new page never got it — the browser did not treat the site as installable and showed no install icon in the address bar). The Dashboard now has a dismissible \"Install the app\" banner with an \"Install\" button (on iPhone — a \"Share → Add to Home Screen\" hint); a closed banner stays hidden for 14 days. The installed app does not see the banner",
    ]},
    { version: "2.02", date: "2026-10-01 19:16", changes: [
        "App icon on Android: the app manifest and the iOS icon are now linked on every page of the new site (Dashboard, Goals, Skills, History, Calendar, Shop, Challenges, Community, Milestones, Languages, Account, Workouts, login and onboarding). They used to exist only in the old version, so when installing from the new pages Android did not see the monochrome icon and kept the default one. To refresh the icon, remove the app from the home screen and install it again; recolouring to the system theme works on Android 13+ with \"Themed icons\" turned on",
    ]},
    { version: "2.01", date: "2026-10-01 22:02", changes: [
        "Dashboard (pilot): next to the name of every metric that has a streak you now see a flame and the number of days in a row (weeks for weekly schedules). If today is not counted yet, the flame is dimmed with a \"not done today\" hint. Metrics with \"count a streak\" switched off have no flame",
    ]},
    { version: "2.00", date: "2026-10-01 21:51", changes: [
        "Dashboard (pilot), charts: the period picker now has a \"Last 30 days\" option and it is the default instead of \"Last 10 days\" (a period you already picked by hand is kept). The short default made charts look empty even though there was a month of data",
    ]},
    { version: "1.99", date: "2026-10-01 20:02", changes: [
        "Workouts: in the exercise form, \"What are you counting?\" is now a dropdown — reps, seconds, minutes, km, meters, rounds — instead of free typing. If your option is not there, choose \"Other…\" and type your own word. Existing exercises keep their value as it was, including custom ones",
    ]},
    { version: "1.98", date: "2026-10-01 14:54", changes: [
        "Water: the (i) help next to the daily goal no longer says \"set manually\" when it was not. It now explains the real source: if the goal is automatic — \"calculated automatically from your latest weight (weight × 30 ml)\"; if it is fixed — that it holds the shown value (you changed it yourself or it was kept from the template) and what the weight-based calculation would give. A new \"Calculate automatically (N ml)\" button switches the goal back to the weight-based value. New users get an automatic goal after onboarding instead of a preset 2500 ml. Works in the header water window on every page too",
        "Dashboard: the Charts block is collapsed by default while no chart is built (no data or fewer than two points) so it does not waste space; it expands by itself as soon as data appears. If you expanded or collapsed the block yourself, your choice always wins",
    ]},
    { version: "1.97", date: "2026-10-01 11:43", changes: [
        "\"Log out\" now asks for confirmation on every page of the new site (Account, Calendar, Challenges, Community, Goals, History, Languages, Milestones, Shop, Skills, Workouts; the Dashboard since v1.95): tapping it in the side menu opens a \"Log out?\" window with \"Log out\" and \"Cancel\" buttons. Esc and a tap on the backdrop cancel, and focus starts on \"Cancel\" — protection against an accidental tap. The right panel still works the old way",
    ]},
    { version: "1.96", date: "2026-10-01 11:33", changes: [
        "Dashboard (pilot): fixed \"the background disappears at the bottom of the screen when scrolling\". The cause was the loading splash (v1.70) pinning the page background to the theme colour at load time, so after switching theme without a reload the area below the first screen kept the old colour. The background now follows the current theme",
    ]},
    { version: "1.95", date: "2026-10-01 11:30", changes: [
        "Dashboard (pilot): \"Log out\" now asks for confirmation — tapping it in the side menu opens a \"Log out?\" window with \"Log out\" and \"Cancel\" buttons (protection against an accidental tap). Esc and a tap on the backdrop cancel, and focus starts on \"Cancel\". The other pages and the right panel still work the old way",
    ]},
    { version: "1.94", date: "2026-10-01 11:24", changes: [
        "Dashboard (pilot): the logo in the top-left of the header now \"burns\" — instead of a static image there is a living flame in the current theme colour, with separate tongues each at its own rhythm (like on the loading splash, but more compact and without sparks). Motion is switched off by the system \"reduce motion\" setting and by the \"Turn off all animations\" switch",
    ]},
    { version: "1.93", date: "2026-10-01 14:17", changes: [
        "Water (Dashboard): the water window now has an 'Undo last add' button — it rolls back what you logged step by step, as long as the day's value has not been changed elsewhere — and a pencil to correct the whole amount for the selected day. A total correction can be undone too. After undoing or editing you get the 'saved' confirmation, and the coin '+1' / '−1' if the daily goal became reached or no longer reached. Logged too much by accident? No need to subtract it by hand any more",
    ]},
    { version: "1.92", date: "2026-10-01 14:05", changes: [
        "Water and points: water now counts as done against the real daily goal — the one you set, or if none is set, your weight × 30 ml, or 2000 ml without a weight. Before, with no goal set, any logged amount earned the point, even 100 ml. Fixed everywhere: in the balance and points log, day and week rings, streaks, the evening reminder, Shop, History and the header, and on the server too — daily and category points, the leaderboard and Community streaks. When you add water, the coin '+1' / '−1' appears when the goal is reached or no longer reached. If you have no water goal set, past days with little water will be recalculated; to pin your goal, set it manually ('Change daily goal')",
    ]},
    { version: "1.91", date: "2026-10-01 13:50", changes: [
        "Workouts: \"just reps\" exercises no longer show a stray \"kg\". Before, adding push-ups as plain reps still appended \"kg\" in sets and records — now only the number of reps is shown, including for exercises created earlier. The exercise form no longer asks for a weight unit when the exercise has no weight. When weight is tracked, the default unit \"kg\" is shown as text and can be changed (lb or your own) with the pencil; the chosen unit is remembered and used for the next exercises",
    ]},
    { version: "1.90", date: "2026-10-01 13:32", changes: [
        "Dashboard: the streak flame on the main page now truly burns. Once your streak reaches 7 days, the plain flame is replaced by a living one: three tongues and a bright core sway and flicker just like on the loading screen. The longer the streak, the brighter it gets: from 30 days the glow is stronger, the flame faster and two sparks rise above it; from 100 days it has the brightest glow and four sparks. If today's streak is not counted yet, the flame stays a dim outline. With \"reduce motion\" or \"turn off all animations\" enabled, the flame still shows but does not move",
    ]},
    { version: "1.89", date: "2026-10-01 13:20", changes: [
        "Dashboard, set charts (push-ups etc.): a day's point is now a mini pie made of the shares of each set variation — e.g. of 100 push-ups, 50 classic, 30 diamond and 20 biceps; with a single variation the point is a solid dot of its colour. A legend \"colour — variation — total reps for the period\" appears under the chart, and each point has a tooltip with the breakdown. Variation colours are stable and do not change when the period changes. If sets have no variation names, the chart looks as before",
    ]},
    { version: "1.88", date: "2026-10-01 13:13", changes: [
        "Dashboard, \"Points\" window (click on the points in the profile): by default it now shows a compact list of the latest 5 sources of income (metrics, goals, books; newest first, with the date), and the \"Show more\" button smoothly expands the rest of the earnings for 7 days and a separate list of purchases. The minus sign in the lists is now typographic (\"−100\")",
    ]},
    { version: "1.87", date: "2026-10-01 11:35", changes: [
        "Dashboard (pilot), charts: when the chosen period (for example \"last 10 days\", or \"this week\" on a Monday) holds fewer than two values but there are entries over a longer span, the chart no longer stays empty with a \"not enough data\" message. It shows the latest entries with the note \"Too little data in the chosen period — showing the latest entries instead.\" Nothing changes for the \"All\" period or when there really is no data",
    ]},
    { version: "1.86", date: "2026-10-01 11:27", changes: [
        "Onboarding (pilot): instead of one long form — a step-by-step setup: use case → about you → priority → metrics, with a step indicator and Back / Next buttons. New users no longer get every metric created: only the ones that fit the chosen goal are pre-checked (for example for \"lose weight\" — water, calories, workout, steps), the rest are tucked behind \"More metrics\" and added on request",
        "Onboarding: \"Skip, I'll set it up myself\" creates two starter metrics (water and workout) instead of six; body parameters are created only as needed for the goal (weight; for \"lose weight\" and \"gain muscle\" also body fat % and muscle mass), none for the planner; for the planner the metric charts block is hidden on the dashboard from the start",
    ]},
    { version: "1.85", date: "2026-10-01 04:46", changes: [
        "Top bar on all Vue pages: instead of the text arrows \">>>\" there is now a neat round button with a chevron that rotates when opened. The quick links to sections are pill-shaped, fade in smoothly and softly fade out at the right edge; close them by tapping again or pressing Esc. Animations are turned off by the system \"reduce motion\" setting and by the global animations switch",
    ]},
    { version: "1.84", date: "2026-10-01 07:35", changes: [
        "Global settings: the right panel (the ⚙️ button) opens one window with all settings — language, theme, turn off all animations, streak congratulations, day/week progress, order and visibility of Dashboard blocks, water, and a link to Account. Works on any page; whatever can be applied right away is applied right away",
    ]},
    { version: "1.83", date: "2026-10-01 07:32", changes: [
        "Right panel: added the muscle map — the body from the front and back, with muscles worked in the last 4 days highlighted green and the rest grey. Tapping a muscle shows when it was last worked; there is a quick link to Workouts. Set data is loaded only when the panel opens, and the block shows if you have at least one exercise",
    ]},
    { version: "1.82", date: "2026-10-01 07:29", changes: [
        "Right slide-out panel on every page (including the Dashboard): open it with a swipe from the right screen edge or the button in the header. Inside: day and week progress \"speedometers\" (tap one for the summary) and the water glass with quick +200 / +500 ml. Close it with a swipe right, a tap on the dimmed area, Esc or the cross. Respects the turn-off-animations switch",
    ]},
    { version: "1.81", date: "2026-10-01 04:22", changes: [
        "Dashboard (pilot): a \"Turn off all animations\" switch is now in the \"Customize dashboard\" window, next to the streak celebrations. One toggle silences all motion: flames and the splash, floating points, smooth collapsing of blocks, celebrations, the water animation. It applies at once, is remembered and works from the very first paint of the page. If your device already has \"reduce motion\" turned on, the switch is checked and locked with a note on where to change it. Not yet connected on the other pilot pages",
    ]},
    { version: "1.80", date: "2026-10-01 04:17", changes: [
        "Dashboard (pilot): the loading splash now really \"burns\". Three variants: \"Living flame\" (default) — separate flame tongues, each with its own speed and phase, plus rising sparks; \"Fire ring\" — a rotating ring with a tail and a small flame in the middle; \"Classic\" — the previous flickering outline (kept). Preview: add ?splash=ring, ?splash=flame or ?splash=classic to the dashboard address (your choice is remembered). The splash shows even before the page scripts load and repeats the chosen variant. Animations are turned off when the system asks for reduced motion. Choosing a variant from the interface will come later, in \"Customization\"",
    ]},
    { version: "1.79", date: "2026-10-01 04:09", changes: [
        "Dashboard (pilot), \"Daily metrics\": the day switcher is redesigned — instead of three text buttons \"Prev / Today / Next\" there is now a \"‹ Thu, October 1 ›\" capsule (tap the date to pick a day from the calendar) and a separate \"Today\" chip that is active only when a day other than today is selected; the buttons are bigger for fingers. \"›\" is not disabled on today — planning for tomorrow still works. The \"Sets\" block (and other nested cards) has its own plate again — it used to blend into the metrics block background",
    ]},
    { version: "1.78", date: "2026-10-01 06:44", changes: [
        "Dashboard and Shop: the points icon was redrawn to look like a real coin — a round disc filling the whole box with a reeded edge, an inner rim and a highlight; the theme-coloured flame now sits in the middle of the coin like an emblem and still flickers softly. In the Profile block the gap between the streak flame and the points coin is smaller",
    ]},
    { version: "1.77", date: "2026-10-01 06:37", changes: [
        "Dashboard: points animation — when you mark a metric as done (or reach a goal for a number, sets or options), a \"+1\" with a coin appears where you tapped, floats up smoothly and fades away. If you undo it and the metric stops being done, the same happens with \"−1\". The label only appears after the value has actually been saved, and only when a point was really gained or lost (for example, a number going 3 → 5 with a goal of 10 changes nothing). If the system asks to reduce motion, the label does not float: it briefly fades in and out in place",
    ]},
    { version: "1.76", date: "2026-10-01 06:24", changes: [
        "Dashboard: streak congratulations — when a streak reaches 5, 10, 30, 50, 100, 200 or 365 days (4, 12, 26 or 52 weeks for weekly metrics), an animated card appears: an igniting flame, a big number, what the streak is for and a few warm words (several variants so it does not get stale). Shown once per threshold; on the very first run only the highest of the already earned streaks. Turn it off with \"Don't show these again\" in the card or the \"Show congratulations for streaks\" checkbox in the ⚙ \"Customize dashboard\" window. Animation is off when the system asks to reduce motion",
    ]},
    { version: "1.75", date: "2026-10-01 06:15", changes: [
        "Dashboard, metric settings: a new switch \"Just record a value (weight, measurements)\" turns off the goal, schedule, streak and streak import and keeps the name, icon, type and unit; such a metric gives no streak and does not get in the way of the \"perfect day\". Regular metrics get a \"Count a streak for this metric\" checkbox — turn it off when a streak is not needed. In the metrics list such a metric is labelled \"value only\". Needs migration 031 (metrics.count_streak) in Supabase",
    ]},
    { version: "1.74", date: "2026-10-01 06:04", changes: [
        "Challenges (pilot): day values can come from a metric. The challenge form now has a \"Source of values\" field — pick one of your metrics (for example \"Push-ups\") and days without a manual entry pick up the value from the Dashboard: a number, the sum of reps across sets, or \"done\" for a checkbox. A manual entry for a day always wins. The card shows a \"from metric\" tag and a hint on how to replace the value. Requires migration 032 in Supabase; without it everything works as before",
    ]},
    { version: "1.73", date: "2026-09-30 20:33", changes: [
        "Languages (pilot): dictionary tabs — every language has its own tab with a word counter, and an \"All\" tab appears once there is more than one dictionary. The \"＋\" button creates a new dictionary (it can be empty and filled later), and an empty dictionary can be removed. The tab order is remembered and does not jump, and a new word is added to the open dictionary. Words and their data are unchanged, no migration needed",
    ]},
    { version: "1.72", date: "2026-09-30 15:32", changes: [
        "Sign-in and sign-up: on the first visit the language is now chosen from the device language (Russian if it is the first supported one in the device settings, otherwise English). Before, new users almost always saw English. After that the language is switched manually and the choice is never overwritten",
    ]},
    { version: "1.71", date: "2026-09-30 15:11", changes: [
        "Dashboard: the \"Profile\" block no longer breaks on phones — it is now two clear rows: avatar with the day ring, the week ring and age on top with the streak and points on the right; below them the body parameters (weight, height, etc.), which wrap to the width, and long names no longer push the layout around",
    ]},
    { version: "1.70", date: "2026-09-30 12:05", changes: [
        "Dashboard (pilot): instead of a plain \"Loading…\" text there is now a splash with the burning streak flame in the current theme colour (flicker and soft glow; the animation is turned off when the system asks for reduced motion). The flame shows up even before the page scripts have loaded, so a slow connection no longer means a blank screen. Other pages will follow separately",
    ]},
    { version: "1.69", date: "2026-09-30 14:44", changes: [
        "Global header: the water glass and the day/week progress rings now appear on every page (Goals, Skills, Workouts, Challenges, Languages, Calendar, Milestones, Shop, Community, History, Account), not only on the Dashboard. Tap the glass for the water dialog (add water, change the goal); tap a ring for the done / left summary with settings. They follow the same progress settings as the Dashboard; the Dashboard page keeps its own header",
    ]},
    { version: "1.68", date: "2026-09-30 13:20", changes: [
        "The points icon (the \"coin\") got a makeover: a translucent coin with a small burning flame in the theme color, with a gentle flicker (static when the system \"reduce motion\" setting is on). Shown next to the balance in the home profile, in the \"where points came from\" window and on shop prices",
    ]},
    { version: "1.67", date: "2026-09-30 13:13", changes: [
        "Collapsing blocks now looks modern: instead of the ▼/▶ arrows there is a chevron that turns smoothly; the whole block header is clickable (keyboard too), and the content collapses and expands with a smooth height animation. Done on the Dashboard (Profile, Daily metrics, Plans, Charts, sets cards) and in Workouts (groups and exercise cards, muscle map, progression trees). The animation is off when the system \"reduce motion\" setting is on",
    ]},
    { version: "1.66", date: "2026-09-30 13:05", changes: [
        "Dashboard (new version), Plans: there is now spacing between the checkbox and the plan text; an unchecked checkbox is no longer a white square — it has a theme-colored border and background, and a checked one fills with the accent and a tick (applies to every checkbox on the Dashboard)",
        "Dashboard (new version), Plans: the time now follows the item — the time from the field next to \"Add\" also applies to a goal picked from the list, and carrying unfinished items over keeps the original item's time",
    ]},
    { version: "1.65", date: "2026-09-30 12:52", changes: [
        "Dashboard (new version): the water in the glass is now always light or deep blue instead of the theme accent, with a separate shade for each theme (darker on the light ones) so it stays readable against the card. This covers the header glass, the Water block and the \"saved\" animation",
    ]},
    { version: "1.64", date: "2026-09-30 12:48", changes: [
        "Classic version: the home page now shows a dismissible banner \"The project has moved to a new version\" with a short list of benefits and an \"Open the new version\" button; once dismissed with the cross it stays hidden",
    ]},
    { version: "1.63", date: "2026-09-30 12:44", changes: [
        "Shop (new version): every item now has a saving progress bar showing what percentage of the price you already have; once you have enough points it switches to \"Enough to buy\"",
    ]},
    { version: "1.62", date: "2026-09-30 12:40", changes: [
        "Dashboard: the part of the progress ring beyond 100% is now a light tint of the current theme's accent instead of a hardcoded crimson, so it stays visible over the main arc in every theme (new and classic versions)",
    ]},
    { version: "1.61", date: "2026-09-30 09:35", changes: [
        "Challenges: you can now add and fix values for past days. Tap the dot of the day in a daily challenge card — its date, target and an input field appear below, and the value is saved for that exact day (future days are unavailable). The input field is now easy to see: an accent border and a background different from the card, instead of blending into it",
    ]},
    { version: "1.60", date: "2026-09-30 09:30", changes: [
        "Challenges: you can now edit challenges you have already added. Each card has a pencil button that opens the same form as a custom challenge, pre-filled — you can change the title, icon, unit, duration, targets and count. The challenge type and start date stay fixed (changing them would change the meaning of entries already logged), and your existing progress is kept",
    ]},
    { version: "1.59", date: "2026-09-30 09:22", changes: [
        "Workouts: new \"Exercise progressions\" block (collapsed by default). Five chains of steps from easier to harder: push-ups (knee → regular → fist → diamond → archer), pull-ups, squats and legs, core, dips. A step is done when you reach its target reps in a single set; the current step shows your best set and an \"Add record\" button. Steps are matched to your exercises by name (Russian and English)",
    ]},
    { version: "1.58", date: "2026-09-30 10:48", changes: [
        "Time zone in streaks and Community: the server now computes \"today\" in the user's time zone instead of UTC. Before, for people in Moscow and Vilnius, between midnight and 2–3 a.m. the streak and day points in Community lagged a day behind. Requires migration 030 in Supabase; without it everything works as before",
        "Dashboard (pilot): on sign-in it quietly saves the browser's time zone into the profile (for example Europe/Moscow — daylight saving is handled automatically). It shows nothing and breaks nothing if the migration is not applied yet",
    ]},
    { version: "1.57", date: "2026-09-30 10:36", changes: [
        "Time zone and daylight-saving audit (Moscow — no DST, Vilnius and New York — with DST, plus Auckland): date arithmetic in the pilots is already calendar-based and holds on switch days. Two places that took the local date from UTC were found and fixed",
        "Dashboard (pilot): when creating a metric with a streak import, the import date was stored in UTC — for users east of Greenwich, between midnight and a few hours after, that was yesterday, so the imported days could be dropped. It now uses the local date",
        "Challenges (pilot): the completion date of a finished challenge came from a UTC timestamp — in the evening or at night it showed a day earlier or later. It now shows the user's local date",
    ]},
    { version: "1.56", date: "2026-09-30 07:33", changes: [
        "Dashboard (pilot), the \"Plans\" block: when adding your own item you can tick \"Already done\" — the item is created as completed right away and counts toward the day and week progress. It is a way to log something you did that was not on your goals list, without ticking it afterwards (a first step towards merging \"What you got done today\" and \"Plans\")",
    ]},
    { version: "1.55", date: "2026-09-30 10:29", changes: [
        "Dashboard: clicking the points in the profile now opens a \"Points\" window — what was earned today and over the last 7 days (completed metrics, goals, books, shop purchases), with day and week totals and the current balance. The shop is reached by a button inside the window instead of the balance click itself. Skill points are not listed by day (skills have no date) but are part of the balance",
    ]},
    { version: "1.54", date: "2026-09-30 07:27", changes: [
        "Dashboard (pilot): the ⭐ bonus in the WEEK ring is now proportional — one done bonus item adds +20%/7 ≈ +2.9% to the week instead of +20% (the day is unchanged: +20%). A bonus done every day therefore adds the same +20% to the week as to a day. The summary shown when you tap the week ring uses the same maths",
    ]},
    { version: "1.53", date: "2026-09-30 10:25", changes: [
        "Dashboard: \"Water\" is removed from the \"Manage metrics\" list — it has its own block in the top right corner and does not need to be configured as a regular daily metric",
    ]},
    { version: "1.52", date: "2026-09-30 07:23", changes: [
        "Workouts (pilot), muscle map: the statistics are more flexible — a 7 / 30 / 90 day period switch (your choice is remembered), all muscle groups worked in the period are listed instead of the top 6, and a \"Not worked in this period\" line lists the rest",
    ]},
    { version: "1.51", date: "2026-09-30 10:10", changes: [
        "Dashboard, \"Sets\": the list of saved set variations is no longer clipped on phones — it now opens over the page below the field (or above it when the keyboard leaves little room below), like in the classic version. Tapping a variation and the \"remove variation\" cross work on touch screens; the list closes with a tap outside",
    ]},
    { version: "1.50", date: "2026-09-30 09:53", changes: [
        "Water: the \"Save goal\" button is renamed to \"Change daily goal\" and moved under the goal field, so it can no longer be mistaken for adding the amount you drank; a confirmation is shown after the goal changes. After adding water an animation plays: the glass fills and a check mark is drawn over it — it starts only once the value is really saved, and a save error is shown in the dialog. The button is renamed in the classic Dashboard too",
    ]},
    { version: "1.49", date: "2026-09-30 09:49", changes: [
        "Dashboard: clicking the day or week progress now opens a summary first — what is done, what is left and how many percent each item is worth (plus the ⭐ bonus). The progress settings icon now lives inside the summary and opens the settings from there",
    ]},
    { version: "1.48", date: "2026-09-30 09:45", changes: [
        "Account: changing the password now happens in a separate dialog and asks for the current password — without it the password is not changed. If the account was created with Google and has no password yet, the dialog simply lets you set the first one",
    ]},
    { version: "1.47", date: "2026-09-30 08:34", changes: [
        "Dashboard (new version): in the Monet theme the streak flame now has a thin accent-colored outline so it no longer gets lost on the dark background, like in the classic version",
    ]},
    { version: "1.46", date: "2026-09-30 08:24", changes: [
        "Sign-in: the \"Back to portfolio\" link is gone from the sign-in screen, in both the new and the classic version",
    ]},
    { version: "1.45", date: "2026-09-30 08:17", changes: [
        "Workouts (new version): the workout templates now include progressive programs with a gradually growing load — \"Push-ups: 6 weeks\" and \"Pull-ups: 6 weeks\". The preview shows a week-by-week load table, and the first week's scheme is saved with the exercise",
    ]},
    { version: "1.44", date: "2026-09-30 08:14", changes: [
        "Account (new version): the admin-only link is now labelled \"Administrator panel\" (previously \"Admin panel\")",
    ]},
    { version: "1.43", date: "2026-09-30 08:04", changes: [
        "Home charts: metrics with an SVG icon (e.g. \"Push-ups\") now show that icon in the chart heading and in the chart settings list — it used to be dropped, only emoji icons were shown. Fixed in both the new and the classic version",
        "Phase 2, stage B: logging out and the \"not signed in → sign in\" / \"onboarding not done → onboarding\" redirects now go straight to /login/ and /onboarding/, without an extra hop through the old addresses",
        "Sign-in and onboarding pages: an unobtrusive link to the classic version at the bottom (legacy-login / legacy-onboarding), and \"Try the new design\" in the classic version",
    ]},
    { version: "1.42", date: "2026-09-30 05:10", changes: [
        "Phase 2: \"Sign in\" and \"Onboarding\" are now at the short addresses /login/ and /onboarding/ instead of /login-vue/ and /onboarding-vue/, and the classic versions live at /legacy/login.html and /legacy/onboarding.html. The old /login.html and /onboarding.html addresses redirect to the new ones (keeping the Google return parameters), and the site root leads to /login/",
    ]},
    { version: "1.41", date: "2026-09-30 04:44", changes: [
        "Workouts: new \"Muscle map\" block (collapsed by default). A front and back body diagram: muscles worked in the last 4 days are green, the rest are grey. Tap a muscle to see your exercises for it (with an \"Add record\" button) and suggestions for what else to do. Below, the muscle groups you trained most over the last 30 days. Muscles are recognised from the exercise name (Russian and English); exercises that could not be matched are listed separately",
    ]},
    { version: "1.40", date: "2026-09-30 07:34", changes: [
        "Account (new version): admins now get an \"Admin panel\" link at the bottom of the page; regular users do not see it",
    ]},
    { version: "1.39", date: "2026-09-30 04:29", changes: [
        "Removed the \"Vue pilot\" badge from the sidebar of every Vue page. The link to the classic version of a page is now a single, unobtrusive link always in the same place — at the very bottom of the slide-out menu (legacy-dashboard, legacy-goals, etc.). The \"Try the new design\" link on classic pages also moved to the bottom of the menu instead of sitting under the active item",
    ]},
    { version: "1.38", date: "2026-09-30 00:52", changes: [
        "New version: checkboxes and radio buttons on every page (Calendar, Challenges, Goals, Languages, Skills, Community, Workouts and more) now use the current theme's accent color, like the classic version, instead of gray/white",
    ]},
    { version: "1.37", date: "2026-09-30 00:49", changes: [
        "Workouts (new version): each exercise can now be collapsed with the ▼/▶ arrow next to its name, leaving just the header with its buttons; the state is remembered per exercise (categories still collapse as before)",
    ]},
    { version: "1.36", date: "2026-09-30 00:44", changes: [
        "Workouts (new version): in the entry form, exercises with a left and a right side now use one block per set — two cells, \"Left\" and \"Right\", sharing one time — instead of two separate sets. The database still stores two sided sets, so per-side records, charts and the classic version work as before",
        "Workouts (new version): a warm-up reminder now shows at the top of the page while there are no entries today; \"Got it\" hides it until tomorrow",
    ]},
    { version: "1.35", date: "2026-09-30 00:40", changes: [
        "Dashboard (pilot): in the evening reminder, the title \"Unfinished metrics left!\" and the text \"Finish them so you don't lose your streak.\" are now on separate lines with a gap between them",
        "Community (pilot): the Follow and Add friend buttons no longer do nothing silently. With an empty field a hint appears (\"Enter an email or a nickname first\"). If the user lookup fails with an error (no permission, missing DB function, network), the real error is shown instead of a false \"not found\", and the buttons no longer stay disabled",
    ]},
    { version: "1.34", date: "2026-09-30 00:38", changes: [
        "Workouts (new version): bodyweight exercises (push-ups, pull-ups, squats) now have a \"Added weight\" checkbox in the entry form — set extra weight per set; it shows in entries as \"15 (+5kg)\" and breaks ties between equal reps in records",
        "Workouts (new version): a set's time is now filled in right away for the first set of a new entry too, not only for sets added after it",
    ]},
    { version: "1.33", date: "2026-09-30 01:10", changes: [
        "Onboarding: a language switcher (RU/EN) and a theme picker now sit at the top, like on the sign-in page, so after signing up or a first Google sign-in you can change the language before filling in the questionnaire",
        "The flame icon in the browser tab on every Vue page now matches the classic site (no blue accent in the core)",
    ]},
    { version: "1.32", date: "2026-09-30 00:40", changes: [
        "Phase 2: \"Account\" is now at the short address /account/ instead of /account-vue/, and the classic version lives at /legacy/account.html; the old /account.html address redirects to the new one. Side-menu links on every Vue page were updated and rebuilt, and the return trip after linking Google lands on the current page",
    ]},
    { version: "1.31", date: "2026-09-30 00:16", changes: [
        "Dashboard pilot: the Profile, Daily metrics, Plans and Charts sections collapse with a ▼/▶ arrow next to the heading, like in the classic version. The state is remembered in the browser (same key as classic — a section collapsed there stays collapsed here). Profile now has a heading",
    ]},
    { version: "1.30", date: "2026-09-30 00:13", changes: [
        "Phase 2, finish: the old addresses of the moved pages (/dashboard.html, /goals.html, /english.html and the rest) no longer return 404 — small stubs there forward to the new address (/dashboard/, /goals/, /languages/ ...), keeping the query string and hash. Bookmarks and old links keep working",
    ]},
    { version: "1.29", date: "2026-09-30 00:12", changes: [
        "Phase 2, Dashboard: the pilot is now at the short address /dashboard/ instead of /dashboard-vue/, and the classic version lives at /legacy/dashboard.html. Side-menu links on every Vue page were updated and rebuilt; after sign-in and after onboarding (classic and Vue) /dashboard/ opens",
    ]},
    { version: "1.28", date: "2026-09-30 00:04", changes: [
        "Dashboard pilot: block layout customization. The ⚙️ button next to the title opens a dialog where the Profile, Charts and Daily metrics & plans blocks can be reordered (↑/↓) and hidden; hidden blocks do not load their data. The layout is stored in profiles.dashboard_layout — shared with the classic Dashboard (migration 015, nothing new to apply). If Profile is hidden, the day/week rings show as a header badge",
    ]},
    { version: "1.27", date: "2026-09-30 00:10", changes: [
        "Phase 2: \"Goals\" is now at the short address /goals/ instead of /goals-vue/, and the classic version lives at /legacy/goals.html. Side-menu links on every Vue page and the link in the weekly reminder were updated and rebuilt",
    ]},
    { version: "1.26", date: "2026-09-29 23:50", changes: [
        "Phase 2: \"Community\" is now at the short address /community/ instead of /community-vue/, and the classic version lives at /legacy/community.html. Side-menu links on every Vue page were updated and rebuilt",
    ]},
    { version: "1.25", date: "2026-09-29 23:35", changes: [
        "Phase 2, fourth page: \"Milestones\" is now at the short address /milestones/ instead of /milestones-vue/, and the classic version lives at /legacy/milestones.html. Side-menu links on every Vue page were updated and rebuilt; the \"open milestones\" link in the classic Dashboard reminder points to /legacy/milestones.html, and the pilot Dashboard one to /milestones/",
    ]},
    { version: "1.24", date: "2026-09-29 23:24", changes: [
        "Phase 2, ninth page: \"Languages\" is now at the short address /languages/ instead of /languages-vue/, and the classic version lives at /legacy/english.html. Side-menu links on every Vue page were updated and rebuilt",
    ]},
    { version: "1.23", date: "2026-09-29 23:18", changes: [
        "Fix after pages moved to /legacy/: logging out and the \"not signed in → login\" / \"onboarding not done → onboarding\" redirects on classic pages pointed to the non-existent /legacy/login.html and /legacy/onboarding.html. The addresses are now absolute",
    ]},
    { version: "1.22", date: "2026-09-29 23:14", changes: [
        "Phase 2, first page: \"Skills\" is now at the short address /skills/ instead of /skills-vue/, and the classic version lives at /legacy/skills.html. Side-menu links on every Vue page were updated and rebuilt",
    ]},
    { version: "1.21", date: "2026-09-29 19:19", changes: [
        "Dashboard (pilot): removed the \"early pilot version\" banner with the link to the classic page — at the owner's request the link to the classic version will be a single one at the very bottom of the side menu",
    ]},
    { version: "1.20", date: "2026-09-29 19:15", changes: [
        "Dashboard (pilot): the \"Today's goals\" block is now called \"Plans\", and a plan item can have a reminder time (a field next to the item, or when adding it). When the time comes and the item is not done, a \"Time for your plan\" banner appears at the top of the page (the X hides it for the rest of the day); if you press \"Enable notifications\" in the block and allow them in the browser, you also get a system notification, once per item per day and not repeated after a reload. Works while the dashboard is open; push while the page is closed is not done yet. The time is stored inside the plan item, no migration needed, and the classic site leaves the field alone",
    ]},
    { version: "1.19", date: "2026-09-29 19:08", changes: [
        "Dashboard (pilot): evening reminder. From 21:00 local time, if any metrics scheduled for today are still unfinished, a banner appears at the top of the page: \"Unfinished metrics left! Finish them so you don't lose your streak.\" Click it to expand and see exactly what is left (for number metrics and sets: done / goal). It shows up on its own at 21:00 without a reload, disappears once everything is done, and the X hides it for the rest of the day",
    ]},
    { version: "1.18", date: "2026-09-29 18:48", changes: [
        "Phase 2, eighth page: Workouts now lives at the short address /workouts/ instead of /workouts-vue/, and the classic version moved to /legacy/workouts.html. Sidebar links on every Vue page were updated and rebuilt",
    ]},
    { version: "1.17", date: "2026-09-29 18:39", changes: [
        "Phase 2, seventh page: Challenges now lives at the short address /challenges/ instead of /challenges-vue/, and the classic version moved to /legacy/challenges.html. Sidebar links on every Vue page were updated and rebuilt",
    ]},
    { version: "1.16", date: "2026-09-29 18:31", changes: [
        "Phase 2, sixth page: Shop now lives at the short address /shop/ instead of /shop-vue/, and the classic version moved to /legacy/shop.html. Also fixed the sidebar links on the Vue pages: after Calendar moved in 1.15 they had not been rebuilt, so on some pages the Calendar item pointed at the removed /calendar-vue/ address",
    ]},
    { version: "1.15", date: "2026-09-29 18:23", changes: [
        "Phase 2 (making the Vue site primary), fifth page: Calendar now lives at the short address /calendar/ instead of /calendar-vue/, and the classic version moved to /legacy/calendar.html. Sidebar links and cross-page links updated",
    ]},
    { version: "1.14", date: "2026-09-29 12:05", changes: [
        "Phase 2 (making the Vue site primary), first fully-moved page: History now lives at the short address /history/ instead of /history-vue/, and the classic version moved to /legacy/history.html. Sidebar links and cross-page links updated automatically both ways",
    ]},
    { version: "1.13", date: "2026-09-29 05:13", changes: [
        "Log in and sign up on Vite + Vue 3 + TS + Tailwind (/login-vue/): email/password, sign-up, Google sign-in, an RU/EN and theme switcher right on the page (no sidebar here)",
        "Onboarding on the same stack (/onboarding-vue/): the \"how do you plan to use this\" questionnaire (goals / daily planner / both) hiding fields that don't apply, starting metrics picked for your goal, a skip button, body parameters and base metrics seeded — 1:1 with the original onboarding.js",
        "22 tests (including UI tests for the forms with Supabase mocked) checked against login.js/onboarding.js; the classic login.html/onboarding.html pages still work in the meantime. This closes phase 1 (migrating every page to Vue) — see COORDINATION.md",
    ]},
    { version: "1.12", date: "2026-09-29 07:06", changes: [
        "Dashboard pilot: closer visual match to the classic site. Checkboxes and radio buttons now use the theme's accent color instead of the browser's default blue — the pilot had no accent-color rule for them at all. The water badge moved from its own block in the page body into the header next to the progress rings — a clickable icon with no text label, like the classic site. The Daily metrics, Today's goals and Charts blocks now sit on a card background — the pilot's stylesheet had no card class at all, even though some markup already referenced it. The streak moved from its own section at the bottom of the page into the profile row next to the avatar, matching the original, and the flame icon now actually \"lights up\": two distinct icons (a warm flickering flame once today counts, a dim dashed outline when it doesn't) instead of one dimmed generic icon",
        "The \"this is a pilot, data may be stale\" notice is still there for now — it'll come out together with the block layout customization",
    ]},
    { version: "1.11", date: "2026-09-29 09:15", changes: [
        "First light step of phase 2 (the full address move happens separately, page by page): the classic site's sidebar now shows a \"✨ Try the new design\" link under the current section when that section already has a finished Vue pilot — Dashboard, Goals, Workouts, Challenges, Languages, Calendar, Milestones, Shop, Community, History, Account. Skills has no such link yet — its short address (without -vue) is being set up separately. The reverse link (pilot → classic) isn't in place yet — that needs a shared design for the \"pilot badge\" across all 12 AppShells first",
    ]},
    { version: "1.10", date: "2026-09-29 14:10", changes: [
        "All 12 Vue pilots: the \"Dashboard\" sidebar link now opens the Dashboard pilot (/dashboard-vue/) instead of the classic dashboard.html — approved ahead of the pilot's remaining two items (block layout customization, visual parity with the classic look), which continue separately",
        "Classic-to-classic navigation is unchanged: other classic pages still link to each other's .html pages as before",
    ]},
    { version: "1.09", date: "2026-09-29 03:40", changes: [
        "All 12 Vue pilots now show the site version in the sidebar and open the update history on tap, matching the classic site. The history reads a single version.json generated from this changelog (scripts/gen_version_json.py) instead of duplicating it in every pilot",
        "45 new tests across the 12 pilots (5 for the changelog modal + 1 for the sidebar button, each)",
    ]},
    { version: "1.08", date: "2026-09-29 00:20", changes: [
        "Dashboard pilot: the \"Daily metrics\" day card — boolean/number (two modes: replace and add-to-total, with a \"Total today\" readout and a manual fix) /multiselect fields, autosave per field, \"What you got done today\", a \"Save day\" button, \"Points for the day\"",
        "\"Sets\" and \"Today's goals\" are now embedded in the same card sharing the selected date (previously separate blocks with no day navigation). Streaks/rings/charts refresh through the existing event bus (notifyDataChanged), no direct calls between blocks",
        "36 new tests (pure logic + a composable with a mocked network), build and the full pilot suite (319 tests) re-checked after merging with phase 2 (Skills), Login and the Calendar offline cache",
    ]},
    { version: "1.07", date: "2026-09-28 20:35", changes: [
        "Extended the read-only offline cache (C3) to Calendar — previously only History and Milestones had it. Each month's notes are cached under their own key as you browse, so previously-viewed months stay available offline (not just the current one); with no network and no saved copy, it behaves as before (a load error). Saving (the day's plan) still requires a connection, same as everywhere else in this offline-cache approach",
    ]},
    { version: "1.06", date: "2026-09-28 19:40", changes: [
        "Fixed a DST bug in the milestones reminder: the \"due within a week\" cutoff was computed as Date.now()+7×86400000 — on the day clocks change, that arithmetic is an hour short of or over a full day and can rarely miss crossing midnight. Replaced with a calendar +7 days (addDaysIso) in both the classic dashboard.js and the pilot (lib/reminders.ts, new soonDateFor function + 2 regression tests)",
    ]},
    { version: "1.05", date: "2026-09-28 21:20", changes: [
        "Workouts pilot: iteration 2 of 2 — a mini progress chart on every exercise card (max weight by day for weighted exercises, total reps by day otherwise) and an overall training-volume chart (total sets per day, with its own period picker). Chart infrastructure copied from the Dashboard pilot per the project's copy-not-import rule (lib/chart.ts, ChartBlock/PeriodPicker/CustomPeriodModal); 14 new tests",
        "This closes the Workouts pilot rebuild — /workouts-vue/ now covers everything the classic workouts.js page did",
    ]},
    { version: "1.04", date: "2026-09-28 13:54", changes: [
        "The Vue pages' icon (browser tab and header) is redone: it is now our orange flame with a small blue accent in the core - replacing the all-blue flame from v0.89",
        "Checked the profile avatar problem on the Dashboard (a stretched oval instead of a circle): it came from the shared button rule overriding the sizes inside the wrapper button, and was already fixed in v0.94 (the avatar is now a 44x44 circle at every screen width and for any photo proportions). If you still see an oval it is a cached old version - a hard refresh helps",
    ]},
    { version: "1.03", date: "2026-09-28 21:15", changes: [
        "Community pilot: mutual friendship with requests, same as the classic site (1.02) — requests (accept / decline incoming, cancel outgoing), a friends list separate from follows, an \"Add friend\" button next to the search; a matching request is accepted right away. The \"Friends only\" filter shows friends and follows. Needs migration 029_friendships.sql — without it the new block is hidden. Own logic (lib/friends.ts), a PersonChip component and 17 new tests, including UI tests",
    ]},
    { version: "1.02", date: "2026-09-28 21:12", changes: [
        "Community (classic site): mutual friendship with requests. The Friends block now has requests (accept / decline incoming, cancel outgoing), a friends list and an \"Add friend\" button next to the email/nickname search; a matching request is accepted right away. Follows work as before, and the \"Friends only\" filter now shows both friends and people you follow. Needs migration 029_friendships.sql — without it the new block is hidden and the page works as before",
    ]},
    { version: "1.01", date: "2026-09-28 21:02", changes: [
        "Fixed: on the classic Dashboard the age was computed from a birth date parsed as UTC midnight, so in time zones west of UTC the age showed one year too high on the day before the birthday. The birth date is now parsed as local. Nothing changes in Europe",
    ]},
    { version: "1.00", date: "2026-09-28 12:48", changes: [
        "Fixed: in the Challenges section (classic site and pilot) challenge day dates were computed from UTC midnight, so in time zones west of UTC every day shifted back by one. Dates are now calendar-based; nothing changes in Europe. Added a 400-day regression test, verified in four time zones",
    ]},
    { version: "0.99", date: "2026-09-28 12:05", changes: [
        "Dashboard pilot: added the \"Today's goals\" block — the day plan (items from your goals and your own items), the ★ bonus mark, one-tap carry-over of unfinished items from the last 7 days, and ticking single-stage goals right from the plan. Everything you change updates the day/week rings and streaks immediately. Own components and composable, 44 tests (lib/planned.ts, usePlanned.ts, PlannedSection.vue)",
        "The plan takes a date, so it can be dropped into the day card together with the daily metrics; carry-over is only offered for today, as on the classic site",
        "Plan saves are queued so two quick edits can't reach the server out of order, and a failed save rolls back to the last saved state",
    ]},
    { version: "0.98", date: "2026-09-28 11:10", changes: [
        "Fixed: history longer than 1000 rows was cut off in places that read it in one request — streaks and day/week progress on the Dashboard pilot and the points balance in the Shop pilot could be calculated from truncated data. They now read page by page in a stable order (date, metric)",
        "Fixed: around the clock change (in Europe — the last Sunday of March/October) streaks were off by a day (\"yesterday\" was computed as minus 24 hours) and chart date axes could duplicate one date and drop another. Fixed on the classic Dashboard and charts, in the Dashboard pilot and in the Community chart",
        "Dashboard pilot: streaks, the day/week progress rings and the chart of a metric now update right after you add water, log a set or edit a value on a chart, without reloading the page",
        "Added COORDINATION.md — a shared board for the agents (who works on what right now, free tasks, done log). 27 new tests",
    ]},
    { version: "0.97", date: "2026-09-28 09:03", changes: [
        "Community pilot: the \"Compare by activity\" section is back — pick a category, see the comparison table (by total / points / streak, for this week / last week / this month / all time, everyone or friends only) and your own progress chart for that category with a period picker and a goal line",
        "If you have no metric in the category you can link any number metric right on the page; the chart uses the same shared infrastructure as the Dashboard charts",
        "Table sorting/filtering, per-day totals and the goal line are covered by tests checked against the original community.js",
    ]},
    { version: "0.96", date: "2026-09-28 17:20", changes: [
        "Dashboard pilot: the rest of the Profile block — the day progress ring now wraps the avatar (percent below it and a settings gear in the corner, like the full site), the week ring sits in the profile row, and in \"header\" mode the day circle and the week rounded square appear as badges on the right of the top bar. The gear on the avatar is always there, so settings stay reachable when the rings are off or moved to the header",
        "The standalone ring block was removed from App.vue; ProfileSection receives the ring data as props. New files: lib/ringPlacement.ts (where to draw a ring, geometry), AvatarProgress.vue, HeaderProgressBadge.vue (Teleport into #topbar-right), 16 new tests. The streak badge has not been moved into the profile row yet — another agent is working on streaks",
    ]},
    { version: "0.95", date: "2026-09-28 16:05", changes: [
        "Follow-up to the sidebar fix (v0.94): the streak badge and water badge on the Dashboard and the suggestion chips on the Skills page now have an explicit transparent background and text color — otherwise, after moving the shared button rule into the base layer, they would have looked like blue buttons with a border. The other buttons on those pages were checked: they either already set a background or use the secondary/danger classes",
    ]},
    { version: "0.94", date: "2026-09-28 15:40", changes: [
        "Fixed the left sidebar on every pilot page. Two causes: the Log out button was being squashed to 12–18px tall (menu items shrank instead of scrolling) — the menu now scrolls and items keep their size; and the shared `button {}` rule in style.css overrode every Tailwind class on buttons (on Goals/Skills/Calendar/Shop etc. the logout and EN/RU buttons looked broken) — it now lives in the base layer and no longer interferes",
        "Menu links cleaned up: Workouts, Community, Languages, Challenges and Account now point at the new *-vue/ pages everywhere (some pages still linked to the old .html files, and Account to /account.html). Dashboard intentionally stays on the old /dashboard.html until the pilot has daily metrics and the plan. The Account menu item now has an icon",
    ]},
    { version: "0.93", date: "2026-09-28 09:50", changes: [
        "Dashboard pilot: charts now cover body parameters and numeric/sets metrics (with the metric's own goal as a reference line), not just points per day. \"Configure charts\": pick which charts to show, their order, a reference line per chart and the shared period; the choice is saved to your profile (same dashboard_charts field as on the classic site). Each chart also gets its own period, and values can be edited right from the chart (not for points and sets, same as before)",
        "Profile and Charts stay in sync: adding/editing/deleting a body parameter or fixing a value from a chart refreshes the other block. Charts now read history page by page, so long histories are no longer cut off at 1000 rows",
        "Covered by 33 new tests (series building checked by hand against the original: order of series, points per day, sets sums, saved-selection formats)",
    ]},
    { version: "0.92", date: "2026-09-28 09:25", changes: [
        "Dashboard pilot: added the Profile block — avatar (photo upload), age with date-of-birth editing, latest body-parameter values with change since the first entry (coloured by your goal: e.g. weight going down is green when losing weight), points balance linking to the shop, and body-parameter management (add / edit / delete, icon picker). Own components, composable and 36 tests (lib/profile.ts, balance.ts, useProfile.ts, ProfileSection.vue)",
        "Points balance and body-parameter history are read page by page, so they no longer get cut off at 1000 rows",
        "Not ported yet: entering body-parameter values inside the day card (waits for the daily-metrics block; useProfile exposes saveBodyValue for it) and the body-parameter charts",
    ]},
    { version: "0.91", date: "2026-09-28 10:20", changes: [
        "Dashboard pilot: added reminder banners — \"Milestones\" (how many are overdue and how many are due within a week, dismissible until end of day) and a Saturday/Sunday \"Weekend check-in\" when the week isn't at 100% yet. Its own component, composable and tests (lib/reminders.ts, useReminders.ts, ReminderBanners.vue) to stay clear of other agents' blocks",
        "Merged with the charts, metrics management and sets blocks that moved over in parallel (v0.86–v0.90): the only conflict was in App.vue, both sides kept, all 148 tests and the build re-checked",
    ]},
    { version: "0.90", date: "2026-09-28 04:01", changes: [
        "Dashboard pilot: charts block — shared chart infrastructure (missing days drawn dashed, long histories bucketed, goal line, period picker: 10 days / week / last week / month / all time / custom, remembered between visits) and the first chart, \"points per day\"",
        "The logic (prepareChartSeries, periodBounds, the points series) is covered by tests checked against the original config.js/dashboard.js; ChartBlock and PeriodPicker are standalone components that other pilot pages (Community, Workouts) can reuse",
        "Not ported yet: body-measurement and per-metric charts with series selection and editing values right from the chart — waiting on the Profile block",
    ]},
    { version: "0.89", date: "2026-09-28 03:57", changes: [
        "Look and feel: every Vue pilot page now shows our flame instead of the default blue Vite lightning bolt (browser tab and header logo) - in blue and orange, so the Vue versions are instantly distinguishable from the old pages with the orange flame. Removed the unused Vite/Vue template logos from the pilot folders",
        "If you still see the bolt, the tab icon is cached - a hard refresh fixes it",
    ]},
    { version: "0.88", date: "2026-09-28 03:52", changes: [
        "Pilot rebuild of Workouts on Vite + Vue 3 + TypeScript + Tailwind at /workouts-vue/, iteration 1 of 2: add/edit/delete exercises (categories, weight, duration, left/right side), logged entries with sets, personal records (by weight and by pace, split by side), category grouping with collapsing, and the workout-template catalog",
        "Charts (the per-exercise progress mini-chart and the overall training-volume chart) still live on the old page for now - that's iteration 2",
    ]},
    { version: "0.87", date: "2026-09-28 12:30", changes: [
        "Dashboard pilot: added the Sets block (metrics of type sets, e.g. push-ups) — a collapsible card with a list of sets: time (filled in automatically when added, editable), reps, and a \"variation\" field with a dropdown of saved options (each has a ✕ to remove a wrong one). A summary line \"N sets · M reps total\" and autosave on every edit",
        "The block isn't tied to day navigation: SetsSection takes a date (default today) and SetsCard is purely presentational, so the daily-metrics block can drop it into its own list. Separate files (lib/setsBlock.ts, lib/useSets.ts, SetsCard/SetsSection/VariationCombo, their own tests — 20 new), App.vue only gets an import and one line",
    ]},
    { version: "0.86", date: "2026-09-28 11:10", changes: [
        "Dashboard pilot: added the Metrics management block (web-dashboard/) — a ⚙️ button opens the metrics list with edit and delete, and a create/edit form with every field of the full site: type (number/checkbox/multiselect/sets), goal and its direction, unit, options, input mode, schedule (every day / weekdays / at least N / at most N times a week), category (with creating a new one), streak import, and an icon picker with search",
        "Separate files (lib/metricsManager.ts, lib/useMetricsManager.ts, three components, their own tests — 34 new), App.vue only gets an import and one line. The Metric type gained optional options/input_mode fields. Schedule and streak import are still skipped when migrations 021/026 haven't been applied",
    ]},
    { version: "0.85", date: "2026-09-28 09:55", changes: [
        "Dashboard pilot: ported day/week progress (theme-colored rings + settings — what counts, where it shows) on top of the streaks block ported earlier — lib/progress.ts/progressSettings.ts, 17 new tests",
        "Merged with the Water block that moved over in parallel (agent 4, v0.84) — both blocks touched web-dashboard/src/App.vue and i18n.ts at the same time, resolved by hand (kept both sides, nothing lost), all 80 tests and the build re-checked after merging",
    ]},
    { version: "0.84", date: "2026-09-28 09:50", changes: [
        "Dashboard pilot: added the Water block (web-dashboard/, alongside the day/week progress block another agent is porting in parallel — see ROADMAP.md) — a glass badge with the same wave animation by percent of the goal as the full site, a modal for quick add (+200ml/+1l/custom), picking a past date, a daily goal (manual or auto from the latest weight ≈30ml/kg — 17 tests on lib/water.ts)",
        "Built as its own composable (lib/useWater.ts) and its own test file, without touching lib/useDashboard.ts or the shared smoke.test.ts — to avoid colliding with the other Dashboard blocks being ported in the same pass",
    ]},
    { version: "0.83", date: "2026-09-28 09:15", changes: [
        "Challenges pilot: web-challenges/ → challenges-vue/ on Vite + Vue 3 + TypeScript + Tailwind. A catalog of 6 ready-made presets plus a custom challenge in 4 flavors — fixed daily target (100 push-ups/day), growing daily target (+5/day), a daily habit checkbox (no sugar), and a cumulative counter with a list (100 books)",
        "Per-day dots — 30 progress dots across the whole challenge, today highlighted; cumulative challenges get a progress bar and an entry list with notes and delete. A \"mark completed\" button once the target or duration is reached. 19 business-logic tests (lib/challenges.ts) + 8 component smoke tests",
        "Also continued B-nav-fix: links to /challenges.html were fixed to /challenges-vue/ across every already-migrated page (History, Calendar, Community, Goals, Account, Languages, Milestones, Shop, Skills) — except Dashboard, which is currently under active separate work",
    ]},
    { version: "0.82", date: "2026-09-28 08:20", changes: [
        "Started moving the Dashboard to Vite + Vue 3 + TypeScript + Tailwind (the biggest, most complex page — ported over several iterations, see ROADMAP.md, ticket B-dashboard). The pilot is honestly marked as unfinished: a banner up top links back to the full Dashboard for anything not moved yet",
        "First iteration — the streaks block: perfect days in a row, per-metric streaks (including \"at least/at most N times a week\" schedules and streaks imported before the move), day-note-filled streak. The business logic (lib/metrics.ts + lib/streaks.ts) was ported verbatim from dashboard.js and covered by 41 tests before any markup was written, to keep it from drifting from the original's math",
        "Next iterations: day/week progress, charts (which, as it turned out while porting Community, the friend-comparison section also depends on), daily metrics and water",
    ]},
    { version: "0.81", date: "2026-09-27 17:32", changes: [
        "Sixth step of the gradual move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of Community, kept separate from the live site at /community-vue/",
        "Friends (search by email/nickname, follow/unfollow), leaderboard (everyone / friends only, medals for the top 3, streak), a \"what they did today\" feed, public profile (name + leaderboard visibility)",
        "The \"Compare by activity\" section (per-metric comparison with friends + a personal chart) was NOT ported this round — it depends on the dashboard's charting infrastructure, which no pilot has yet; the link to the vanilla page still works for viewing it in the meantime",
    ]},
    { version: "0.80", date: "2026-09-27 17:27", changes: [
        "Sixth step of the move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of Languages (formerly english.js/html) at /languages-vue/ - a word dictionary with a per-language filter, add/edit with auto-translate (MyMemory), and a \"learned\" toggle",
        "The link to this page in every other pilot's menu (History, Milestones, Calendar, Goals, Skills, Account, Shop) now points to /languages-vue/ instead of /english.html - the vanilla page itself still keeps its old name for now; renaming its files is a separate, later task",
    ]},
    { version: "0.79", date: "2026-09-27 13:05", changes: [
        "Small pilot cleanup, not tied to a new page: fixed menu links that still pointed at /skills.html and /shop.html instead of the current /skills-vue/ and /shop-vue/ (History, Calendar, Milestones, Goals, Skills, Account), and caught up /goals-vue/ and /calendar-vue/ in the Account menu too",
        "The Milestones pilot now has real CSS for its buttons (default/secondary/danger) and modals — the markup referenced these classes already, but they weren't defined, so the buttons looked like unstyled browser defaults",
    ]},
    { version: "0.78", date: "2026-09-27 12:37", changes: [
        "Fifth step of the gradual move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of the points Shop, kept separate from the live site at /shop-vue/",
        "The balance card (earned/spent/remaining) uses the exact same formula as the dashboard — metrics across every day, done goals, mastered skills, finished books; an item grid with an image (paste a link or upload a file), buying, editing and deleting",
        "Same login, theme, header and menu as the other pilot pages; the balance math is covered by tests checked against the original config.js",
    ]},
    { version: "0.77", date: "2026-09-27 12:27", changes: [
        "Fixed a bug: the offline-mode service worker (v0.72) broke navigation to links like /goals.html, /shop.html etc. with a \"site can't be reached\" error — Cloudflare redirects those addresses to their short, extension-less form, and browsers refuse to satisfy a link navigation with an already-redirected response. Before the service worker existed, the browser just quietly followed the redirect itself",
        "Account pilot (web-account/ → /account-vue/): change password, change email, link a Google account — the fifth page ported over",
        "The header/menu icons (from the shared module in v0.73) only ever made it into the History pilot — backported them into Milestones, Calendar, Goals and Skills too, so every pilot page now shows real icons instead of plain text",
        "Also fixed a few menu links (Goals/Calendar/Milestones) that in some pilots still pointed at the old vanilla pages instead of the current *-vue/ addresses",
    ]},
    { version: "0.76", date: "2026-09-28 07:55", changes: [
        "Another step of the move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of Skills, kept separate from the live site at /skills-vue/",
        "Skills: a progress bar with a ±N% step per click, a \"mastered\" toggle, quick-idea suggestion chips, an add/edit form; separately — books (want-to-read/read, a \"done\" toggle, a form with author and points)",
        "Same login, theme, header and menu as the other pilot pages; the progress bar and suggestion list are covered by tests checked against the original skills.js",
    ]},
    { version: "0.75", date: "2026-09-27 07:44", changes: [
        "Fourth step of the gradual move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of Goals, kept separate from the live site at /goals-vue/",
        "Active goals grouped by category (with a progress bar for multi-stage ones, difficulty and deadline-urgency chips), points earned so far, completed goals listed separately; a full add/edit form with every field",
        "Same login, theme, header and menu as the other pilot pages; the progress and deadline-urgency math is covered by tests checked against the original goals.js",
    ]},
    { version: "0.74", date: "2026-09-27 07:20", changes: [
        "Third step of the gradual move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of the Calendar, kept separate from the live site at /calendar-vue/",
        "Month grid with progress badges (day's plan done/partial), month navigation, a day-plan modal — add items, mark done, delete, save",
        "Same login, theme, header and menu as the other pilot pages; the month-grid layout is covered by tests checked against real weekdays",
    ]},
    { version: "0.73", date: "2026-09-27 03:15", changes: [
        "History pilot: shared icon module (src/lib/icons.ts, all 120 icons + search keywords, byte-checked against config.js) plus Icon.vue/MetricIcon.vue/IconPicker.vue components — same picker grid, search and custom-emoji fallback as buildIconPicker()",
        "Fixed a real pilot display bug along the way: a metric with an svg: icon was showing the literal text \"svg:dumbbell\" instead of the icon (DayDetailModal now uses MetricIcon); nav sidebar/quick-nav also gained the real icons instead of text-only labels",
        "Icon module still duplicated per pilot (web-history/ only for now), not yet a shared npm-workspace package — that question is still open, see B2 in the roadmap",
    ]},
    { version: "0.72", date: "2026-09-27 23:20", changes: [
        "First step of offline mode (\"local, no sync\" variant): the History and Milestones pages now show the last saved data when the network drops — previously they'd just show a load error. Also added a service worker that caches the app's static shell (HTML/JS/CSS/icons), so pages open even with no connection",
        "Also hardened offline sign-in: previously, if the network dropped during the \"has this user finished onboarding\" check, they'd be wrongly bounced to the onboarding screen",
    ]},
    { version: "0.71", date: "2026-09-27 02:43", changes: [
        "Fixed a bug: the update-history text arrays (RU/EN) were swapped for versions 0.60–0.70 — Russian text showed up with the interface set to English and vice versa. The wording itself didn't change, just which array it lives in",
        "Versions 0.59 and older were not affected",
    ]},
    { version: "0.70", date: "2026-09-27 02:27", changes: [
        "History pilot (/history-vue/): install app, welcome tour (7 steps) and \"about the project\" ported into AppShell.vue, matching the vanilla site's modals",
        "Note: CHANGELOG_RU/CHANGELOG_EN content is still swapped (see C-changelog-bug) — this entry keeps the same swap on purpose until that gets fixed",
    ]},
    { version: "0.69", date: "2026-09-27 22:50", changes: [
        "Milestones pilot: reached full display parity with the vanilla page — interval label (\"every N months\"), last-time chip (with mileage), and next-mileage chip now shown under each milestone, same as milestones.js",
    ]},
    { version: "0.68", date: "2026-09-27 22:35", changes: [
        "Milestones pilot: history modal for each milestone — past completions (date, mileage, note), newest first, matching the vanilla page's History button",
    ]},
    { version: "0.67", date: "2026-09-27 22:15", changes: [
        "Milestones pilot: add/edit form with every field (category, last time, repeat interval and unit, due date, mileage at last time / repeat every, note) — same rules as the vanilla page, a set interval recalculates the due date automatically",
        "Marking a milestone done now asks for the date, mileage and a note (was a quick one-click confirm before) and edit/delete are now available for completed one-off milestones too, not just active ones",
    ]},
    { version: "0.66", date: "2026-09-27 21:40", changes: [
        "Second step of the gradual move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of the Milestones page, kept separate from the live site at /milestones-vue/",
        "Active milestones grouped by category with an overdue/today/due-soon status chip, completed one-offs listed separately, mark-as-done and delete actions; add/edit forms with all fields (interval, km, history) are a follow-up iteration",
        "Same login, theme, header and menu as the History pilot; the underlying due-date math is covered by tests checked against the original page's numbers",
    ]},
    { version: "0.65", date: "2026-09-26 12:40", changes: [
        "The Vue pilot (/history-vue/) got its own header and swipeable side menu, matching the rest of the site — the menu links to all the other (still vanilla) pages, plus language and theme switchers and logout",
        "Install app / guided tour / about-the-project are intentionally not ported into the pilot yet — a later iteration if the pilot sticks",
    ]},
    { version: "0.64", date: "2026-09-26 11:15", changes: [
        "First step of the gradual move to Vite + Vue 3 + TypeScript + Tailwind: a pilot rebuild of the History page, kept separate from the live site at /history-vue/ while it's being tried out — nothing on the current site changed",
        "The pilot reuses the exact same login (same Supabase project, same browser session) and the same 4 themes, and its day/week percentage math is covered by tests checked against the original page's numbers",
        "Stack-migration commits will only bump the version by 0.01 each, regardless of how much work they contain",
    ]},
    { version: "0.63", date: "2026-09-25 18:20", changes: [
        "The metric icon picker grew from 44 to 90 icons — added stretching, boxing, jump rope, weight plate, treadmill, skiing, health (bandage, thermometer, eye, lungs), food and drink (tea, water bottle, pizza, salad, bread), home and chores, finance, gifts, weather and nature, travel, tech, hobbies, pets and more",
        "A search field above the grid finds icons by name in Russian or English (e.g. \"бег\" or \"run\"), including synonyms — no need to scroll through the whole set",
        "No migration needed — this only changes what's offered in the picker",
    ]},
    { version: "0.62", date: "2026-09-25 17:35", changes: [
        "Exercises done one side at a time can now track left/right separately (⚙️ on the exercise → \"Track left/right separately\"): each set gets an L/R toggle, and new sets alternate sides by default",
        "Personal records split by side for these exercises — best set and best pace for the left arm/leg and the right, shown as separate lines instead of one mixed number",
        "Requires migration migrations/028_exercise_bilateral.sql; without it, everything works as before and the toggle just isn't offered",
    ]},
    { version: "0.61", date: "2026-09-25 17:05", changes: [
        "Exercises can now also log duration per set (⚙️ on the exercise → \"Also log duration\"): a set becomes \"5 km in 30 min\", and the app shows the pace (value per hour — km/h for running, etc.)",
        "Two personal-record lines instead of one where it applies: the best single set (furthest run, heaviest lift) and, for duration-tracked exercises, the best pace — since they're rarely from the same session",
        "Requires migration migrations/027_exercise_duration.sql; without it, everything works as before and duration just isn't offered",
    ]},
    { version: "0.60", date: "2026-09-25 16:20", changes: [
        "Import an existing streak: a metric can now say \"I already had a streak of N days\" (set in its ⚙️); it keeps counting from today and stops applying the first day you miss",
        "Languages: an explicit \"translate to\" language, separate from the word's own language",
        "Workouts: a personal-record line under each exercise — the best single set by weight (or reps for bodyweight exercises)",
        "A \"↺ Unfinished from previous days\" button in today's plan: pick from the last 7 days' undone items instead of losing them once the day rolls over",
        "A thin accent-colored bar highlights metrics still needed today, so what's left before 100% stands out",
        "Checkboxes and radio buttons everywhere now follow the theme's accent color, not just in dialogs",
        "The status bar / address bar color now matches the theme from the very first frame — it used to briefly show the wrong color while the page loaded",
        "The streak flame gets a faint outline in the Monet theme so it doesn't blend into the dark corner",
        "More emoji replaced with SVG icons: the mini-calendar's day badge, skill/leaderboard point stars, leaderboard medals (gold/silver/bronze), a shop item's link icon, the vocabulary translate button, the admin checkmark",
        "The portfolio site got its own favicon (a \"VK\" monogram) instead of reusing the dashboard's flame",
        "Changelog entries now include the time, not just the date",
    ]},
    { version: "0.59", date: "2026-09-24", changes: [
        "SVG icons for metrics and body parameters: the forms now have a grid of 44 icons instead of a text field (push-ups, pull-ups, squats, running, walking, cycling, swimming, yoga, sleep, water, food, coffee, book, code, pulse and more); you can still type your own emoji",
        "Known emoji (💧, 💪, 🏋️, 🚶, 🏃, 📚, ⚖️, ❤️ and others) are already drawn as their SVG counterpart — without changing your data; unknown ones stay as they are",
    ]},
    { version: "0.58", date: "2026-09-24", changes: [
        "New \"History\" section: a month calendar where each day is filled bottom-up by its completion percentage (100% is solid green, an overachieved day with bonuses gets a gold border). Each row shows the week's percentage at the end; above the calendar are the month's average, the number of perfect days and days tracked",
        "Tap a day for details: the percentage, every metric's value (sets with times, numbers against the goal, chosen options), plan completion and notes. Months flip with buttons or a swipe; below are the last 8 weeks as progress bars",
        "Percentages are calculated exactly like the circles on the dashboard: the same settings, metric schedules and bonuses. No migrations needed",
    ]},
    { version: "0.57", date: "2026-09-24", changes: [
        "Day and week progress live in one dialog (the ⚙️ by the avatar or a click on either circle): you choose separately where the day circle goes (around the avatar / header / hidden) and where the week circle goes (next to the profile / header / hidden). Your previous setting is carried over automatically",
        "The leaderboard and the category comparison in Community respect metric schedules: \"certain days\" and \"N times a week\" metrics no longer break a streak on days they aren't due. Requires migration migrations/023_leaderboard_schedule.sql",
        "In \"Languages\" every word has a language (20 languages), the list can be filtered by language, and auto-translate goes from the chosen language to the interface language. Requires migration migrations/024_vocabulary_language.sql, all existing words stay English",
        "More SVG icons on the main page: hide/show block, chart period, avatar placeholder, balance, age, bonus star, warning and the drop in the water dialog",
    ]},
    { version: "0.56", date: "2026-09-24", changes: [
        "Faster loading: the metrics list and the whole history of values/notes are now loaded once and cached; after a write only the affected days are refreshed. Before, every tick and every set re-downloaded the whole history",
        "History is now read page by page: Supabase caps a response at 1000 rows, and without this streaks and charts for long-time users could be computed from truncated data",
        "Scripts load with defer and the servers are pre-connected (preconnect): pages appear sooner",
    ]},
    { version: "0.55", date: "2026-09-24", changes: [
        "The streak flame now burns in the colors of the chosen theme and flickers slightly; if today's streak isn't counted yet it is a dim dashed outline. Fixed the bug where the flame got duplicated when entering a new set",
        "The gear next to the avatar is now high-contrast and visible on any background",
        "The water glass was redrawn: glass with a highlight, water with a gradient and a wave, gold at 100%",
        "Water was removed from the daily metrics list — only the glass in the header tracks it",
        "The set time field and the date/time pickers now match the theme (they used to be plain white)",
        "\"How it works\" can be flipped with swipes (and arrow keys) with a smooth transition",
        "The \"English\" section was renamed to \"Languages\": you can track more than English",
    ]},
    { version: "0.54", date: "2026-09-24", changes: [
        "New section \"Milestones\": recurring things with a date — a car's oil change and consumables, a doctor visit, etc. Note when you last did it and how often to repeat (days/weeks/months/years), optionally the mileage; the page calculates the next due date, highlights overdue and upcoming ones and keeps a completion history. The \"done\" button moves the milestone to its next due date",
        "The dashboard shows a banner when milestones are overdue or due within a week (can be hidden until tomorrow)",
        "Requires migration migrations/022_milestones.sql (run once in Supabase → SQL Editor)",
    ]},
    { version: "0.53", date: "2026-09-24", changes: [
        "Second wave of SVG icons: page and block headings, dialog titles and button labels (\"Add\", \"Configure\", etc.) now use icons instead of emoji too. New icons: check, star, book, list, chart, note, trophy, medal, lock",
        "Your own names, categories and metric emoji are still shown exactly as you entered them",
    ]},
    { version: "0.52", date: "2026-09-24", changes: [
        "\"Ragged\" daily metrics: a metric can now have a schedule — every day, only on chosen weekdays, or at least N times a week (set in the metric's ⚙️)",
        "A weekday-scheduled metric's streak doesn't break on days it isn't due; \"perfect day\" only considers metrics due that day. \"N times a week\" metrics count their streak in weeks (wk), and it is flagged at risk when the quota can only be met by doing it every remaining day",
        "Day and week percentages no longer penalize off-schedule metrics: they count only when done, and \"N times a week\" counts as N items for the week",
        "Requires migration migrations/021_metric_schedule.sql (run once in Supabase → SQL Editor); the leaderboard streak is calculated as before",
    ]},
    { version: "0.51", date: "2026-09-24", changes: [
        "A unified set of SVG icons replaces emoji across the interface: navigation (header and side menu), edit/delete/settings/close/add buttons, points, the streak flame and the water drop. Icons follow the theme color and scale with the text",
        "Icons you pick yourself for metrics and body parameters stay emoji — that's your data",
    ]},
    { version: "0.50", date: "2026-09-24", changes: [
        "Goals now have a deadline and a difficulty (easy/medium/hard). Chips under the goal name show how many days are left (amber at 3 days or less, red when due today or overdue) and the difficulty",
        "Goals inside a category are sorted by the nearest deadline; goals without one go last",
        "Requires migration migrations/020_goal_deadline_difficulty.sql (run once in Supabase → SQL Editor); everything else keeps working without it",
    ]},
    { version: "0.49", date: "2026-09-24", changes: [
        "Welcome tour for new users: 7 short steps covering the dashboard, goals, skills, workouts, challenges, shop, community and calendar. Shown once right after onboarding",
        "The tour can be reopened any time: the side menu has a new \"How it works\" item",
    ]},
    { version: "0.48", date: "2026-09-24", changes: [
        "Water can be logged for past days: the water dialog has a date picker. The circle, streak, charts and week update instantly, no reload needed",
        "Every set now records its time: it is filled in automatically when you enter the reps and can be edited by hand (dashboard and the Workouts page)",
        "The \"About\" section became \"About the creator\": short info about the author and a link to the portfolio",
        "The monochrome icon for Android themes was rebuilt: the silhouette now sits fully inside the safe zone, a 192 size and an explicit app id were added. To pick it up, remove the app from the home screen and add it again",
        "Small thing: changing the water goal in the dialog now recalculates the bar right away, and the bar turns gold at 100%",
    ]},
    { version: "0.47", date: "2026-09-24", changes: [
        "The week circle can now live in the header: the progress settings (⚙️) have a new \"Week circle in the header\" option. It differs from the day circle by a dashed track and a \"wk\" label",
        "The weekend reminder no longer picks a random goal: it just shows the current percentage and a link \"Do something from your goals to reach 100%\" that leads to the goals page",
    ]},
    { version: "0.46", date: "2026-09-24", changes: [
        "Logout icon (door) removed from the header — logout lives in the side menu again. Logging out now leads to the login page instead of the portfolio",
        "The progress circle and the water glass are pinned to the right edge of the header in a fixed order and no longer jump around",
        "The water glass turns gold at 100% of the daily goal",
        "The streak flame is solid once today's streak is counted (dashed only stays as an at-risk warning)",
        "The gear next to the avatar is round again instead of a stretched oval",
        "The \"Back to portfolio\" link on the login page is properly styled",
    ]},
    { version: "0.45", date: "2026-09-22", changes: [
        "Week now runs Monday-Sunday instead of Saturday-Friday",
        "The unfinished-week hint moved out of the permanent circle — now a reminder banner that only shows up on Saturday/Sunday if the week isn't at 100% yet",
        "Logout icon (open door) in the top-right corner of the header — no need to dig into the side menu just for that",
        "Clicking the points (💰) in the profile takes you to the shop",
        "Streak icon is now an outline/dashed SVG instead of a solid emoji; turns crimson if today isn't counted yet, and clicking it spells out that the streak is at risk. Also fixed a bug where the streak wouldn't update without a page reload",
        "New widget — water tracker in the header: a glass that fills up through the day, +200ml/+1L/+custom buttons, daily goal calculated from weight automatically or set manually",
    ]},
    { version: "0.44", date: "2026-09-22", changes: [
        "App icon: added a monochrome variant — on Android with a system dark/themed look (Material You), the icon now blends in like other apps instead of always keeping its own background",
        "Day progress now has two display modes (via ⚙️): a ring around the avatar (as before) or a separate filling circle with the percentage in the page header",
        "Added week progress — a separate circle next to the avatar, same logic as the day one but over 7 days. The week runs Saturday through Friday. If the week isn't finished, a hint next to it suggests an unfinished goal to wrap up",
    ]},
    { version: "0.43", date: "2026-09-22", changes: [
        "Checking a plan item / toggling its star / saving today's metric no longer redraws the whole Profile card — only the day-progress ring itself updates, without the block vanishing and reappearing",
    ]},
    { version: "0.42", date: "2026-09-21", changes: [
        "Fixed the profile block duplicating itself on rapid successive changes (e.g. toggling the star several times quickly) — overlapping refresh calls now collapse into one instead of stacking up copies",
        "The bonus ring now draws on top of the base ring at the same radius (not a separate smaller inner ring), colored crimson instead of green",
        "Added an on-page hint in \"Planned for today\" explaining what the ⭐ star does — previously that was only discoverable via a hover tooltip",
    ]},
    { version: "0.41", date: "2026-09-21", changes: [
        "\"Planned for today\" no longer rebuilds the whole list when checking an item or toggling its star — only that one row updates, no more jarring whole-block redraw",
    ]},
    { version: "0.40", date: "2026-09-21", changes: [
        "Fixed ⭐ bonus items — they only counted before if \"Planned for today\" was included in the base 100% of the day-progress settings, so with the \"goal tracker\" onboarding path (metrics only) the bonus never triggered and 100% couldn't be exceeded. Bonus now counts always, regardless of that setting",
    ]},
    { version: "0.39", date: "2026-09-21", changes: [
        "Logo: reverted to flat colors instead of the gradient, and fixed it being off-center — now centered and fills the icon shape better",
        "Day-progress ring now updates instantly, no page reload needed — right when a metric is saved or a plan item is checked off",
        "Added a percentage number as text under the avatar; the settings gear badge is cleaner now (emoji properly centered)",
        "\"Planned for today\" items now have a ⭐ \"bonus item\" star — it doesn't count toward the base 100%, but adds +20% on top when completed, shown as a second ring in a different color — a way to go past 100%",
        "Each chart now has its own period (🗓️ button next to it) — use the shared one from \"Configure charts\" or set a custom range just for that chart",
    ]},
    { version: "0.38", date: "2026-09-20", changes: [
        "Fixed the NaN% bug in the day-progress chart — the code had two definitions of the same function, the old one was winning, hence the NaN and the invisible settings gear",
        "Day-progress chart moved from its own block onto a ring around the avatar — 100% draws a full ring around the photo, 50% half, and so on. The settings gear is a small icon on the ring's corner now",
    ]},
    { version: "0.37", date: "2026-09-20", changes: [
        "Dropdown lists (select and set-variation) now position relative to the screen instead of their block — in tight spots there used to be no room above or below and the list couldn't be scrolled on phone. Its height now always fits the actually available space and scrolls properly",
    ]},
    { version: "0.36", date: "2026-09-20", changes: [
        "Flame logo shape is leaner now — removed the \"balloon\" look at the bottom, reads more like an actual flame",
        "Day-progress chart moved into the Profile block (was in \"Planned for today\") — now draws from both daily metrics and today's plan, configurable via ⚙️ next to it (including hiding it entirely)",
        "New first onboarding question — \"How do you plan to use this?\" (goal tracker / daily planner / both). Choosing \"planner\" hides the fitness fields (height/weight/goal/metrics) right away since they're not needed for a plain to-do list",
    ]},
    { version: "0.35", date: "2026-09-20", changes: [
        "New logo — same flame, now with a gradient and depth instead of a flat fill (icon, favicon, PWA — updated everywhere)",
        "Workouts now support adding your own category with any name — besides the Upper/Lower/Full body/Custom presets there's a \"➕ Add my own category…\" option",
        "Dashboard's \"Planned for today\" block now has a circular chart showing what % of today's plan is already done",
    ]},
    { version: "0.34", date: "2026-09-19", changes: [
        "Exercise category in workouts is now a fixed set of choices: Upper / Lower / Full body / Custom (plus \"no category\") — instead of free text, so groups don't split apart over typos or capitalization",
        "Workout category groups now sort in a fixed order (Upper → Lower → Full body → Custom → legacy categories → uncategorized) instead of insertion order",
        "Every select field in modals (not just the metric \"Type\") now uses the custom dropdown instead of the native picker",
    ]},
    { version: "0.33", date: "2026-09-19", changes: [
        "Fixed the clipped, unclickable \"set variation\" dropdown on the last row of the table — it now opens upward on its own when there's not enough room below inside the scrollable table",
    ]},
    { version: "0.32", date: "2026-09-19", changes: [
        "The \"set variation\" field now has a ▾ arrow on the right — click it to see the full list of saved variations right away, without typing first",
    ]},
    { version: "0.31", date: "2026-09-19", changes: [
        "Shortened the profile row to fit on one line: \"💰 Balance: 120\" → \"💰 120\", dropped \"since start\" from the body-metric deltas — just \"(+1.0kg)\" now, age now reads \"29 years\" instead of \"Age: 29\"",
    ]},
    { version: "0.30", date: "2026-09-19", changes: [
        "Account page — removed the leftover narrow width cap on its cards, now matches every other page",
        "Password show/hide toggle — a proper SVG icon instead of an emoji, matching the usual pattern",
        "Fixed broken CSS: checkboxes (community profile visibility, calendar plan items) no longer stretch to half the block's width",
        "Workouts: exercises now group by category (the existing \"Category\" field on each exercise — write \"Upper\", \"Lower\", \"Full body\" or whatever fits), each group collapses independently",
    ]},
    { version: "0.29", date: "2026-09-18", changes: [
        "Sign in with Google on the login page (button below the form) — works once the Google provider is configured in Supabase, see README",
        "Link Google to an existing account — in Account, for anyone who signed up by email and now wants to also sign in with Google",
        "Eye icon to show/hide the password — on login, sign-up, and the account password change",
        "Charts with no data no longer render empty — the section auto-collapses when there's nothing to show and auto-expands once data appears (as long as the section hasn't been toggled by hand)",
        "Replaced the home icon in quick nav with the actual logo (the flame)",
        "Quick-nav toggle button is now plain text >>> instead of special characters",
        "The \"Type\" dropdown in the metric form (including \"Sets\") now uses a custom-built dropdown instead of a native select — in case the system picker misbehaves inside an installed PWA",
        "\"About\" moved to the very bottom of the sidebar menu; links inside modals now use the site's accent color instead of default blue",
    ]},
    { version: "0.28", date: "2026-09-18", changes: [
        "Added a \"📲 Install app\" item to the sidebar — on Android/desktop Chrome it opens the native install dialog right away; on iPhone/iPad and other browsers it shows clear step-by-step instructions instead (iOS has no native install prompt at all — that's an iOS limitation, not this app's)",
        "Added iOS web-app meta tags so the app opens full-screen with a proper icon once added to the Home Screen on iPhone",
    ]},
    { version: "0.27", date: "2026-09-18", changes: [
        "The dashboard is now a PWA — installable on Android as an app (\"Install\" / \"Add to Home Screen\" in Chrome): its own icon, full-screen launch with no address bar, status-bar color matches whichever theme is selected",
    ]},
    { version: "0.26", date: "2026-09-18", changes: [
        "Removed the \"← Portfolio\" sidebar link (no longer relevant now the projects are split) — replaced with \"About\": a link to the portfolio plus a feedback contact",
    ]},
    { version: "0.25", date: "2026-09-18", changes: [
        "Fixed the deploy: without an index.html at the root, Cloudflare Workers couldn't find any static files and the build failed. Brought index.html back as a lightweight stub that instantly redirects to /login.html",
    ]},
    { version: "0.24", date: "2026-09-18", changes: [
        "Wired in the real portfolio URL instead of the placeholder, added a redirect from the site root to the login page",
    ]},
    { version: "0.23", date: "2026-09-18", changes: [
        "The portfolio has been split into its own repo and will live on its own deployment — index.html/portfolio.css removed from this repo, portfolio links temporarily point to a placeholder until the real URL is wired in",
    ]},
    { version: "0.22", date: "2026-09-17", changes: [
        "The \"set variation\" dropdown in the sets-metric card (e.g. \"Push-ups\") is now a custom combobox instead of the native datalist — each suggestion has a ✕ to remove a mistyped entry right there, without going into metric settings",
    ]},
    { version: "0.21", date: "2026-09-17", changes: [
        "Removed line-wrapping from the quick nav — expanded icons now stay on one row next to the »»» button",
    ]},
    { version: "0.20", date: "2026-09-17", changes: [
        "Quick nav is hidden behind the »»» button again, but now opens to show all icons at once on a new line — no partial view, no scrolling",
    ]},
    { version: "0.19", date: "2026-09-17", changes: [
        "Top navigation no longer collapses — all section icons are visible right away, wrapping to a second line instead of scrolling when space is tight",
        "Cleaned up the repo README and removed the internal chat-handoff file",
    ]},
    { version: "0.18", date: "2026-09-17", changes: [
        "Quick-nav toggle button is now \"»»»\" instead of an ellipsis",
        "Full pass on site translation: theme switcher, login/signup messages, default weight unit in workouts — now bilingual",
        "The sidebar's update history is now translated into English too",
    ]},
    { version: "0.17", date: "2026-09-17", changes: [
        "Top navigation redesigned: only the home icon stays in the bar, the other sections slide out in a panel via the »»» button",
    ]},
    { version: "0.16", date: "2026-09-17", changes: [
        "⚙️ icon instead of the \"Customize dashboard\" button — sits plainly next to the title, no background",
        "Email change added to the Account section",
        "Quick emoji navigation in the top bar (🏠 — home, larger than the rest)",
        "Update history available by clicking the version number in the sidebar",
    ]},
];
const CHANGELOG = getLang() === "en" ? CHANGELOG_EN : CHANGELOG_RU;

// Возвращает текущую сессию или null
async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
}

// Для защищённых страниц (дашборд/цели/навыки/магазин):
// если не залогинен — уводит на /login/
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = "/login/";
        return null;
    }
    return session.user;
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = "/login/";
}

// Текущее время "ЧЧ:ММ" — для отметки времени подхода
function nowHHMM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function fmtDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// DD.MM — для подписей на графиках, из строки "YYYY-MM-DD"
function fmtChartLabel(isoDateStr) {
    const parts = isoDateStr.split("-");
    return `${parts[2]}.${parts[1]}`;
}

// DD.MM.YYYY — для отображения дат (выполнено/куплено и т.д.)
function fmtRu(isoDateStr) {
    if (!isoDateStr) return "";
    const parts = isoDateStr.split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function addDaysIso(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return fmtDate(d);
}
function todayStr() {
    return fmtDate(new Date());
}

// ---- Баллы ----

// Числовое значение метрики независимо от формата хранения — обычное число, или сумма
// reps по всем подходам (для типа "sets"). Совпадает по смыслу с SQL-функцией
// metric_numeric_value() в migrations/018 — держать логику одинаковой на клиенте и сервере.
function metricNumericValue(metric, value) {
    if (value == null) return null;
    if (metric.type === "sets" && Array.isArray(value)) {
        return value.reduce((sum, s) => sum + (s?.reps || 0), 0);
    }
    return typeof value === "number" ? value : null;
}

function isMetricDone(metric, value) {
    if (value === null || value === undefined) return false;
    if (metric.type === "boolean") return value === true;
    if (metric.type === "multiselect") return Array.isArray(value) && value.length > 0;
    if (metric.type === "number" || metric.type === "sets") {
        const numeric = metricNumericValue(metric, value);
        if (numeric == null) return false;
        const goal = metric.goal_value ?? 0;
        if (metric.goal_direction === "at_most") return numeric > 0 && numeric < goal;
        return numeric >= goal;
    }
    return false;
}

// ---- Настройки прогресса дня/недели (общие для дашборда и истории; хранятся на устройстве) ----
const BONUS_PCT_PER_ITEM = 20;
function getDayProgressSettings() {
    // dayPlace: "avatar" | "header" | "off" — где кружок дня; weekPlace: "profile" | "header" | "off" — где кружок недели
    const defaults = { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: "avatar", weekPlace: "profile" };
    try {
        const raw = localStorage.getItem("day_progress_settings");
        if (!raw) return defaults;
        const saved = JSON.parse(raw);
        // старый формат (displayMode) → новые поля
        if (saved.displayMode && !saved.dayPlace) {
            if (saved.displayMode === "header") { saved.dayPlace = "header"; saved.weekPlace = "profile"; }
            else if (saved.displayMode === "header_week") { saved.dayPlace = "off"; saved.weekPlace = "header"; }
            else { saved.dayPlace = "avatar"; saved.weekPlace = "profile"; }
        }
        delete saved.displayMode;
        return { ...defaults, ...saved };
    } catch { return defaults; }
}
function setDayProgressSettings(s) {
    localStorage.setItem("day_progress_settings", JSON.stringify(s));
}

// ---- Расписание метрики (см. migrations/021) ----
// null = каждый день; {type:"days", days:[0..6]} = только в эти дни недели (0 = воскресенье);
// {type:"weekly", min:N} = не менее N раз в неделю (неделя пн-вс) в любые дни.
function metricSchedule(m) {
    const s = m?.schedule;
    if (!s || typeof s !== "object") return null;
    if (s.type === "days" && Array.isArray(s.days) && s.days.length > 0 && s.days.length < 7) return { type: "days", days: s.days };
    if (s.type === "weekly" && s.min >= 1) return { type: "weekly", min: Math.min(7, Math.floor(s.min)) };
    if (s.type === "at_most" && s.max >= 0) return { type: "at_most", max: Math.min(7, Math.floor(s.max)) };
    return null;
}
function weekdayOf(dateStr) { return new Date(dateStr + "T00:00:00").getDay(); }

// Нужно ли выполнять метрику именно в этот день (для weekly — нет, она не привязана к дню)
function metricExpectedOn(m, dateStr) {
    const s = metricSchedule(m);
    if (!s) return true;
    if (s.type === "days") return s.days.includes(weekdayOf(dateStr));
    return false;
}

// Учитывать ли метрику в "проценте дня": обязательные на этот день — да; сделанные вне
// расписания и "N раз в неделю" — только если сделаны (это бонус, а не штраф за отдых)
function metricCountsInDay(m, dateStr, isDone) {
    return metricExpectedOn(m, dateStr) || isDone;
}

// Понедельник недели, в которую попадает дата (неделя пн-вс, как в прогрессе недели)
function weekStartStr(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return fmtDate(d);
}

async function calcDailyPoints(userId, dateStr, metrics) {
    const { data: values } = await sb.from("daily_values").select("*").eq("user_id", userId).eq("date", dateStr);
    const byMetric = {};
    (values || []).forEach(v => byMetric[v.metric_id] = v.value);
    let points = 0;
    for (const m of metrics) {
        if (isMetricDone(m, byMetric[m.id])) points++;
    }
    return points;
}

async function calcTotalPoints(userId) {
    const { data: metrics } = await sb.from("metrics").select("*").eq("user_id", userId).eq("active", true);
    const { data: allValues } = await sb.from("daily_values").select("*").eq("user_id", userId);

    const byDay = {};
    (allValues || []).forEach(v => {
        byDay[v.date] = byDay[v.date] || {};
        byDay[v.date][v.metric_id] = v.value;
    });

    let dailyPoints = 0;
    for (const dateStr of Object.keys(byDay)) {
        for (const m of (metrics || [])) {
            if (isMetricDone(m, byDay[dateStr][m.id])) dailyPoints++;
        }
    }

    const { data: goals } = await sb.from("goals").select("*").eq("user_id", userId).eq("done", true);
    const goalPoints = (goals || []).reduce((sum, g) => sum + (g.points ?? 5), 0);

    const { data: skills } = await sb.from("skills").select("*").eq("user_id", userId).eq("mastered", true);
    const skillPoints = (skills || []).reduce((sum, s) => sum + (s.points ?? 10), 0);

    const { data: books } = await sb.from("books").select("*").eq("user_id", userId).eq("status", "done");
    const bookPoints = (books || []).reduce((sum, b) => sum + (b.points ?? 10), 0);

    return dailyPoints + goalPoints + skillPoints + bookPoints;
}

async function calcBalance(userId) {
    const total = await calcTotalPoints(userId);
    const { data: items } = await sb.from("shop_items").select("*").eq("user_id", userId).eq("redeemed", true);
    const spent = (items || []).reduce((sum, i) => sum + (i.cost ?? 0), 0);
    return { total, spent, balance: total - spent };
}

// ---- Навигация ----

function makeAvatarEl(url, size = 32) {
    if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:1px solid var(--border);`;
        return img;
    }
    const div = document.createElement("div");
    div.textContent = "👤";
    div.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; background:var(--bg); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:${size * 0.55}px;`;
    return div;
}

async function requireOnboarded(userId) {
    const { data: profile, error } = await sb.from("profiles").select("onboarded").eq("user_id", userId).maybeSingle();
    if (error) {
        // Сетевой сбой (не "профиля нет") — не гоним офлайн-пользователя на онбординг:
        // либо доверяем последнему известному состоянию, либо (нет кэша, но браузер сам говорит
        // "офлайн") пропускаем на страницу — там уже offline-cache.js покажет последние данные.
        if (localStorage.getItem("ld_onboarded_" + userId) === "1") return true;
        if (!navigator.onLine) return true;
        window.location.href = "/onboarding/";
        return false;
    }
    if (!profile?.onboarded) { window.location.href = "/onboarding/"; return false; }
    try { localStorage.setItem("ld_onboarded_" + userId, "1"); } catch (e) { /* приватный режим — не критично */ }
    return true;
}

function showToast(message, type = "success") {
    document.querySelectorAll(".toast").forEach(el => el.remove());
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-show"));
    setTimeout(() => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// Готовит точки для графика: заполняет пропущенные дни (null), и если точек много —
// укрупняет (берёт представительное значение из "корзины" дней), чтобы график не превращался
// в нечитаемую кашу на длинных периодах.
function prepareChartSeries(rawPoints, maxPoints = 24) {
    if (!rawPoints || rawPoints.length === 0) return [];
    const sorted = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 1) return sorted;

    const dayMs = 86400000;
    const first = new Date(sorted[0].date + "T00:00:00");
    const last = new Date(sorted[sorted.length - 1].date + "T00:00:00");
    const totalDays = Math.round((last - first) / dayMs) + 1;

    const byDate = {};
    sorted.forEach(p => byDate[p.date] = p.y);

    let full = [];
    for (let i = 0; i < totalDays; i++) {
        // календарный шаг, а не first + i×24ч: в сутки перехода времени это давало дубль и пропуск даты
        const d = new Date(first);
        d.setDate(first.getDate() + i);
        const key = fmtDate(d);
        full.push({ date: key, y: key in byDate ? byDate[key] : null });
    }

    if (full.length <= maxPoints) return full;

    // укрупняем: делим на корзины по несколько дней, берём последнее известное значение в корзине
    const bucketSize = Math.ceil(full.length / maxPoints);
    const bucketed = [];
    for (let i = 0; i < full.length; i += bucketSize) {
        const chunk = full.slice(i, i + bucketSize);
        const withValue = chunk.filter(p => p.y != null);
        const y = withValue.length ? withValue[withValue.length - 1].y : null;
        bucketed.push({ date: chunk[chunk.length - 1].date, y, bucketDays: chunk.length });
    }
    return bucketed;
}

function svgLineChart(points, opts = {}) {
    const w = opts.width || 620, h = opts.height || 160, pad = 34;
    const withValues = points.filter(p => p.y != null);
    if (withValues.length < 2) return null;

    const values = withValues.map(p => p.y);
    if (opts.goalValue != null) values.push(opts.goalValue); // расширяем диапазон, чтобы линия-ориентир была видна на графике
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const stepX = (w - pad * 2) / (points.length - 1);

    const coords = points.map((p, i) => ({
        x: pad + i * stepX,
        y: p.y != null ? h - pad - ((p.y - min) / range) * (h - pad * 2) : null,
        label: p.date ? fmtChartLabel(p.date) : p.x,
        value: p.y
    }));

    let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">`;
    const color = opts.color || "var(--accent)";

    // Линия-ориентир (например, норма калорий/цель по весу) — рисуем первой, под графиком
    if (opts.goalValue != null) {
        const gy = h - pad - ((opts.goalValue - min) / range) * (h - pad * 2);
        svg += `<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${(w - pad).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.85" />`;
        const goalText = opts.goalLabel || `${opts.goalValue}${opts.unit || ''}`;
        const goalTextY = gy < pad + 10 ? gy + 12 : gy - 5;
        svg += `<text x="${(w - pad).toFixed(1)}" y="${goalTextY.toFixed(1)}" font-size="10" fill="var(--text-dim)" text-anchor="end">${goalText}</text>`;
    }

    let lastReal = null, gapBetween = false;
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (c.y == null) { if (lastReal) gapBetween = true; continue; }
        if (lastReal) {
            const dash = gapBetween ? ` stroke-dasharray="5,4"` : "";
            svg += `<line x1="${lastReal.x.toFixed(1)}" y1="${lastReal.y.toFixed(1)}" x2="${c.x.toFixed(1)}" y2="${c.y.toFixed(1)}" stroke="${color}" stroke-width="2.5"${dash} opacity="${gapBetween ? 0.55 : 1}" />`;
        }
        lastReal = c;
        gapBetween = false;
    }

    const labelEvery = Math.max(1, Math.ceil(coords.filter(c => c.y != null).length / 12));
    let shown = 0;
    for (const c of coords) {
        if (c.y == null) continue;
        svg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="${color}" />`;
        if (shown % labelEvery === 0) {
            svg += `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" font-size="11" fill="var(--text)" text-anchor="middle">${c.value}${opts.unit || ''}</text>`;
            svg += `<text x="${c.x.toFixed(1)}" y="${h - 8}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${c.label}</text>`;
        }
        shown++;
    }
    svg += `</svg>`;
    return svg;
}

function renderChartBlock(container, title, points, opts) {
    if (title) {
        const h4 = document.createElement("h4");
        // titleHtml — заголовок с SVG-иконкой (название внутри уже экранировано, см. labelHtml()); иначе просто текст
        if (opts && opts.titleHtml) h4.innerHTML = opts.titleHtml; else h4.textContent = title;
        h4.style.marginBottom = "6px";
        container.appendChild(h4);
    }
    const prepared = prepareChartSeries(points);
    const svg = svgLineChart(prepared, opts);
    if (svg) {
        const wrap = document.createElement("div");
        wrap.innerHTML = svg;
        container.appendChild(wrap);
        const withValues = prepared.filter(p => p.y != null);
        if (withValues.length < prepared.length) {
            const hint = document.createElement("p");
            hint.className = "dim";
            hint.style.cssText = "font-size:0.75em; margin:2px 0 0;";
            hint.textContent = t("chart_dashed_hint");
            container.appendChild(hint);
        }
    } else {
        const withValues = points.filter(p => p.y != null);
        const last = withValues.length ? `${t("chart_last_value")} ${withValues[withValues.length - 1].y}${opts.unit || ''}` : t("chart_no_data");
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = `${t("chart_not_enough_data")} ${last}`;
        container.appendChild(p);
    }
}

// возвращает [from, to] в формате "YYYY-MM-DD" (локальные даты) для периода
// customFrom/customTo — используются только когда rangeKey === "custom" (свой период)
function periodBounds(rangeKey, customFrom, customTo) {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // 0 = понедельник
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dow);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (rangeKey === "days10") {
        const start = new Date(today); start.setDate(today.getDate() - 9); // 10 дней включая сегодня
        return [fmtDate(start), fmtDate(today)];
    }
    if (rangeKey === "week") return [fmtDate(startOfWeek), fmtDate(today)];
    if (rangeKey === "last_week") {
        const startLastWeek = new Date(startOfWeek); startLastWeek.setDate(startOfWeek.getDate() - 7);
        const endLastWeek = new Date(startOfWeek); endLastWeek.setDate(startOfWeek.getDate() - 1);
        return [fmtDate(startLastWeek), fmtDate(endLastWeek)];
    }
    if (rangeKey === "month") return [fmtDate(startOfMonth), fmtDate(today)];
    if (rangeKey === "custom") return [customFrom || null, customTo || null];
    return [null, null]; // "all" — без ограничения
}

// Период графика запоминается в localStorage между сессиями (по умолчанию — последние 10 дней,
// чтобы графики с большой историей не выглядели нечитаемо густыми при каждом заходе).
function loadPeriodState(storageKey, fallback) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.range) return parsed;
        }
    } catch (e) { /* повреждённые данные в localStorage — просто используем дефолт */ }
    return fallback;
}
function savePeriodState(storageKey, state) {
    try { localStorage.setItem(storageKey, JSON.stringify({ range: state.range, from: state.from, to: state.to })); } catch (e) { /* localStorage недоступен — не критично */ }
}
// Оборачивает onChange/onApply, вызываемый из renderPeriodPicker/openPeriodModal, так чтобы
// каждое изменение периода сразу сохранялось — используется во всех местах с выбором периода.
function wrapPeriodPersist(storageKey, state, cb) {
    return () => { savePeriodState(storageKey, state); cb(); };
}

// рендерит панель выбора периода (пресеты + свой период с датами) и вызывает onChange(rangeKey, from, to)
// state — объект {range, from, to}, который вызывающий код хранит у себя и мутирует сюда же
function renderPeriodPicker(container, state, onChange) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; gap:6px; flex-wrap:wrap; align-items:center;";

    const presets = [["days10", t("period_10_days")], ["week", t("period_week")], ["last_week", t("period_last_week")], ["month", t("period_month")], ["all", t("period_all")]];
    presets.forEach(([key, label]) => {
        const btn = document.createElement("button");
        btn.className = state.range === key ? "" : "secondary";
        btn.textContent = label;
        btn.onclick = () => { state.range = key; onChange(); };
        wrap.appendChild(btn);
    });

    // "Свой период" — не инлайновые поля дат (они сжимались в кашу на телефоне),
    // а модалка, как и все остальные формы в приложении. Заодно кнопка сама
    // показывает уже выбранный диапазон, если он есть.
    const customBtn = document.createElement("button");
    customBtn.className = state.range === "custom" ? "" : "secondary";
    customBtn.textContent = (state.range === "custom" && state.from)
        ? `📅 ${fmtRu(state.from)} – ${state.to ? fmtRu(state.to) : "…"}`
        : t("period_custom");
    customBtn.onclick = () => openCustomPeriodModal(state, onChange);
    wrap.appendChild(customBtn);

    container.appendChild(wrap);
}

// Модалка выбора периода целиком (пресеты + свой диапазон) — для мест, где период
// не встроен в более крупную форму настройки (см. также openChartsConfigModal в
// dashboard.js, где период встроен прямо в модалку настройки графиков).
function openPeriodModal(title, state, onApply) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${title}</h3>`;

    let local = { ...state };
    const pickerRow = document.createElement("div");
    function renderRow() {
        pickerRow.innerHTML = "";
        renderPeriodPicker(pickerRow, local, renderRow);
    }
    renderRow();
    modal.appendChild(pickerRow);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = () => {
        Object.assign(state, local);
        backdrop.remove();
        onApply();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

function openCustomPeriodModal(state, onChange) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("period_custom")}</h3>`;

    const fromLabel = document.createElement("label");
    fromLabel.style.cssText = "display:block; margin-bottom:14px;";
    fromLabel.textContent = t("period_from");
    const fromInput = document.createElement("input");
    fromInput.type = "date";
    fromInput.style.cssText = "width:100%; margin-top:4px;";
    fromInput.value = state.from || "";
    fromInput.max = todayStr();
    fromLabel.appendChild(fromInput);
    modal.appendChild(fromLabel);

    const toLabel = document.createElement("label");
    toLabel.style.cssText = "display:block; margin-bottom:14px;";
    toLabel.textContent = t("period_to");
    const toInput = document.createElement("input");
    toInput.type = "date";
    toInput.style.cssText = "width:100%; margin-top:4px;";
    toInput.value = state.to || "";
    toInput.max = todayStr();
    toLabel.appendChild(toInput);
    modal.appendChild(toLabel);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("period_apply");
    okBtn.onclick = () => {
        state.range = "custom";
        state.from = fromInput.value || null;
        state.to = toInput.value || null;
        backdrop.remove();
        onChange();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    fromInput.focus();
}

function wrapTable(table) {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    wrap.appendChild(table);
    return wrap;
}

function renderNav(active, userEmail) {
    document.querySelectorAll(".topbar, .sidebar, .sidebar-backdrop").forEach(el => el.remove());

    // vue: путь до готового Vue-пилота этой страницы — если задан, в сайдбаре под пунктом
    // навигации появляется тонкая ссылка "Попробовать новую версию" (см. ниже, после списка
    // pages). У Skills это поле сознательно не трогаем — полный переезд адреса/в legacy делает
    // другой агент отдельным заходом (см. COORDINATION.md), а не эта лёгкая перелинковка.
    // Пока часть классических страниц переезжает на короткие адреса пилота, а часть остаётся
    // в корне (см. docs/ROADMAP.md, фаза 2), href в pages[] и у accountLink ниже бывает и
    // "goals.html" (страница ещё в корне), и "legacy/history.html" (уже переехала). navHref()
    // нормализует оба варианта в абсолютный путь от корня сайта — тогда ссылка работает
    // одинаково верно с ЛЮБОЙ страницы, независимо от того, открыли её из корня или уже из
    // /legacy/ (без этого относительная ссылка с переехавшей страницы вела бы не туда).
    const navHref = (href) => "/" + href.replace(/^\//, "");

    const pages = [
        { href: "legacy/dashboard.html", key: "dashboard", i18n: "nav_dashboard", icon: "home", home: true, vue: "dashboard/" },
        { href: "legacy/goals.html", key: "goals", i18n: "nav_goals", icon: "goals", vue: "goals/" },
        { href: "legacy/skills.html", key: "skills", i18n: "nav_skills", icon: "skills", vue: "skills/" },
        { href: "legacy/workouts.html", key: "workouts", i18n: "nav_workouts", icon: "workouts", vue: "workouts/" },
        { href: "legacy/challenges.html", key: "challenges", i18n: "nav_challenges", icon: "challenges", vue: "challenges/" },
        { href: "legacy/english.html", key: "english", i18n: "nav_english", icon: "english", vue: "languages/" },
        { href: "legacy/calendar.html", key: "calendar", i18n: "nav_calendar", icon: "calendar", vue: "calendar/" },
        { href: "legacy/milestones.html", key: "milestones", i18n: "nav_milestones", icon: "milestones", vue: "milestones/" },
        { href: "legacy/shop.html", key: "shop", i18n: "nav_shop", icon: "shop", vue: "shop/" },
        { href: "legacy/community.html", key: "community", i18n: "nav_community", icon: "community", vue: "community/" },
        { href: "legacy/history.html", key: "history", i18n: "nav_history", icon: "history", vue: "history/" },
    ];
    // В i18n названия разделов начинаются с эмодзи ("🎯 Цели") — для подписей рядом с SVG-иконкой
    // отрезаем ведущие эмодзи/пробелы.
    const plainLabel = (key) => t(key).replace(/^[^\p{L}\p{N}]+/u, "");

    // ---- Тонкая верхняя полоса: гамбургер + быстрая эмодзи-навигация ----
    const topbar = document.createElement("div");
    topbar.className = "topbar";

    const hamburger = document.createElement("button");
    hamburger.className = "hamburger-btn";
    hamburger.setAttribute("aria-label", t("nav_open_menu"));
    hamburger.innerHTML = "☰";
    topbar.appendChild(hamburger);

    const homePage = pages.find(p => p.home);
    const homeIconLink = document.createElement("a");
    homeIconLink.href = navHref(homePage.href);
    homeIconLink.title = plainLabel(homePage.i18n);
    homeIconLink.className = "quick-nav-icon home" + (homePage.key === active ? " active" : "");
    const homeLogo = document.createElement("img");
    homeLogo.src = "/favicon.svg";
    homeLogo.alt = plainLabel(homePage.i18n);
    homeLogo.className = "quick-nav-logo";
    homeIconLink.appendChild(homeLogo);
    topbar.appendChild(homeIconLink);

    const moreToggle = document.createElement("button");
    moreToggle.className = "quick-nav-toggle";
    moreToggle.textContent = ">>>";
    moreToggle.setAttribute("aria-label", t("nav_more"));
    topbar.appendChild(moreToggle);

    const quickNav = document.createElement("div");
    quickNav.className = "quick-nav";
    for (const p of pages) {
        if (p.home) continue;
        const a = document.createElement("a");
        a.href = navHref(p.href);
        a.innerHTML = iconSvg(p.icon);
        a.title = plainLabel(p.i18n);
        a.className = "quick-nav-icon" + (p.key === active ? " active" : "");
        quickNav.appendChild(a);
    }
    topbar.appendChild(quickNav);

    moreToggle.onclick = (e) => {
        e.stopPropagation();
        const isOpen = quickNav.classList.toggle("open");
        moreToggle.classList.toggle("open", isOpen);
    };
    document.addEventListener("click", (e) => {
        if (quickNav.classList.contains("open") && !quickNav.contains(e.target) && e.target !== moreToggle) {
            quickNav.classList.remove("open");
            moreToggle.classList.remove("open");
        }
    });

    // Правый край шапки: сюда встают бейджи (кружок прогресса, стакан воды) в фиксированном
    // порядке — чтобы они не прыгали друг относительно друга при перерисовке.
    const topbarRight = document.createElement("div");
    topbarRight.className = "topbar-right";
    topbarRight.id = "topbar-right";
    topbar.appendChild(topbarRight);

    document.body.prepend(topbar);

    // ---- Выезжающий сайдбар со всем содержимым бывшей шапки ----
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";

    const sidebar = document.createElement("nav");
    sidebar.className = "sidebar";

    // Ссылка "Попробовать новый дизайн" на Vue-версию текущей страницы: одна, неприметная (dim-link)
    // и всегда в одном месте — внизу меню, над номером версии (по запросу владельца; раньше она
    // вставлялась под активным пунктом навигации). Здесь только запоминаем адрес, сама ссылка
    // добавляется ниже.
    let tryPilotPath = null;
    function appendTryPilotLink(vuePath) {
        if (vuePath) tryPilotPath = vuePath;
    }

    for (const p of pages) {
        const a = document.createElement("a");
        a.href = navHref(p.href);
        a.innerHTML = `${iconSvg(p.icon)}<span>${plainLabel(p.i18n)}</span>`;
        if (p.key === active) a.className = "active";
        sidebar.appendChild(a);
        if (p.key === active) appendTryPilotLink(p.vue);
    }

    if (userEmail) {
        const accountLink = document.createElement("a");
        accountLink.href = navHref("legacy/account.html");
        accountLink.innerHTML = `${iconSvg("user")}<span>${t("nav_account_title")}</span>`;
        accountLink.className = active === "account" ? "active" : "";
        sidebar.appendChild(accountLink);
        if (active === "account") appendTryPilotLink("account/");
    }

    const divider = document.createElement("div");
    divider.className = "sidebar-divider";
    sidebar.appendChild(divider);

    const langRow = document.createElement("div");
    langRow.className = "sidebar-row";
    renderLangSwitcher(langRow);
    langRow.querySelectorAll(".lang-btn").forEach(btn => {
        const original = btn.onclick;
        btn.onclick = () => { original(); };
    });
    sidebar.appendChild(langRow);

    const themeRow = document.createElement("div");
    themeRow.className = "sidebar-row";
    renderThemeSwitcher(themeRow);
    sidebar.appendChild(themeRow);

    if (userEmail) {
        const logoutBtn = document.createElement("button");
        logoutBtn.textContent = `${t("logout")} (${userEmail})`;
        logoutBtn.className = "user-switch";
        logoutBtn.onclick = logout;
        sidebar.appendChild(logoutBtn);
    }

    if (!isStandaloneApp()) {
        const installLink = document.createElement("a");
        installLink.href = "#";
        installLink.innerHTML = `${iconSvg("download")}<span>${t("nav_install_app")}</span>`;
        installLink.className = "dim-link";
        installLink.onclick = (e) => { e.preventDefault(); handleInstallClick(); };
        sidebar.appendChild(installLink);
    }

    const tourLink = document.createElement("a");
    tourLink.href = "#";
    tourLink.innerHTML = `${iconSvg("help")}<span>${t("nav_tour")}</span>`;
    tourLink.className = "dim-link";
    tourLink.onclick = (e) => { e.preventDefault(); showWelcomeTour(); };
    sidebar.appendChild(tourLink);

    const aboutLink = document.createElement("a");
    aboutLink.href = "#";
    aboutLink.innerHTML = `${iconSvg("info")}<span>${t("nav_about")}</span>`;
    aboutLink.className = "dim-link";
    aboutLink.onclick = (e) => { e.preventDefault(); showAboutModal(); };
    sidebar.appendChild(aboutLink);

    if (tryPilotPath) {
        const tryPilotLink = document.createElement("a");
        tryPilotLink.href = "/" + tryPilotPath;
        tryPilotLink.innerHTML = `${iconSvg("sparkles")}<span>${t("nav_try_pilot")}</span>`;
        tryPilotLink.className = "dim-link";
        sidebar.appendChild(tryPilotLink);
    }

    const version = document.createElement("button");
    version.className = "sidebar-version";
    version.textContent = "v" + SITE_VERSION;
    version.onclick = showChangelogModal;
    sidebar.appendChild(version);

    document.body.appendChild(backdrop);
    document.body.appendChild(sidebar);

    function openSidebar() { sidebar.classList.add("open"); backdrop.classList.add("open"); }
    function closeSidebar() { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
    hamburger.onclick = openSidebar;
    backdrop.onclick = closeSidebar;
    sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", closeSidebar));
}

// ---- Приветственный тур для новых пользователей ----
// Показывается один раз сразу после онбординга (флаг tour_pending в localStorage ставит
// onboarding.js), а потом всегда доступен из бокового меню («Как пользоваться»).
const TOUR_STEPS = [
    { icon: "👋", key: "tour_1" },
    { icon: "🏠", key: "tour_2" },
    { icon: "🎯", key: "tour_3" },
    { icon: "🥋", key: "tour_4" },
    { icon: "🏆", key: "tour_5" },
    { icon: "🗓️", key: "tour_6" },
    { icon: "🧭", key: "tour_7" },
];

function showWelcomeTour() {
    if (document.getElementById("welcome-tour")) return;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "welcome-tour";
    const modal = document.createElement("div");
    modal.className = "modal";

    let step = 0;
    const iconEl = document.createElement("div");
    iconEl.style.cssText = "font-size:2.2em; text-align:center; margin-top:4px;";
    const titleEl = document.createElement("h3");
    titleEl.style.cssText = "text-align:center; margin:8px 0;";
    const textEl = document.createElement("p");
    textEl.style.cssText = "font-size:0.95em; line-height:1.6; white-space:pre-line;";
    const dotsEl = document.createElement("div");
    dotsEl.style.cssText = "display:flex; justify-content:center; gap:6px; margin:14px 0 4px;";

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const skipBtn = document.createElement("button");
    skipBtn.className = "secondary";
    const backBtn = document.createElement("button");
    backBtn.className = "secondary";
    backBtn.textContent = t("tour_back");
    const nextBtn = document.createElement("button");

    const bodyEl = document.createElement("div");
    bodyEl.className = "tour-body";

    const onKey = (e) => {
        if (e.key === "ArrowRight") goNext();
        else if (e.key === "ArrowLeft") goBack();
        else if (e.key === "Escape") close();
    };
    const close = () => { document.removeEventListener("keydown", onKey); backdrop.remove(); };
    function goBack() { if (step > 0) { step--; bodyEl.style.setProperty("--tour-dir", "-16px"); render(); } }
    function goNext() { if (step < TOUR_STEPS.length - 1) { step++; bodyEl.style.setProperty("--tour-dir", "16px"); render(); } else close(); }
    skipBtn.onclick = close;
    backBtn.onclick = goBack;
    nextBtn.onclick = goNext;
    document.addEventListener("keydown", onKey);

    // Листание свайпами: влево — дальше, вправо — назад (только явный горизонтальный жест)
    let touchX = null, touchY = null;
    modal.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
    modal.addEventListener("touchend", (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = touchY = null;
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0) goNext(); else goBack();
    }, { passive: true });

    function render() {
        const s = TOUR_STEPS[step];
        iconEl.textContent = s.icon;
        titleEl.textContent = t(s.key + "_title");
        textEl.textContent = t(s.key + "_text");
        bodyEl.style.animation = "none"; void bodyEl.offsetWidth; bodyEl.style.animation = ""; // перезапуск плавной смены
        dotsEl.innerHTML = "";
        TOUR_STEPS.forEach((_, i) => {
            const d = document.createElement("span");
            d.style.cssText = "width:8px; height:8px; border-radius:50%; background:" + (i === step ? "var(--accent)" : "var(--border)") + ";";
            dotsEl.appendChild(d);
        });
        const last = step === TOUR_STEPS.length - 1;
        nextBtn.textContent = last ? t("tour_done") : t("tour_next");
        skipBtn.textContent = t("tour_skip");
        skipBtn.style.display = last ? "none" : "";
        backBtn.style.display = step === 0 ? "none" : "";
    }

    bodyEl.appendChild(iconEl);
    bodyEl.appendChild(titleEl);
    bodyEl.appendChild(textEl);
    modal.appendChild(bodyEl);
    modal.appendChild(dotsEl);
    actions.appendChild(skipBtn);
    actions.appendChild(backBtn);
    actions.appendChild(nextBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    render();
}

// ---- Модалка "О создателе" — кто сделал проект, ссылка на портфолио + обратная связь ----
function showAboutModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${tIcon("about_title")}</h3>`;

    // Блок «О создателе» (вместо прежней одиночной ссылки на портфолио)
    const creatorH = document.createElement("h4");
    creatorH.style.cssText = "margin:14px 0 6px;";
    creatorH.textContent = t("about_creator_title");
    modal.appendChild(creatorH);
    const creatorP = document.createElement("p");
    creatorP.style.cssText = "font-size:0.92em; line-height:1.55;";
    creatorP.textContent = t("about_creator_text");
    modal.appendChild(creatorP);
    const portfolioP = document.createElement("p");
    portfolioP.style.cssText = "margin-top:8px; font-size:0.92em;";
    const portfolioLink = document.createElement("a");
    portfolioLink.href = "https://portfolio.orneryhero.workers.dev/";
    portfolioLink.target = "_blank";
    portfolioLink.rel = "noopener";
    portfolioLink.textContent = t("about_portfolio_link");
    portfolioP.appendChild(portfolioLink);
    modal.appendChild(portfolioP);

    const feedbackP = document.createElement("p");
    feedbackP.className = "dim";
    feedbackP.style.cssText = "font-size:0.9em; margin-top:16px; line-height:1.6;";
    feedbackP.innerHTML = t("about_feedback_intro") +
        `<br>Telegram: <a href="https://t.me/vsekorolev" target="_blank" rel="noopener">@vsekorolev</a>`;
    modal.appendChild(feedbackP);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ---- Модалка "Что нового" — по клику на версию в сайдбаре ----
function showChangelogModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${tIcon("changelog_title")}</h3>`;

    if (CHANGELOG.length === 0) {
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = t("changelog_empty");
        modal.appendChild(p);
    }
    for (const entry of CHANGELOG) {
        const h4 = document.createElement("h4");
        h4.style.cssText = "margin-top:16px; margin-bottom:6px;";
        h4.textContent = "v" + entry.version + (entry.date ? " — " + entry.date : "");
        modal.appendChild(h4);
        const ul = document.createElement("ul");
        ul.style.cssText = "margin:0; padding-left:20px; font-size:0.9em; color:var(--text-dim);";
        for (const c of entry.changes) {
            const li = document.createElement("li");
            li.textContent = c;
            ul.appendChild(li);
        }
        modal.appendChild(ul);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ---- Глазик "показать/скрыть пароль" — оборачивает существующий input ----
const EYE_ICON_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function attachPasswordToggle(input) {
    const wrap = document.createElement("div");
    wrap.className = "password-field";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.innerHTML = EYE_ICON_OPEN;
    toggle.setAttribute("aria-label", t("password_toggle_show"));
    toggle.onclick = () => {
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        toggle.innerHTML = willShow ? EYE_ICON_OFF : EYE_ICON_OPEN;
        toggle.setAttribute("aria-label", willShow ? t("password_toggle_hide") : t("password_toggle_show"));
    };
    wrap.appendChild(toggle);
    return wrap;
}

// ---- Позиционирование плавающих списков (кастомный select, комбобокс вариантов и т.п.)
// относительно ЭКРАНА (position: fixed), а не родителя — так список никогда не обрезается
// оverflow-контейнерами (таблицы с горизонтальным скроллом, тесные модалки и т.п.) и высота
// всегда подгоняется под реально доступное место, так что скроллить есть где и его видно.
function positionFloatingPanel(anchor, panel) {
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferredMax = 280;

    panel.style.left = Math.max(margin, rect.left) + "px";
    panel.style.width = Math.min(rect.width, window.innerWidth - margin * 2) + "px";

    if (spaceBelow >= 100 || spaceBelow >= spaceAbove) {
        panel.style.top = (rect.bottom + 4) + "px";
        panel.style.bottom = "auto";
        panel.style.maxHeight = Math.max(80, Math.min(preferredMax, spaceBelow)) + "px";
    } else {
        panel.style.bottom = (window.innerHeight - rect.top + 4) + "px";
        panel.style.top = "auto";
        panel.style.maxHeight = Math.max(80, Math.min(preferredMax, spaceAbove)) + "px";
    }
}

// ---- Обёртка нативного <select> собственной выпадашкой — на случай если системный пикер
// плохо ведёт себя в установленном PWA. Сам select прячем, но не убираем: он остаётся
// источником истины (.value/.onchange продолжают работать как раньше, весь остальной код
// вокруг select менять не нужно) — просто синхронизируем его со своей видимой кнопкой-списком.
function enhanceSelectWithCustomDropdown(select) {
    const wrap = document.createElement("div");
    wrap.className = "custom-select";
    select.parentNode.insertBefore(wrap, select);
    select.style.display = "none";
    wrap.appendChild(select);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "custom-select-btn";
    wrap.appendChild(btn);

    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";
    document.body.appendChild(dropdown);

    function currentLabel() {
        const opt = select.options[select.selectedIndex];
        return opt ? opt.textContent : "";
    }
    function renderBtn() {
        btn.textContent = currentLabel();
    }
    function renderOptions() {
        dropdown.innerHTML = "";
        Array.from(select.options).forEach(opt => {
            const item = document.createElement("div");
            item.className = "custom-select-option" + (opt.value === select.value ? " selected" : "");
            item.textContent = opt.textContent;
            item.onmousedown = (e) => {
                e.preventDefault();
                select.value = opt.value;
                select.dispatchEvent(new Event("change"));
                renderBtn();
                dropdown.classList.remove("open");
            };
            dropdown.appendChild(item);
        });
    }
    btn.onclick = (e) => {
        e.stopPropagation();
        renderOptions();
        const willOpen = !dropdown.classList.contains("open");
        if (willOpen) positionFloatingPanel(btn, dropdown);
        dropdown.classList.toggle("open");
    };
    document.addEventListener("click", () => dropdown.classList.remove("open"));

    renderBtn();
    return wrap;
}

// ---- Модальные окна (переиспользуются везде) ----

// fields: [{key, label, type: 'text'|'number'|'select'|'date', options?, value}]
function openModal(title, fields, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${title}</h3>`;

    const inputs = {};
    for (const f of fields) {
        if (f.type === "icon") {
            // выбор иконки: подпись + сетка (не внутри <label>, чтобы клик по подписи не нажимал первую кнопку)
            const caption = document.createElement("div");
            caption.className = "icon-picker-caption";
            caption.textContent = f.label;
            const picker = buildIconPicker(f.value);
            modal.appendChild(caption);
            modal.appendChild(picker.el);
            inputs[f.key] = { get value() { return picker.getValue(); } };
            continue;
        }
        const label = document.createElement("label");
        label.textContent = f.label;
        let input;
        if (f.type === "select") {
            input = document.createElement("select");
            for (const opt of f.options) {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                input.appendChild(o);
            }
            input.value = f.value ?? f.options[0]?.value;
        } else {
            input = document.createElement("input");
            input.type = f.type || "text";
            input.value = f.value ?? "";
            if (f.min !== undefined) input.min = f.min;
            if (f.max !== undefined) input.max = f.max;
        }
        label.appendChild(input);
        modal.appendChild(label);
        inputs[f.key] = input;
        if (f.type === "select") enhanceSelectWithCustomDropdown(input);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        const result = {};
        for (const f of fields) {
            const v = inputs[f.key].value;
            result[f.key] = f.type === "number" ? (parseFloat(v) || 0) : v;
        }
        backdrop.remove();
        await onSubmit(result);
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    inputs[fields[0]?.key]?.focus();
}

// ==== Свайп с центра экрана вправо — открывает боковое меню (сайдбар) на телефоне ====
// Работает на любой странице (config.js подключён везде), не завязан на renderNav —
// ищет .sidebar/.sidebar-backdrop заново при каждом срабатывании, так что переживает
// пересоздание сайдбара через renderNav() без переустановки слушателей.
(function setupSidebarSwipe() {
    let startX = null, startY = null, tracking = false, mode = null; // mode: "open" | "close"
    const SWIPE_THRESHOLD = 70;   // px — минимальная длина свайпа по горизонтали, чтобы сработало
    const MAX_VERTICAL_DRIFT = 60; // px — если увели палец вертикально больше этого — это скролл, не свайп
    const CENTER_ZONE_MIN = 0.15, CENTER_ZONE_MAX = 0.85; // для открытия — начало свайпа должно быть в центре экрана

    document.addEventListener("touchstart", (e) => {
        const sidebar = document.querySelector(".sidebar");
        const isOpen = sidebar?.classList.contains("open");
        const touch = e.touches[0];

        if (isOpen) {
            // сайдбар уже открыт — свайп влево в любом месте закрывает
            mode = "close";
            startX = touch.clientX;
            startY = touch.clientY;
            tracking = true;
            return;
        }

        if (e.target.closest(".table-scroll, .calendar-grid")) { tracking = false; return; } // не мешаем горизонтальному скроллу таблиц/календаря
        const w = window.innerWidth;
        if (touch.clientX < w * CENTER_ZONE_MIN || touch.clientX > w * CENTER_ZONE_MAX) { tracking = false; return; }
        mode = "open";
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
        if (!tracking) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);
        if (dy > MAX_VERTICAL_DRIFT) { tracking = false; return; } // похоже на вертикальный скролл страницы

        const sidebar = document.querySelector(".sidebar");
        const backdrop = document.querySelector(".sidebar-backdrop");
        if (mode === "open" && dx > SWIPE_THRESHOLD) {
            if (sidebar && backdrop) { sidebar.classList.add("open"); backdrop.classList.add("open"); }
            tracking = false;
        } else if (mode === "close" && dx < -SWIPE_THRESHOLD) {
            if (sidebar && backdrop) { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
            tracking = false;
        }
    }, { passive: true });

    document.addEventListener("touchend", () => { tracking = false; });
})();
