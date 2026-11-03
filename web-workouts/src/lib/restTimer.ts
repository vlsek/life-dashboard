// Таймер отдыха (BACKLOG 69.5, срез 1): ЧИСТАЯ логика. Точность в фоне держим через метку времени окончания (endsAt), а не через счётчик тиков.
import { supersetPos } from './activeWorkout'
import type { ActiveDraft } from './activeWorkout'

export interface RestState { endsAt: number; total: number }
export const REST_PRESETS = [0, 60, 90, 120, 180] as const // 0 = выкл
export const REST_MAX = 600
export const REST_STORE_KEY = 'workouts.restSeconds.v1'

export const startRest = (nowMs: number, seconds: number): RestState | null =>
  seconds > 0 ? { endsAt: nowMs + Math.min(seconds, REST_MAX) * 1000, total: Math.min(seconds, REST_MAX) } : null
export const restLeft = (r: RestState, nowMs: number): number => Math.max(0, Math.ceil((r.endsAt - nowMs) / 1000))
export const isRestDone = (r: RestState, nowMs: number): boolean => nowMs >= r.endsAt
// −15 / +15: не уходим ниже нуля и выше потолка; total растёт вместе с добавленным временем (для полоски прогресса)
export function adjustRest(r: RestState, nowMs: number, deltaSec: number): RestState {
  const left = Math.min(REST_MAX, Math.max(0, restLeft(r, nowMs) + deltaSec))
  return { endsAt: nowMs + left * 1000, total: Math.max(r.total, left) }
}
export const restProgress = (r: RestState, nowMs: number): number => (r.total > 0 ? Math.min(1, Math.max(0, restLeft(r, nowMs) / r.total)) : 0)

// В суперсете отдыхаем только после ПОСЛЕДНЕГО упражнения группы
export const shouldRestAfter = (d: ActiveDraft, exerciseIndex: number): boolean => {
  const p = supersetPos(d, exerciseIndex)
  return p === 'none' || p === 'end'
}
export const nextPreset = (cur: number): number => REST_PRESETS[(Math.max(0, REST_PRESETS.indexOf(cur as (typeof REST_PRESETS)[number])) + 1) % REST_PRESETS.length]

type Store = Pick<Storage, 'getItem' | 'setItem'>
export function readRestSeconds(store: Store): number {
  try {
    const v = store.getItem(REST_STORE_KEY)
    if (v == null) return 90
    const n = Number(v)
    return (REST_PRESETS as readonly number[]).includes(n) ? n : 90
  } catch { return 90 }
}
export function writeRestSeconds(n: number, store: Store): void { try { store.setItem(REST_STORE_KEY, String(n)) } catch { /* настройка не критична */ } }

// Своё время отдыха у упражнения (BACKLOG 69.5, срез 3): хранится на устройстве по id упражнения; нет записи — общая настройка.
export const REST_BY_EX_KEY = 'workouts.restByExercise.v1'
export type RestByExercise = Record<string, number>
export function readRestByExercise(store: Store): RestByExercise {
  try {
    const o = JSON.parse(store.getItem(REST_BY_EX_KEY) || '{}')
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {}
    const out: RestByExercise = {}
    for (const [k, v] of Object.entries(o)) if ((REST_PRESETS as readonly number[]).includes(v as number)) out[k] = v as number
    return out
  } catch { return {} }
}
export function writeRestByExercise(m: RestByExercise, store: Store): void { try { store.setItem(REST_BY_EX_KEY, JSON.stringify(m)) } catch { /* не критично */ } }
// Цикл: «как у всех» (undefined) → выкл → 60 → 90 → 120 → 180 → снова «как у всех»
export const nextExerciseRest = (cur: number | undefined): number | undefined => {
  if (cur === undefined) return REST_PRESETS[0]
  const i = REST_PRESETS.indexOf(cur as (typeof REST_PRESETS)[number])
  return i >= 0 && i < REST_PRESETS.length - 1 ? REST_PRESETS[i + 1] : undefined
}
export const restFor = (m: RestByExercise, exerciseId: string, base: number): number => m[exerciseId] ?? base
