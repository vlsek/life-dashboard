// Активная тренировка (BACKLOG 69.2, срез 1): ЧИСТАЯ логика черновика «Начать → записывать → Завершить». Без сети и без UI.
// Черновик живёт в localStorage (закрыл вкладку — вернулся и продолжил), на «Завершить» превращается в сессию + записи по упражнениям
// (формат контракта — docs/WORKOUTS_V2_CONTRACT.md). Идентификаторы создаёт вызывающий (uuid) — офлайн-очередь повторяет запись без дублей.
import { isWorking } from './sessionContract'
import type { SetType, SetV2 } from './sessionContract'

export interface DraftExercise { id: string; exercise_id: string; superset_group: number | null; note: string | null; sets: SetV2[] }
export interface ActiveDraft {
  v: 1; id: string; name: string | null; date: string; started_at: string
  routine_id: string | null; notes: string | null; exercises: DraftExercise[]
}
export interface SessionPayload { id: string; name: string | null; date: string; started_at: string; finished_at: string; routine_id: string | null; notes: string | null; source: 'live' }
export interface EntryPayload { id: string; exercise_id: string; date: string; sets: SetV2[]; notes: string | null; session_id: string | null; position: number | null; superset_group: number | null }
export interface FinishResult { session: SessionPayload | null; entries: EntryPayload[] }

export const DRAFT_KEY = 'workouts.activeDraft.v1'
export const MAX_EXERCISES = 40
export const MAX_SETS = 60

const emptySet = (): SetV2 => ({ reps: null, weight: null, time: null, duration: null, side: null, done: false })

