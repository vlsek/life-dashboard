import { addDaysIso } from './date'
import { musclesForExercise, type MuscleId } from './muscles'
import type { Exercise, WorkoutEntry } from './types'

type ExLite = Pick<Exercise, 'id' | 'name'>
type EntryLite = Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>

// Окно «последние N дней» включает сегодняшний день: при N=4 это сегодня и три дня назад.
export const RECENT_DAYS = 4

function musclesByExerciseId(exercises: ExLite[]): Map<string, MuscleId[]> {
  const m = new Map<string, MuscleId[]>()
  for (const ex of exercises) m.set(ex.id, musclesForExercise(ex.name))
  return m
}

// Пустая запись (без подходов) не считается тренировкой; даты из будущего — тоже.
function realEntries(entries: EntryLite[], today: string): EntryLite[] {
  return entries.filter((e) => e.sets.length > 0 && e.date <= today)
}

export function lastTrainedByMuscle(entries: EntryLite[], exercises: ExLite[], today: string): Partial<Record<MuscleId, string>> {
  const byEx = musclesByExerciseId(exercises)
  const last: Partial<Record<MuscleId, string>> = {}
  for (const e of realEntries(entries, today)) {
    for (const m of byEx.get(e.exercise_id) ?? []) {
      if (!last[m] || e.date > (last[m] as string)) last[m] = e.date
    }
  }
  return last
}

export function isTrainedRecently(last: string | undefined, today: string, days = RECENT_DAYS): boolean {
  if (!last) return false
  return last >= addDaysIso(today, -(days - 1)) && last <= today
}

// Сколько РАЗНЫХ дней с даты `sinceIso` мышца была в работе; по убыванию, нули не выводятся.
export function trainingDaysByMuscle(entries: EntryLite[], exercises: ExLite[], today: string, sinceIso: string): { muscle: MuscleId; days: number }[] {
  const byEx = musclesByExerciseId(exercises)
  const daysSets = new Map<MuscleId, Set<string>>()
  for (const e of realEntries(entries, today)) {
    if (e.date < sinceIso) continue
    for (const m of byEx.get(e.exercise_id) ?? []) {
      if (!daysSets.has(m)) daysSets.set(m, new Set())
      daysSets.get(m)!.add(e.date)
    }
  }
  return [...daysSets.entries()].map(([muscle, s]) => ({ muscle, days: s.size })).sort((a, b) => b.days - a.days || a.muscle.localeCompare(b.muscle))
}

export function unmappedExercises<T extends ExLite>(exercises: T[]): T[] {
  return exercises.filter((ex) => musclesForExercise(ex.name).length === 0)
}
