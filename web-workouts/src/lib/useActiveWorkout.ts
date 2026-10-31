// Состояние активной тренировки (BACKLOG 69.2): один черновик на вкладку/устройство, живёт в localStorage, секундомер тикает раз в секунду.
// Вся логика — в activeWorkout.ts (чистые функции); здесь только реактивность и сохранение после каждого изменения.
import { computed, ref } from 'vue'
import { addExercise, addSet, applyPrevious, fillAllPrevious, elapsedSeconds, loadDraft, moveExercise, newDraft, removeExercise, removeSet, saveDraft, setSetType, toggleDone, updateSet, type ActiveDraft } from './activeWorkout'
import type { SetType, SetV2 } from './sessionContract'

const store = (): Storage | null => { try { return localStorage } catch { return null } }
const noStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const newId = (): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`)

const draft = ref<ActiveDraft | null>(loadDraft(store() ?? noStore))
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
function syncTimer() {
  if (draft.value && !timer) { nowMs.value = Date.now(); timer = setInterval(() => { nowMs.value = Date.now() }, 1000) }
  else if (!draft.value && timer) { clearInterval(timer); timer = null }
}
syncTimer()
function apply(next: ActiveDraft | null) {
  if (next === draft.value) return
  draft.value = next
  saveDraft(next, store() ?? noStore)
  syncTimer()
}

export function useActiveWorkout() {
  const d = () => draft.value!
  return {
    draft,
    active: computed(() => draft.value !== null),
    elapsed: computed(() => (draft.value ? elapsedSeconds(draft.value, nowMs.value) : 0)),
    start: (opts: { name?: string | null; routine_id?: string | null } = {}) => { if (!draft.value) apply(newDraft(newId(), new Date(), opts)) },
    discard: () => apply(null),
    startWith: (d: ActiveDraft) => { if (!draft.value) apply(d) },
    setName: (name: string) => { if (draft.value) apply({ ...d(), name: name.slice(0, 80) || null }) },
    addExercise: (exerciseId: string) => { if (draft.value) apply(addExercise(d(), newId(), exerciseId)) },
    removeExercise: (id: string) => { if (draft.value) apply(removeExercise(d(), id)) },
    move: (id: string, delta: -1 | 1) => { if (draft.value) apply(moveExercise(d(), id, delta)) },
    addSet: (id: string) => { if (draft.value) apply(addSet(d(), id)) },
    removeSet: (id: string, i: number) => { if (draft.value) apply(removeSet(d(), id, i)) },
    update: (id: string, i: number, change: Partial<SetV2>) => { if (draft.value) apply(updateSet(d(), id, i, change)) },
    applyPrev: (id: string, i: number, prev: SetV2 | null) => { if (draft.value) apply(applyPrevious(d(), id, i, prev)) },
    fillAllPrev: (id: string, prevAt: (i: number) => SetV2 | null) => { if (draft.value) apply(fillAllPrevious(d(), id, prevAt)) },
    toggleDone: (id: string, i: number) => { if (draft.value) apply(toggleDone(d(), id, i)) },
    setType: (id: string, i: number, type: SetType) => { if (draft.value) apply(setSetType(d(), id, i, type)) },
  }
}
