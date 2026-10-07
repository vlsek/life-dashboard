// Портировано из theme.js — тот же localStorage-ключ и тот же список тем, чтобы
// переключение здесь совпадало с остальным сайтом (общий localStorage, общий домен).
export const THEME_KEYS = {
  dark: 'theme_dark',
  monet: 'theme_monet',
  light: 'theme_light',
  pink: 'theme_pink',
  mint: 'theme_mint',
  sepia: 'theme_sepia',
  solarlight: 'theme_solarlight',
  nord: 'theme_nord',
  mocha: 'theme_mocha',
  amoled: 'theme_amoled',
  contrast: 'theme_contrast',
} as const

export type ThemeKey = keyof typeof THEME_KEYS

const THEME_BG_COLORS: Record<ThemeKey, string> = {
  dark: '#121212',
  monet: '#0d0703',
  light: '#f7f4ef',
  pink: '#fff0f5',
  mint: '#effaf4',
  sepia: '#f4ecd8',
  solarlight: '#fdf6e3',
  nord: '#2e3440',
  mocha: '#1e1e2e',
  amoled: '#000000',
  contrast: '#000000',
}

export function getTheme(): ThemeKey {
  const v = localStorage.getItem('site_theme')
  return v && v in THEME_KEYS ? (v as ThemeKey) : 'dark'
}

export function setTheme(theme: ThemeKey) {
  localStorage.setItem('site_theme', theme)
  document.documentElement.classList.remove(...Object.keys(THEME_KEYS).map((k) => 'theme-' + k))
  document.documentElement.classList.add('theme-' + theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_BG_COLORS[theme])
}

/* favorites:start (генерируется scripts/apply_themes.py — не править руками) */
// «Любимые темы» (решение владельца 2026-10-04): отмечаются в «Кастомизации» (максимум 4), и ТОЛЬКО они показываются в выпадающем
// списке тем бокового меню. Хранятся на устройстве в localStorage; пусто/сломано — прежние четыре. Активная тема в списке всегда есть.
export const FAVORITE_THEMES_KEY = 'favorite_themes'
export const FAVORITE_THEMES_EVENT = 'favorite-themes:changed'
export const MAX_FAVORITE_THEMES = 4
export const DEFAULT_FAVORITE_THEMES: ThemeKey[] = ['dark', 'monet', 'light', 'pink']

export function sanitizeFavoriteThemes(raw: unknown): ThemeKey[] {
  const list = Array.isArray(raw) ? raw : []
  const out: ThemeKey[] = []
  for (const k of list) {
    if (typeof k === 'string' && k in THEME_KEYS && !out.includes(k as ThemeKey)) out.push(k as ThemeKey)
    if (out.length === MAX_FAVORITE_THEMES) break
  }
  return out.length ? out : [...DEFAULT_FAVORITE_THEMES]
}

export function readFavoriteThemes(): ThemeKey[] {
  try {
    return sanitizeFavoriteThemes(JSON.parse(localStorage.getItem(FAVORITE_THEMES_KEY) || 'null'))
  } catch {
    return [...DEFAULT_FAVORITE_THEMES]
  }
}

export function writeFavoriteThemes(keys: ThemeKey[]): ThemeKey[] {
  const clean = sanitizeFavoriteThemes(keys)
  try {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(clean))
  } catch {
    /* хранилище недоступно — выбор не запомнится, список останется прежним */
  }
  window.dispatchEvent(new Event(FAVORITE_THEMES_EVENT))
  return clean
}

// Что показывать в выпадающем списке: любимые в их порядке (закрытые темы пропускаются) + активная тема, если её среди них нет
// (иначе select «потеряет» значение).
export function visibleThemes(active: ThemeKey): ThemeKey[] {
  const unlocked = readUnlockedThemes()
  const open = readFavoriteThemes().filter((k) => !isThemeLocked(k, unlocked))
  const fav = open.length ? open : [...DEFAULT_FAVORITE_THEMES]
  return fav.includes(active) ? fav : [...fav, active]
}

// «Темы-награды» (решение владельца 2026-10-06): часть тем закрыта и открывается НАГРАДОЙ за достижение (THEME_UNLOCK: тема → ключ
// достижения; остальные темы открыты всегда). Какие темы открыты, страница сама не знает: список «открытых» ставит шапка при каждой
// загрузке (запрос к user_achievements), а также «Кастомизация»; хранится на устройстве. Нет данных → закрытые остаются закрытыми.
// Закрытая тема, которая УЖЕ включена у человека, остаётся включённой (в списке активная тема есть всегда): отнимать её нельзя.
export const THEME_UNLOCK: Partial<Record<ThemeKey, string>> = { mint: 'skills_25', sepia: 'words_100', solarlight: 'goals_50', nord: 'learned_100', mocha: 'books_25', amoled: 'workouts_250' }
export const UNLOCKED_THEMES_KEY = 'unlocked_themes'
export const UNLOCKED_THEMES_EVENT = 'unlocked-themes:changed'

export function sanitizeUnlockedThemes(raw: unknown): ThemeKey[] {
  const list = Array.isArray(raw) ? raw : []
  return [...new Set(list)].filter((k): k is ThemeKey => typeof k === 'string' && k in THEME_UNLOCK)
}

export function readUnlockedThemes(): ThemeKey[] {
  try {
    return sanitizeUnlockedThemes(JSON.parse(localStorage.getItem(UNLOCKED_THEMES_KEY) || '[]'))
  } catch {
    return []
  }
}

// Записывает список и сообщает странице, только если он изменился (чтобы список тем не «мигал» при каждой синхронизации).
export function writeUnlockedThemes(keys: unknown): ThemeKey[] {
  const clean = sanitizeUnlockedThemes(keys)
  const before = readUnlockedThemes()
  const same = before.length === clean.length && clean.every((k) => before.includes(k))
  try {
    localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(clean))
  } catch {
    /* хранилище недоступно — список открытых не запомнится */
  }
  if (!same) window.dispatchEvent(new Event(UNLOCKED_THEMES_EVENT))
  return clean
}

export function isThemeLocked(key: ThemeKey, unlocked: ThemeKey[] = readUnlockedThemes()): boolean {
  return key in THEME_UNLOCK && !unlocked.includes(key)
}

// Какие закрытые темы открыты при данном наборе полученных достижений.
export function unlockedThemesFromAchievements(earned: Iterable<string>): ThemeKey[] {
  const have = new Set(earned)
  return (Object.keys(THEME_UNLOCK) as ThemeKey[]).filter((k) => have.has(THEME_UNLOCK[k] as string))
}
/* favorites:end */
