// BACKLOG 49.5 «Приложение перегружено для нового пользователя» (решение владельца 2026-10-29): первые 7 дней после регистрации на Дашборде
// показываем только базовое — «Метрики дня» (в них «Цели на сегодня») и кружок прогресса дня (он сам уходит в шапку, раз «Профиль» скрыт);
// «Профиль», «Графики» и «Виджеты» открываются кнопкой «Показать всё» (выбор помнится на устройстве и едет между устройствами — SYNC_KEYS шапки)
// либо сами, когда пройдут 7 дней. У тех, кто пользуется давно, ничего не меняется (аккаунт старше 7 дней).
export const NEWBIE_DAYS = 7
export const SHOW_ALL_KEY = 'dash_show_all'
export const NEWBIE_VISIBLE_BLOCKS = ['daily'] as const

// Дней с регистрации (по дате создания аккаунта из auth). Нет даты / дата в будущем / мусор — null: режим новичка не включаем.
export function accountAgeDays(createdAt: string | null | undefined, now: number = Date.now()): number | null {
  if (!createdAt) return null
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t) || t > now + 3600_000) return null
  return (now - t) / 86400_000
}

export function isNewbie(createdAt: string | null | undefined, showAll: boolean, now: number = Date.now()): boolean {
  if (showAll) return false
  const age = accountAgeDays(createdAt, now)
  return age !== null && age < NEWBIE_DAYS
}

// Сколько целых дней осталось до автоматического открытия всех блоков (минимум 1, пока режим включён).
export function daysLeft(createdAt: string | null | undefined, now: number = Date.now()): number {
  const age = accountAgeDays(createdAt, now)
  if (age === null) return 0
  return Math.max(1, Math.ceil(NEWBIE_DAYS - age))
}

export function readShowAll(): boolean {
  try {
    return localStorage.getItem(SHOW_ALL_KEY) === '1'
  } catch {
    return false
  }
}

export function writeShowAll(): boolean {
  try {
    localStorage.setItem(SHOW_ALL_KEY, '1')
    return true
  } catch {
    return false
  }
}

export const isBlockInNewbie = (key: string): boolean => (NEWBIE_VISIBLE_BLOCKS as readonly string[]).includes(key)
