import type {
  DailyNote,
  DayProgressSettings,
  Goal,
  Metric,
  MetricValue,
  PlannedItem,
  StatResult,
} from './types'
import { addDaysIso } from './date'
import { BONUS_PCT_PER_ITEM, isMetricDone, metricCountsInDay, metricSchedule } from './metrics'

export interface HistoryContext {
  metrics: Metric[]
  byDate: Record<string, Record<string, MetricValue>>
  notesByDate: Record<string, DailyNote>
  goals: Goal[]
  settings: DayProgressSettings
  firstDate: string | null
  today: string
}

export function hasData(ctx: HistoryContext, dateStr: string): boolean {
  return !!ctx.firstDate && dateStr >= ctx.firstDate && dateStr <= ctx.today
}

// Выполнен ли запланированный пункт (цели — по текущему состоянию цели, как и на дашборде).
// null — цель была удалена и в счёт не идёт (как на дашборде).
export function plannedItemDone(ctx: HistoryContext, item: PlannedItem): boolean | null {
  if (item.type === 'goal') {
    const g = ctx.goals.find((x) => x.name === item.text)
    if (!g) return null
    const stages = g.stages ?? 1
    return stages <= 1 ? !!g.done : (g.current_stage ?? 0) >= stages
  }
  return !!item.done
}

export function plannedOf(ctx: HistoryContext, dateStr: string): PlannedItem[] {
  const raw = ctx.notesByDate[dateStr]?.planned_goals || []
  return raw.map((p) => (typeof p === 'string' ? { type: 'custom' as const, text: p, done: false } : p))
}

// Итог дня: та же формула, что и кружок дня на дашборде, для произвольной даты
export function dayStats(ctx: HistoryContext, dateStr: string): StatResult {
  const s = ctx.settings
  let done = 0
  let total = 0
  let bonusPct = 0
  if (s.includeMetrics) {
    const vals = ctx.byDate[dateStr] || {}
    for (const m of ctx.metrics) {
      const isDone = isMetricDone(m, vals[m.id])
      if (metricSchedule(m)?.type === 'at_most') continue // не дневной пункт — считается в неделе
      if (!metricCountsInDay(m, dateStr, isDone)) continue
      total++
      if (isDone) done++
    }
  }
  for (const item of plannedOf(ctx, dateStr)) {
    const isDone = plannedItemDone(ctx, item)
    if (isDone === null) continue
    if (item.bonus) {
      if (isDone) bonusPct += BONUS_PCT_PER_ITEM
    } else if (s.includePlanned) {
      total++
      if (isDone) done++
    }
  }
  const base = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, bonusPct, pct: base + bonusPct }
}

// Итог недели (пн-вс): как computeWeekProgress на дашборде; считаются только дни с данными
// (от первой записи и до сегодня — будущее и «до начала» не в счёте)
export function weekStats(ctx: HistoryContext, mondayStr: string): StatResult | null {
  const s = ctx.settings
  if (!ctx.firstDate) return null
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(mondayStr, i)
    if (d <= ctx.today && d >= ctx.firstDate) days.push(d)
  }
  if (days.length === 0) return null

  let done = 0
  let total = 0
  let bonusPct = 0
  if (s.includeMetrics) {
    const weeklyDone: Record<string, number> = {}
    for (const d of days) {
      const vals = ctx.byDate[d] || {}
      for (const m of ctx.metrics) {
        const isDone = isMetricDone(m, vals[m.id])
        const sc = metricSchedule(m)
        if (sc?.type === 'weekly' || sc?.type === 'at_most') {
          if (isDone) weeklyDone[m.id] = (weeklyDone[m.id] || 0) + 1
          continue
        }
        if (!metricCountsInDay(m, d, isDone)) continue
        total++
        if (isDone) done++
      }
    }
    for (const m of ctx.metrics) {
      const sc = metricSchedule(m)
      if (sc?.type === 'weekly') {
        total += sc.min!
        done += Math.min(sc.min!, weeklyDone[m.id] || 0)
      } else if (sc?.type === 'at_most') {
        total += 1
        if ((weeklyDone[m.id] || 0) <= sc.max!) done += 1
      }
    }
  }
  for (const d of days) {
    for (const item of plannedOf(ctx, d)) {
      const isDone = plannedItemDone(ctx, item)
      if (isDone === null) continue
      if (item.bonus) {
        if (isDone) bonusPct += BONUS_PCT_PER_ITEM
      } else if (s.includePlanned) {
        total++
        if (isDone) done++
      }
    }
  }
  const base = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, bonusPct, pct: base + bonusPct }
}
