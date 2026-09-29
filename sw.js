// Service Worker: кэш "оболочки" приложения (HTML/JS/CSS/иконки) для офлайн-доступности.
// НЕ трогает запросы к Supabase (другой домен, реальные данные) — за офлайн-данные для
// конкретных страниц отвечает offline-cache.js. Бампать CACHE_NAME при добавлении новых
// статических файлов в список ASSETS, иначе новые файлы не попадут в кэш у уже установленных
// пользователей до следующего изменения версии.

const CACHE_NAME = "ld-shell-v4";

const ASSETS = [
    "/", "/index.html", "/login.html", "/login.js", "/onboarding.html", "/onboarding.js",
    "/dashboard.html", "/dashboard.js",
    "/account.html", "/account.js",
    "/admin.html", "/admin.js",
    "/legacy/calendar.html", "/legacy/calendar.js",
    "/challenges.html", "/challenges.js",
    "/community.html", "/community.js",
    "/english.html", "/english.js",
    "/goals.html", "/goals.js",
    "/legacy/history.html", "/legacy/history.js",
    "/milestones.html", "/milestones.js",
    "/legacy/shop.html", "/legacy/shop.js",
    "/skills.html", "/skills.js",
    "/workouts.html", "/workouts.js",
    "/config.js", "/datacache.js", "/offline-cache.js", "/i18n.js", "/theme.js", "/style.css",
    "/manifest.json",
    "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-512-maskable.png",
    "/icons/icon-monochrome-192.png", "/icons/icon-monochrome.png", "/icons/apple-touch-icon.png",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(ASSETS.map((url) =>
                cache.add(new Request(url, { mode: url.startsWith("http") ? "no-cors" : "same-origin" }))
                    .catch((e) => console.warn("sw: precache failed for", url, e)) // один файл не должен ронять установку
            ))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// stale-while-revalidate: сразу отдаём закэшированное (если есть), в фоне обновляем из сети
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return; // POST/PATCH к Supabase (запись данных) не трогаем

    const url = new URL(req.url);
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
