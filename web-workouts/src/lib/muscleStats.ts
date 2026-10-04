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

// Периоды статистики (BACKLOG 3.2): сколько последних дней смотреть. Окно включает сегодня.
export const STATS_PERIODS = [7, 30, 90] as const
export type StatsPeriod = (typeof STATS_PERIODS)[number]
export const DEFAULT_STATS_PERIOD: StatsPeriod = 30

export function isStatsPeriod(v: unknown): v is StatsPeriod {
  return (STATS_PERIODS as readonly unknown[]).includes(v)
}

// Дата начала окна из N последних дней (включая сегодня): N=7 → сегодня и 6 дней назад.
export function periodStart(today: string, days: number): string {
  return addDaysIso(today, -(days - 1))
}

// Группы мышц, которые за период ни разу не были в работе: все из `all`, которых нет в статистике.
export function untrainedMuscles(stats: { muscle: MuscleId }[], all: readonly MuscleId[]): MuscleId[] {
  const trained = new Set(stats.map((s) => s.muscle))
  return all.filter((m) => !trained.has(m))
}

// BACKLOG «Мышцы: по каждой мышце писать, когда её последний раз тренировали» (раздел 30). Сколько полных дней прошло с `last` до `today`
// (оба — ISO-даты YYYY-MM-DD): 0 — сегодня, 1 — вчера. Дата из будущего или без значения — null.
export function daysAgo(last: string | undefined, today: string): number | null {
  if (!last) return null
  const a = Date.parse(last + 'T00:00:00Z')
  const b = Date.parse(today + 'T00:00:00Z')
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return null
  return Math.round((b - a) / 86400000)
}

export interface MuscleLastRow {
  muscle: MuscleId
  last: string | null // ISO-дата последней тренировки; null — ещё не тренировали
  ago: number | null // дней назад (0 — сегодня); null — ещё не тренировали
}

// Строка по КАЖДОЙ мышце из `all` (в порядке `all`): когда последний раз была в работе. Порядок для показа — давно не тренированные сверху:
// сначала «ещё не тренировали», затем по убыванию «дней назад»; при равенстве — исходный порядок.
export function lastTrainedRows(entries: EntryLite[], exercises: ExLite[], today: string, all: readonly MuscleId[]): MuscleLastRow[] {
  const last = lastTrainedByMuscle(entries, exercises, today)
  const rows = all.map((muscle, i) => {
    const l = last[muscle] ?? null
    return { muscle, last: l, ago: daysAgo(l ?? undefined, today), i }
  })
  rows.sort((x, y) => {
    const ax = x.ago === null ? Infinity : x.ago
    const ay = y.ago === null ? Infinity : y.ago
    return ay - ax || x.i - y.i
  })
  return rows.map(({ muscle, last: l, ago }) => ({ muscle, last: l, ago }))
}

