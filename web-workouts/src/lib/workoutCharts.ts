import type { WorkoutEntry, Exercise } from './types'
import type { ChartPoint } from './chart'

// Чистая логика точек для графиков Тренировок — портировано из renderOverviewChart()/
// renderExerciseCard() в workouts.js. Без сети и без Vue, чтобы проверяться тестами.

// Общий объём: сумма количества подходов по всем упражнениям за день (не сумма повторений —
// «объём» тут значит «сколько подходов сделано», как в оригинале).
export function overviewPoints(entries: WorkoutEntry[]): ChartPoint[] {
  const byDay: Record<string, number> = {}
  for (const e of entries) {
    const count = e.sets?.length ?? 0
    if (!count) continue
    byDay[e.date] = (byDay[e.date] || 0) + count
  }
  return Object.keys(byDay)
    .sort()
    .map((date) => ({ date, y: byDay[date] }))
}

// Мини-график упражнения: для упражнений с весом — максимальный вес за день (среди подходов,
// где вес указан); для остальных — суммарный объём (сумма повторений за день). Дни без ни одного
// подхода с нужным полем пропускаются, а не превращаются в 0 (иначе линия ложно шла бы на дно).
export function exercisePoints(entries: WorkoutEntry[], exercise: Pick<Exercise, 'tracks_weight'>): ChartPoint[] {
  if (exercise.tracks_weight) {
    return entries
      .filter((e) => e.sets?.some((s) => s.weight != null))
      .map((e) => ({ date: e.date, y: Math.max(...e.sets!.filter((s) => s.weight != null).map((s) => s.weight as number)) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  return entries
    .filter((e) => e.sets?.some((s) => s.reps != null))
    .map((e) => ({ date: e.date, y: e.sets!.reduce((sum, s) => sum + (s.reps || 0), 0) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
