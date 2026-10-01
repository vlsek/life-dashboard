import { isDone, type BalanceMetric, type BalanceValueRow } from './balance'
import { addDaysIso } from './date'

// Журнал баллов за последние дни (BACKLOG 7.1 «Клик по баллам на главной»): за что начислено сегодня и за неделю.
// Правила начисления — ровно те же, что в calcBalance() (lib/balance.ts): +1 за каждую выполненную метрику дня,
// у цели — её points (по умолчанию 5), у прочитанной книги — points (по умолчанию 10); покупка в магазине — минус cost.
// Навыки (+10 при освоении) даты не хранят, поэтому в журнал по дням не попадают — только в общий баланс.
// Только чистая логика, без DOM и сети (сеть — в usePointsLog.ts).

export interface LogMetric extends BalanceMetric {
  name: string
  icon: string | null
}
export interface LogGoal { name: string; points: number | null; done_date: string | null }
export interface LogBook { title: string; points: number | null; done_date: string | null }
export interface LogPurchase { name: string; cost: number | null; redeemed_date: string | null }

export type PointsKind = 'metric' | 'goal' | 'book' | 'spent'
export interface PointsEntry {
  kind: PointsKind
  label: string
  icon: string | null
  // для начислений > 0, для покупки — отрицательное число
  points: number
}
export interface PointsDay {
  date: string
  entries: PointsEntry[]
  earned: number
  spent: number
}
export interface PointsLog {
  days: PointsDay[]
  earnedToday: number
  earnedWeek: number
  spentWeek: number
}

export const LOG_DAYS = 7

// Даты окна: сегодня и предыдущие дни, новые сверху. Календарная арифметика (addDaysIso), не миллисекунды.
export function windowDates(today: string, days: number = LOG_DAYS): string[] {
  return Array.from({ length: days }, (_, i) => addDaysIso(today, -i))
}

export function buildPointsLog(
  today: string,
  metrics: LogMetric[],
  values: BalanceValueRow[],
  goals: LogGoal[],
  books: LogBook[],
  purchases: LogPurchase[],
  days: number = LOG_DAYS,
): PointsLog {
  const dates = windowDates(today, days)
  const inWindow = new Set(dates)
  const byDay: Record<string, Record<string, unknown>> = {}
  for (const v of values) if (inWindow.has(v.date)) (byDay[v.date] ||= {})[v.metric_id] = v.value

  const list: PointsDay[] = dates.map((date) => {
    const entries: PointsEntry[] = []
    for (const m of metrics) {
      if (isDone(m, byDay[date]?.[m.id])) entries.push({ kind: 'metric', label: m.name, icon: m.icon, points: 1 })
    }
    for (const g of goals) if (g.done_date === date) entries.push({ kind: 'goal', label: g.name, icon: null, points: g.points ?? 5 })
    for (const b of books) if (b.done_date === date) entries.push({ kind: 'book', label: b.title, icon: null, points: b.points ?? 10 })
    for (const p of purchases) if (p.redeemed_date === date) entries.push({ kind: 'spent', label: p.name, icon: null, points: -(p.cost ?? 0) })
    const earned = entries.filter((e) => e.points > 0).reduce((s, e) => s + e.points, 0)
    const spent = -entries.filter((e) => e.points < 0).reduce((s, e) => s + e.points, 0)
    return { date, entries, earned, spent }
  })

  return {
    days: list,
    earnedToday: list[0]?.earned ?? 0,
    earnedWeek: list.reduce((s, d) => s + d.earned, 0),
    spentWeek: list.reduce((s, d) => s + d.spent, 0),
  }
}

// Компактный вид окна «Баллы» (BACKLOG 16, 17:02): по умолчанию — последние RECENT_LIMIT «источников прибытка»,
// остальное разворачивается вниз. Источник прибытка — запись с положительными баллами (метрика, цель, книга);
// покупки в магазине — отдельный список (они не «прибыток»). Порядок: новые дни сверху; внутри дня — как в журнале.
export const RECENT_LIMIT = 5

export interface LogRow extends PointsEntry {
  date: string
}

function flatten(log: PointsLog, pick: (e: PointsEntry) => boolean): LogRow[] {
  const rows: LogRow[] = []
  for (const d of log.days) for (const e of d.entries) if (pick(e)) rows.push({ ...e, date: d.date })
  return rows
}

export const incomeRows = (log: PointsLog): LogRow[] => flatten(log, (e) => e.points > 0)
export const purchaseRows = (log: PointsLog): LogRow[] => flatten(log, (e) => e.points < 0)
