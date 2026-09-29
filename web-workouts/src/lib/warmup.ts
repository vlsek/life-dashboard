import type { WorkoutEntry } from './types'

// Напоминание о разминке (BACKLOG 3.1): плашка над списком упражнений. Показывается, пока
// пользователь не нажал «Понятно» сегодня и пока сегодня ещё нет ни одной записи (если
// тренировка уже началась, напоминать поздно). Состояние — дата последнего закрытия в
// localStorage, поэтому завтра плашка появится снова.
export const WARMUP_LS_KEY = 'workouts_warmup_dismissed'

export function shouldShowWarmup(opts: {
  hasExercises: boolean
  entries: Pick<WorkoutEntry, 'date'>[]
  dismissedOn: string | null
  today: string
}): boolean {
  if (!opts.hasExercises) return false
  if (opts.dismissedOn === opts.today) return false
  return !opts.entries.some((e) => e.date === opts.today)
}

export function readWarmupDismissed(): string | null {
  try {
    return localStorage.getItem(WARMUP_LS_KEY)
  } catch {
    return null
  }
}

export function writeWarmupDismissed(day: string): void {
  try {
    localStorage.setItem(WARMUP_LS_KEY, day)
  } catch {
    /* ignore */
  }
}
