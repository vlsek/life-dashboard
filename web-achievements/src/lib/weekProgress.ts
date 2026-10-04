// Процент недели для достижения «Мега продуктивность» (BACKLOG раздел 32): копия расчёта кольца недели с Дашборда
// (web-dashboard/src/lib/progress.ts + progressSettings.ts) — пилоты не делят код, поэтому правила держим в паре, менять ВМЕСТЕ.
// Здесь нет сети и DOM (кроме чтения настроек из localStorage в getDayProgressSettings).
import { fmtDate } from './date'
import { isMetricDone, metricCountsInDay, metricSchedule } from './metrics'
import type { Metric, MetricValue } from './types'

export interface DayProgressSettings {
  enabled: boolean
  includePlanned: boolean
  includeMetrics: boolean
}

export const BONUS_PCT_PER_ITEM = 20
export const WEEK_DAYS = 7

// Бонус недели пропорционален: +20%/7 за каждый выполненный ⭐-пункт (так бонус, сделанный каждый день, даёт неделе те же +20%, что дню).
export function weekBonusPct(doneBonusItems: number): number {
  return Math.round(((doneBonusItems * BONUS_PCT_PER_ITEM) / WEEK_DAYS) * 10) / 10
}

const DEFAULTS: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: true }

// Те же настройки, что на Дашборде (localStorage, ключ day_progress_settings; страницы одного адреса видят одно хранилище).
export function getDayProgressSettings(): DayProgressSettings {
  try {
    const raw = localStorage.getItem('day_progress_settings')
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw)
    return { enabled: saved.enabled ?? DEFAULTS.enabled, includePlanned: saved.includePlanned ?? DEFAULTS.includePlanned, includeMetrics: saved.includeMetrics ?? DEFAULTS.includeMetrics }
  } catch {
    return DEFAULTS
  }
}

export interface PlannedItem {
  type?: 'goal' | string
  text: string
  done?: boolean
  bonus?: boolean
}

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

// Неделя пн–вс — как getWeekDates() на Дашборде.
export function getWeekDates(day: Date): string[] {
  const daysSinceMonday = (day.getDay() + 6) % 7
  const start = new Date(day)
  start.setDate(day.getDate() - daysSinceMonday)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(fmtDate(d))
  }
  return dates
}

export function computeWeekProgressPure(
  settings: DayProgressSettings,
  metrics: Metric[],
  valuesByDate: Record<string, Record<string, MetricValue>>,
  dates: string[],
  plannedByDate: Record<string, PlannedItem[]>,
  allGoals: GoalLite[],
): ProgressResult | null {
  if (!settings.enabled) return null
  let done = 0
  let total = 0
  let doneBonusItems = 0

  if (settings.includeMetrics && metrics.length > 0 && dates.length > 0) {
    const weeklyDoneCount: Record<string, number> = {}
    for (const dateStr of dates) {
      const byMetric = valuesByDate[dateStr] || {}
      for (const m of metrics) {
        const isDone = isMetricDone(m, byMetric[m.id], dateStr)
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
    // «N раз в неделю» — N пунктов, сделано столько, сколько выполнено дней; «не чаще N раз» — один пункт недели.
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

  for (const dateStr of dates) {
    for (const item of plannedByDate[dateStr] || []) {
      const isDone = isPlannedItemDone(item, allGoals)
      if (isDone === undefined) continue
      if (item.bonus) {
        if (isDone) doneBonusItems++
      } else if (settings.includePlanned) {
        total++
        if (isDone) done++
      }
    }
  }
  return { done, total, bonusPct: weekBonusPct(doneBonusItems) }
}

// Итоговый процент (как кольцо недели): округлённая база + бонус сверху — может уйти за 100%.
export function progressPercent(p: ProgressResult): number {
  const basePct = p.total > 0 ? p.done / p.total : 0
  return Math.round(basePct * 100 + p.bonusPct)
}

export interface MegaWeeksInput {
  metrics: Metric[]
  values: { date: string; metric_id: string; value: MetricValue }[]
  planned: { date: string; planned_goals: PlannedItem[] | null }[]
  goals: GoalLite[]
  settings: DayProgressSettings
  today: Date
}

// Сколько ЗАКОНЧЕННЫХ недель (пн–вс, уже прошли целиком) завершены больше чем на 100%. Текущая неделя не считается — «закончить неделю».
// Больше 100% бывает только с бонусом (⭐-пункты плана): база не выше 100%. Если показ прогресса выключен — 0.
export function countMegaWeeks(input: MegaWeeksInput): number {
  if (!input.settings.enabled) return 0
  const byDay: Record<string, Record<string, MetricValue>> = {}
  for (const v of input.values) (byDay[v.date] ||= {})[v.metric_id] = v.value
  const plannedByDate: Record<string, PlannedItem[]> = {}
  for (const n of input.planned) if (Array.isArray(n.planned_goals) && n.planned_goals.length) plannedByDate[n.date] = n.planned_goals
  const firstDays = [...Object.keys(byDay), ...Object.keys(plannedByDate)].sort()
  if (!firstDays.length) return 0
  const thisMonday = getWeekDates(input.today)[0]
  const cursor = new Date(getWeekDates(new Date(firstDays[0] + 'T00:00:00'))[0] + 'T00:00:00')
  let count = 0
  for (let i = 0; i < 1500 && fmtDate(cursor) < thisMonday; i++) {
    const dates = getWeekDates(cursor)
    const active = dates.some((d) => byDay[d] || plannedByDate[d])
    if (active) {
      const r = computeWeekProgressPure(input.settings, input.metrics, byDay, dates, plannedByDate, input.goals)
      if (r && progressPercent(r) > 100) count++
    }
    cursor.setDate(cursor.getDate() + 7)
  }
  return count
}
