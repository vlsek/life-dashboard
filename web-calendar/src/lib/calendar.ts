import type { CalendarCell, PlannedItem, RawPlannedItem } from './types'
import { fmtDate } from './date'

// Старые записи-строки конвертируются на лету, как в calendar.js/dashboard.js.
export function normalizePlanned(raw: RawPlannedItem[] | null | undefined): PlannedItem[] {
  return (raw || []).map((p) => (typeof p === 'string' ? { type: 'custom', text: p, done: false } : p))
}

export function doneCount(planned: PlannedItem[]): { done: number; total: number } {
  return { done: planned.filter((p) => p.done).length, total: planned.length }
}

// Понедельник = 0 (portировано из startOffset в calendar.js: (firstOfMonth.getDay()+6)%7).
export function mondayOffset(firstOfMonth: Date): number {
  return (firstOfMonth.getDay() + 6) % 7
}

// Строит сетку месяца: `mondayOffset` пустых ячеек в начале + одна ячейка на каждый день.
// byDate — уже нормализованные planned_goals по дате (см. normalizePlanned).
export function buildMonthGrid(year: number, month: number, byDate: Record<string, PlannedItem[]>, todayIso: string): (CalendarCell | null)[] {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const cells: (CalendarCell | null)[] = new Array(mondayOffset(firstOfMonth)).fill(null)
  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    const dateStr = fmtDate(new Date(year, month, day))
    cells.push({ day, dateStr, isToday: dateStr === todayIso, planned: byDate[dateStr] || [] })
  }
  return cells
}
