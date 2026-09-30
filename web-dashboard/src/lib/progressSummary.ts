import { isMetricDone, metricCountsInDay, metricSchedule } from './metrics'
import { isPlannedItemDone, type GoalLite, type PlannedItem } from './progress'
import { BONUS_PCT_PER_ITEM, type DayProgressSettings } from './progressSettings'
import type { Metric } from './types'

// Сводка по клику на кольцо дня/недели (BACKLOG 11): что сделано, что осталось и сколько процентов даёт каждый пункт.
// Логика набора пунктов — ровно та же, что в computeDayProgressPure/computeWeekProgressPure (progress.ts); тест
// summaryMatchesProgress проверяет, что сумма весов совпадает с их done/total.

export interface SummaryItem {
  kind: 'metric' | 'plan'
  name: string
  date?: string // для недели: день, к которому относится пункт
  weight: number // сколько пунктов «веса» он даёт в знаменателе (обычно 1; «N раз в неделю» — N)
  doneWeight: number // сколько из этого выполнено
  note?: string // «2/3» для «N раз в неделю», «≤ 2» для «не чаще N»
}

export interface BonusItem {
  name: string
  date?: string
  done: boolean
}

export interface ProgressSummary {
  items: SummaryItem[]
  bonus: BonusItem[]
  done: number
  total: number
  basePct: number // 0..100, округлённо, как в кольце
  bonusPct: number
  totalPct: number
  itemPct: number // сколько процентов даёт один пункт веса (100 / total), 0 если пунктов нет
}

export const isItemDone = (i: SummaryItem) => i.doneWeight >= i.weight

function finish(items: SummaryItem[], bonus: BonusItem[]): ProgressSummary {
  const total = items.reduce((s, i) => s + i.weight, 0)
  const done = items.reduce((s, i) => s + i.doneWeight, 0)
  const basePct = total > 0 ? Math.round((done / total) * 100) : 0
  const bonusPct = bonus.filter((b) => b.done).length * BONUS_PCT_PER_ITEM
  return { items, bonus, done, total, basePct, bonusPct, totalPct: basePct + bonusPct, itemPct: total > 0 ? 100 / total : 0 }
}

function planItems(
  planned: PlannedItem[],
  allGoals: GoalLite[],
  includePlanned: boolean,
  date: string | undefined,
  items: SummaryItem[],
  bonus: BonusItem[],
) {
  for (const p of planned) {
    const isDone = isPlannedItemDone(p, allGoals)
    if (isDone === undefined) continue // удалённая цель — не в счёте
    if (p.bonus) bonus.push({ name: p.text, date, done: isDone })
    else if (includePlanned) items.push({ kind: 'plan', name: p.text, date, weight: 1, doneWeight: isDone ? 1 : 0 })
  }
}

export function daySummary(
  settings: DayProgressSettings,
  metrics: Metric[],
  byMetricToday: Record<string, unknown>,
  dateStr: string,
  planned: PlannedItem[],
  allGoals: GoalLite[],
): ProgressSummary {
  const items: SummaryItem[] = []
  const bonus: BonusItem[] = []
  if (settings.includeMetrics) {
    for (const m of metrics) {
      const isDone = isMetricDone(m, byMetricToday[m.id] as any)
      if (metricSchedule(m)?.type === 'at_most') continue
      if (!metricCountsInDay(m, dateStr, isDone)) continue
      items.push({ kind: 'metric', name: m.name, weight: 1, doneWeight: isDone ? 1 : 0 })
    }
  }
  planItems(planned, allGoals, settings.includePlanned, undefined, items, bonus)
  return finish(items, bonus)
}

export function weekSummary(
  settings: DayProgressSettings,
  metrics: Metric[],
  valuesByDate: Record<string, Record<string, unknown>>,
  pastOrToday: string[],
  plannedByDate: Record<string, PlannedItem[]>,
  allGoals: GoalLite[],
): ProgressSummary {
  const items: SummaryItem[] = []
  const bonus: BonusItem[] = []
  if (settings.includeMetrics && metrics.length > 0 && pastOrToday.length > 0) {
    const weeklyDoneCount: Record<string, number> = {}
    for (const dateStr of pastOrToday) {
      const byMetric = valuesByDate[dateStr] || {}
      for (const m of metrics) {
        const isDone = isMetricDone(m, byMetric[m.id] as any)
        const sc = metricSchedule(m)
        if (sc?.type === 'weekly' || sc?.type === 'at_most') {
          if (isDone) weeklyDoneCount[m.id] = (weeklyDoneCount[m.id] || 0) + 1
          continue
        }
        if (!metricCountsInDay(m, dateStr, isDone)) continue
        items.push({ kind: 'metric', name: m.name, date: dateStr, weight: 1, doneWeight: isDone ? 1 : 0 })
      }
    }
    for (const m of metrics) {
      const s = metricSchedule(m)
      const count = weeklyDoneCount[m.id] || 0
      if (s?.type === 'weekly') {
        items.push({ kind: 'metric', name: m.name, weight: s.min, doneWeight: Math.min(s.min, count), note: `${Math.min(s.min, count)}/${s.min}` })
      } else if (s?.type === 'at_most') {
        items.push({ kind: 'metric', name: m.name, weight: 1, doneWeight: count <= s.max ? 1 : 0, note: `${count}/≤${s.max}` })
      }
    }
  }
  for (const dateStr of pastOrToday) planItems(plannedByDate[dateStr] || [], allGoals, settings.includePlanned, dateStr, items, bonus)
  return finish(items, bonus)
}

// Сколько процентов даёт пункт (или недостающая часть «N раз в неделю»): вес / общий вес, одной цифрой после запятой.
export function itemSharePct(s: ProgressSummary, weight: number): number {
  return Math.round(weight * s.itemPct * 10) / 10
}
