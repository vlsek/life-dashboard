import { metricIconKey } from './icons'
import type { Metric } from './types'

// Строка body_parameters — своя, минимальная копия только тех полей, что нужны для авто-нормы
// воды по весу. Полноценный CRUD параметров тела — отдельный блок «Профиль» (см. ROADMAP.md),
// сюда попадает только read-only использование уже существующих данных.
export interface BodyParameter {
  id: string
  name: string
  icon: string | null
}
export interface BodyParameterValue {
  parameter_id: string
  date: string
  value: number
}

// Портировано из findWaterMetric() в dashboard.js: метрика воды опознаётся по иконке-капле
// или по названию на случай, если иконка ещё не выставлена.
export function findWaterMetric(metrics: Metric[]): Metric | undefined {
  return metrics.find((m) => metricIconKey(m.icon) === 'droplet' || /вода|water/i.test(m.name || ''))
}

// Портировано из того же паттерна для параметра «вес» внутри getAutoWaterNorm().
export function findWeightParam(params: BodyParameter[]): BodyParameter | undefined {
  return params.find((p) => metricIconKey(p.icon) === 'scale' || /вес|weight/i.test(p.name || ''))
}

// Портировано из getAutoWaterNormMl(): грубая формула 30мл на кг веса.
export function autoNormMlFromWeight(weightKg: number): number {
  return Math.round(weightKg * 30)
}

// Итоговая цель на день: ручная (metric.goal_value), иначе авто по весу, иначе дефолт 2000 —
// портировано из `metric.goal_value ?? (await getAutoWaterNormMl()) ?? 2000` в renderWaterBadge().
export function effectiveNormMl(goalValue: number | null | undefined, autoNormMl: number | null): number {
  return goalValue ?? autoNormMl ?? 2000
}

// Портировано из `Math.max(0, current + deltaMl)` в addWaterMl() — суточное значение не уходит
// в минус, даже если минусовая корректировка больше текущего.
export function nextWaterValue(currentMl: number, deltaMl: number): number {
  return Math.max(0, currentMl + deltaMl)
}

export function waterPct(currentMl: number, normMl: number): number {
  return normMl > 0 ? Math.min(1, currentMl / normMl) : 0
}

export interface GlassLevel {
  levelY: number
  waveAmp: number
}

// Портировано из renderWaterBadge(): координата уровня воды в SVG-стакане (22.5 — низ округлой
// части, 6 — верх у горлышка) и амплитуда волны (только пока стакан не пуст и не полон).
export function glassLevel(pct: number): GlassLevel {
  return {
    levelY: 22.5 - pct * 16.5,
    waveAmp: pct > 0 && pct < 1 ? 1.0 : 0,
  }
}
