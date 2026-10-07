// ГЕНЕРИРУЕТСЯ scripts/apply_themes.py из scripts/themes_data.py (UNLOCK) — не править руками.
import type { ThemeKey } from './prefs'

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
