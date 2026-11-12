export const VERSION_CACHE_KEY = 'version_info_cache';
let cached = null;
let inFlight = null;
function isVersionInfo(v) {
    const o = v;
    return !!o && typeof o === 'object' && typeof o.version === 'string' && o.version !== '' && Array.isArray(o.en) && Array.isArray(o.ru);
}
function readStored() {
    try {
        const v = JSON.parse(localStorage.getItem(VERSION_CACHE_KEY) || 'null');
        return isVersionInfo(v) ? v : null;
    }
    catch {
        return null;
    }
}
function store(v) {
    try {
        localStorage.setItem(VERSION_CACHE_KEY, JSON.stringify(v));
    }
    catch {
        /* хранилище недоступно или переполнено — просто без запасной копии */
    }
}
export async function loadVersionInfo() {
    if (cached)
        return cached;
    if (!inFlight) {
        inFlight = fetch('/version.json')
            .then((r) => {
            if (!r.ok)
                throw new Error('version.json ' + r.status);
            return r.json();
        })
            .then((data) => {
            if (!isVersionInfo(data))
                throw new Error('version.json: неверный формат');
            cached = data;
            store(data);
            return data;
        })
            .catch((e) => {
            const old = readStored();
            if (old)
                return old; // не кладём в cached: следующая попытка снова сходит в сеть
            throw e;
        })
            .finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
}
