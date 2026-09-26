import type { Milestone, MilestoneFormInput } from './types'
import { fmtDate } from './date'

// Прибавляет период к ISO-дате. Для месяцев/лет день месяца не «переезжает»:
// 31 января + 1 месяц = 28/29 февраля, а не 3 марта. Портировано 1:1 из milestones.js
// (addInterval), с тестами ниже сверенными по значениям оригинала.
export function addInterval(iso: string, value: number, unit: 'day' | 'week' | 'month' | 'year'): string {
  const d = new Date(iso + 'T00:00:00')
  if (unit === 'day') d.setDate(d.getDate() + value)
  else if (unit === 'week') d.setDate(d.getDate() + 7 * value)
  else {
    const day = d.getDate()
    const months = unit === 'year' ? value * 12 : value
    d.setDate(1)
    d.setMonth(d.getMonth() + months)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, lastDay))
  }
  return fmtDate(d)
}

// Разница в днях между сегодня и ISO-датой (отрицательное = просрочено).
export function daysUntil(iso: string, today: Date = new Date()): number {
  const t0 = new Date(today)
  t0.setHours(0, 0, 0, 0)
  return Math.round((new Date(iso + 'T00:00:00').getTime() - t0.getTime()) / 86400000)
}

export type StatusLevel = 'overdue' | 'today' | 'soon' | 'later' | null

// Уровень срочности для чипа статуса (цвет/текст рисует компонент, тут — только классификация).
// Пороги как в statusChip() оригинала: <0 просрочено, 0 сегодня, <=14 скоро, иначе обычный.
export function statusLevel(dueDate: string | null, today: Date = new Date()): { level: StatusLevel; days: number | null } {
  if (!dueDate) return { level: null, days: null }
  const days = daysUntil(dueDate, today)
  if (days < 0) return { level: 'overdue', days }
  if (days === 0) return { level: 'today', days }
  if (days <= 14) return { level: 'soon', days }
  return { level: 'later', days }
}

// Собирает строку для базы из значений формы. Если задан интервал и дата последнего раза —
// срок считается сам; иначе берётся дата, введённая вручную (разовая веха).
// Портировано 1:1 из buildRow() в milestones.js.
export function buildRow(res: MilestoneFormInput, noCategoryLabel: string) {
  const value = Math.max(0, Math.floor(res.interval_value || 0))
  let due: string | null = res.due_date || null
  if (value > 0 && res.last_date) due = addInterval(res.last_date, value, res.interval_unit)
  return {
    name: res.name.trim(),
    category: (res.category || '').trim() || noCategoryLabel,
    last_date: res.last_date || null,
    interval_value: value || null,
    interval_unit: value ? res.interval_unit : null,
    due_date: due,
    last_km: res.last_km || null,
    interval_km: res.interval_km || null,
    note: res.note?.trim() || null,
  }
}

// Группировка активных вех по категории (ключи отсортированы), внутри группы —
// по сроку (без срока — в конец). Портировано из render() в milestones.js.
export function groupActiveByCategory(active: Milestone[], noCategoryLabel: string): [string, Milestone[]][] {
  const groups: Record<string, Milestone[]> = {}
  for (const m of active) {
    const key = m.category || noCategoryLabel
    ;(groups[key] ??= []).push(m)
  }
  return Object.keys(groups)
    .sort()
    .map((cat) => [
      cat,
      groups[cat].slice().sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }),
    ])
}

// Выполненные — по дате последнего раза, новые сверху.
export function sortDone(done: Milestone[]): Milestone[] {
  return done.slice().sort((a, b) => (b.last_date ?? '').localeCompare(a.last_date ?? ''))
}

// Сводка "просрочено N / скоро N" для активных вех.
export function summary(active: Milestone[], today: Date = new Date()): { overdue: number; soon: number } {
  let overdue = 0
  let soon = 0
  for (const m of active) {
    if (!m.due_date) continue
    const days = daysUntil(m.due_date, today)
    if (days < 0) overdue++
    else if (days <= 14) soon++
  }
  return { overdue, soon }
}
