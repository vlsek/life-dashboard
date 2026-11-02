import { addDaysIso, fmtDate } from './date'
import { isMetricDone, metricExpectedOn } from './metrics'
import { isPlannedItemDone, type GoalLite, type PlannedItem } from './progress'
import { gridMetrics } from './yearGrid'
import type { Metric } from './types'

// Недельный ритуал (BACKLOG 75.6): раз в неделю — не стена графиков, а три факта и один вывод: сколько выполнено, лучший день,
// метрика с лучшей динамикой и поле «что изменить на следующей». Считаем по метрикам теми же isMetricDone/metricExpectedOn, что серии,
// сила привычки и год-сетка. Честность по правилу 73.5: дни до первой записи по метрике не считаются; динамика показывается
// только там, где данных достаточно в ОБЕИХ неделях (MIN_TREND_DAYS) и разница заметная (MIN_TREND_DELTA), иначе её просто нет.
export const MIN_TREND_DAYS = 3
export const MIN_TREND_DELTA = 0.15

export interface WeeklyReview {
  weekStart: string // понедельник
  weekEnd: string // воскресенье
  done: number // выполненных отметок по метрикам за неделю…
  total: number // …из нужных по расписанию
  bestDay: { date: string; done: number; total: number } | null
  bestMetric: { id: string; name: string; thisDone: number; thisTotal: number; prevDone: number; prevTotal: number } | null
  plan: { done: number; total: number } | null // пункты плана за неделю (срез 2): выполнено из запланированных, бонусные не считаются
  goalsClosed: number | null // цели, закрытые за неделю (done_date внутри недели); нет — null
}

export interface WeeklyExtra {
  planned?: Readonly<Record<string, readonly PlannedItem[]>>
  goals?: readonly (GoalLite & { done_date?: string | null })[]
}

// Какую неделю разбираем: в воскресенье — текущую (пн…вс), в понедельник — только что закончившуюся; в остальные дни ритуала нет.
export function reviewWeekStart(today: Date): string | null {
  const dow = today.getDay()
  const t = fmtDate(today)
  if (dow === 0) return addDaysIso(t, -6)
  if (dow === 1) return addDaysIso(t, -7)
  return null
}

type ByDay = Readonly<Record<string, Record<string, unknown>>>
interface Tally {
  perDay: { date: string; done: number; total: number }[]
  perMetric: Record<string, { done: number; total: number }>
  done: number
  total: number
}

function tally(ms: readonly Metric[], byDay: ByDay, from: string, to: string, firstOf: Record<string, string>): Tally {
  const out: Tally = { perDay: [], perMetric: {}, done: 0, total: 0 }
  for (let d = from; d <= to; d = addDaysIso(d, 1)) {
    let dd = 0
    let dt = 0
    for (const m of ms) {
      if (firstOf[m.id] === undefined || d < firstOf[m.id]) continue // метрику ещё не вели
      if (!metricExpectedOn(m, d)) continue
      const done = isMetricDone(m, byDay[d]?.[m.id] as never, d)
      const pm = (out.perMetric[m.id] ||= { done: 0, total: 0 })
      pm.total++
      dt++
      if (done) {
        pm.done++
        dd++
      }
    }
    if (dt > 0) out.perDay.push({ date: d, done: dd, total: dt })
    out.done += dd
    out.total += dt
  }
  return out
}

