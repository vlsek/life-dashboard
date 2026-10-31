import { musclesForExercise, type MuscleId } from './muscles'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 70.3 «Тепловая карта нагрузки»: три режима окраски карты мышц. Чистая логика без сети и Vue.
//  recent  — как раньше: «задействована» за последние дни (по умолчанию);
//  volume  — подходов за период: чем больше, тем плотнее заливка; без подходов — «нет данных» (серый, не «нулевая нагрузка»);
//  covered — какие группы вообще покрыты упражнениями из списка человека (это НЕ нагрузка, а охват: нет упражнения — нет и данных).
export type HeatMode = 'recent' | 'volume' | 'covered'
export const HEAT_MODES: readonly HeatMode[] = ['recent', 'volume', 'covered']
export const HEAT_KEY = 'workouts_musclemap_heat'
export const HEAT_LEVELS = 4

export function normalizeHeatMode(v: unknown): HeatMode {
  return HEAT_MODES.includes(v as HeatMode) ? (v as HeatMode) : 'recent'
}

type ExLite = Pick<Exercise, 'id' | 'name'>
type EntryLite = Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>

// Подходы по мышцам с даты sinceIso по today включительно; пустые записи и будущие даты не считаются. Мышцы без подходов в карту не попадают.
export function setsByMuscle(entries: EntryLite[], exercises: ExLite[], today: string, sinceIso: string): Map<MuscleId, number> {
  const byEx = new Map<string, MuscleId[]>()
  for (const ex of exercises) byEx.set(ex.id, musclesForExercise(ex.name))
  const out = new Map<MuscleId, number>()
  for (const e of entries) {
    if (e.sets.length === 0 || e.date > today || e.date < sinceIso) continue
    for (const m of byEx.get(e.exercise_id) ?? []) out.set(m, (out.get(m) ?? 0) + e.sets.length)
  }
  return out
}

// Группы, у которых есть хотя бы одно упражнение человека.
export function coveredMuscles(exercises: ExLite[]): Set<MuscleId> {
  const s = new Set<MuscleId>()
  for (const ex of exercises) for (const m of musclesForExercise(ex.name)) s.add(m)
  return s
}

// Ступень насыщенности 0..HEAT_LEVELS: 0 — нет данных; остальные делят диапазон до максимума поровну (минимум одна ступень, если подходы есть).
export function heatLevel(value: number, max: number): number {
  if (!(value > 0) || !(max > 0)) return 0
  return Math.max(1, Math.min(HEAT_LEVELS, Math.ceil((value / max) * HEAT_LEVELS)))
}
