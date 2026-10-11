import { addDaysIso } from './date'
import { musclesForExercise, type MuscleId } from './muscles'
import type { MuscleLastRow } from './muscleStats'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 44.5г: «когда тренировал каждую мышцу» — не плоский список из всех мышц, а группы по «свежести», полоска последних дней
// и история по выбранной мышце. Чистые функции: без Vue, сети и localStorage.
type ExLite = Pick<Exercise, 'id' | 'name'>
type EntryLite = Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>

export type Bucket = 'stale' | 'recent' | 'fresh' | 'never'
// Границы в днях «назад»: 0–1 — свежие (сегодня и вчера), 2–6 — на этой неделе, 7 и больше — давно.
export const FRESH_MAX = 1
export const RECENT_MAX = 6
export const STRIP_DAYS = 14
// Порядок показа: сначала то, что пора тренировать
export const BUCKET_ORDER: readonly Bucket[] = ['stale', 'recent', 'fresh', 'never']

export function bucketOf(ago: number | null): Bucket {
  if (ago === null) return 'never'
  if (ago <= FRESH_MAX) return 'fresh'
  if (ago <= RECENT_MAX) return 'recent'
  return 'stale'
}

export interface BucketGroup {
  bucket: Bucket
  rows: MuscleLastRow[]
}

// Строки (в порядке «давно не тренированные сверху», как отдаёт lastTrainedRows) → группы по BUCKET_ORDER; пустые группы не выводим.
// Внутри «давно» — самые запущенные сверху; внутри «на этой неделе» и «свежих» — самые свежие сверху.
export function groupLastRows(rows: MuscleLastRow[]): BucketGroup[] {
  const by = new Map<Bucket, MuscleLastRow[]>()
  for (const r of rows) {
    const b = bucketOf(r.ago)
    if (!by.has(b)) by.set(b, [])
    by.get(b)!.push(r)
  }
  return BUCKET_ORDER.filter((b) => by.has(b)).map((bucket) => {
    const list = [...(by.get(bucket) as MuscleLastRow[])]
    if (bucket === 'recent' || bucket === 'fresh') list.sort((x, y) => (x.ago as number) - (y.ago as number))
    return { bucket, rows: list }
  })
}

function realEntries(entries: EntryLite[], today: string): EntryLite[] {
  return entries.filter((e) => e.sets.length > 0 && e.date <= today)
}

function byExerciseId(exercises: ExLite[]): Map<string, MuscleId[]> {
  const m = new Map<string, MuscleId[]>()
  for (const ex of exercises) m.set(ex.id, musclesForExercise(ex.name))
  return m
}

// По каждой мышце — `days` последних дней (включая сегодня), от старого к новому: true — в этот день мышца была в работе.
export function trainingStrips(entries: EntryLite[], exercises: ExLite[], today: string, all: readonly MuscleId[], days = STRIP_DAYS): Record<MuscleId, boolean[]> {
  const first = addDaysIso(today, -(days - 1))
  const idx = new Map<string, number>()
  for (let i = 0; i < days; i++) idx.set(addDaysIso(first, i), i)
  const out = {} as Record<MuscleId, boolean[]>
  for (const m of all) out[m] = Array.from({ length: days }, () => false)
  const ex = byExerciseId(exercises)
  for (const e of realEntries(entries, today)) {
    const i = idx.get(e.date)
    if (i === undefined) continue
    for (const m of ex.get(e.exercise_id) ?? []) if (out[m]) out[m][i] = true
  }
  return out
}

export interface MuscleSession {
  date: string
  exercises: string[] // названия упражнений за день, без повторов, в порядке появления
  sets: number
  reps: number // сумма повторов по подходам, где они указаны
}

// Тренировочные дни выбранной мышцы, новые сверху: что делал, сколько подходов и повторов.
export function muscleSessions(entries: EntryLite[], exercises: ExLite[], today: string, muscle: MuscleId): MuscleSession[] {
  const ex = byExerciseId(exercises)
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  const days = new Map<string, MuscleSession>()
  for (const e of realEntries(entries, today)) {
    if (!(ex.get(e.exercise_id) ?? []).includes(muscle)) continue
    let s = days.get(e.date)
    if (!s) days.set(e.date, (s = { date: e.date, exercises: [], sets: 0, reps: 0 }))
    const name = names.get(e.exercise_id)
    if (name && !s.exercises.includes(name)) s.exercises.push(name)
    s.sets += e.sets.length
    for (const set of e.sets) if (typeof set.reps === 'number' && set.reps > 0) s.reps += set.reps
  }
  return [...days.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export interface MuscleVolume {
  days: number // тренировочных дней в окне
  sets: number
  reps: number
}

// Нагрузка за последние `windowDays` дней (окно включает сегодня): тренировочные дни, подходы, повторы.
export function muscleVolume(sessions: MuscleSession[], today: string, windowDays: number): MuscleVolume {
  const since = addDaysIso(today, -(windowDays - 1))
  const v: MuscleVolume = { days: 0, sets: 0, reps: 0 }
  for (const s of sessions) {
    if (s.date < since || s.date > today) continue
    v.days += 1
    v.sets += s.sets
    v.reps += s.reps
  }
  return v
}

// ---- Срез 2 (BACKLOG 44.5г): нагрузка по неделям для мини-графика в панели мышцы
export const LOAD_WEEKS = 8

export interface WeekLoad {
  from: string // первый день окна (включительно)
  to: string // последний день окна (включительно); у самой свежей недели — сегодня
  days: number // тренировочных дней
  sets: number
  reps: number
}

// Окна по 7 дней, считая НАЗАД от сегодня (последнее окно заканчивается сегодня) — не зависит от того, с какого дня недели начинается неделя
// в локали. Результат от старого к новому: именно так строится график слева направо.
export function weeklyLoad(sessions: MuscleSession[], today: string, weeks = LOAD_WEEKS): WeekLoad[] {
  const out: WeekLoad[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const to = addDaysIso(today, -7 * i)
    const from = addDaysIso(to, -6)
    const v: WeekLoad = { from, to, days: 0, sets: 0, reps: 0 }
    for (const s of sessions) {
      if (s.date < from || s.date > to) continue
      v.days += 1
      v.sets += s.sets
      v.reps += s.reps
    }
    out.push(v)
  }
  return out
}
