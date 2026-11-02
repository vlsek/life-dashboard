import { musclesForExercise, type MuscleId } from './muscles'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 80.6 «Баланс: толкай/тяни, верх/низ, лево/право», срез 1. Три отношения подходов за период. Чистая логика без сети и Vue.
// Считаем ЧЕСТНО: мало данных — «нет данных», а не выдуманный перекос. Вес синергистов (80.2) пока не учитывается: подход идёт в каждую группу, которую
// задействует упражнение, поэтому жим лёжа добавляет и «толкай», и «верх» один раз (а не по числу мышц).
const PUSH: readonly MuscleId[] = ['chest', 'shoulders', 'triceps']
const PULL: readonly MuscleId[] = ['back', 'biceps', 'forearms']
const UPPER: readonly MuscleId[] = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'back']
const LOWER: readonly MuscleId[] = ['glutes', 'quads', 'hamstrings', 'calves']
// пресс и поясница в верх/низ и толкай/тяни не входят — у них своя роль (кор)

export const MIN_SETS = 6 // меньше подходов в паре — «мало данных»
export const MIN_SIDED_SETS = 4 // подходов с указанной стороной (Л/П) в сумме

export interface Pair {
  a: number
  b: number
  /** доля a от a+b, 0..1; null — данных мало */
  share: number | null
}

export interface Balance {
  pushPull: Pair
  upperLower: Pair
  /** подходы левой/правой стороны (Л = a, П = b); перекос считается по повторам */
  leftRight: Pair & { aReps: number; bReps: number; gapPct: number | null }
}

type ExLite = Pick<Exercise, 'id' | 'name'>
type EntryLite = Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>

const hits = (ms: MuscleId[], group: readonly MuscleId[]) => ms.some((m) => group.includes(m))
const pair = (a: number, b: number, min: number): Pair => ({ a, b, share: a + b >= min ? a / (a + b) : null })

export function muscleBalance(entries: EntryLite[], exercises: ExLite[], today: string, sinceIso: string): Balance {
  const musc = new Map<string, MuscleId[]>()
  for (const ex of exercises) musc.set(ex.id, musclesForExercise(ex.name))
  let push = 0, pull = 0, upper = 0, lower = 0, l = 0, r = 0, lReps = 0, rReps = 0
  for (const e of entries) {
    if (e.sets.length === 0 || e.date > today || e.date < sinceIso) continue
    const ms = musc.get(e.exercise_id) ?? []
    const n = e.sets.length
    if (hits(ms, PUSH)) push += n
    if (hits(ms, PULL)) pull += n
    if (hits(ms, UPPER)) upper += n
    if (hits(ms, LOWER)) lower += n
    for (const s of e.sets) {
      if (s.side === 'L') { l++; lReps += s.reps ?? 0 }
      else if (s.side === 'R') { r++; rReps += s.reps ?? 0 }
    }
  }
  const lr = pair(l, r, MIN_SIDED_SETS)
  const mx = Math.max(lReps, rReps)
  const gapPct = lr.share === null || mx === 0 ? null : Math.round((Math.abs(lReps - rReps) / mx) * 100)
  return { pushPull: pair(push, pull, MIN_SETS), upperLower: pair(upper, lower, MIN_SETS), leftRight: { ...lr, aReps: lReps, bReps: rReps, gapPct } }
}

// Заметный перекос — когда меньшая сторона отстаёт от большей больше чем на 25% (доля < 0.4 или > 0.6 — это отношение 2:3).
export function isSkewed(share: number | null): boolean {
  return share !== null && (share < 0.4 || share > 0.6)
}
