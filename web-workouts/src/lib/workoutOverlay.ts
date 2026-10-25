// «Наложение» ещё не отправленных записей на загруженные данные (BACKLOG 66.5в): без сети новая запись/упражнение уходят в очередь офлайн-записей,
// а список на экране берётся с сервера (или из кэша чтения) и их не знает. Чистая функция: применяет ожидающие операции по порядку постановки (seq),
// идемпотентно (повторное применение ничего не меняет), «проблемные» (failed — сервер отказал) не показывает.
import type { Exercise, WorkoutEntry } from './types'

export interface PendingOp {
  seq: number
  table: string
  op: 'insert' | 'upsert' | 'update' | 'delete'
  payload?: Record<string, unknown> | Record<string, unknown>[]
  match?: Record<string, unknown>
  clientTs: number
  status: 'pending' | 'failed'
}

export const WORKOUT_TABLES = ['workout_entries', 'workout_exercises'] as const

const idOf = (o: PendingOp): string | null => {
  const m = o.match?.id
  if (typeof m === 'string') return m
  const p = o.payload
  return p && !Array.isArray(p) && typeof p.id === 'string' ? p.id : null
}

export function applyPendingWorkouts(exercises: Exercise[], entries: WorkoutEntry[], pending: PendingOp[]): { exercises: Exercise[]; entries: WorkoutEntry[] } {
  let ex = exercises
  let en = entries
  const ops = pending.filter((o) => o.status === 'pending' && (WORKOUT_TABLES as readonly string[]).includes(o.table)).sort((a, b) => a.seq - b.seq)
  for (const o of ops) {
    const id = idOf(o)
    if (!id) continue
    const patch = o.payload && !Array.isArray(o.payload) ? o.payload : {}
    if (o.table === 'workout_exercises') {
      if (o.op === 'insert') {
        if (!ex.some((e) => e.id === id)) ex = [...ex, { suggested_scheme: null, category: null, unit: null, value_label: null, tracks_weight: true, created_at: new Date(o.clientTs).toISOString(), ...patch } as unknown as Exercise]
      } else if (o.op === 'update') ex = ex.map((e) => (e.id === id ? ({ ...e, ...patch } as Exercise) : e))
      else if (o.op === 'delete') {
        ex = ex.filter((e) => e.id !== id)
        en = en.filter((e) => e.exercise_id !== id) // в БД записи упражнения удаляются каскадом
      }
    } else {
      if (o.op === 'insert') {
        if (!en.some((e) => e.id === id)) en = [...en, { notes: null, sets: [], ...patch } as unknown as WorkoutEntry]
      } else if (o.op === 'update') en = en.map((e) => (e.id === id ? ({ ...e, ...patch } as WorkoutEntry) : e))
      else if (o.op === 'delete') en = en.filter((e) => e.id !== id)
    }
  }
  // как и с сервера: записи упорядочены по дате
  if (en !== entries) en = [...en].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return { exercises: ex, entries: en }
}
