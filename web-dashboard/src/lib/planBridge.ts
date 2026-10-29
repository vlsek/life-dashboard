import type { PlannedEntry } from './planned'

// Мост «План ↔ список „Осталось на сегодня“» (BACKLOG 75.2, срез 2). У блоков страницы нет общего стора (см. events.ts),
// поэтому план остаётся у ЕДИНСТВЕННОГО писателя — PlannedSection: он публикует снимок своих невыполненных пунктов, а список читает
// снимок и просит отметить пункт тем же каналом. Второй копии плана и второй записи в daily_notes нет — значит, и гонки между ними.
// Нет блока «Планы» на странице (скрыт в раскладке) — снимка нет, отметка возвращает handled=false, ничего не ломается.
export const PLAN_SNAPSHOT = 'dashboard:plan-snapshot'
export const PLAN_REQUEST = 'dashboard:plan-request'
export const PLAN_MARK = 'dashboard:plan-mark-done'

export interface PlanSnapshotItem {
  index: number // позиция пункта в плане дня (нужна, чтобы PlannedSection нашёл его же)
  text: string
  time: string | null // «HH:MM» — время напоминания, если стоит
}
export interface PlanSnapshot {
  date: string
  items: PlanSnapshotItem[]
}
export interface PlanMarkDetail {
  date: string
  index: number
  text: string
  handled: boolean
}

// Только свои пункты (type !== 'goal') и только невыполненные: «выполнено» у пункта-цели берётся из самой цели — это следующий срез.
export function planSnapshotOf(date: string, planned: readonly PlannedEntry[]): PlanSnapshot {
  const items: PlanSnapshotItem[] = []
  planned.forEach((p, index) => {
    if (p.type === 'goal' || p.done) return
    items.push({ index, text: p.text, time: typeof p.time === 'string' && p.time ? p.time : null })
  })
  return { date, items }
}

export const publishPlanSnapshot = (snapshot: PlanSnapshot) => window.dispatchEvent(new CustomEvent<PlanSnapshot>(PLAN_SNAPSHOT, { detail: snapshot }))
export const requestPlanSnapshot = () => window.dispatchEvent(new Event(PLAN_REQUEST))

// Просьба отметить пункт. Возвращает true, только если PlannedSection её принял (синхронный dispatch — флаг ставится до возврата).
export function requestPlanMark(date: string, index: number, text: string): boolean {
  const detail: PlanMarkDetail = { date, index, text, handled: false }
  window.dispatchEvent(new CustomEvent<PlanMarkDetail>(PLAN_MARK, { detail }))
  return detail.handled
}
