import type { MuscleId } from './muscles'
import { MUSCLE_IDS } from './muscles'
import { setType } from './sessionContract'
import type { Exercise } from './types'

// BACKLOG 80.8 «Подсветка в активной тренировке»: какие мышцы задействует сегодняшняя сессия и насколько они уже «закрыты» галочками.
// Считаем рабочие подходы (разминочные не в счёт — как и в остальной аналитике): всего и выполненных (done === true).
export interface SessionMuscle {
  total: number
  done: number
}
interface DraftSet {
  done?: boolean | null
  [k: string]: unknown
}
interface DraftExercise {
  exercise_id: string
  sets: DraftSet[]
}

export function sessionMuscles(draft: readonly DraftExercise[], exercises: readonly Pick<Exercise, 'id' | 'muscle_groups'>[]): Partial<Record<MuscleId, SessionMuscle>> {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const out: Partial<Record<MuscleId, SessionMuscle>> = {}
  for (const d of draft) {
    const groups = (byId.get(d.exercise_id)?.muscle_groups ?? []).filter((m): m is MuscleId => (MUSCLE_IDS as readonly string[]).includes(m))
    if (!groups.length) continue
    const working = d.sets.filter((s) => setType(s as never) !== 'warmup')
    const total = working.length
    const done = working.filter((s) => s.done === true).length
    for (const m of new Set(groups)) {
      const cur = (out[m] ??= { total: 0, done: 0 })
      cur.total += total
      cur.done += done
    }
  }
  return out
}

// Заливка зоны 0..1: не в сессии — null (приглушена), в сессии без галочек — 0, дальше доля выполненных.
export function sessionFill(s: SessionMuscle | undefined): number | null {
  if (!s || s.total <= 0) return null
  return Math.min(1, s.done / s.total)
}
