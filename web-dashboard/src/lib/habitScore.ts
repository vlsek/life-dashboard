import { addDaysIso, fmtDate } from './date'
import { isMetricDone, metricExpectedOn, metricSchedule } from './metrics'
import type { Metric } from './types'

// «Сила привычки» (BACKLOG 75.1): плавная оценка 0–100 на метрику вместо бинарной серии. Экспоненциальное сглаживание, как у Loop Habit Tracker:
// выполненный день подтягивает оценку к 100, пропущенный — умножает её на коэффициент, поэтому длинная серия не рушится от одного провала,
// а возвращение к привычке поднимает оценку заметно быстрее, чем «серия с нуля».
// Что считаем днями (честно по правилу 73.5, ничего выдуманного):
//  • начало — первый день, когда по метрике вообще есть запись (до него пользователь привычку не вёл);
//  • день, когда метрику по расписанию не надо делать (и она не сделана) / день «пропуска» — оценку не меняет, как и в серии;
//  • сегодняшний день не штрафует, пока метрика не выполнена (день ещё не кончился), но выполнение сегодня засчитывается;
//  • меньше HABIT_MIN_DAYS учтённых дней — оценку не показываем (на коротком ряду она ничего не значит);
//  • «N раз в неделю» и «не больше N» (и числа-лимиты) в оценку не входят — у них нет понятия «пропущенный день».
// Прошлые дни не пересчитываются заново по новым правилам: берутся те же `isMetricDone`/`metricExpectedOn`, что и у серий.
export const HABIT_MIN_DAYS = 7
export const HABIT_DECAY = Math.pow(0.5, 1 / 13) // ≈0,948: половина «веса» уходит за ~13 дней, как у Loop для ежедневной привычки

export interface HabitScore {
  score: number // 0–100, целое
  days: number // сколько дней учтено
}

export function habitScoreFor(m: Metric, byDay: Readonly<Record<string, Record<string, unknown>>>, today: Date): HabitScore | null {
  if (m.count_streak === false) return null
  const sched = metricSchedule(m)
  if (sched?.type === 'weekly' || sched?.type === 'at_most') return null
  if ((m.type === 'number' || m.type === 'sets') && m.goal_direction === 'at_most') return null

  let first: string | null = null
  for (const d of Object.keys(byDay)) {
    if (byDay[d][m.id] !== undefined && (first === null || d < first)) first = d
  }
  if (first === null) return null

  const todayStr = fmtDate(today)
  let s = 0
  let days = 0
  for (let d = first; d <= todayStr; d = addDaysIso(d, 1)) {
    const done = isMetricDone(m, byDay[d]?.[m.id] as never, d)
    if (!done && (!metricExpectedOn(m, d) || d === todayStr)) continue // не нужно по расписанию / день ещё не кончился
    s = done ? s * HABIT_DECAY + (1 - HABIT_DECAY) : s * HABIT_DECAY
    days++
  }
  if (days < HABIT_MIN_DAYS) return null
  return { score: Math.round(s * 100), days }
}

export function computeHabitScores(metrics: readonly Metric[], byDay: Readonly<Record<string, Record<string, unknown>>>, today: Date): Record<string, HabitScore> {
  const out: Record<string, HabitScore> = {}
  for (const m of metrics || []) {
    const r = habitScoreFor(m, byDay, today)
    if (r) out[m.id] = r
  }
  return out
}
