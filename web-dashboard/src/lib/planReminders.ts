import { isValidTime, type PlannedEntry } from './planned'

// Напоминания по времени пунктов плана (BACKLOG 7.1). Чистые функции без сети/DOM/Vue —
// сеть, таймер и системные уведомления в usePlanReminders.ts. Покрыто planReminders.test.ts.

export interface DueReminder {
  index: number // позиция пункта в плане дня
  time: string
  text: string
  key: string // стабильный ключ «уже напомнили / уже закрыли»
}

// «HH:MM» текущего локального времени — сравниваем строками: для валидных HH:MM это то же
// самое, что сравнивать минуты с полуночи.
export function nowHHMM(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// Ключ не зависит от позиции: пункты можно удалять/переставлять, а «уже напомнили» должно
// сохраниться. Дата — часть ключа, чтобы завтрашний «Позвонить в 09:00» сработал снова.
export function reminderKey(dateIso: string, entry: Pick<PlannedEntry, 'time' | 'text'>): string {
  return `${dateIso}|${entry.time}|${entry.text}`
}

// Пункты, у которых время уже наступило (или прошло) и которые ещё не выполнены. Просроченное тоже
// возвращаем: открыл Дашборд в 18:00, а на 15:00 стоял пункт — лучше напомнить поздно, чем никогда.
// `isDone` решает вызывающий: у своих пунктов это done, у целей — состояние самой цели.
export function dueReminders(planned: PlannedEntry[], now: Date, dateIso: string, isDone: (entry: PlannedEntry) => boolean): DueReminder[] {
  const hhmm = nowHHMM(now)
  const out: DueReminder[] = []
  planned.forEach((p, index) => {
    if (!isValidTime(p.time) || p.time > hhmm || isDone(p)) return
    out.push({ index, time: p.time, text: p.text, key: reminderKey(dateIso, p) })
  })
  return out.sort((a, b) => a.time.localeCompare(b.time))
}
