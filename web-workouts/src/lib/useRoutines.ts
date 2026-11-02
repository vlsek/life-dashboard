// Рутины на устройстве (BACKLOG 69.7, срез 1): реактивный список поверх routines.ts; после каждого изменения пишется в localStorage.
import { ref } from 'vue'
import { duplicateRoutine, loadRoutines, removeRoutine, renameRoutine, routineFromDraft, saveRoutines, upsertRoutine, type Routine } from './routines'
import type { ActiveDraft } from './activeWorkout'
import { sb } from './supabase'
import { qDelete, qUpsert } from './outboxClient'
import { sessionsAvailable } from './sessionProbe'
import { itemRows, mergeRoutines, routineRow, routinesFromRemote } from './routineSync'

const store = (): Storage | null => { try { return localStorage } catch { return null } }
const noStore = { getItem: () => null, setItem: () => {} }
const newId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`)
const synced = ref(false)
const routines = ref<Routine[]>(loadRoutines(store() ?? noStore))
// Синхронизация (срез 2): включается после sync(userId), если в базе есть таблицы миграции 113; иначе рутины живут только на устройстве
let syncUser: string | null = null
const pushRoutine = async (r: Routine, position: number): Promise<void> => {
  const u = syncUser
  if (!u) return
  await qUpsert(u, 'workout_routines', `workout_routines:${r.id}`, routineRow(u, r, position), 'id')
  await qDelete(u, 'workout_routine_items', `workout_routine_items:${r.id}`, { routine_id: r.id })
  const rows = itemRows(u, r, newId)
  if (rows.length) await qUpsert(u, 'workout_routine_items', `workout_routine_items+:${r.id}:${r.updated_at}`, rows, 'id')
}
const commit = (next: Routine[]) => { routines.value = next; saveRoutines(next, store() ?? noStore) }
const pushOne = (id: string) => { const i = routines.value.findIndex((x) => x.id === id); if (i >= 0) void pushRoutine(routines.value[i], i) }

export function useRoutines() {
  return {
    routines,
    synced,
    duplicate: (id: string, suffix: string): Routine | null => {
      const r = duplicateRoutine(routines.value, id, newId(), suffix, new Date().toISOString())
      if (r.copy) { commit(r.list); pushOne(r.copy.id) }
      return r.copy
    },
    saveFromDraft: (d: ActiveDraft, name: string): Routine | null => {
      const r = routineFromDraft(d, newId(), name, new Date().toISOString())
      if (r) { commit(upsertRoutine(routines.value, r)); pushOne(r.id) }
      return r
    },
    remove: (id: string) => { commit(removeRoutine(routines.value, id)); if (syncUser) void qDelete(syncUser, 'workout_routines', `workout_routines:${id}`, { id }) },
    rename: (id: string, name: string) => { commit(renameRoutine(routines.value, id, name, new Date().toISOString())); pushOne(id) },
    // Подтянуть рутины с сервера и слить с устройством (вызывать после входа). Нет таблицы/сеть упала — молча остаёмся на устройстве
    sync: async (userId: string): Promise<boolean> => {
      try {
        if (!(await sessionsAvailable())) { syncUser = null; synced.value = false; return false }
        const [rs, its] = await Promise.all([
          sb.from('workout_routines').select('id,name,position,archived,updated_at').eq('user_id', userId),
          sb.from('workout_routine_items').select('routine_id,exercise_id,position,target_sets,superset_group').eq('user_id', userId),
        ])
        if (rs.error || its.error) { syncUser = null; synced.value = false; return false }
        syncUser = userId
        synced.value = true
        const { merged, toPush } = mergeRoutines(routines.value, routinesFromRemote(rs.data ?? [], its.data ?? []))
        commit(merged)
        for (const r of toPush) pushOne(r.id)
        return true
      } catch { return false }
    },
  }
}
