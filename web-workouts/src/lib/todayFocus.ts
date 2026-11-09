import { musclesForExercise, type MuscleId } from './muscles'
import { coveredMuscles } from './muscleHeat'
import { workingOf } from './sessionContract'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 80.4 «Что тренировать сегодня», срез 1: 2–3 группы с наибольшим дефицитом рабочих подходов за 7 дней и достаточным отдыхом.
// Только группы, на которые у человека есть упражнения (иначе совет невыполним). Разминка не считается. Чистая логика без сети и Vue.
export const WEEK_TARGET = 10
export const MIN_REST_DAYS = 2
export const MAX_FOCUS = 3

export interface FocusItem { muscle: MuscleId; sets: number; target: number; restDays: number | null }

type ExLite = Pick<Exercise, 'id' | 'name'>
type EntryLite = Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>

const dayNum = (iso: string) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000)

export function todayFocus(entries: EntryLite[], exercises: ExLite[], today: string, goals: Partial<Record<MuscleId, number>> = {}): FocusItem[] {
  const byEx = new Map<string, MuscleId[]>()
  for (const ex of exercises) byEx.set(ex.id, musclesForExercise(ex.name))
  const t0 = dayNum(today)
  const sets = new Map<MuscleId, number>()
  const last = new Map<MuscleId, number>()
  for (const e of entries) {
    const n = workingOf(e.sets).length
    const d = dayNum(e.date)
    if (n === 0 || d > t0) continue
    for (const m of byEx.get(e.exercise_id) ?? []) {
      if (d > t0 - 7) sets.set(m, (sets.get(m) ?? 0) + n)
      if (!last.has(m) || d > (last.get(m) as number)) last.set(m, d)
    }
  }
  const out: FocusItem[] = []
  for (const m of coveredMuscles(exercises)) {
    const s = sets.get(m) ?? 0
    const rest = last.has(m) ? t0 - (last.get(m) as number) : null
    const target = goals[m] ?? WEEK_TARGET // свои цели по группам (80.5)
    if (s >= target || (rest !== null && rest < MIN_REST_DAYS)) continue
    out.push({ muscle: m, sets: s, target, restDays: rest })
  }
  out.sort((a, b) => b.target - b.sets - (a.target - a.sets) || (b.restDays ?? 99) - (a.restDays ?? 99))
  return out.slice(0, MAX_FOCUS)
}

export interface RestingItem { muscle: MuscleId; readyInDays: number } // 1 — завтра, 2 — послезавтра

// Группы, которые сейчас отдыхают (подпись на главной, макет v2): тренировались меньше MIN_REST_DAYS дней назад — то же правило,
// по которому `todayFocus` их не предлагает. Только группы, на которые у человека есть упражнения. Ближайшие к готовности — первыми.
export function restingMuscles(entries: EntryLite[], exercises: ExLite[], today: string): RestingItem[] {
  const byEx = new Map<string, MuscleId[]>()
  for (const ex of exercises) byEx.set(ex.id, musclesForExercise(ex.name))
  const t0 = dayNum(today)
  const last = new Map<MuscleId, number>()
  for (const e of entries) {
    const d = dayNum(e.date)
    if (workingOf(e.sets).length === 0 || d > t0) continue
    for (const m of byEx.get(e.exercise_id) ?? []) if (!last.has(m) || d > (last.get(m) as number)) last.set(m, d)
  }
  const out: RestingItem[] = []
  for (const m of coveredMuscles(exercises)) {
    const rest = last.has(m) ? t0 - (last.get(m) as number) : null
    if (rest !== null && rest < MIN_REST_DAYS) out.push({ muscle: m, readyInDays: MIN_REST_DAYS - rest })
  }
  return out.sort((a, b) => a.readyInDays - b.readyInDays)
}