export function newDraft(id: string, now: Date, opts: { name?: string | null; routine_id?: string | null; date?: string } = {}): ActiveDraft {
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` // локальная дата начала, как у workout_entries.date
  return { v: 1, id, name: opts.name?.trim() || null, date: opts.date ?? local, started_at: now.toISOString(), routine_id: opts.routine_id ?? null, notes: null, exercises: [] }
}

// Все изменения возвращают НОВЫЙ черновик; «нельзя» (лимит, нет такого упражнения) — тот же объект, чтобы вызывающий мог сравнить по ссылке.
export function addExercise(d: ActiveDraft, entryId: string, exerciseId: string): ActiveDraft {
  if (d.exercises.length >= MAX_EXERCISES) return d
  return { ...d, exercises: [...d.exercises, { id: entryId, exercise_id: exerciseId, superset_group: null, note: null, sets: [emptySet()] }] }
}
export function removeExercise(d: ActiveDraft, entryId: string): ActiveDraft {
  return d.exercises.some(e => e.id === entryId) ? { ...d, exercises: d.exercises.filter(e => e.id !== entryId) } : d
}
export function moveExercise(d: ActiveDraft, entryId: string, delta: -1 | 1): ActiveDraft {
  const i = d.exercises.findIndex(e => e.id === entryId), j = i + delta
  if (i < 0 || j < 0 || j >= d.exercises.length) return d
  const ex = [...d.exercises]; [ex[i], ex[j]] = [ex[j], ex[i]]
  return { ...d, exercises: ex }
}
const patch = (d: ActiveDraft, entryId: string, f: (e: DraftExercise) => DraftExercise): ActiveDraft => {
  let changed = false
  const exercises = d.exercises.map(e => { if (e.id !== entryId) return e; const n = f(e); if (n !== e) changed = true; return n })
  return changed ? { ...d, exercises } : d
}
// «+ подход» копирует числа предыдущего подхода (вес/повторы/сторона), но НЕ «выполнен» и не тип разминки
export function addSet(d: ActiveDraft, entryId: string): ActiveDraft {
  return patch(d, entryId, e => {
    if (e.sets.length >= MAX_SETS) return e
    const p = e.sets[e.sets.length - 1]
    const next: SetV2 = p ? { ...emptySet(), reps: p.reps, weight: p.weight, duration: p.duration, side: p.side } : emptySet()
    return { ...e, sets: [...e.sets, next] }
  })
}
export function updateSet(d: ActiveDraft, entryId: string, i: number, change: Partial<SetV2>): ActiveDraft {
  return patch(d, entryId, e => i < 0 || i >= e.sets.length ? e : { ...e, sets: e.sets.map((s, k) => k === i ? { ...s, ...change } : s) })
}
export const toggleDone = (d: ActiveDraft, entryId: string, i: number): ActiveDraft =>
  patch(d, entryId, e => i < 0 || i >= e.sets.length ? e : { ...e, sets: e.sets.map((s, k) => k === i ? { ...s, done: s.done !== true } : s) })
export const setSetType = (d: ActiveDraft, entryId: string, i: number, type: SetType): ActiveDraft => updateSet(d, entryId, i, { type: type === 'normal' ? null : type })
export const removeSet = (d: ActiveDraft, entryId: string, i: number): ActiveDraft =>
  patch(d, entryId, e => i < 0 || i >= e.sets.length ? e : { ...e, sets: e.sets.filter((_, k) => k !== i) })

// Выполненный подход «имеет смысл», если есть повторы или длительность (пустая галочка без чисел не считается)
const hasValue = (s: SetV2) => (s.reps ?? 0) > 0 || (s.duration ?? 0) > 0
export const countedSets = (e: DraftExercise): SetV2[] => e.sets.filter(s => s.done === true && hasValue(s))
export const doneSetCount = (d: ActiveDraft): number => d.exercises.reduce((n, e) => n + countedSets(e).length, 0)
// Тренировка без единого выполненного подхода не сохраняется (BACKLOG 69.2)
export const canSave = (d: ActiveDraft): boolean => doneSetCount(d) > 0
export const workingDoneSets = (d: ActiveDraft): number => d.exercises.reduce((n, e) => n + countedSets(e).filter(isWorking).length, 0)

// «Завершить»: сессия + записи. В запись идут только выполненные подходы (с пометкой done:true — так их читает и старый клиент); упражнения без
// них пропускаются; position — порядок среди СОХРАНЁННЫХ. withSession=false (таблицы сессий ещё нет, миграция 113 не применена) — только записи
// старого формата без session_id/position/superset_group: раздел работает по-старому.
export function finishDraft(d: ActiveDraft, nowIso: string, withSession = true): FinishResult {
  if (!canSave(d)) return { session: null, entries: [] }
  const kept = d.exercises.filter(e => countedSets(e).length > 0)
  const finished = Date.parse(nowIso) >= Date.parse(d.started_at) ? nowIso : d.started_at
  const entries: EntryPayload[] = kept.map((e, i) => ({
    id: e.id, exercise_id: e.exercise_id, date: d.date, sets: countedSets(e).map(s => ({ ...s, done: true })), notes: e.note?.trim() || null,
    session_id: withSession ? d.id : null, position: withSession ? i : null, superset_group: withSession ? e.superset_group : null,
  }))
  const session: SessionPayload | null = withSession
    ? { id: d.id, name: d.name, date: d.date, started_at: d.started_at, finished_at: finished, routine_id: d.routine_id, notes: d.notes?.trim() || null, source: 'live' }
    : null
  return { session, entries }
}

export function elapsedSeconds(d: ActiveDraft, nowMs: number): number {
  const s = Date.parse(d.started_at)
  return Number.isFinite(s) && nowMs > s ? Math.floor((nowMs - s) / 1000) : 0
}
// 42:10 или 1:05:09 (плашка «Идёт тренировка · 0:42:10» показывает часы всегда — formatElapsed(sec, true))
export function formatElapsed(sec: number, alwaysHours = false): string {
  const s = Math.max(0, Math.floor(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 || alwaysHours ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`
}

