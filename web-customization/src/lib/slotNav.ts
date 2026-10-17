import { SLOTS } from './slots'

// Навигация «витрина ↔ слот» страницы «Кастомизация» (BACKLOG 64.1, срез 2). Состояние лежит в адресе: `#slot=<id>` — открыт слот, `#slot=all` —
// все разделы одним списком (прежняя лента), пусто — витрина. Так кнопка «Назад» на телефоне возвращает из слота на витрину, а перезагрузка
// остаётся там же. Мусор в адресе = витрина.
export const SLOT_ALL = 'all'
const PREFIX = '#slot='

export function parseSlotHash(hash: string, valid: readonly string[] = SLOTS.map((s) => s.id)): string {
  if (!hash.startsWith(PREFIX)) return ''
  let id: string
  try {
    id = decodeURIComponent(hash.slice(PREFIX.length))
  } catch {
    return '' // битая запись (%E0%A4%A) — витрина, а не ошибка страницы
  }
  return id === SLOT_ALL || valid.includes(id) ? id : ''
}

export const slotHash = (id: string): string => (id ? PREFIX + encodeURIComponent(id) : '')

export function readSlot(): string {
  try {
    return parseSlotHash(location.hash)
  } catch {
    return ''
  }
}

// Открыть слот (или витрину при ''): меняем адрес — браузер сам добавит запись в историю, «Назад» вернёт на витрину
export function writeSlot(id: string): void {
  try {
    if (id) location.hash = slotHash(id)
    else history.pushState(null, '', location.pathname + location.search)
  } catch {
    /* адрес недоступен — состояние живёт в странице */
  }
}
