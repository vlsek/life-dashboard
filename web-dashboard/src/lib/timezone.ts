import { sb } from './supabase'

// BACKLOG 7.3 / миграция 030_user_timezone.sql: серверные функции лидерборда и стриков считают «сегодня»
// по часовому поясу пользователя из profiles.timezone. Пояс берём из браузера (IANA-имя, например
// 'Europe/Moscow' — с ним переход на летнее время учитывается сам, в отличие от числового смещения) и
// тихо записываем в профиль. Это необязательная синхронизация: если миграция ещё не применена или запись
// не удалась, ничего не показываем и сайт работает как раньше.

const SYNCED_KEY = 'tz_synced' // `${userId}:${timeZone}` — что уже записано в профиль
const RETRY_KEY = 'tz_sync_retry_at' // после неудачи (нет колонки/прав) не повторять чаще, чем раз в 6 часов
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000

export function browserTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && tz.length <= 64 ? tz : null
  } catch {
    return null
  }
}

export async function syncUserTimezone(userId: string, now: number = Date.now()): Promise<void> {
  const tz = browserTimeZone()
  if (!tz) return
  try {
    const stamp = `${userId}:${tz}`
    if (localStorage.getItem(SYNCED_KEY) === stamp) return
    if (now < Number(localStorage.getItem(RETRY_KEY) || 0)) return
    const { error } = await sb.from('profiles').update({ timezone: tz }).eq('user_id', userId)
    if (error) {
      localStorage.setItem(RETRY_KEY, String(now + RETRY_DELAY_MS))
      return
    }
    localStorage.setItem(SYNCED_KEY, stamp)
    localStorage.removeItem(RETRY_KEY)
  } catch {
    /* необязательная синхронизация — не мешаем странице */
  }
}