// Хранение. Любое обращение к storage в try/catch (приватный режим, переполнение): без него тренировка просто не переживёт перезагрузку.
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export function saveDraft(d: ActiveDraft | null, store: Store): boolean {
  try { if (d) store.setItem(DRAFT_KEY, JSON.stringify(d)); else store.removeItem(DRAFT_KEY); return true } catch { return false }
}
// Битый или чужой формат → null (черновик молча игнорируется, а не ломает раздел)
export function loadDraft(store: Store): ActiveDraft | null {
  try {
    const o = JSON.parse(store.getItem(DRAFT_KEY) || 'null')
    if (!o || o.v !== 1 || typeof o.id !== 'string' || typeof o.date !== 'string' || !Number.isFinite(Date.parse(o.started_at)) || !Array.isArray(o.exercises)) return null
    const exercises: DraftExercise[] = o.exercises
      .filter((e: any) => e && typeof e.id === 'string' && typeof e.exercise_id === 'string' && Array.isArray(e.sets))
      .map((e: any) => ({ id: e.id, exercise_id: e.exercise_id, superset_group: Number.isInteger(e.superset_group) ? e.superset_group : null, note: typeof e.note === 'string' ? e.note : null, sets: e.sets.filter((s: any) => s && typeof s === 'object') }))
    return { v: 1, id: o.id, name: typeof o.name === 'string' ? o.name : null, date: o.date, started_at: o.started_at, routine_id: typeof o.routine_id === 'string' ? o.routine_id : null, notes: typeof o.notes === 'string' ? o.notes : null, exercises }
  } catch { return null }
}

// Строки для вставки в БД. Без таблицы сессий (withSession=false) колонок session_id/position/superset_group в запросе НЕТ вовсе:
// до миграции 113 такой столбец сломал бы вставку.
export function sessionRow(userId: string, s: SessionPayload): Record<string, unknown> { return { ...s, user_id: userId } }
export function entryRow(userId: string, e: EntryPayload, withSession: boolean): Record<string, unknown> {
  const base = { id: e.id, user_id: userId, exercise_id: e.exercise_id, date: e.date, sets: e.sets, notes: e.notes }
  return withSession ? { ...base, session_id: e.session_id, position: e.position, superset_group: e.superset_group } : base
}

// Подсказка «прошлый раз»: рабочий подход с тем же номером из последней записи упражнения ДО даты тренировки.
// Разминка и невыполненные подходы в подсказку не идут (BACKLOG 69.4).
export function previousSet(entries: readonly { exercise_id: string; date: string; sets: SetV2[] }[], exerciseId: string, beforeDate: string, index: number): SetV2 | null {
  let best: { date: string; sets: SetV2[] } | null = null
  for (const e of entries) {
    if (e.exercise_id !== exerciseId || e.date >= beforeDate) continue
    const w = (e.sets || []).filter(isWorking)
    if (w.length && (!best || e.date > best.date)) best = { date: e.date, sets: w }
  }
  return best ? (best.sets[index] ?? null) : null
}
export const previousText = (s: SetV2 | null, unit: string): string =>
  !s ? '' : s.weight ? `${s.weight}${unit}×${s.reps ?? ''}` : s.reps ? String(s.reps) : s.duration ? `${s.duration}'` : ''

// Подстановка «прошлого раза» (BACKLOG 69.6): значения прошлого подхода попадают в поля, но «выполнен» НЕ ставится (серая подсказка не пишется в данные, пока не нажали ✓).
const fromPrev = (p: SetV2): Partial<SetV2> => ({ reps: p.reps ?? null, weight: p.weight ?? null, duration: p.duration ?? null })
export function applyPrevious(d: ActiveDraft, entryId: string, i: number, prev: SetV2 | null): ActiveDraft {
  return prev ? updateSet(d, entryId, i, fromPrev(prev)) : d
}
const isBlank = (s: SetV2) => s.reps == null && s.weight == null && s.duration == null
// «Подставить прошлое для всех подходов»: только ПУСТЫЕ подходы (набранное руками не затираем); подходов больше, чем было в прошлый раз, берут последний прошлый
export function fillAllPrevious(d: ActiveDraft, entryId: string, prevAt: (index: number) => SetV2 | null): ActiveDraft {
  const e = d.exercises.find((x) => x.id === entryId)
  if (!e) return d
  let out = d, last: SetV2 | null = null
  e.sets.forEach((s, i) => {
    const p = prevAt(i) ?? last
    if (prevAt(i)) last = prevAt(i)
    if (isBlank(s) && p) out = updateSet(out, entryId, i, fromPrev(p))
  })
  return out
}
