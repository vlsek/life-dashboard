// Урезанная копия web-workouts/src/lib/muscleStats.ts: шапке нужны только «когда мышцу тренировали в последний раз» и
// «за последние 4 дня» (без статистики по периодам).
import { addDaysIso } from './date'
import { musclesForExercise, type MuscleId } from './muscles'

type ExLite = { id: string; name: string }
type EntryLite = { exercise_id: string; date: string; sets: unknown[] }

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
