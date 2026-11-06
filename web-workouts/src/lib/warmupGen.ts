import type { ActiveDraft } from './activeWorkout'
import { MAX_SETS } from './activeWorkout'
import { isDone, setType } from './sessionContract'
import type { SetV2 } from './sessionContract'

// Генератор разминки (BACKLOG 69.15, срез 2): от рабочего веса — подходы типа W. Схема: доля рабочего веса × повторы; вес округляется до шага (2,5 кг / 5 lb).
export interface WarmupStep { pct: number; reps: number }
export const DEFAULT_WARMUP: readonly WarmupStep[] = [{ pct: 0.4, reps: 8 }, { pct: 0.6, reps: 5 }, { pct: 0.8, reps: 3 }]

export interface WarmupSet { weight: number; reps: number }

// План разминки. Шаги, у которых после округления вес не больше нуля, не ниже рабочего или равен уже взятому, пропускаются
// (для лёгких весов схема сама сжимается; рабочий вес меньше шага — плана нет).
export function warmupPlan(workWeight: number, step: number, scheme: readonly WarmupStep[] = DEFAULT_WARMUP): WarmupSet[] {
  if (!Number.isFinite(workWeight) || workWeight <= 0 || !Number.isFinite(step) || step <= 0) return []
  const out: WarmupSet[] = []
  for (const s of scheme) {
    const weight = Math.round((workWeight * s.pct) / step) * step
    const rounded = Math.round(weight * 100) / 100
    if (rounded <= 0 || rounded >= workWeight) continue
    if (out.some((x) => x.weight === rounded)) continue
    out.push({ weight: rounded, reps: s.reps })
  }
  return out
}

// Рабочий вес упражнения для разминки: сначала первый введённый подход тренировки (не разминочный, вес > 0),
// иначе самый тяжёлый РАБОЧИЙ подход прошлой тренировки; нет ни того ни другого — null.
export function workingWeightFor(current: readonly SetV2[], previous: readonly SetV2[]): number | null {
  const own = current.find((s) => setType(s) !== 'warmup' && (s.weight ?? 0) > 0)
  if (own) return own.weight as number
  const prev = previous.filter((s) => setType(s) !== 'warmup' && isDone(s) && (s.weight ?? 0) > 0).map((s) => s.weight as number)
  return prev.length ? Math.max(...prev) : null
}

export const hasWarmup = (sets: readonly SetV2[]): boolean => sets.some((s) => setType(s) === 'warmup')

const emptyW = (weight: number, reps: number): SetV2 => ({ reps, weight, time: null, duration: null, side: null, done: false, type: 'warmup' })

// Вставляет разминочные подходы В НАЧАЛО упражнения (до рабочих); если разминка уже есть — ничего не меняет; лимит подходов MAX_SETS соблюдается.
export function insertWarmup(d: ActiveDraft, entryId: string, plan: readonly WarmupSet[]): ActiveDraft {
  if (plan.length === 0) return d
  let changed = false
  const exercises = d.exercises.map((e) => {
    if (e.id !== entryId || hasWarmup(e.sets)) return e
    const room = Math.max(0, MAX_SETS - e.sets.length)
    const add = plan.slice(0, room).map((p) => emptyW(p.weight, p.reps))
    if (add.length === 0) return e
    changed = true
    return { ...e, sets: [...add, ...e.sets] }
  })
  return changed ? { ...d, exercises } : d
}

// ---- Настройка схемы (69.15, срез 3) ----
export const WARMUP_KEY = 'workouts.warmupScheme.v1'
export const MAX_WARMUP_STEPS = 6

// Схема из текста «40x8, 60x5, 80x3»: шаги через запятую или точку с запятой, «процент × повторы» с разделителем x / х / × / *, знак % необязателен.
// Дробный процент — ТОЛЬКО через точку (запятая всегда разделяет шаги). Разбор СТРОГИЙ: процент строго между 0 и 100, повторы целые 1–30, шагов не больше
// MAX_WARMUP_STEPS; если хоть один шаг негоден, схема отклоняется целиком (null) — чтобы опечатка вроде «42,5x6» не превратилась молча в шаг «5x6».
export function parseScheme(text: string): WarmupStep[] | null {
  const out: WarmupStep[] = []
  for (const tok of text.split(/[,;]+/)) {
    if (!tok.trim()) continue
    const m = tok.trim().match(/^(\d+(?:\.\d+)?)\s*%?\s*[xXхХ×*]\s*(\d+)$/)
    if (!m) return null
    const pct = Number(m[1])
    const reps = Number(m[2])
    if (!(pct > 0 && pct < 100) || !(reps >= 1 && reps <= 30)) return null
    out.push({ pct: pct / 100, reps })
  }
  return out.length && out.length <= MAX_WARMUP_STEPS ? out : null
}

export const formatScheme = (scheme: readonly WarmupStep[]): string => scheme.map((s) => `${Math.round(s.pct * 1000) / 10}x${s.reps}`).join(', ')

export function readScheme(): WarmupStep[] {
  try {
    const raw = localStorage.getItem(WARMUP_KEY)
    const parsed = raw ? parseScheme(raw) : null
    if (parsed) return parsed
  } catch { /* нет доступа к storage — схема по умолчанию */ }
  return DEFAULT_WARMUP.map((s) => ({ ...s }))
}

export function writeScheme(scheme: readonly WarmupStep[]): void {
  try { localStorage.setItem(WARMUP_KEY, formatScheme(scheme)) } catch { /* настройка не критична */ }
}

export function resetScheme(): WarmupStep[] {
  try { localStorage.removeItem(WARMUP_KEY) } catch { /* ignore */ }
  return DEFAULT_WARMUP.map((s) => ({ ...s }))
}
