import { MUSCLE_IDS, musclesForExercise, type MuscleId } from './muscles'

// «Какие мышцы тренировали недавно» — для подбора типового упражнения по схеме тела (BACKLOG 762 срез 2, вариант Б).
// Чистые функции без Vue, сети и localStorage; нужны и Тренировкам, и Дашборду. Типы объявлены структурно (а не берутся
// из `types` пилота), чтобы модуль не зависел ни от одного из них.
export interface RecencyExercise {
  id: string
  name: string
}
export interface RecencyEntry {
  exercise_id: string
  date: string
  sets: readonly unknown[]
}

// Окно «последние N дней» включает сегодняшний день: при N=4 это сегодня и три дня назад.
export const RECENT_DAYS = 4

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Сдвиг ISO-даты (ГГГГ-ММ-ДД) на n дней по локальному календарю — как addDaysIso в `date.ts` пилотов.
function shiftIso(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function musclesByExerciseId(exercises: readonly RecencyExercise[]): Map<string, MuscleId[]> {
  const m = new Map<string, MuscleId[]>()
  for (const ex of exercises) m.set(ex.id, musclesForExercise(ex.name))
  return m
}

// Пустая запись (без подходов) не считается тренировкой; даты из будущего — тоже.
export function lastTrainedByMuscle(entries: readonly RecencyEntry[], exercises: readonly RecencyExercise[], today: string): Partial<Record<MuscleId, string>> {
  const byEx = musclesByExerciseId(exercises)
  const last: Partial<Record<MuscleId, string>> = {}
  for (const e of entries) {
    if (e.sets.length === 0 || e.date > today) continue
    for (const m of byEx.get(e.exercise_id) ?? []) {
      if (!last[m] || e.date > (last[m] as string)) last[m] = e.date
    }
  }
  return last
}

export function isTrainedRecently(last: string | undefined, today: string, days = RECENT_DAYS): boolean {
  if (!last) return false
  return last >= shiftIso(today, -(days - 1)) && last <= today
}

// Мышцы, тренированные за последние RECENT_DAYS дней — на схеме тела они «зелёные».
export function recentMuscles(entries: readonly RecencyEntry[], exercises: readonly RecencyExercise[], today: string): MuscleId[] {
  const last = lastTrainedByMuscle(entries, exercises, today)
  return MUSCLE_IDS.filter((m) => isTrainedRecently(last[m], today))
}
