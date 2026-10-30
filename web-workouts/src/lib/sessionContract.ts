// Контракт данных «Тренировки v2» (BACKLOG 69.1, docs/WORKOUTS_V2_CONTRACT.md, миграция 113): типы и ЧИСТЫЕ правила чтения.
// Ничего не ходит в сеть: слой загрузки/записи (69.2+) берёт отсюда типы и правила. Без миграции 113 клиент живёт на «неявных тренировках».
import type { WorkoutEntry, WorkoutSet } from './types'

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure'
export const SET_TYPES: readonly SetType[] = ['normal', 'warmup', 'drop', 'failure']

// Необязательные поля подхода v2 в jsonb `workout_entries.sets` (старые записи их не имеют — это нормально).
export interface SetExtras { type?: SetType | string | null; rpe?: number | null; done?: boolean | null; rest?: number | null }
export type SetV2 = WorkoutSet & SetExtras

export interface WorkoutSession {
  id: string; user_id: string; name: string | null; date: string
  started_at: string; finished_at: string | null
  routine_id: string | null; notes: string | null; source: 'live' | 'manual'
}
export interface RoutineItem {
  id: string; routine_id: string; exercise_id: string; position: number
  target_sets: number | null; reps_min: number | null; reps_max: number | null
  rest_seconds: number | null; superset_group: number | null; note: string | null
}
export interface WorkoutSettings {
  units: 'kg' | 'lb'; rest_default: number; auto_rest: boolean; rpe: boolean
  prev_source: 'last' | 'best'; keep_awake: boolean; smart_superset: boolean
}
export const DEFAULT_SETTINGS: WorkoutSettings = { units: 'kg', rest_default: 90, auto_rest: true, rpe: false, prev_source: 'last', keep_awake: true, smart_superset: true }

// Неизвестный или пустой тип = обычный подход (так старые клиенты и будущие типы не ломают расчёты)
export function setType(s: SetExtras): SetType {
  return SET_TYPES.includes(s.type as SetType) ? (s.type as SetType) : 'normal'
}
// Подход выполнен: у записей без поля `done` — да (так было всегда); в активной тренировке `done:false` — «ещё не сделан»
export const isDone = (s: SetExtras): boolean => s.done !== false
// Рабочий подход: выполнен и не разминка. Только такие идут в объём, рекорды и «прошлый раз».
export const isWorking = (s: SetExtras): boolean => isDone(s) && setType(s) !== 'warmup'

// RPE: 5…10 с шагом 0.5, иначе null
export function normalizeRpe(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const r = Math.round(v * 2) / 2
  return r >= 5 && r <= 10 ? r : null
}

// Объём = Σ повторы × вес по рабочим подходам (без веса — 0)
export function setsVolume(sets: readonly SetV2[]): number {
  let t = 0
  for (const s of sets) if (isWorking(s) && s.reps && s.weight) t += s.reps * s.weight
  return t
}
export const workingSetCount = (sets: readonly SetV2[]): number => sets.filter(isWorking).length

export interface SessionView {
  key: string               // id сессии либо `implicit:<date>`
  session: WorkoutSession | null // null — «неявная тренировка» за день (записи без session_id)
  date: string
  entries: WorkoutEntry[]   // отсортированы по position, затем без позиции — в порядке прихода
}
type EntryV2 = WorkoutEntry & { session_id?: string | null; position?: number | null; superset_group?: number | null }

// Группировка записей в тренировки: по session_id; записи без него (или со ссылкой на неизвестную сессию) — по дате в «неявную тренировку».
// Порядок: новые сверху (по началу сессии, неявные — по дате в конец дня).
export function groupSessions(entries: readonly EntryV2[], sessions: readonly WorkoutSession[]): SessionView[] {
  const byId = new Map(sessions.map(s => [s.id, s]))
  const out = new Map<string, SessionView>()
  for (const s of sessions) out.set(s.id, { key: s.id, session: s, date: s.date, entries: [] })
  for (const e of entries) {
    const known = e.session_id && byId.has(e.session_id)
    const key = known ? (e.session_id as string) : `implicit:${e.date}`
    let v = out.get(key)
    if (!v) { v = { key, session: null, date: e.date, entries: [] }; out.set(key, v) }
    v.entries.push(e)
  }
  for (const v of out.values()) {
    v.entries = v.entries.map((e, i) => ({ e, i })).sort((a, b) => {
      const pa = (a.e as EntryV2).position, pb = (b.e as EntryV2).position
      if (pa != null && pb != null) return pa - pb || a.i - b.i
      if (pa != null) return -1
      if (pb != null) return 1
      return a.i - b.i
    }).map(x => x.e)
  }
  const stamp = (v: SessionView) => v.session ? v.session.started_at : `${v.date}T23:59:59`
  return [...out.values()].sort((a, b) => b.date.localeCompare(a.date) || stamp(b).localeCompare(stamp(a)))
}

// Длительность сессии в минутах: завершённая — по концу, идущая — до «сейчас»; неявная — null
export function sessionMinutes(s: WorkoutSession | null, nowMs: number): number | null {
  if (!s) return null
  const end = s.finished_at ? Date.parse(s.finished_at) : nowMs
  const start = Date.parse(s.started_at)
  if (!Number.isFinite(end) || !Number.isFinite(start) || end < start) return null
  return Math.round((end - start) / 60000)
}

// Суперсеты: записи с одним superset_group подряд — одна группа; одиночные группы (один участник) считаются обычными
export function supersetGroups(entries: readonly EntryV2[]): Map<number, string[]> {
  const g = new Map<number, string[]>()
  for (const e of entries) if (e.superset_group != null) g.set(e.superset_group, [...(g.get(e.superset_group) ?? []), e.id])
  for (const [k, v] of [...g]) if (v.length < 2) g.delete(k)
  return g
}

// Настройки из profiles.workout_settings: неизвестные/битые ключи заменяются значениями по умолчанию
export function readSettings(raw: unknown): WorkoutSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_SETTINGS
  const rest = typeof o.rest_default === 'number' && o.rest_default >= 0 && o.rest_default <= 3600 ? Math.round(o.rest_default) : d.rest_default
  return {
    units: o.units === 'lb' ? 'lb' : 'kg', rest_default: rest,
    auto_rest: typeof o.auto_rest === 'boolean' ? o.auto_rest : d.auto_rest, rpe: typeof o.rpe === 'boolean' ? o.rpe : d.rpe,
    prev_source: o.prev_source === 'best' ? 'best' : 'last', keep_awake: typeof o.keep_awake === 'boolean' ? o.keep_awake : d.keep_awake,
    smart_superset: typeof o.smart_superset === 'boolean' ? o.smart_superset : d.smart_superset,
  }
}
