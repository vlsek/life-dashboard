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
