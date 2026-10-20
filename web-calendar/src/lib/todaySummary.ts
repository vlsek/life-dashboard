import { addDaysIso, parseIso } from './date'
import type { PlannedItem } from './types'

// Карточка «Сегодня» над сеткой «Календаря» (BACKLOG 44.8, срез 4): планы на сегодня и ближайшие сроки целей. Чистая логика без Vue и сети.
export const HORIZON_DAYS = 14 // какие сроки считаем «ближайшими»
export const MAX_PLANS = 4 // сколько пунктов плана показываем (остальные — «ещё n»)
export const MAX_DEADLINES = 3

export interface GoalRow {
  id: string
  name: string
  done: boolean
  deadline: string | null // ISO-дата
}

export type DueKind = 'overdue' | 'today' | 'tomorrow' | 'soon'

export interface UpcomingGoal {
  id: string
  name: string
  deadline: string
  daysLeft: number // < 0 — просрочено
  kind: DueKind
}

export interface TodaySummary {
  plans: PlannedItem[] // первые MAX_PLANS
  planMore: number // сколько пунктов не поместилось
  plannedTotal: number
  plannedDone: number
  upcoming: UpcomingGoal[] // просроченные первыми, затем по возрастанию срока; не больше MAX_DEADLINES
  upcomingMore: number
}

// Дней от a до b (по календарным датам, без часов/DST): b позже — положительное
export function daysBetween(a: string, b: string): number {
  const x = parseIso(a)
  const y = parseIso(b)
  return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000)
}

export function dueKind(daysLeft: number): DueKind {
  return daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : 'soon'
}

export function buildToday(today: string, planned: readonly PlannedItem[], goals: readonly GoalRow[]): TodaySummary {
  const limit = addDaysIso(today, HORIZON_DAYS)
  const rows: UpcomingGoal[] = []
  for (const g of goals) {
    if (g.done || !g.deadline || g.deadline > limit) continue
    const daysLeft = daysBetween(today, g.deadline)
    rows.push({ id: g.id, name: g.name, deadline: g.deadline, daysLeft, kind: dueKind(daysLeft) })
  }
  rows.sort((p, q) => p.daysLeft - q.daysLeft || p.name.localeCompare(q.name)) // просроченные (отрицательные) окажутся первыми
  return {
    plans: planned.slice(0, MAX_PLANS),
    planMore: Math.max(0, planned.length - MAX_PLANS),
    plannedTotal: planned.length,
    plannedDone: planned.filter((p) => p.done).length,
    upcoming: rows.slice(0, MAX_DEADLINES),
    upcomingMore: Math.max(0, rows.length - MAX_DEADLINES),
  }
}
