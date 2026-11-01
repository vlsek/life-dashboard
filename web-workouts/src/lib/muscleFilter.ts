import { musclesForExercise, type MuscleId } from './muscles'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 70.4: выбор мышцы на карте фильтрует упражнения и журнал. Используются те же связи «упражнение → мышцы» (`musclesForExercise`), что и у карты:
// никаких параллельных справочников. Упражнение без распознанных мышц ни в один фильтр не попадает.
export function exercisesForMuscle<T extends Pick<Exercise, 'name'>>(exercises: T[], m: MuscleId | null): T[] {
  return m ? exercises.filter((ex) => musclesForExercise(ex.name).includes(m)) : exercises
}

export function entriesForMuscle<E extends Pick<WorkoutEntry, 'exercise_id'>>(entries: E[], exercises: Pick<Exercise, 'id' | 'name'>[], m: MuscleId | null): E[] {
  if (!m) return entries
  const ids = new Set(exercisesForMuscle(exercises, m).map((ex) => ex.id))
  return entries.filter((e) => ids.has(e.exercise_id))
}
