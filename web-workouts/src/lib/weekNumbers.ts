// «Неделя в цифрах» (BACKLOG 69.14, срез 1): тренировочных дней, рабочих подходов и объём за календарную неделю (пн–вс)
// с разницей к прошлой неделе, плюс объём по неделям. Чтение уже загруженных записей, ничего не пишется.
import { addDaysIso, fmtDate, mondayOf, parseIso } from './date'
import { monthOf, weekOf } from './periodNav'
import { setsByMuscle } from './muscleHeat'
import { WEEK_TARGET } from './todayFocus'
import type { MuscleId } from './muscles'
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

export type StatsPeriod = 'week' | 'month'

// Календарный период со сдвигом назад: offset 0 — текущий, -1 — предыдущий и т. д. (вперёд, в будущее, не листаем)
export function periodRange(kind: StatsPeriod, today: string, offset = 0): { from: string; to: string } {
  const k = Math.min(0, offset)
  if (kind === 'week') return weekOf(addDaysIso(today, 7 * k))
  const d = parseIso(today)
  return monthOf(fmtDate(new Date(d.getFullYear(), d.getMonth() + k, 1)))
}

// Период и предыдущий такой же период (для сравнения)
export function periodCompare(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], kind: StatsPeriod, today: string, offset = 0): WeekCompare {
  const cur = periodRange(kind, today, offset)
  const prev = periodRange(kind, today, Math.min(0, offset) - 1)
  return { from: cur.from, to: cur.to, current: periodTotals(entries, exercises, cur.from, cur.to), previous: periodTotals(entries, exercises, prev.from, prev.to) }
}

export const weekCompare = (entries: readonly WorkoutEntry[], exercises: readonly Exercise[], today: string): WeekCompare => periodCompare(entries, exercises, 'week', today, 0)

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

export interface MonthVolume { monthStart: string; volume: number; current: boolean }

// Объём по месяцам: последние `months` месяцев до месяца даты `anchor` включительно, от старого к новому; последний — «выбранный»
export function monthlyVolumes(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], anchor: string, months = 6): MonthVolume[] {
  const a = parseIso(anchor)
  const out: MonthVolume[] = []
  for (let i = months - 1; i >= 0; i--) {
    const r = monthOf(fmtDate(new Date(a.getFullYear(), a.getMonth() - i, 1)))
    out.push({ monthStart: r.from, volume: periodTotals(entries, exercises, r.from, r.to).volume, current: i === 0 })
  }
  return out
}

export interface MuscleBar { muscle: MuscleId; sets: number; target: number | null }
export const MUSCLE_BARS_LIMIT = 8

// Рабочие подходы по группам мышц за период [from, to], от большего к меньшему (до MUSCLE_BARS_LIMIT). Только группы, где подходы были.
// target — недельная цель группы (своя из «Цели подходов» или WEEK_TARGET), только для недели; для месяца сравнивать не с чем.
export function muscleBars(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], from: string, to: string, goals: Partial<Record<MuscleId, number>> = {}, withTarget = true): MuscleBar[] {
  const rows: MuscleBar[] = []
  // setsByMuscle сама берёт только записи с `from` по `to` (по `to` как «сегодня») — отдельная фильтрация не нужна
  for (const [muscle, sets] of setsByMuscle([...entries], [...exercises], to, from)) {
    if (sets > 0) rows.push({ muscle, sets, target: withTarget ? goals[muscle] ?? WEEK_TARGET : null })
  }
  return rows.sort((a, b) => b.sets - a.sets || (a.muscle < b.muscle ? -1 : 1)).slice(0, MUSCLE_BARS_LIMIT)
}