export function buildWeeklyReview(metrics: readonly Metric[], byDay: ByDay, weekStart: string, today: Date, extra: WeeklyExtra = {}): WeeklyReview | null {
  const ms = gridMetrics(metrics).filter((m) => m.count_streak !== false)
  const todayStr = fmtDate(today)
  const weekEnd = addDaysIso(weekStart, 6)
  const firstOf: Record<string, string> = {}
  for (const d of Object.keys(byDay)) {
    const row = byDay[d] || {}
    for (const m of ms) if (row[m.id] !== undefined && (firstOf[m.id] === undefined || d < firstOf[m.id])) firstOf[m.id] = d
  }
  const lastDay = weekEnd < todayStr ? weekEnd : todayStr
  const cur = tally(ms, byDay, weekStart, lastDay, firstOf)

  // План (срез 2): считаем так же, как кольцо недели — бонусные пункты не в знаменателе, удалённая цель не в счёте (isPlannedItemDone → undefined)
  let plan: WeeklyReview['plan'] = null
  if (extra.planned) {
    let pd = 0
    let pt = 0
    for (let d = weekStart; d <= lastDay; d = addDaysIso(d, 1)) {
      for (const p of extra.planned[d] ?? []) {
        if (p.bonus) continue
        const r = isPlannedItemDone(p as PlannedItem, (extra.goals ?? []) as GoalLite[])
        if (r === undefined) continue
        pt++
        if (r) pd++
      }
    }
    if (pt > 0) plan = { done: pd, total: pt }
  }
  // Цели, закрытые за неделю: по дате закрытия, а не по «сейчас выполнена» (цель из прошлого месяца в итог этой недели не попадает)
  let goalsClosed: number | null = null
  if (extra.goals) {
    const n = extra.goals.filter((g) => g.done && !!g.done_date && g.done_date >= weekStart && g.done_date <= lastDay).length
    if (n > 0) goalsClosed = n
  }
  if (cur.total === 0 && !plan && !goalsClosed) return null
  const prevStart = addDaysIso(weekStart, -7)
  const prev = tally(ms, byDay, prevStart, addDaysIso(weekStart, -1), firstOf)

  // лучший день: наибольшая доля (нужно хотя бы 2 метрики в этот день и хоть что-то выполнено), при равенстве — где выполнено больше, потом более ранний
  let bestDay: WeeklyReview['bestDay'] = null
  for (const r of cur.perDay) {
    if (r.total < 2 || r.done === 0) continue
    if (!bestDay || r.done / r.total > bestDay.done / bestDay.total || (r.done / r.total === bestDay.done / bestDay.total && r.done > bestDay.done)) bestDay = r
  }

  let bestMetric: WeeklyReview['bestMetric'] = null
  let bestDelta = MIN_TREND_DELTA - 1e-9
  for (const m of ms) {
    const a = cur.perMetric[m.id]
    const b = prev.perMetric[m.id]
    if (!a || !b || a.total < MIN_TREND_DAYS || b.total < MIN_TREND_DAYS) continue
    const delta = a.done / a.total - b.done / b.total
    if (delta > bestDelta) {
      bestDelta = delta
      bestMetric = { id: m.id, name: m.name, thisDone: a.done, thisTotal: a.total, prevDone: b.done, prevTotal: b.total }
    }
  }
  return { weekStart, weekEnd, done: cur.done, total: cur.total, bestDay, bestMetric, plan, goalsClosed }
}

// Заметка «что изменить на следующей» и «скрыто» хранятся на устройстве (SQL нет; между устройствами не синхронизируются).
const NOTE_PREFIX = 'dash_weekly_note:'
const DISMISS_KEY = 'dash_weekly_review_dismissed'
export function loadWeeklyNote(weekStart: string): string {
  try { return localStorage.getItem(NOTE_PREFIX + weekStart) ?? '' } catch { return '' }
}
export function saveWeeklyNote(weekStart: string, text: string): void {
  try {
    const v = text.trim()
    if (v) localStorage.setItem(NOTE_PREFIX + weekStart, v.slice(0, 280))
    else localStorage.removeItem(NOTE_PREFIX + weekStart)
  } catch { /* приватный режим — заметка не сохранится */ }
}
export function isWeeklyDismissed(weekStart: string): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === weekStart } catch { return false }
}
export function dismissWeekly(weekStart: string): void {
  try { localStorage.setItem(DISMISS_KEY, weekStart) } catch { /* не запомнится */ }
}
