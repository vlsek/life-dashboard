import { sb } from './supabase'
import { THEME_UNLOCK, unlockedThemesFromAchievements, writeUnlockedThemes } from './themeUnlock'

// Какие темы-награды открыты у человека: смотрим, какие из достижений-«ключей» (THEME_UNLOCK) у него получены, и запоминаем список на
// устройстве (его читают все страницы: список тем в боковом меню, окно «Настройки», «Кастомизация»). Вызывается шапкой при каждой
// загрузке страницы. Нет сети/ошибка — молча оставляем прежний список (закрытые не откроются, открытые не закроются).
export async function syncUnlockedThemes(userId: string): Promise<void> {
  try {
    const keys = [...new Set(Object.values(THEME_UNLOCK))] as string[]
    const { data, error } = await sb.from('user_achievements').select('key').eq('user_id', userId).in('key', keys)
    if (error || !data) return
    writeUnlockedThemes(unlockedThemesFromAchievements((data as { key: string }[]).map((r) => r.key)))
  } catch {
    /* оставляем прежний список */
  }
}
