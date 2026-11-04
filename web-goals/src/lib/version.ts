// Версия и ченджлог сайдбара — единственный источник данных: /version.json в корне домена,
// сгенерированный из config.js (см. scripts/gen_version_json.py). Не дублируем CHANGELOG в
// каждом пилоте: после правки config.js достаточно перегенерировать один файл.
// Последний удачный ответ запоминается на устройстве: если /version.json не загрузился (нет сети, сбой, 404 вместо JSON), сайдбар
// показывает последнюю известную версию и историю, а не пустое «Что нового» без номера. Файл одинаков во всех пилотах (copy-sync тест).
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export interface VersionInfo {
  version: string
  en: ChangelogEntry[]
  ru: ChangelogEntry[]
}

export const VERSION_CACHE_KEY = 'version_info_cache'

let cached: VersionInfo | null = null
let inFlight: Promise<VersionInfo> | null = null

function isVersionInfo(v: unknown): v is VersionInfo {
  const o = v as VersionInfo | null
  return !!o && typeof o === 'object' && typeof o.version === 'string' && o.version !== '' && Array.isArray(o.en) && Array.isArray(o.ru)
}

function readStored(): VersionInfo | null {
  try {
    const v = JSON.parse(localStorage.getItem(VERSION_CACHE_KEY) || 'null')
    return isVersionInfo(v) ? v : null
  } catch {
    return null
  }
}

function store(v: VersionInfo): void {
  try {
    localStorage.setItem(VERSION_CACHE_KEY, JSON.stringify(v))
  } catch {
    /* хранилище недоступно или переполнено — просто без запасной копии */
  }
}

export async function loadVersionInfo(): Promise<VersionInfo> {
  if (cached) return cached
  if (!inFlight) {
    inFlight = fetch('/version.json')
      .then((r) => {
        if (!r.ok) throw new Error('version.json ' + r.status)
        return r.json()
      })
      .then((data: unknown) => {
        if (!isVersionInfo(data)) throw new Error('version.json: неверный формат')
        cached = data
        store(data)
        return data
      })
      .catch((e) => {
        const old = readStored()
        if (old) return old // не кладём в cached: следующая попытка снова сходит в сеть
        throw e
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}
