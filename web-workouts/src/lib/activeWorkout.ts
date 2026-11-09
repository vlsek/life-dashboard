// Активная тренировка (BACKLOG 69.2, срез 1): ЧИСТАЯ логика черновика «Начать → записывать → Завершить». Без сети и без UI.
// Черновик живёт в localStorage (закрыл вкладку — вернулся и продолжил), на «Завершить» превращается в сессию + записи по упражнениям
// (формат контракта — docs/WORKOUTS_V2_CONTRACT.md). Идентификаторы создаёт вызывающий (uuid) — офлайн-очередь повторяет запись без дублей.
import { isWorking, repsFields } from './sessionContract'
import type { SetType, SetV2 } from './sessionContract'

export interface DraftExercise { id: string; exercise_id: string; superset_group: number | null; note: string | null; sets: SetV2[]; reps_min?: number; reps_max?: number }
export interface ActiveDraft {
  v: 1; id: string; name: string | null; date: string; started_at: string
  manual_minutes?: number | null // тренировка задним числом: длительность в минутах (секундомера нет)
  routine_id: string | null; notes: string | null; exercises: DraftExercise[]
}
export interface SessionPayload { id: string; name: string | null; date: string; started_at: string; finished_at: string; routine_id: string | null; notes: string | null; source: 'live' | 'manual' }
export interface EntryPayload { id: string; exercise_id: string; date: string; sets: SetV2[]; notes: string | null; session_id: string | null; position: number | null; superset_group: number | null }
export interface FinishResult { session: SessionPayload | null; entries: EntryPayload[] }

export const DRAFT_KEY = 'workouts.activeDraft.v1'
export const MAX_EXERCISES = 40
export const MAX_SETS = 60

const emptySet = (): SetV2 => ({ reps: null, weight: null, time: null, duration: null, side: null, done: false })

