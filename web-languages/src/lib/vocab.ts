// Порт констант и чистых функций из english.js: список языков словаря, отображаемое
// имя языка, выбор языка перевода по умолчанию, авто-перевод через MyMemory, и
// localStorage-хранилище выбранного фильтра/последнего языка.
export const VOCAB_LANGS: [string, string][] = [
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['it', 'Italiano'],
  ['pt', 'Português'],
  ['nl', 'Nederlands'],
  ['pl', 'Polski'],
  ['cs', 'Čeština'],
  ['sv', 'Svenska'],
  ['tr', 'Türkçe'],
  ['uk', 'Українська'],
  ['ru', 'Русский'],
  ['ka', 'ქართული'],
  ['ar', 'العربية'],
  ['he', 'עברית'],
  ['hi', 'हिन्दी'],
  ['zh', '中文'],
  ['ja', '日本語'],
  ['ko', '한국어'],
]

export function langName(code: string): string {
  return (VOCAB_LANGS.find((l) => l[0] === code) || [code, (code || '').toUpperCase()])[1]
}

const FILTER_KEY = 'vocab_lang_filter'
const LAST_LANG_KEY = 'vocab_last_lang'

export function getLangFilter(): string {
  try {
    return localStorage.getItem(FILTER_KEY) || 'all'
  } catch {
    return 'all'
  }
}
export function setLangFilter(v: string) {
  try {
    localStorage.setItem(FILTER_KEY, v)
  } catch {
    /* ignore */
  }
}
export function getLastLang(): string {
  try {
    return localStorage.getItem(LAST_LANG_KEY) || 'en'
  } catch {
    return 'en'
  }
}
export function setLastLang(v: string) {
  try {
    localStorage.setItem(LAST_LANG_KEY, v)
  } catch {
    /* ignore */
  }
}

// ===== Вкладки словарей (BACKLOG 14, «Языки: вкладки словарей») =====
// Словарь = все слова одного языка (колонка vocabulary.lang). Вкладка может быть и пустой — человек создал
// словарь нового языка и ещё не добавил слов. Пустые вкладки и порядок вкладок хранятся в localStorage
// (как и выбранная вкладка), слова — в БД; новая миграция не нужна.
const TABS_KEY = 'vocab_tabs'

export interface VocabTab {
  code: string
  label: string
  count: number
}

export function getSavedTabs(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TABS_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.filter((c): c is string => typeof c === 'string' && c.length > 0 && c.length <= 12))]
  } catch {
    return []
  }
}
export function setSavedTabs(codes: string[]) {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(codes))
  } catch {
    /* ignore */
  }
}

// Вкладки = сохранённый порядок + языки, в которых есть слова, но которых в порядке ещё нет (по убыванию
// числа слов, при равенстве — по порядку списка языков). Порядок не прыгает, когда слов становится больше.
export function buildTabs(words: { lang: string | null }[], saved: string[]): VocabTab[] {
  const counts: Record<string, number> = {}
  for (const w of words) {
    const l = w.lang || 'en'
    counts[l] = (counts[l] || 0) + 1
  }
  const listIndex = (c: string) => {
    const i = VOCAB_LANGS.findIndex((l) => l[0] === c)
    return i === -1 ? 999 : i
  }
  const known = new Set(saved)
  const fresh = Object.keys(counts)
    .filter((c) => !known.has(c))
    .sort((a, b) => counts[b] - counts[a] || listIndex(a) - listIndex(b))
  return [...saved, ...fresh].map((code) => ({ code, label: langName(code), count: counts[code] || 0 }))
}

// Какая вкладка сейчас открыта: сохранённая, если она есть; единственный словарь — он сам; иначе «все».
export function resolveActiveTab(filter: string, tabs: VocabTab[]): string {
  if (filter !== 'all' && tabs.some((t) => t.code === filter)) return filter
  return tabs.length === 1 ? tabs[0].code : 'all'
}

// Языки, для которых словаря ещё нет — их можно добавить кнопкой «+».
export function addableLangs(tabs: VocabTab[]): [string, string][] {
  const have = new Set(tabs.map((t) => t.code))
  return VOCAB_LANGS.filter(([code]) => !have.has(code))
}

// Перевод идёт на язык интерфейса; если учишь как раз его — тогда на английский.
export function translationTarget(fromLang: string, uiLang: string): string {
  const ui = uiLang === 'en' ? 'en' : 'ru'
  return ui === fromLang ? 'en' : ui
}

// Бесплатный переводчик без ключа (MyMemory) — вызывается прямо из браузера пользователя,
// никаких серверных секретов не нужно. Лимит щедрый для личного использования (не для спама).
export async function autoTranslate(text: string, fromLang = 'en', toLang = 'ru'): Promise<string | null> {
  if (!text?.trim()) return null
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${fromLang}|${toLang}`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = await resp.json()
    const translated = data?.responseData?.translatedText
    // MyMemory возвращает "NO QUERY SPECIFIED" / похожие фейковые ответы при проблемах — отсекаем
    if (!translated || /no query|invalid|error/i.test(translated)) return null
    return translated
  } catch (e) {
    console.error('Translate error:', e)
    return null
  }
}
