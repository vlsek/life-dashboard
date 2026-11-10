// «Неделя в цифрах» (BACKLOG 69.14, срез 1): тренировочных дней, рабочих подходов и объём за календарную неделю (пн–вс)
// с разницей к прошлой неделе, плюс объём по неделям. Чтение уже загруженных записей, ничего не пишется.
import { addDaysIso, mondayOf } from './date'
import { setsVolume, workingOf } from './sessionContract'
import type { SetV2 } from './sessionContract'
import type { Exercise, WorkoutEntry } from './types'

export interface PeriodTotals { days: number; sets: number; volume: number }
export type DeltaKind = 'up' | 'down' | 'same' | 'new' // new — на прошлой неделе было 0, а сейчас есть

export interface Delta { kind: DeltaKind; diff: number; pct: number | null }

// Итоги за период [from, to] (включительно). Записи удалённых упражнений пропускаются — как в журнале.
export function periodTotals(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], from: string, to: string): PeriodTotals {
  const known = new Set(exercises.map((x) => x.id))
  const days = new Set<string>()
  let sets = 0
  let volume = 0
  for (const e of entries) {
    if (e.date < from || e.date > to || !known.has(e.exercise_id)) continue
    const working = workingOf(e.sets as SetV2[])
    if (working.length === 0) continue
    days.add(e.date)
    sets += working.length
    volume += setsVolume(working)
  }
  return { days: days.size, sets, volume: Math.round(volume * 10) / 10 }
}

export interface WeekCompare { from: string; to: string; current: PeriodTotals; previous: PeriodTotals }

export function weekCompare(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], today: string): WeekCompare {
  const from = mondayOf(today)
  const to = addDaysIso(from, 6)
  const prevFrom = addDaysIso(from, -7)
  return { from, to, current: periodTotals(entries, exercises, from, to), previous: periodTotals(entries, exercises, prevFrom, addDaysIso(prevFrom, 6)) }
}

// Разница с прошлой неделей: «+3», «−12 %», «как на прошлой», «новое». pct — null, если сравнивать не с чем
export function delta(cur: number, prev: number): Delta {
  const diff = Math.round((cur - prev) * 10) / 10
  if (diff === 0) return { kind: 'same', diff: 0, pct: 0 }
  if (prev === 0) return { kind: cur > 0 ? 'new' : 'same', diff, pct: null }
  return { kind: diff > 0 ? 'up' : 'down', diff, pct: Math.round((diff / prev) * 100) }
}

export interface WeekVolume { monday: string; volume: number; current: boolean }

// Объём по неделям: последние `weeks` недель, от старой к новой; последняя — текущая
export function weeklyVolumes(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], today: string, weeks = 8): WeekVolume[] {
  const thisMonday = mondayOf(today)
  const out: WeekVolume[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = addDaysIso(thisMonday, -7 * i)
    out.push({ monday, volume: periodTotals(entries, exercises, monday, addDaysIso(monday, 6)).volume, current: i === 0 })
  }
  return out
}

export const hasAnyTraining = (entries: readonly WorkoutEntry[], exercises: readonly Exercise[], today: string, weeks = 8): boolean => {
  const from = addDaysIso(mondayOf(today), -7 * (weeks - 1))
  return periodTotals(entries, exercises, from, addDaysIso(mondayOf(today), 6)).sets > 0
}
