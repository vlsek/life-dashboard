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

const SITE_VERSION = "1.09";

// ==== История обновлений — короткая заметка на каждую версию, показывается по клику
// на номер версии в сайдбаре. Добавлять новую запись сверху на RU и EN при каждом бампе версии. ====
const CHANGELOG_RU = [
    { version: "1.09", date: "2026-09-29 03:40", changes: [
        "Во всех 12 Vue-пилотах в сайдбаре появился номер версии, по тапу на который открывается история обновлений — как на классическом сайте. История читается из одного version.json, сгенерированного из этого ченджлога (scripts/gen_version_json.py), а не дублируется в каждом пилоте",
        "45 новых тестов на 12 пилотов (по 5 на модалку ченджлога + 1 на кнопку в сайдбаре)",
    ]},
    { version: "1.08", date: "2026-09-29 00:20", changes: [
        "Пилот Дашборда: карточка дня «Дневные метрики» — boolean/number (два режима: заменять и прибавлять, с «Итого сегодня» и ручной правкой итога)/multiselect, автосохранение каждого поля, «Что полезного сделал за день», кнопка «Сохранить день», «Баллы за день»",
        "«Подходы» и «Цели на сегодня» встроены в ту же карточку с общей выбранной датой (раньше были отдельными блоками без листания дней). Пересчёт стриков/колец/графиков — через уже существующую событийную шину (notifyDataChanged), без прямых вызовов между блоками",
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
        "Пилот Дашборда: добавлен блок «Цели на сегодня» — план на день (пункты из целей и свои), отметка ★ «доп. пункт», перенос незавершённого за последние 7 дней одним нажатием и отметка одноэтапных целей прямо из плана. Любое изменение сразу обновляет кольца дня/недели и стрики. Свои компоненты и composable, 44 теста (lib/planned.ts, usePlanned.ts, PlannedSection.vue)",
        "План принимает дату, поэтому его можно встроить в карточку дня вместе с дневными метриками; перенос предлагается только для сегодняшнего дня, как на классическом сайте",
        "Сохранения плана идут по очереди — две быстрые правки не приходят на сервер в перепутанном порядке, а при ошибке план откатывается к последнему сохранённому состоянию",
    ]},
    { version: "0.98", date: "2026-09-28 11:10", changes: [
        "Исправлено: история длиннее 1000 записей обрезалась там, где читалась одним запросом, — стрики и дневной/недельный прогресс в пилоте Дашборда и баланс баллов в пилоте Магазина могли считаться по неполным данным. Теперь читаются постранично в стабильном порядке (дата, метрика)",
        "Исправлено: в ночь перевода часов (в Европе — последнее воскресенье марта/октября) стрик считался со сдвигом на день («вчера» вычислялось как минус 24 часа), а на оси дат графика одна дата дублировалась и одна пропадала. Исправлено в классическом Дашборде и графиках, в пилоте Дашборда и в графике Сообщества",
        "Пилот Дашборда: стрики, кольца дневного/недельного прогресса и график метрики обновляются сразу после добавления воды, записи подхода или правки значения на графике — без перезагрузки страницы",
        "Добавлен COORDINATION.md — общая доска для агентов (кто что делает сейчас, свободные задачи, журнал). 27 новых тестов",
    ]},
    { version: "0.97", date: "2026-09-28 09:03", changes: [
        "Пилот «Сообщество»: вернулся раздел «Сравнение по активности» — выбор категории, таблица сравнения (по сумме / баллам / streak, за неделю / прошлую неделю / месяц / всё время, все или только друзья) и личный график прогресса в этой категории с выбором периода и линией-целью",
        "Если своей метрики в категории нет — можно привязать любую числовую метрику прямо на странице; график построен на той же общей инфраструктуре, что и графики Дашборда",
        "Сортировка и фильтр таблицы, сумма значений по дням и линия-цель покрыты тестами, сверенными с оригинальным community.js",
    ]},
    { version: "0.96", date: "2026-09-28 17:20", changes: [
        "Пилот Дашборда: остаток блока «Профиль» — кольцо прогресса дня теперь вокруг аватарки (процент под ней и шестерёнка настроек в углу, как на обычном сайте), кольцо недели стоит в строке профиля, а в режиме «в шапке» дневной круг и недельный скруглённый квадрат появляются бейджами в правой части шапки. Шестерёнка на аватарке есть всегда, так что настройки доступны и когда кольца выключены или уехали в шапку",
        "Отдельное кольцо-блок из App.vue убран; ProfileSection получает данные колец пропсами. Новые файлы: lib/ringPlacement.ts (куда рисовать кольцо, геометрия), AvatarProgress.vue, HeaderProgressBadge.vue (через Teleport в #topbar-right), 16 новых тестов. Стрик-бейдж в строку профиля пока не переносился — им занимается другой агент",
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
        "Пилот Дашборда: добавлен блок «Управление метриками» (web-dashboard/) — кнопка ⚙️ открывает список метрик с правкой и удалением, форма создания/правки со всеми полями обычного сайта: тип (число/галочка/выбор/подходы), цель и её направление, единица, варианты, режим ввода, расписание (каждый день / дни недели / не менее N раз / не более N раз в неделю), категория (с созданием новой), импорт стрика и выбор иконки с поиском",
        "Отдельные файлы (lib/metricsManager.ts, lib/useMetricsManager.ts, три компонента, свои тесты — 34 новых), в App.vue только импорт и одна строка. Тип Metric дополнен необязательными полями options/input_mode. Расписание и импорт стрика по-прежнему не пишутся, если миграции 021/026 ещё не применены",
    ]},
    { version: "0.85", date: "2026-09-28 09:55", changes: [
        "Пилот Дашборда: перенесён дневной/недельный прогресс (кольца вокруг темы + настройки — что учитывать, где показывать) поверх стриков, перенесённых раньше — lib/progress.ts/progressSettings.ts, 17 новых тестов",
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
        "Импорт существующего стрика: у метрики можно указать «уже был стрик N дней» (в её ⚙️) — он продолжает считаться с сегодняшнего дня и перестаёт применяться в первый пропущенный день",
        "Языки: явный выбор «переводить на», отдельно от языка самого слова",
        "Тренировки: строка личного рекорда под каждым упражнением — лучший отдельный подход по весу (или по повторениям для упражнений без веса)",
        "Кнопка «↺ Незавершённое с прошлых дней» в плане на сегодня: можно выбрать из невыполненного за последние 7 дней, вместо того чтобы это терялось после смены дня",
        "Тонкая полоса цвета темы подсвечивает метрики, ещё нужные сегодня — видно, что осталось до 100%",
        "Чекбоксы и переключатели везде в цвет темы, а не только в модалках",
        "Цвет шторки/строки состояния на телефоне теперь совпадает с темой с первого кадра — раньше на загрузке на миг мелькал неверный цвет",
        "У огонька стрика в теме Monet — слабая обводка, чтобы не терялся в тёмном углу",
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
        "Историю читаем постранично: у Supabase лимит ответа 1000 строк, и без этого стрики и графики у давних пользователей могли считаться по обрезанным данным",
        "Скрипты загружаются с defer, а к серверам подключаемся заранее (preconnect): страницы показываются раньше",
    ]},
    { version: "0.55", date: "2026-09-24", changes: [
        "Огонёк стрика теперь горит цветами выбранной темы и слегка мерцает; если стрик на сегодня ещё не засчитан — тусклый пунктирный контур. Исправлен баг с дублированием огонька при вводе нового подхода",
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
        "Стрик метрики по дням недели не рвётся в дни, когда её делать не нужно; «идеальный день» учитывает только метрики, нужные в этот день. Метрики «N раз в неделю» считают серию в неделях (нед.), а если добрать норму можно только каждый оставшийся день, серия помечается как под угрозой",
        "Проценты дня и недели не штрафуют за метрики вне расписания: они учитываются только если сделаны, а «N раз в неделю» идёт в неделю как N пунктов",
        "Нужна миграция migrations/021_metric_schedule.sql (один раз в Supabase → SQL Editor); серия в лидерборде считается как раньше",
    ]},
    { version: "0.51", date: "2026-09-24", changes: [
        "Единый набор SVG-иконок вместо эмодзи в интерфейсе: навигация (шапка и боковое меню), кнопки «изменить», «удалить», «настройки», «закрыть», «добавить», баллы, огонёк стрика и капля воды. Иконки берут цвет темы и масштабируются вместе с текстом",
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
        "Воду можно вносить за прошлые дни: в окошке воды появился выбор даты. Кружок, стрик, графики и неделя обновляются сразу, без перезагрузки",
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
        "Огонёк стрика теперь сплошной, если стрик на сегодня уже засчитан (пунктир остаётся только как предупреждение)",
        "Шестерёнка у аватарки снова круглая, а не вытянутый овал",
        "Ссылка «Назад к портфолио» на странице входа оформлена как остальные элементы",
    ]},
    { version: "0.45", date: "2026-09-22", changes: [
        "Неделя теперь считается пн-вс, а не сб-пт",
        "Подсказка про незакрытую неделю убрана из постоянного кружка — вместо этого баннер-напоминание, который появляется только по субботам/воскресеньям, если неделя ещё не на 100%",
        "Иконка выхода (дверь) в правом углу шапки — теперь не обязательно лезть в боковое меню",
        "Клик по баллам (💰) в профиле уводит в магазин",
        "Иконка стрика — контурная/пунктирная SVG вместо заливного эмодзи; если сегодня ещё не засчитано — подсвечивается малиновым, а при клике прямым текстом предупреждает, что серия под угрозой. Плюс починили баг: стрик не обновлялся без перезагрузки страницы",
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
// если не залогинен — уводит на login.html
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = "login.html";
        return null;
    }
    return session.user;
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = "login.html";
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
        window.location.href = "onboarding.html";
        return false;
    }
    if (!profile?.onboarded) { window.location.href = "onboarding.html"; return false; }
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
        h4.textContent = title;
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

    const pages = [
        { href: "dashboard.html", key: "dashboard", i18n: "nav_dashboard", icon: "home", home: true },
        { href: "goals.html", key: "goals", i18n: "nav_goals", icon: "goals" },
        { href: "skills.html", key: "skills", i18n: "nav_skills", icon: "skills" },
        { href: "workouts.html", key: "workouts", i18n: "nav_workouts", icon: "workouts" },
        { href: "challenges.html", key: "challenges", i18n: "nav_challenges", icon: "challenges" },
        { href: "english.html", key: "english", i18n: "nav_english", icon: "english" },
        { href: "calendar.html", key: "calendar", i18n: "nav_calendar", icon: "calendar" },
        { href: "milestones.html", key: "milestones", i18n: "nav_milestones", icon: "milestones" },
        { href: "shop.html", key: "shop", i18n: "nav_shop", icon: "shop" },
        { href: "community.html", key: "community", i18n: "nav_community", icon: "community" },
        { href: "history.html", key: "history", i18n: "nav_history", icon: "history" },
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
    homeIconLink.href = homePage.href;
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
        a.href = p.href;
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

    for (const p of pages) {
        const a = document.createElement("a");
        a.href = p.href;
        a.innerHTML = `${iconSvg(p.icon)}<span>${plainLabel(p.i18n)}</span>`;
        if (p.key === active) a.className = "active";
        sidebar.appendChild(a);
    }

    if (userEmail) {
        const accountLink = document.createElement("a");
        accountLink.href = "account.html";
        accountLink.innerHTML = `${iconSvg("user")}<span>${t("nav_account_title")}</span>`;
        accountLink.className = active === "account" ? "active" : "";
        sidebar.appendChild(accountLink);
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
