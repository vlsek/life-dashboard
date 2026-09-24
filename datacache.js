// Кэш данных дашборда (скорость загрузки).
//
// Раньше каждая галочка/подход заново скачивали ВСЮ историю значений и заметок (для стриков и
// графиков), а список метрик запрашивался десятки раз. Теперь:
//   • список метрик и вся история значений/заметок загружаются один раз (параллельные вызовы
//     делят один запрос);
//   • после записи в daily_values / daily_notes перезапрашиваются только затронутые даты и
//     подмешиваются в кэш — вместо полной перезагрузки;
//   • запись в metrics сбрасывает кэш метрик;
//   • страницы читаются пачками по 1000 строк — у Supabase лимит ответа 1000 строк, и без
//     пагинации у давних пользователей стрики и графики считались бы по обрезанной истории.
// Отслеживание записей — обёртка над sb.from(): ловит insert/update/upsert/delete по этим
// трём таблицам, остальной код записи менять не нужно.

const dataCache = {
    metrics: null,
    values: null,
    valuesDirty: new Set(),
    notes: null,
    notesDirty: new Set(),
};

const PAGE_SIZE = 1000;

async function fetchAllRows(buildQuery) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
    }
    return rows;
}

function byDateAsc(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }

// payload записи (объект или массив объектов) → список дат, либо null если даты определить нельзя
function datesFromPayload(payload) {
    const items = Array.isArray(payload) ? payload : [payload];
    const dates = [];
    for (const it of items) {
        if (!it || typeof it.date !== "string") return null;
        dates.push(it.date);
    }
    return dates.length ? dates : null;
}

function markCacheDirty(table, method, payload) {
    if (table === "metrics") { dataCache.metrics = null; return; }
    const isValues = table === "daily_values";
    const dirty = isValues ? dataCache.valuesDirty : dataCache.notesDirty;
    const dates = (method === "insert" || method === "upsert") ? datesFromPayload(payload) : null;
    if (dates) { dates.forEach(d => dirty.add(d)); return; }
    // update/delete без понятных дат — сбрасываем кэш таблицы целиком
    if (isValues) { dataCache.values = null; dataCache.valuesDirty.clear(); }
    else { dataCache.notes = null; dataCache.notesDirty.clear(); }
}

function installCacheInvalidation(client) {
    const WATCHED = new Set(["metrics", "daily_values", "daily_notes"]);
    const origFrom = client.from.bind(client);
    client.from = (table) => {
        const qb = origFrom(table);
        if (!WATCHED.has(table)) return qb;
        for (const method of ["insert", "update", "upsert", "delete"]) {
            const orig = qb[method];
            if (typeof orig !== "function") continue;
            qb[method] = function (...args) {
                markCacheDirty(table, method, args[0]); // сразу — чтобы читатели во время записи не взяли устаревшее
                const builder = orig.apply(this, args);
                const origThen = builder.then.bind(builder);
                builder.then = (onOk, onErr) => origThen(
                    (res) => { markCacheDirty(table, method, args[0]); return onOk ? onOk(res) : res; }, // и после — когда запись реально прошла
                    onErr
                );
                return builder;
            };
        }
        return qb;
    };
}

// ---- Чтение ----
function getMetrics() {
    if (!dataCache.metrics) {
        dataCache.metrics = (async () => {
            const { data, error } = await sb.from("metrics").select("*").eq("user_id", user.id).eq("active", true).order("position");
            if (error) { dataCache.metrics = null; console.error(error); return []; }
            return data || [];
        })();
    }
    return dataCache.metrics;
}

function getAllValues() {
    if (!dataCache.values) {
        dataCache.valuesDirty.clear();
        dataCache.values = fetchAllRows(() => sb.from("daily_values").select("*").eq("user_id", user.id).order("date").order("metric_id"))
            .catch(e => { dataCache.values = null; console.error(e); return []; });
    } else if (dataCache.valuesDirty.size) {
        const dates = [...dataCache.valuesDirty];
        dataCache.valuesDirty.clear();
        const prev = dataCache.values;
        dataCache.values = (async () => {
            const rows = await prev;
            try {
                const fresh = await fetchAllRows(() => sb.from("daily_values").select("*").eq("user_id", user.id).in("date", dates).order("date").order("metric_id"));
                const set = new Set(dates);
                return rows.filter(r => !set.has(r.date)).concat(fresh).sort(byDateAsc);
            } catch (e) {
                console.error(e);
                dataCache.values = null; // на следующем чтении загрузим заново
                return rows;
            }
        })();
    }
    return dataCache.values;
}

function getAllNotes() {
    if (!dataCache.notes) {
        dataCache.notesDirty.clear();
        dataCache.notes = fetchAllRows(() => sb.from("daily_notes").select("date, items, planned_goals").eq("user_id", user.id).order("date"))
            .catch(e => { dataCache.notes = null; console.error(e); return []; });
    } else if (dataCache.notesDirty.size) {
        const dates = [...dataCache.notesDirty];
        dataCache.notesDirty.clear();
        const prev = dataCache.notes;
        dataCache.notes = (async () => {
            const rows = await prev;
            try {
                const fresh = await fetchAllRows(() => sb.from("daily_notes").select("date, items, planned_goals").eq("user_id", user.id).in("date", dates).order("date"));
                const set = new Set(dates);
                return rows.filter(r => !set.has(r.date)).concat(fresh).sort(byDateAsc);
            } catch (e) {
                console.error(e);
                dataCache.notes = null;
                return rows;
            }
        })();
    }
    return dataCache.notes;
}
