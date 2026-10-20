// Service Worker: кэш "оболочки" приложения для офлайн-доступности.
//
// Два слоя:
//  1) СТРАНИЦЫ ПИЛОТОВ (/dashboard/, /goals/ … и их хэшированные ассеты, /header-widgets/header.js, иконки) — список лежит в
//     sw-assets.js, его ГЕНЕРИРУЕТ scripts/gen_sw_assets.py из собранных папок (BACKLOG 66.3). Версия кэша ld-shell-<хэш содержимого>
//     меняется сама: изменился sw-assets.js → браузер ставит новый service worker (importScripts учитывается при проверке обновления) →
//     новый кэш, старый удаляется. Страницы отдаются из кэша (холодный старт без сети), хэшированные файлы — cache-first, файлы без
//     хэша в имени (header.js, manifest, version.json, иконки) — «сеть, потом кэш».
//  2) ЛЕГАСИ-страницы (ASSETS ниже) — прежняя логика stale-while-revalidate, не менялась.
// НЕ трогает запросы к Supabase и любые не-GET (запись данных) — за офлайн-ЧТЕНИЕ данных отвечает offline-cache.js, за офлайн-ЗАПИСЬ
// будет очередь offlineOutbox (BACKLOG 66.5).

importScripts("/sw-assets.js");
const SHELL = self.LD_SW || { version: "none", pages: [], assets: [], runtime: [] };
const CACHE_NAME = "ld-shell-" + SHELL.version;
const NAV_NETWORK_TIMEOUT_MS = 4000; // для файлов «сеть, потом кэш»: на плохой связи не ждать вечно
const PAGES = new Set(SHELL.pages);
const HASHED = new Set(SHELL.assets);
const RUNTIME = new Set(SHELL.runtime);

const ASSETS = [
    "/", "/index.html", "/legacy/login.html", "/legacy/login.js", "/legacy/onboarding.html", "/legacy/onboarding.js",
    "/legacy/dashboard.html", "/legacy/dashboard.js",
    "/legacy/account.html", "/legacy/account.js",
    "/legacy/admin.html", "/legacy/admin.js",
    "/legacy/calendar.html", "/legacy/calendar.js",
    "/legacy/challenges.html", "/legacy/challenges.js",
    "/legacy/community.html", "/legacy/community.js",
    "/legacy/english.html", "/legacy/english.js",
    "/legacy/goals.html", "/legacy/goals.js",
    "/legacy/history.html", "/legacy/history.js",
    "/legacy/milestones.html", "/legacy/milestones.js",
    "/legacy/shop.html", "/legacy/shop.js",
    "/legacy/skills.html", "/legacy/skills.js",
    "/legacy/workouts.html", "/legacy/workouts.js",
    "/config.js", "/datacache.js", "/offline-cache.js", "/i18n.js", "/theme.js", "/style.css",
    "/manifest.json",
    "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-512-maskable.png",
    "/icons/icon-monochrome-192.png", "/icons/icon-monochrome.png", "/icons/apple-touch-icon.png",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const shellUrls = [...SHELL.pages, ...SHELL.assets, ...SHELL.runtime];
            return Promise.all([
                // cache: "reload" — не брать из HTTP-кэша браузера, иначе можно закэшировать устаревшую копию
                ...shellUrls.map((url) =>
                    cache.add(new Request(url, { cache: "reload" }))
                        .catch((e) => console.warn("sw: precache failed for", url, e)) // один файл не должен ронять установку
                ),
                ...ASSETS.map((url) =>
                    cache.add(new Request(url, { mode: url.startsWith("http") ? "no-cors" : "same-origin" }))
                        .catch((e) => console.warn("sw: precache failed for", url, e))
                ),
            ]);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k.startsWith("ld-shell-")).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Cloudflare 308-редиректит любой *.html путь на канонический адрес без расширения; respondWith() не может отдать РЕДИРЕКТНУТЫЙ
// Response для навигационного запроса — браузер кидает NetworkError. Пересобираем чистый Response без флага redirected.
async function clean(resp) {
    if (resp && resp.redirected) {
        const body = await resp.clone().blob();
        return new Response(body, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
    }
    return resp;
}

// /goals, /goals/ и /goals/index.html — одна и та же страница пилота; иначе null
function pageKey(pathname) {
    let p = pathname.endsWith("/index.html") ? pathname.slice(0, -"index.html".length) : pathname;
    if (!p.endsWith("/")) p += "/";
    return PAGES.has(p) ? p : null;
}

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), ms);
        promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });
}

// страница пилота: из кэша (уже предзагружена вместе со своими хэшированными файлами — страница и ассеты всегда одной версии);
// нет в кэше (первый визит до установки SW) — сеть; сети нет и кэша нет — страница входа, иначе короткий текст
async function pagePage(req, page) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(page);
    if (cached) return clean(cached);
    try {
        const resp = await fetch(req);
        if (resp && resp.ok) cache.put(page, resp.clone());
        return clean(resp);
    } catch (e) {
        const login = await cache.match("/login/");
        if (login) return clean(login);
        return new Response("Нет сети. Открой приложение, когда появится соединение.", {
            status: 503, headers: { "content-type": "text/plain; charset=utf-8" },
        });
    }
}

// файл с хэшем в имени неизменяем: кэш первым, сеть — только если его там нет
async function hashedAsset(req) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
}

// файл без хэша в имени (header.js, manifest, version.json, иконки) меняется на месте: сеть первой (с таймаутом), кэш — запасной
async function networkFirst(req) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const resp = await withTimeout(fetch(req), NAV_NETWORK_TIMEOUT_MS);
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
    } catch (e) {
        const cached = await cache.match(req);
        if (cached) return cached;
        throw e;
    }
}

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return; // POST/PATCH к Supabase (запись данных) не трогаем

    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
        if (req.mode === "navigate") {
            const page = pageKey(url.pathname);
            if (page) { event.respondWith(pagePage(req, page)); return; }
        } else if (HASHED.has(url.pathname)) {
            event.respondWith(hashedAsset(req)); return;
        } else if (RUNTIME.has(url.pathname)) {
            event.respondWith(networkFirst(req)); return;
        }
    }

    // ЛЕГАСИ: stale-while-revalidate — сразу отдаём закэшированное (если есть), в фоне обновляем из сети
    const isKnownAsset = ASSETS.includes(url.pathname) || ASSETS.includes(req.url);
    if (!isKnownAsset) return; // всё остальное, включая Supabase REST/Auth, идёт мимо SW как обычно

    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            const network = fetch(req)
                .then((resp) => {
                    if (resp && (resp.ok || resp.type === "opaque")) {
                        const copy = resp.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return resp;
                })
                .catch(() => cached);

            let result = cached || (await network);
            // Cloudflare 308-редиректит любой *.html путь (например /goals.html) на его
            // канонический адрес без расширения (/goals) — так было всегда, просто раньше
            // браузер сам тихо шёл по редиректу при обычной навигации. Но respondWith() не
            // может отдать РЕДИРЕКТНУТЫЙ Response для навигационного запроса — браузер кидает
            // NetworkError ("не удаётся получить доступ к сайту") вместо загрузки страницы.
            // Пересобираем чистый Response без флага redirected, прежде чем его отдавать.
            if (result && result.redirected) {
                const body = await result.clone().blob();
                result = new Response(body, { status: result.status, statusText: result.statusText, headers: result.headers });
            }
            return result;
        })()
    );
});
