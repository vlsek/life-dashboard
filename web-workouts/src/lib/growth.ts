// «Что растёт / стоит / просело» (BACKLOG 44.5д, срез 2): по каждому упражнению сравниваем лучший подход последних 28 дней с лучшим подходом
// предыдущих 28 дней. Лучший подход — по «силе»: у упражнений с весом оценка разового максимума (вес × (1 + повторы / 30)), у остальных — повторы.
// Чистые функции без обращения к DOM; текст «было → стало» собирает bestSetRecord на отфильтрованных записях, как рекорды карточки.
import { addDaysIso } from './date'
import { bestSetRecord } from './workouts'
import type { Exercise, WorkoutEntry } from './types'

export const GROWTH_WINDOW_DAYS = 28
export const GROWTH_THRESHOLD = 0.03 // ±3 % — «стоит на месте»

export type GrowthStatus = 'up' | 'flat' | 'down' | 'new'

export interface GrowthRow {
  exerciseId: string
  status: GrowthStatus
  /** изменение в процентах, целое; у `new` — null */
  deltaPct: number | null
  /** подписи лучшего подхода: было (прошлое окно) и стало (последнее окно) */
  prevText: string | null
  curText: string
}

// Сила одного подхода
export function setScore(exercise: Exercise, reps: number | null, weight: number | null): number | null {
  if (reps == null || reps <= 0) return null
  if (exercise.tracks_weight && weight != null && weight > 0) return weight * (1 + reps / 30)
  return reps
}

function windowEntries(entries: WorkoutEntry[], from: string, to: string): WorkoutEntry[] {
  return entries.filter((e) => e.date >= from && e.date <= to)
}

function bestScore(entries: WorkoutEntry[], exercise: Exercise): number | null {
  let best: number | null = null
  for (const e of entries) {
    for (const s of e.sets ?? []) {
      const v = setScore(exercise, s.reps, s.weight)
      if (v != null && (best == null || v > best)) best = v
    }
  }
  return best
}

export function growthRows(entries: WorkoutEntry[], exercises: Exercise[], today: string, unitFallback: string): GrowthRow[] {
  const curFrom = addDaysIso(today, -(GROWTH_WINDOW_DAYS - 1))
  const prevTo = addDaysIso(curFrom, -1)
  const prevFrom = addDaysIso(prevTo, -(GROWTH_WINDOW_DAYS - 1))
  const rows: GrowthRow[] = []
  for (const ex of exercises) {
    const own = entries.filter((e) => e.exercise_id === ex.id)
    const cur = windowEntries(own, curFrom, today)
    const prev = windowEntries(own, prevFrom, prevTo)
    const curScore = bestScore(cur, ex)
    if (curScore == null) continue // в последние 28 дней упражнение не делали — сравнивать нечего
    const curText = bestSetRecord(cur, ex, unitFallback)?.text ?? ''
    const prevScore = bestScore(prev, ex)
    if (prevScore == null) {
      rows.push({ exerciseId: ex.id, status: 'new', deltaPct: null, prevText: null, curText })
      continue
    }
    const delta = (curScore - prevScore) / prevScore
    const status: GrowthStatus = delta >= GROWTH_THRESHOLD ? 'up' : delta <= -GROWTH_THRESHOLD ? 'down' : 'flat'
    rows.push({ exerciseId: ex.id, status, deltaPct: Math.round(delta * 100), prevText: bestSetRecord(prev, ex, unitFallback)?.text ?? null, curText })
  }
  // Сначала растущие (сильнее — выше), потом стоящие, просевшие, новые
  const rank: Record<GrowthStatus, number> = { up: 0, flat: 1, down: 2, new: 3 }
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || (b.deltaPct ?? 0) - (a.deltaPct ?? 0))
}
