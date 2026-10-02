// BACKLOG 18.5: «напоминание выпить воды — каждые 3 часа и только при открытии приложения». Никаких push-уведомлений и
// фоновых таймеров: плашка может появиться только в момент, когда человек открыл страницу, и не чаще раза в 3 часа
// (время последнего показа лежит в localStorage и общее для всех вкладок и страниц сайта). Ночью не беспокоим.
export const WATER_REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000
export const WATER_REMINDER_OFF_KEY = 'water_reminders_off' // '1' — выключено в настройках (окно в правой панели)
export const WATER_REMINDER_LAST_KEY = 'water_reminder_last' // метка времени (мс) последнего показа
export const QUIET_FROM_HOUR = 22 // с 22:00 …
export const QUIET_UNTIL_HOUR = 8 // … до 08:00 не напоминаем

export function isQuietHour(d: Date): boolean {
  const h = d.getHours()
  return h >= QUIET_FROM_HOUR || h < QUIET_UNTIL_HOUR
}

export interface WaterReminderInput {
  now: Date
  lastShownMs: number | null
  ml: number // выпито сегодня
  goal: number | null | undefined // эффективная норма, мл
  off: boolean
}

export function shouldRemindWater({ now, lastShownMs, ml, goal, off }: WaterReminderInput): boolean {
  if (off) return false
  if (!goal || goal <= 0) return false // нет воды-метрики или нормы — напоминать не о чем
  if (ml >= goal) return false // норма выпита
  if (isQuietHour(now)) return false
  if (lastShownMs != null && Number.isFinite(lastShownMs)) {
    const passed = now.getTime() - lastShownMs
    // passed < 0 — часы переведены назад: считаем, что показ был «давно», чтобы напоминание не пропало навсегда
    if (passed >= 0 && passed < WATER_REMINDER_INTERVAL_MS) return false
  }
  return true
}

export function readLastShown(): number | null {
  try {
    const v = localStorage.getItem(WATER_REMINDER_LAST_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}
export function writeLastShown(ms: number) {
  try {
    localStorage.setItem(WATER_REMINDER_LAST_KEY, String(ms))
  } catch {
    /* приватный режим: напомнит при каждом открытии — не страшно */
  }
}
export function remindersOff(): boolean {
  try {
    return localStorage.getItem(WATER_REMINDER_OFF_KEY) === '1'
  } catch {
    return false
  }
}
