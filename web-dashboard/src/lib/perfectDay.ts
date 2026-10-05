import { fmtDate } from './date'
import { isMetricDone, metricExpectedOn } from './metrics'
import type { Metric } from './types'

// «Идеальный день» (BACKLOG раздел 36, владелец 2026-10-04): «когда идеальный день — всплывающее окно, которое поздравляет с этим,
// даёт ачивку, если такой нет, и пишет прогресс для получения следующей такой ачивки». Чистая логика, без сети и DOM.
// Правила идеального дня — те же, что у серии (computeStreakItemsPure в streaks.ts): метрики с count_streak=false не участвуют,
// день без обязательных по расписанию метрик не считается.

// КОПИЯ лесенки web-achievements/src/lib/achievements.ts (`makeLadder('perfect_days', 'perfect', 'perfectDays', …, [1, 10, 30, 100])`);
// тест perfectDayDashboard.test.ts сверяет пороги и ключи с реестром достижений. Ключи после релиза не менять (на них ссылаются
// записи user_achievements).
export const PERFECT_DAY_TARGETS = [1, 10, 30, 100] as const
export const perfectKey = (target: number) => `perfect_days_${target}`

type DayValues = Record<string, unknown>

function perfectOn(ms: Metric[], values: DayValues | undefined, date: string): boolean {
  const exp = ms.filter((m) => metricExpectedOn(m, date))
  return exp.length > 0 && exp.every((m) => isMetricDone(m, values?.[m.id] as never, date))
}

// Сколько ВСЕГО было идеальных дней (не подряд), считая сегодняшний, если он уже идеальный. Копия countPerfectDays из web-achievements.
export function countPerfectDays(metrics: Metric[], byDay: Record<string, DayValues>, today: Date): number {
  const ms = (metrics || []).filter((m) => m.count_streak !== false)
  if (!ms.length) return 0
  const todayStr = fmtDate(today)
  let n = 0
  for (const d of Object.keys(byDay)) {
    if (d <= todayStr && perfectOn(ms, byDay[d], d)) n++
  }
  return n
}

export function isPerfectToday(metrics: Metric[], todayValues: DayValues | undefined, date: string): boolean {
  const ms = (metrics || []).filter((m) => m.count_streak !== false)
  return ms.length > 0 && perfectOn(ms, todayValues, date)
}

export interface PerfectDayInfo {
  date: string // сегодняшняя дата (YYYY-MM-DD)
  todayPerfect: boolean
  count: number // всего идеальных дней, включая сегодняшний
}

export interface NextPerfect {
  target: number
  remaining: number // сколько идеальных дней осталось до достижения
  pct: number // 0..99, для полосы
}

export interface PerfectOutcome {
  newTargets: number[] // пороги, чьи достижения открыты именно сейчас (их нет в хранилище) — по возрастанию
  next: NextPerfect | null // ближайшее ещё не набранное достижение «Идеальных дней» (null — все набраны)
}

// Что показать в окне: какие достижения этой группы открыть сейчас и сколько осталось до следующего.
// `unlocked` — ключи, уже лежащие в хранилище достижений (user_achievements / устройство).
export function perfectOutcome(count: number, unlocked: ReadonlySet<string>): PerfectOutcome {
  const newTargets = PERFECT_DAY_TARGETS.filter((t) => t <= count && !unlocked.has(perfectKey(t)))
  const nextTarget = PERFECT_DAY_TARGETS.find((t) => t > count)
  const next = nextTarget === undefined ? null : { target: nextTarget, remaining: nextTarget - count, pct: Math.min(99, Math.floor((count / nextTarget) * 100)) }
  return { newTargets: [...newTargets], next }
}
