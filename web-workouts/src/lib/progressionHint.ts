// Подсказка прогрессии в активной тренировке (BACKLOG 69.6): простое правило «двойной прогрессии», без ИИ.
// Берём рабочие подходы прошлой тренировки с весом. Если на самом тяжёлом весе ВСЕ подходы набрали верхнюю границу повторов — предлагаем прибавить вес на шаг;
// иначе — тот же вес и на повтор больше, чем самый слабый подход. Только для упражнений с весом.
import type { SetV2 } from './sessionContract'

export const REPS_UP = 10
export const stepFor = (unit: string): number => (unit === 'lb' ? 5 : 2.5)
export interface Hint { kind: 'weight' | 'reps'; sets: number; reps: number; weight: number; next: number }

export function progressionHint(prev: readonly SetV2[], unit: string): Hint | null {
  const w = prev.filter((s) => (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0)
  if (!w.length) return null
  const top = Math.max(...w.map((s) => s.weight as number))
  const atTop = w.filter((s) => s.weight === top)
  const minReps = Math.min(...atTop.map((s) => s.reps as number))
  const base = { sets: atTop.length, reps: minReps, weight: top }
  return minReps >= REPS_UP ? { ...base, kind: 'weight', next: Math.round((top + stepFor(unit)) * 100) / 100 } : { ...base, kind: 'reps', next: minReps + 1 }
}
