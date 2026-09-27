// Офлайн-кэш для чтения (C3, вариант 3 — локально, без синка записи).
//
// Идея: каждая страница считает свои данные в один объект (например ctx в history.js)
// и вместо прямого loadData() вызывает offlineCache.read(key, loadFn):
//   • если сеть есть и загрузка прошла — результат сохраняется в localStorage и возвращается
//     как есть ({ data, stale: false });
//   • если сети нет (fetch упал) — берётся последняя сохранённая копия из localStorage и
//     возвращается с флагом { data, stale: true, savedAt } — страница сама решает, показать
//     баннер "офлайн" через offlineCache.banner(savedAt) или нет;
//   • если офлайн и сохранённой копии ещё не было — исходная ошибка пробрасывается дальше,
//     как и раньше (страница ведёт себя как без офлайн-кэша).
// Ключ кэша привязан к user.id, чтобы при смене аккаунта на одном устройстве не подмешивались
// чужие данные. Ничего не пишется на сервер офлайн — это отдельная, более сложная задача
// (вариант 1 из ROADMAP), тут сознательно только чтение.

const OFFLINE_CACHE_PREFIX = "oc:";

function offlineCacheKey(userId, key) {
    return OFFLINE_CACHE_PREFIX + userId + ":" + key;
}

const offlineCache = {
    async read(userId, key, loadFn) {
        try {
            const data = await loadFn();
            try {
                localStorage.setItem(offlineCacheKey(userId, key), JSON.stringify({ data, savedAt: Date.now() }));
            } catch (e) {
                // localStorage переполнен/недоступен (приватный режим) — не критично, просто не кэшируем
                console.warn("offlineCache: couldn't persist", key, e);
            }
            return { data, stale: false };
        } catch (err) {
            const raw = localStorage.getItem(offlineCacheKey(userId, key));
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    return { data: parsed.data, stale: true, savedAt: parsed.savedAt };
                } catch (e2) {
                    // кэш повреждён — ведём себя как будто его не было
                }
            }
            throw err;
        }
    },

    // Текст баннера "офлайн, данные на HH:MM" в текущем языке; null если savedAt нет.
    banner(savedAt) {
        if (!savedAt) return null;
        const time = new Date(savedAt).toLocaleString(getLang() === "en" ? "en-US" : "ru-RU", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        return t("offline_cached_banner").replace("{time}", time);
    },
};
