import type { Goal, GoalFormInput } from './types'

// Цели на вес (BACKLOG 1085, миграция 085): «Сбросить вес» / «Набрать вес». Текущий вес не хранится в цели — это последнее
// измерение из body_stats.weight (источник истины); прогресс считается от стартового веса к целевому.
export type WeightMode = 'lose' | 'gain'
export interface WeightSpec {
  mode: WeightMode
  start: number
  target: number
}

export const WEIGHT_MIN = 20
export const WEIGHT_MAX = 500

// Число из поля ввода: запятая как десятичный разделитель, диапазон 20–500 кг, один знак после запятой. Иначе null.
export function parseWeight(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < WEIGHT_MIN || n > WEIGHT_MAX) return null
  return Math.round(n * 10) / 10
}

export function weightSpecOf(g: Pick<Goal, 'weight_mode' | 'weight_start' | 'weight_target'>): WeightSpec | null {
  const mode = g.weight_mode
  const start = Number(g.weight_start)
  const target = Number(g.weight_target)
  if ((mode !== 'lose' && mode !== 'gain') || !Number.isFinite(start) || !Number.isFinite(target) || g.weight_start == null || g.weight_target == null) return null
  return { mode, start, target }
}

export type WeightCheck = 'ok' | 'start' | 'target' | 'direction'

// Проверка формы: оба числа в диапазоне, цель — в нужную сторону от старта («сбросить» — ниже, «набрать» — выше).
export function validateWeight(mode: WeightMode, start: number | null, target: number | null): WeightCheck {
  if (start === null) return 'start'
  if (target === null) return 'target'
  if (mode === 'lose' ? target >= start : target <= start) return 'direction'
  return 'ok'
}

export interface WeightProgress {
  pct: number // 0–100
  reached: boolean
  left: number // сколько осталось до цели, кг (0, если достигнута)
  current: number // вес, от которого посчитано (нет измерения — стартовый)
}

export function weightProgress(spec: WeightSpec, currentWeight: number | null): WeightProgress {
  const current = currentWeight ?? spec.start
  const total = Math.abs(spec.target - spec.start)
  const moved = spec.mode === 'lose' ? spec.start - current : current - spec.start
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((moved / total) * 100))) : 0
  const reached = spec.mode === 'lose' ? current <= spec.target : current >= spec.target
  const left = reached ? 0 : Math.round(Math.abs(current - spec.target) * 10) / 10
  return { pct, reached, left, current }
}

// Поля цели для базы. Без колонок (миграция 085 не применена) — ничего не пишем; обычная цель при наличии колонок обнуляет вес.
export function weightFields(res: Pick<GoalFormInput, 'weightMode' | 'weightStart' | 'weightTarget'>, column: boolean): { weight_mode?: WeightMode | null; weight_start?: number | null; weight_target?: number | null } {
  if (!column) return {}
  if (res.weightMode) return { weight_mode: res.weightMode, weight_start: res.weightStart ?? null, weight_target: res.weightTarget ?? null }
  return { weight_mode: null, weight_start: null, weight_target: null }
}
