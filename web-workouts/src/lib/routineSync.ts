// Синхронизация рутин с таблицами workout_routines / workout_routine_items (миграция 113, BACKLOG 69.7 срез 2). ЧИСТАЯ логика: строки для записи и слияние.
// Правило слияния: по id; побеждает более свежий updated_at; рутина, которой нет на сервере, — на отправку; которой нет на устройстве — забираем.
import type { Routine, RoutineItem } from './routines'

export type RoutineRow = { id: string; user_id: string; name: string; position: number; archived: boolean; updated_at: string }
export type RoutineItemRow = { id: string; user_id: string; routine_id: string; exercise_id: string; position: number; target_sets: number; superset_group: number | null }

export const routineRow = (userId: string, r: Routine, position: number): RoutineRow =>
  ({ id: r.id, user_id: userId, name: r.name, position, archived: false, updated_at: r.updated_at || new Date(0).toISOString() })
export const itemRows = (userId: string, r: Routine, newId: () => string): RoutineItemRow[] =>
  r.items.map((i, k) => ({ id: newId(), user_id: userId, routine_id: r.id, exercise_id: i.exercise_id, position: k, target_sets: i.target_sets, superset_group: i.superset_group }))

interface RemoteRoutine { id: string; name: string; position?: number; archived?: boolean; updated_at?: string }
interface RemoteItem { routine_id: string; exercise_id: string; position?: number; target_sets?: number | null; superset_group?: number | null }

export function routinesFromRemote(rs: readonly RemoteRoutine[], items: readonly RemoteItem[]): Routine[] {
  return [...rs].filter((r) => !r.archived).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).flatMap((r): Routine[] => {
    const its: RoutineItem[] = items.filter((i) => i.routine_id === r.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((i) => ({ exercise_id: i.exercise_id, target_sets: Math.min(20, Math.max(1, i.target_sets ?? 3)), superset_group: i.superset_group ?? null }))
    return its.length ? [{ id: r.id, name: r.name, items: its, updated_at: r.updated_at ?? '' }] : []
  })
}

export interface MergeResult { merged: Routine[]; toPush: Routine[] }
export function mergeRoutines(local: readonly Routine[], remote: readonly Routine[]): MergeResult {
  const rem = new Map(remote.map((r) => [r.id, r]))
  const loc = new Map(local.map((r) => [r.id, r]))
  const toPush: Routine[] = []
  const merged: Routine[] = local.map((l) => {
    const r = rem.get(l.id)
    if (!r) { toPush.push(l); return l }
    if (l.updated_at > r.updated_at) { toPush.push(l); return l }
    return r
  })
  for (const r of remote) if (!loc.has(r.id)) merged.push(r)
  return { merged, toPush }
}
