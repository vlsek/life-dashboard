import { fmtDate } from './date'
import { isMetricDone, metricCountsInDay, metricSchedule } from './metrics'
import { BONUS_PCT_PER_ITEM, weekBonusPct, type DayProgressSettings } from './progressSettings'
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
      const isDone = isMetricDone(m, byMetricToday[m.id] as any, dateStr)
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
  let doneBonusItems = 0

  if (settings.includeMetrics && metrics.length > 0 && pastOrToday.length > 0) {
    const weeklyDoneCount: Record<string, number> = {}
    for (const dateStr of pastOrToday) {
      const byMetric = valuesByDate[dateStr] || {}
      for (const m of metrics) {
        const isDone = isMetricDone(m, byMetric[m.id] as any, dateStr)
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
        if (isDone) doneBonusItems++
      } else if (settings.includePlanned) {
        total++
        if (isDone) done++
      }
    }
  }
  return { done, total, bonusPct: weekBonusPct(doneBonusItems) }
}

// Итоговый процент (кольцо/бейдж): округлённая база + бонус сверху (может уйти за 100%).
export function progressPercent(p: ProgressResult): number {
  const basePct = p.total > 0 ? p.done / p.total : 0
  return Math.round(basePct * 100 + p.bonusPct)
}

// Прогресс КАЖДОГО дня недели — для семиугольника (сторона = день). Будущие дни пустые, прошлые считаются своей датой
// теми же правилами, что и «день» (computeDayProgressPure). `fill` — доля выполненного дня 0..1, `bonus` — золото ⭐ 0..1.
export interface WeekDaySegment {
  date: string
  state: 'past' | 'today' | 'future'
  done: number
  total: number
  fill: number
  bonus: number
  pct: number // итог дня в процентах (с бонусом), как в кольце дня
}

export function computeWeekDaySegments(
  settings: DayProgressSettings,
  metrics: Metric[],
  valuesByDate: Record<string, Record<string, unknown>>,
  weekDates: string[],
  today: string,
  plannedByDate: Record<string, PlannedItem[]>,
  allGoals: GoalLite[],
): WeekDaySegment[] | null {
  if (!settings.enabled) return null
  return weekDates.map((date) => {
    if (date > today) return { date, state: 'future', done: 0, total: 0, fill: 0, bonus: 0, pct: 0 }
    const r = computeDayProgressPure(settings, metrics, valuesByDate[date] || {}, date, plannedByDate[date] || [], allGoals)
    const p: ProgressResult = r ?? { done: 0, total: 0, bonusPct: 0 }
    return {
      date,
      state: date === today ? 'today' : 'past',
      done: p.done,
      total: p.total,
      fill: p.total > 0 ? Math.min(1, p.done / p.total) : 0,
      bonus: Math.min(1, p.bonusPct / 100),
      pct: progressPercent(p),
    }
  })
}

// Подпись для скринридера: «Пн 100 %, Вт 60 %, …» (будущие дни — без процента). `weekdays` — строка «Вс,Пн,…,Сб» из i18n.
export function weekDaysAriaLabel(days: WeekDaySegment[], weekdays: string): string {
  const names = weekdays.split(',')
  return days
    .map((d) => {
      const [y, m, dd] = d.date.split('-').map(Number)
      const name = names[new Date(y, m - 1, dd).getDay()] ?? d.date
      return d.state === 'future' ? name : `${name} ${d.pct} %`
    })
    .join(', ')
}
