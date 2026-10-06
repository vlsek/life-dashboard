import type { Exercise, WorkoutEntry } from './types'

export interface CalorieEstimate {
  kcal: number
  minutes: number
  basis: 'duration' | 'reps'
}

const MET_BY_CATEGORY: Record<string, number> = {
  upper: 5,
  lower: 5.5,
  fullbody: 6,
  custom: 5,
}

const DEFAULT_MET = 5

// Оценка активных калорий по MET: 0.0175 × MET × масса(кг) × минуты.
// Для силовых упражнений без длительности принимаем ~3 секунды на повтор — только
// для ориентировочной оценки, поэтому UI всегда показывает знак «≈».
export function estimateExerciseCalories(
  entries: WorkoutEntry[],
  exercise: Exercise,
  bodyWeightKg = 70,
): CalorieEstimate | null {
  const weight = Number.isFinite(bodyWeightKg) && bodyWeightKg > 0 ? bodyWeightKg : 70
  const met = MET_BY_CATEGORY[exercise.category || ''] ?? DEFAULT_MET
  let minutes = 0
  let hasDuration = false

  for (const entry of entries) {
    for (const set of entry.sets || []) {
      if (set.duration != null && set.duration > 0) {
        minutes += set.duration
        hasDuration = true
      } else if (set.reps != null && set.reps > 0) {
        minutes += (set.reps * 3) / 60
      }
    }
  }
  if (minutes <= 0) return null

  const kcal = Math.max(0, Math.round(0.0175 * met * weight * minutes))
  return { kcal, minutes, basis: hasDuration ? 'duration' : 'reps' }
}
