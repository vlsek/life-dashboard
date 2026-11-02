import { goalRowKind, type PlanGoal, type PlannedEntry } from './planned'

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
  goal?: boolean // пункт-ЦЕЛЬ (срез 3): отметка идёт через setGoalDone, а не через done пункта
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
  goal?: boolean // просьба отметить пункт-цель (одноэтапную)
}

// Свои невыполненные пункты и (срез 3) одноэтапные цели, ещё не выполненные: именно у них в плане стоит чекбокс. Многоэтапная цель закрывается
// этапами в «Целях» — одним касанием её не закрыть, поэтому в список «осталось» она не попадает; цель, которой уже нет (удалена), тоже.
// Без `goals` (старые вызовы) пункты-цели пропускаются, как раньше.
export function planSnapshotOf(date: string, planned: readonly PlannedEntry[], goals: readonly PlanGoal[] = []): PlanSnapshot {
  const items: PlanSnapshotItem[] = []
  planned.forEach((p, index) => {
    const time = typeof p.time === 'string' && p.time ? p.time : null
    if (p.type === 'goal') {
      const g = goals.find((x) => x.name === p.text)
      if (!g || goalRowKind(g) !== 'single' || g.done) return
      items.push({ index, text: p.text, time, goal: true })
      return
    }
    if (p.done) return
    items.push({ index, text: p.text, time })
  })
  return { date, items }
}

export const publishPlanSnapshot = (snapshot: PlanSnapshot) => window.dispatchEvent(new CustomEvent<PlanSnapshot>(PLAN_SNAPSHOT, { detail: snapshot }))
export const requestPlanSnapshot = () => window.dispatchEvent(new Event(PLAN_REQUEST))

// Просьба отметить пункт. Возвращает true, только если PlannedSection её принял (синхронный dispatch — флаг ставится до возврата).
export function requestPlanMark(date: string, index: number, text: string, goal = false): boolean {
  const detail: PlanMarkDetail = { date, index, text, handled: false, ...(goal ? { goal: true } : {}) }
  window.dispatchEvent(new CustomEvent<PlanMarkDetail>(PLAN_MARK, { detail }))
  return detail.handled
}
