// Версия и ченджлог сайдбара — единственный источник данных: /version.json в корне домена,
// сгенерированный из config.js (см. scripts/gen_version_json.py). Не дублируем CHANGELOG в
// каждом пилоте: после правки config.js достаточно перегенерировать один файл.
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

let cached: VersionInfo | null = null
let inFlight: Promise<VersionInfo> | null = null

export async function loadVersionInfo(): Promise<VersionInfo> {
  if (cached) return cached
  if (!inFlight) {
    inFlight = fetch('/version.json')
      .then((r) => r.json())
      .then((data: VersionInfo) => {
        cached = data
        return data
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}
