// BACKLOG 44.8 срез 2: «Показывать …» — что человек видит на странице «Календарь» (вкладки «Календарь» и «История»). По умолчанию видно всё;
// выключенное запоминается в localStorage `calendar_show` (JSON) и уходит в профиль через ui_settings (ключ в SYNC_KEYS шапки, миграция 064).
// Сетка месяца есть всегда: её отключить нельзя — это и есть страница.
export const SHOW_KEY = 'calendar_show';
// Какие части относятся к какой вкладке (порядок — порядок «чипов» на экране)
export const CALENDAR_PARTS = ['today', 'plans', 'deadlines', 'events'];
export const HISTORY_PARTS = ['summary', 'progress', 'weekcol', 'stats', 'chart', 'weeks'];
export const ALL_PARTS = [...CALENDAR_PARTS, ...HISTORY_PARTS];
export function defaultShow() {
    return { today: true, plans: true, deadlines: true, events: true, summary: true, progress: true, weekcol: true, stats: true, chart: true, weeks: true };
}
// Из строки хранилища: мусор, не-объект, неизвестные ключи и не-булевы значения игнорируются (остаётся «показывать»)
export function parseShow(raw) {
    const out = defaultShow();
    if (!raw)
        return out;
    let v;
    try {
        v = JSON.parse(raw);
    }
    catch {
        return out;
    }
    if (!v || typeof v !== 'object' || Array.isArray(v))
        return out;
    for (const k of ALL_PARTS) {
        const x = v[k];
        if (typeof x === 'boolean')
            out[k] = x;
    }
    return out;
}
// В хранилище пишем только то, что выключено (короче, и новые части по умолчанию включены у всех); всё включено — ключ удаляем
export function serializeShow(s) {
    const off = {};
    for (const k of ALL_PARTS)
        if (!s[k])
            off[k] = false;
    return Object.keys(off).length ? JSON.stringify(off) : null;
}
export function loadShow() {
    try {
        return parseShow(localStorage.getItem(SHOW_KEY));
    }
    catch {
        return defaultShow();
    }
}
export function saveShow(s) {
    try {
        const v = serializeShow(s);
        if (v === null)
            localStorage.removeItem(SHOW_KEY);
        else
            localStorage.setItem(SHOW_KEY, v);
    }
    catch {
        /* хранилище недоступно — настройка живёт до перезагрузки страницы */
    }
}
