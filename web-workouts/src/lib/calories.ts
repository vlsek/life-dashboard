import type { Exercise, WorkoutEntry } from './types'

export interface CalorieEstimate {
  kcal: number
  minutes: number
  basis: 'duration' | 'reps'
}

// Формула MET — стандартная: ккал/мин = MET × 3.5 × масса(кг) / 200 = 0.0175 × MET × кг. Это ВАЛОВЫЙ расход (вместе с обменом покоя ≈ 1 MET), это не «только сверх покоя».
const MET_BY_CATEGORY: Record<string, number> = {
  upper: 5,
  lower: 5.5,
  fullbody: 6,
  custom: 5,
}
const DEFAULT_MET = 5

// Силовой подход БЕЗ записанной длительности. Прежде считали только время под нагрузкой (3 с на повтор) с завышенным MET 5–6 —
// отдых между подходами игнорировался, и тренировка из 10 подходов по 10 повторов давала ~33 ккал вместо ~65. Теперь: время подхода
// = 3 с на повтор + 60 с отдыха, MET 3.5 (силовая тренировка средней интенсивности по Compendium of Physical Activities — значение дано
// на всё время занятия, включая отдых). Цифра всё равно ориентировочная, UI показывает «≈».
export const STRENGTH_MET = 3.5
export const SECONDS_PER_REP = 3
export const REST_SECONDS_PER_SET = 60

export function validWeightKg(w: number | null | undefined): w is number {
  return typeof w === 'number' && Number.isFinite(w) && w > 0
}

// Есть ли в записях хоть что-то, из чего можно посчитать (повторы или длительность). Нужно, чтобы отличить «нечего считать» от «не знаем вес».
export function hasCalorieActivity(entries: WorkoutEntry[]): boolean {
  for (const entry of entries) {
    for (const set of entry.sets || []) {
      if ((set.duration != null && set.duration > 0) || (set.reps != null && set.reps > 0)) return true
    }
  }
  return false
}

// Оценка калорий по MET. Веса нет (не задан в метриках тела) — НЕ подставляем «70 кг»: возвращаем null, интерфейс подсказывает, где указать вес.
export function estimateExerciseCalories(
  entries: WorkoutEntry[],
  exercise: Exercise,
  bodyWeightKg: number | null | undefined,
): CalorieEstimate | null {
  if (!validWeightKg(bodyWeightKg)) return null
  const met = MET_BY_CATEGORY[exercise.category || ''] ?? DEFAULT_MET
  let kcal = 0
  let minutes = 0
  let hasDuration = false

  for (const entry of entries) {
    for (const set of entry.sets || []) {
      if (set.duration != null && set.duration > 0) {
        minutes += set.duration
        kcal += 0.0175 * met * bodyWeightKg * set.duration
        hasDuration = true
      } else if (set.reps != null && set.reps > 0) {
        const m = (set.reps * SECONDS_PER_REP + REST_SECONDS_PER_SET) / 60
        minutes += m
        kcal += 0.0175 * STRENGTH_MET * bodyWeightKg * m
      }
    }
  }
  if (minutes <= 0) return null

  return { kcal: Math.max(0, Math.round(kcal)), minutes, basis: hasDuration ? 'duration' : 'reps' }
}