export function newDraft(id: string, now: Date, opts: { name?: string | null; routine_id?: string | null; date?: string } = {}): ActiveDraft {
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` // локальная дата начала, как у workout_entries.date
  return { v: 1, manual_minutes: null, id, name: opts.name?.trim() || null, date: opts.date ?? local, started_at: now.toISOString(), routine_id: opts.routine_id ?? null, notes: null, exercises: [] }
}

// Все изменения возвращают НОВЫЙ черновик; «нельзя» (лимит, нет такого упражнения) — тот же объект, чтобы вызывающий мог сравнить по ссылке.
export function addExercise(d: ActiveDraft, entryId: string, exerciseId: string): ActiveDraft {
  if (d.exercises.length >= MAX_EXERCISES) return d
  return { ...d, exercises: [...d.exercises, { id: entryId, exercise_id: exerciseId, superset_group: null, note: null, sets: [emptySet()] }] }
}
export function removeExercise(d: ActiveDraft, entryId: string): ActiveDraft {
  return d.exercises.some(e => e.id === entryId) ? normalizeSupersets({ ...d, exercises: d.exercises.filter(e => e.id !== entryId) }) : d
}
export function moveExercise(d: ActiveDraft, entryId: string, delta: -1 | 1): ActiveDraft {
  const i = d.exercises.findIndex(e => e.id === entryId), j = i + delta
  if (i < 0 || j < 0 || j >= d.exercises.length) return d
  const ex = [...d.exercises]; [ex[i], ex[j]] = [ex[j], ex[i]]
  return normalizeSupersets({ ...d, exercises: ex })
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

// Вернуть удалённый подход на прежнее место (кнопка «Отменить» в тосте); индекс за пределами — в конец
export const insertSet = (d: ActiveDraft, entryId: string, i: number, set: SetV2): ActiveDraft =>
  patch(d, entryId, e => { const at = Math.min(Math.max(0, i), e.sets.length); return { ...e, sets: [...e.sets.slice(0, at), set, ...e.sets.slice(at)] } })

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
  const manual = typeof d.manual_minutes === 'number' && d.manual_minutes > 0
  const startMs = Date.parse(d.started_at)
  const finished = manual ? new Date(startMs + d.manual_minutes! * 60000).toISOString() : Date.parse(nowIso) >= startMs ? nowIso : d.started_at
  const entries: EntryPayload[] = kept.map((e, i) => ({
    id: e.id, exercise_id: e.exercise_id, date: d.date, sets: countedSets(e).map(s => ({ ...s, done: true })), notes: e.note?.trim() || null,
    session_id: withSession ? d.id : null, position: withSession ? i : null, superset_group: withSession ? e.superset_group : null,
  }))
  const session: SessionPayload | null = withSession
    ? { id: d.id, name: d.name, date: d.date, started_at: d.started_at, finished_at: finished, routine_id: d.routine_id, notes: d.notes?.trim() || null, source: manual ? 'manual' : 'live' }
    : null
  return { session, entries }
}

export function elapsedSeconds(d: ActiveDraft, nowMs: number): number {
  if (typeof d.manual_minutes === 'number') return d.manual_minutes * 60 // задним числом секундомера нет
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
      .map((e: any) => ({ id: e.id, exercise_id: e.exercise_id, superset_group: Number.isInteger(e.superset_group) ? e.superset_group : null, note: typeof e.note === 'string' ? e.note : null, ...repsFields(e.reps_min, e.reps_max), sets: e.sets.filter((s: any) => s && typeof s === 'object') }))
    return { v: 1, manual_minutes: Number.isInteger(o.manual_minutes) && o.manual_minutes > 0 && o.manual_minutes <= 1440 ? o.manual_minutes : null, id: o.id, name: typeof o.name === 'string' ? o.name : null, date: o.date, started_at: o.started_at, routine_id: typeof o.routine_id === 'string' ? o.routine_id : null, notes: typeof o.notes === 'string' ? o.notes : null, exercises }
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
export type PrevSource = 'last' | 'best'
// Источник «прошлого раза»: 'last' — последняя тренировка с упражнением; 'best' — тренировка с самым тяжёлым рабочим подходом (при равенстве — более свежая)
export function previousSets(entries: readonly { exercise_id: string; date: string; sets: SetV2[] }[], exerciseId: string, beforeDate: string, source: PrevSource = 'last'): SetV2[] {
  let best: { date: string; sets: SetV2[]; top: number } | null = null
  for (const e of entries) {
    if (e.exercise_id !== exerciseId || e.date >= beforeDate) continue
    const w = (e.sets || []).filter(isWorking)
    if (!w.length) continue
    const top = source === 'best' ? Math.max(...w.map((x) => x.weight ?? 0)) : 0
    if (!best || (source === 'best' && top > best.top) || ((source === 'last' || top === best.top) && e.date > best.date)) best = { date: e.date, sets: w, top }
  }
  return best ? best.sets : []
}
// «Прошлое из этой рутины» (69.6): если тренировка запущена из рутины и по упражнению есть рабочие подходы в прошлых тренировках ЭТОЙ рутины — берём только их; иначе — вся история
export function scopeToRoutine<T extends { exercise_id: string; date: string; sets: SetV2[]; session_id?: string | null }>(entries: readonly T[], sessions: readonly { id: string; routine_id: string | null }[], routineId: string | null | undefined, exerciseId: string, beforeDate: string): readonly T[] {
  if (!routineId) return entries
  const ids = new Set(sessions.filter((s) => s.routine_id === routineId).map((s) => s.id))
  if (!ids.size) return entries
  const scoped = entries.filter((e) => e.session_id != null && ids.has(e.session_id))
  return previousSets(scoped, exerciseId, beforeDate).length ? scoped : entries
}
export const previousSet = (entries: readonly { exercise_id: string; date: string; sets: SetV2[] }[], exerciseId: string, beforeDate: string, index: number, source: PrevSource = 'last'): SetV2 | null =>
  previousSets(entries, exerciseId, beforeDate, source)[index] ?? null
// Заметка к упражнению в тренировке (69.2): до 500 знаков, пустая = нет заметки
export const NOTE_MAX = 500
export const setExerciseNote = (d: ActiveDraft, entryId: string, note: string): ActiveDraft =>
  ({ ...d, exercises: d.exercises.map((e) => (e.id === entryId ? { ...e, note: note.slice(0, NOTE_MAX) || null } : e)) })
// Самая свежая заметка к упражнению до даты тренировки — показываем как напоминание («в прошлый раз: …»)
export function lastNote(entries: readonly { exercise_id: string; date: string; notes?: string | null }[], exerciseId: string, beforeDate: string): string | null {
  let best: { date: string; note: string } | null = null
  for (const e of entries) {
    const n = e.notes?.trim()
    if (e.exercise_id === exerciseId && e.date < beforeDate && n && (!best || e.date > best.date)) best = { date: e.date, note: n }
  }
  return best?.note ?? null
}
// Шаг поля клавишами ↑/↓ (69.3): пустое поле + ↑ даёт шаг, ↓ ниже нуля не уходит (остаётся 0); результат без хвостов дробей
export function stepNumber(cur: number | null | undefined, dir: 1 | -1, step: number): number {
  const base = typeof cur === 'number' && Number.isFinite(cur) ? cur : 0
  return Math.max(0, Math.round((base + dir * step) * 100) / 100)
}
export const weightStep = (unit: string): number => (unit === 'lb' ? 5 : 2.5)
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

// Тренировка задним числом (BACKLOG 69.2, срез 3): дата YYYY-MM-DD, время начала HH:MM (локальное), длительность в минутах. Некорректный ввод → null.
export function newPastDraft(id: string, date: string, time: string, minutes: number, opts: { name?: string | null } = {}): ActiveDraft | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date), tm = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!dm || !tm || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return null
  const [y, mo, da, h, mi] = [+dm[1], +dm[2], +dm[3], +tm[1], +tm[2]]
  if (h > 23 || mi > 59) return null
  const start = new Date(y, mo - 1, da, h, mi, 0)
  if (start.getFullYear() !== y || start.getMonth() !== mo - 1 || start.getDate() !== da) return null
  const d = newDraft(id, start, { name: opts.name, date })
  return { ...d, manual_minutes: minutes }
}

// «Повторить прошлую» (BACKLOG 69.2, срез 5): упражнения самого свежего дня тренировок (в порядке position, затем как пришли), подходы пустые — по числу рабочих
// подходов прошлого раза (минимум 1); числа подставит «прошлый раз» (69.6). Нет записей с подходами → null.
type HistEntry = { id: string; exercise_id: string; date: string; sets: readonly SetV2[]; position?: number | null; superset_group?: number | null }
export function draftFromLast(entries: readonly HistEntry[], existingExerciseIds: ReadonlySet<string>, draftId: string, now: Date, newEntryId: () => string, name: string | null = null): ActiveDraft | null {
  const usable = entries.filter((e) => (e.sets?.length ?? 0) > 0 && existingExerciseIds.has(e.exercise_id))
  if (!usable.length) return null
  const day = usable.reduce((m, e) => (e.date > m ? e.date : m), '')
  const same = usable.map((e, i) => ({ e, i })).filter((x) => x.e.date === day)
  same.sort((a, b) => ((a.e.position ?? 1e9) - (b.e.position ?? 1e9)) || a.i - b.i)
  const d = newDraft(draftId, now, { name })
  const seen = new Set<string>()
  d.exercises = same.filter(({ e }) => !seen.has(e.exercise_id) && !!seen.add(e.exercise_id)).slice(0, MAX_EXERCISES).map(({ e }) => ({
    id: newEntryId(), exercise_id: e.exercise_id, superset_group: e.superset_group ?? null, note: null,
    sets: Array.from({ length: Math.min(MAX_SETS, Math.max(1, e.sets.filter(isWorking).length)) }, emptySet),
  }))
  return d
}
export const lastWorkoutDate = (entries: readonly { date: string; sets: readonly unknown[] }[]): string | null =>
  entries.reduce<string | null>((m, e) => ((e.sets?.length ?? 0) > 0 && (!m || e.date > m) ? e.date : m), null)

// Суперсеты (BACKLOG 69.8): группа = номер superset_group у НЕСКОЛЬКИХ упражнений ПОДРЯД. Одиночные и разорванные группы сбрасываются, номера идут 1..n по порядку.
// Если ничего менять не надо — возвращается тот же объект.
export function normalizeSupersets(d: ActiveDraft): ActiveDraft {
  const out: (number | null)[] = d.exercises.map(() => null)
  let next = 0, i = 0
  while (i < d.exercises.length) {
    const g = d.exercises[i].superset_group
    let j = i + 1
    if (g != null) while (j < d.exercises.length && d.exercises[j].superset_group === g) j++
    if (g != null && j - i >= 2) { next++; for (let k = i; k < j; k++) out[k] = next }
    i = j
  }
  if (d.exercises.every((e, k) => (e.superset_group ?? null) === out[k])) return d
  return { ...d, exercises: d.exercises.map((e, k) => ({ ...e, superset_group: out[k] })) }
}
// «Объединить со следующим» / «Разъединить»: если это упражнение и следующее уже в одной группе — убираем СЛЕДУЮЩЕЕ и всё после него из группы (разрыв здесь); иначе соединяем
export function toggleSupersetWithNext(d: ActiveDraft, entryId: string): ActiveDraft {
  const i = d.exercises.findIndex((e) => e.id === entryId)
  if (i < 0 || i >= d.exercises.length - 1) return d
  const a = d.exercises[i], b = d.exercises[i + 1]
  if (a.superset_group != null && a.superset_group === b.superset_group) {
    const g = a.superset_group
    // разрываем: хвост группы (с i+1) получает «пустую» группу, нормализация сбросит одиночек
    const ex = d.exercises.map((e, idx) => (idx >= i + 1 && e.superset_group === g ? { ...e, superset_group: 1000 } : e))
    return normalizeSupersets({ ...d, exercises: ex })
  }
  const g = a.superset_group ?? b.superset_group ?? 1000 + i
  const ex = d.exercises.map((e, idx) => (idx === i || idx === i + 1 || (b.superset_group != null && e.superset_group === b.superset_group) || (a.superset_group != null && e.superset_group === a.superset_group) ? { ...e, superset_group: g } : e))
  return normalizeSupersets({ ...d, exercises: ex })
}
// Ввод попеременно (69.8): после ✓ в суперсете — к какому подходу перейти. Идём по кругу по упражнениям группы: следующее упражнение — тот же номер подхода,
// после последнего в группе — первое упражнение со следующим номером. Невыполненный подход с таким номером берём первым; нет такого — null (раунд закончен).
export function nextSupersetTarget(d: ActiveDraft, ei: number, i: number): { ei: number; i: number } | null {
  const g = d.exercises[ei]?.superset_group ?? null
  if (g == null) return null
  let lo = ei, hi = ei
  while (lo > 0 && d.exercises[lo - 1].superset_group === g) lo--
  while (hi < d.exercises.length - 1 && d.exercises[hi + 1].superset_group === g) hi++
  const size = hi - lo + 1
  if (size < 2) return null
  for (let k = 1; k <= size; k++) {
    const idx = lo + ((ei - lo + k) % size)
    const round = i + (idx <= ei ? 1 : 0)
    const set = d.exercises[idx].sets[round]
    if (set && set.done !== true) return { ei: idx, i: round }
  }
  return null
}
export const supersetPos = (d: ActiveDraft, i: number): 'none' | 'start' | 'mid' | 'end' => {
  const g = d.exercises[i]?.superset_group ?? null
  if (g == null) return 'none'
  const prev = i > 0 && d.exercises[i - 1].superset_group === g, next = i < d.exercises.length - 1 && d.exercises[i + 1].superset_group === g
  return prev && next ? 'mid' : prev ? 'end' : 'start'
}
