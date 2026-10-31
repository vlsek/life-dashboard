// Рутины (BACKLOG 69.7, срез 1): шаблон тренировки «какие упражнения я делаю». ЧИСТАЯ логика + хранение на устройстве (localStorage).
// Синхронизация с таблицами workout_routines/workout_routine_items (миграция 113) — срез 2; формат элемента совпадает с таблицей (exercise_id, position, target_sets, superset_group).
import { newDraft, type ActiveDraft } from './activeWorkout'

export interface RoutineItem { exercise_id: string; target_sets: number; superset_group: number | null }
export interface Routine { id: string; name: string; items: RoutineItem[]; updated_at: string }
export const ROUTINES_KEY = 'workouts.routines.v1'
export const MAX_ROUTINES = 50

// «Сохранить эту тренировку как рутину»: упражнения в порядке тренировки (включая невыполненные — это шаблон), число подходов как запланировано
export function routineFromDraft(d: ActiveDraft, id: string, name: string, nowIso: string): Routine | null {
  const items = d.exercises.map((e) => ({ exercise_id: e.exercise_id, target_sets: Math.min(20, Math.max(1, e.sets.length)), superset_group: e.superset_group }))
  const nm = name.trim().slice(0, 80)
  return nm && items.length ? { id, name: nm, items, updated_at: nowIso } : null
}
// «Начать из рутины»: черновик с упражнениями и пустыми подходами (число — из шаблона); упражнения, которых уже нет, пропускаются
export function draftFromRoutine(r: Routine, draftId: string, now: Date, newEntryId: () => string, existingExerciseIds: ReadonlySet<string>): ActiveDraft {
  const d = newDraft(draftId, now, { name: r.name })
  d.exercises = r.items.filter((i) => existingExerciseIds.has(i.exercise_id)).map((i) => ({
    id: newEntryId(), exercise_id: i.exercise_id, superset_group: i.superset_group, note: null,
    sets: Array.from({ length: i.target_sets }, () => ({ reps: null, weight: null, time: null, duration: null, side: null, done: false })),
  }))
  return d
}
export const upsertRoutine = (list: readonly Routine[], r: Routine): Routine[] => {
  const i = list.findIndex((x) => x.id === r.id)
  const next = i >= 0 ? list.map((x, k) => (k === i ? r : x)) : [r, ...list]
  return next.slice(0, MAX_ROUTINES)
}
export const removeRoutine = (list: readonly Routine[], id: string): Routine[] => list.filter((x) => x.id !== id)
export const renameRoutine = (list: readonly Routine[], id: string, name: string, nowIso: string): Routine[] => {
  const nm = name.trim().slice(0, 80)
  return nm ? list.map((x) => (x.id === id ? { ...x, name: nm, updated_at: nowIso } : x)) : [...list]
}

type Store = Pick<Storage, 'getItem' | 'setItem'>
export function saveRoutines(list: readonly Routine[], store: Store): boolean {
  try { store.setItem(ROUTINES_KEY, JSON.stringify(list)); return true } catch { return false }
}
export function loadRoutines(store: Store): Routine[] {
  try {
    const a = JSON.parse(store.getItem(ROUTINES_KEY) || '[]')
    if (!Array.isArray(a)) return []
    return a.flatMap((r: any): Routine[] => {
      if (!r || typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name.trim() || !Array.isArray(r.items)) return []
      const items: RoutineItem[] = r.items
        .filter((i: any) => i && typeof i.exercise_id === 'string')
        .map((i: any) => ({ exercise_id: i.exercise_id, target_sets: Number.isInteger(i.target_sets) ? Math.min(20, Math.max(1, i.target_sets)) : 3, superset_group: Number.isInteger(i.superset_group) ? i.superset_group : null }))
      return items.length ? [{ id: r.id, name: r.name.trim().slice(0, 80), items, updated_at: typeof r.updated_at === 'string' ? r.updated_at : '' }] : []
    })
  } catch { return [] }
}
