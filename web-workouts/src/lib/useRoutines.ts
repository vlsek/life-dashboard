// Рутины на устройстве (BACKLOG 69.7, срез 1): реактивный список поверх routines.ts; после каждого изменения пишется в localStorage.
import { ref } from 'vue'
import { loadRoutines, removeRoutine, renameRoutine, routineFromDraft, saveRoutines, upsertRoutine, type Routine } from './routines'
import type { ActiveDraft } from './activeWorkout'

const store = (): Storage | null => { try { return localStorage } catch { return null } }
const noStore = { getItem: () => null, setItem: () => {} }
const newId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`)
const routines = ref<Routine[]>(loadRoutines(store() ?? noStore))
const commit = (next: Routine[]) => { routines.value = next; saveRoutines(next, store() ?? noStore) }

export function useRoutines() {
  return {
    routines,
    saveFromDraft: (d: ActiveDraft, name: string): Routine | null => {
      const r = routineFromDraft(d, newId(), name, new Date().toISOString())
      if (r) commit(upsertRoutine(routines.value, r))
      return r
    },
    remove: (id: string) => commit(removeRoutine(routines.value, id)),
    rename: (id: string, name: string) => commit(renameRoutine(routines.value, id, name, new Date().toISOString())),
  }
}
