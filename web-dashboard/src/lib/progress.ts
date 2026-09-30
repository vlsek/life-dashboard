import { fmtDate } from './date'
import { isMetricDone, metricCountsInDay, metricSchedule } from './metrics'
import { BONUS_PCT_PER_ITEM, type DayProgressSettings } from './progressSettings'
import type { Metric } from './types'

export interface PlannedItem {
  type?: 'goal' | string
  text: string
  done?: boolean
  bonus?: boolean
}

// Минимум полей цели, нужный чтобы понять "выполнена ли" — как g в allGoals в dashboard.js.
export interface GoalLite {
  name: string
  stages?: number | null
  done: boolean
  current_stage?: number | null
}

export interface ProgressResult {
  done: number
  total: number
  bonusPct: number
}

export function isPlannedItemDone(item: PlannedItem, allGoals: GoalLite[]): boolean | undefined {
  if (item.type === 'goal') {
    const g = allGoals.find((x) => x.name === item.text)
    if (!g) return undefined // удалённая цель — больше не в счёте
    const stages = g.stages ?? 1
    return stages <= 1 ? g.done : (g.current_stage ?? 0) >= stages
  }
  return !!item.done
}

// Портировано из computeDayProgress(): принимает уже загруженные данные вместо похода в БД.
export function computeDayProgressPure(
  settings: DayProgressSettings,
  metrics: Metric[],
  byMetricToday: Record<string, unknown>,
  dateStr: string,
  planned: PlannedItem[],
  allGoals: GoalLite[],
): ProgressResult | null {
  if (!settings.enabled) return null
  let done = 0
  let total = 0
  let bonusPct = 0

  if (settings.includeMetrics) {
    for (const m of metrics) {
      const isDone = isMetricDone(m, byMetricToday[m.id] as any)
      if (metricSchedule(m)?.type === 'at_most') continue // не дневной пункт — считается в неделе
      if (!metricCountsInDay(m, dateStr, isDone)) continue // сегодня по расписанию не нужна — не штрафуем
      total++
      if (isDone) done++
    }
  }

  // Бонусные (⭐) пункты дают перевыполнение НЕЗАВИСИМО от того, включён ли сам план в
  // базовые 100% — осознанный бонус сверху, поэтому список планов учитываем всегда.
  for (const item of planned) {
    const isDone = isPlannedItemDone(item, allGoals)
    if (isDone === undefined) continue
    if (item.bonus) {
      if (isDone) bonusPct += BONUS_PCT_PER_ITEM
    } else if (settings.includePlanned) {
      total++
      if (isDone) done++
    }
  }
  return { done, total, bonusPct }
}

// Неделя пн-вс — совпадает с mondayOf() в date.ts / weekStartStr() в streaks.ts
export function getWeekDates(today: Date): string[] {
  const daysSinceMonday = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - daysSinceMonday)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(fmtDate(d))
  }
  return dates
}

// Портировано из computeWeekProgress(): те же входные данные, но по каждому дню недели.
export function computeWeekProgressPure(
  settings: DayProgressSettings,
  metrics: Metric[],
  valuesByDate: Record<string, Record<string, unknown>>,
  pastOrToday: string[],
  plannedByDate: Record<string, PlannedItem[]>,
  allGoals: GoalLite[],
): ProgressResult | null {
  if (!settings.enabled) return null
  let done = 0
  let total = 0
  let bonusPct = 0

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
        total++
        if (isDone) done++
      }
    }
    // "N раз в неделю": в неделю идёт как N пунктов, из которых сделано столько, сколько выполнено дней.
    // "Не чаще N раз в неделю": один пункт недели — уложился в лимит или нет.
    for (const m of metrics) {
      const s = metricSchedule(m)
      if (s?.type === 'weekly') {
        total += s.min
        done += Math.min(s.min, weeklyDoneCount[m.id] || 0)
      } else if (s?.type === 'at_most') {
        total += 1
        if ((weeklyDoneCount[m.id] || 0) <= s.max) done += 1
      }
    }
  }

  for (const dateStr of pastOrToday) {
    for (const item of plannedByDate[dateStr] || []) {
      const isDone = isPlannedItemDone(item, allGoals)
      if (isDone === undefined) continue
      if (item.bonus) {
        if (isDone) bonusPct += BONUS_PCT_PER_ITEM
      } else if (settings.includePlanned) {
        total++
        if (isDone) done++
      }
    }
  }
  return { done, total, bonusPct }
}

// Итоговый процент (кольцо/бейдж): округлённая база + бонус сверху (может уйти за 100%).
export function progressPercent(p: ProgressResult): number {
  const basePct = p.total > 0 ? p.done / p.total : 0
  return Math.round(basePct * 100) + p.bonusPct
}
