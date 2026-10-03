import type { Exercise, WorkoutEntry, WorkoutSet } from './types'
import { repUnit } from './weightUnit'

export interface BestRecord {
  text: string
  date: string
}

// Лучший отдельный подход за всю историю упражнения: по весу (при равенстве — по
// повторениям), либо, если упражнение без веса, по повторениям.
export function bestSetRecord(
  entries: WorkoutEntry[],
  exercise: Exercise,
  unitFallback: string,
  sideFilter: 'L' | 'R' | null = null,
): BestRecord | null {
  let best: { weight: number | null; extra: number; reps: number; date: string } | null = null
  for (const e of entries) {
    for (const s of e.sets || []) {
      if (s.reps == null) continue
      if (sideFilter && s.side !== sideFilter) continue
      const w = exercise.tracks_weight ? (s.weight ?? 0) : null
      // «Утяжеление» — необязательный доп. вес у упражнений с собственным весом: при равных
      // повторениях побеждает подход с большим доп. весом.
      const extra = !exercise.tracks_weight ? (s.weight ?? 0) : 0
      const better =
        !best ||
        (exercise.tracks_weight && ((w ?? 0) > (best.weight ?? 0) || ((w ?? 0) === (best.weight ?? 0) && s.reps > best.reps))) ||
        (!exercise.tracks_weight && (s.reps > best.reps || (s.reps === best.reps && extra > best.extra)))
      if (better) best = { weight: w, extra, reps: s.reps, date: e.date }
    }
  }
  if (!best) return null
  const unitSuffix = repUnit(exercise) ? ' ' + repUnit(exercise) : '' // у упражнения без веса «кг» после повторений не пишем
  const text =
    exercise.tracks_weight && best.weight != null
      ? `${best.reps}×${best.weight}${exercise.unit || unitFallback}`
      : `${best.reps}${unitSuffix}${best.extra > 0 ? ` (+${best.extra}${unitFallback})` : ''}`
  return { text, date: best.date }
}

// "5.2 км за 28 мин" → средняя скорость в час, плюс сама длительность.
export function paceText(value: number, durationMin: number, valueLabel: string | null, perHourLabel: string, durationUnitLabel: string): string {
  if (!durationMin) return ''
  const perHour = (value / durationMin) * 60
  const rounded = perHour >= 10 ? Math.round(perHour) : Math.round(perHour * 10) / 10
  return `${durationMin} ${durationUnitLabel} · ${rounded} ${valueLabel || ''}/${perHourLabel}`.replace(/\s+/g, ' ').trim()
}

// Лучший темп (наибольшее значение/час) — отдельно от "самого большого подхода", потому
// что самая длинная дистанция и самая быстрая скорость почти всегда были в разных тренировках.
export function bestPaceRecord(
  entries: WorkoutEntry[],
  exercise: Exercise,
  perHourLabel: string,
  durationUnitLabel: string,
  sideFilter: 'L' | 'R' | null = null,
): BestRecord | null {
  if (!exercise.tracks_duration) return null
  let best: { perHour: number; text: string; date: string } | null = null
  for (const e of entries) {
    for (const s of e.sets || []) {
      if (s.reps == null || !s.duration) continue
      if (sideFilter && s.side !== sideFilter) continue
      const perHour = (s.reps / s.duration) * 60
      if (!best || perHour > best.perHour) {
        best = { perHour, text: paceText(s.reps, s.duration, exercise.value_label, perHourLabel, durationUnitLabel), date: e.date }
      }
    }
  }
  return best ? { text: best.text, date: best.date } : null
}

export function formatSets(
  sets: WorkoutSet[] | null | undefined,
  exercise: Exercise,
  perHourLabel: string,
  durationUnitLabel: string,
  unitFallback = '',
): string {
  if (!sets || !sets.length) return '—'
  const at = (s: WorkoutSet) => (s.time ? ` (${s.time})` : '')
  const dur = (s: WorkoutSet) =>
    exercise.tracks_duration && s.duration
      ? ` · ${paceText(s.reps ?? 0, s.duration, exercise.value_label, perHourLabel, durationUnitLabel)}`
      : ''
  if (exercise.tracks_weight) {
    return sets.map((s) => (s.weight != null ? `${s.reps}×${s.weight}${exercise.unit || unitFallback}` : `${s.reps}`) + dur(s) + at(s)).join(', ')
  }
  const unitSuffix = repUnit(exercise) ? ` ${repUnit(exercise)}` : ''
  // Доп. вес («Утяжеление») измеряется в весовых единицах (кг), а не в единицах самого упражнения.
  const extra = (s: WorkoutSet) => (s.weight != null && s.weight > 0 ? ` (+${s.weight}${unitFallback})` : '')
  return sets.map((s) => `${s.reps}${unitSuffix}` + extra(s) + dur(s) + at(s)).join(', ')
}

// Порядок фиксированных категорий; свободные (старые произвольные) идут после по
// алфавиту, "без категории" (key === "") — всегда последней.
const CATEGORY_ORDER = ['upper', 'lower', 'fullbody', 'custom']

export function categoryRank(key: string): number {
  if (key === '') return 1000
  const i = CATEGORY_ORDER.indexOf(key)
  return i === -1 ? 500 : i
}

export function isKnownCategory(key: string): boolean {
  return CATEGORY_ORDER.includes(key)
}

export function sortCategoryKeys(keys: string[], labelOf: (key: string) => string): string[] {
  return [...keys].sort((a, b) => {
    const diff = categoryRank(a) - categoryRank(b)
    return diff !== 0 ? diff : labelOf(a).localeCompare(labelOf(b))
  })
}

// Порт exerciseDurationField()/exerciseBilateralField() из workouts.js: столбцы появились
// в миграциях 027/028. Поле шлём в апдейт только если оно уже есть у существующей строки
// (т.е. миграция применена) — иначе апдейт упадёт на базе без миграции.
export function exerciseDurationField(tracksDuration: boolean, existing: Exercise | null): { tracks_duration?: boolean } {
  return existing && 'tracks_duration' in existing ? { tracks_duration: tracksDuration } : {}
}
export function exerciseBilateralField(bilateral: boolean, existing: Exercise | null): { bilateral?: boolean } {
  return existing && 'bilateral' in existing ? { bilateral: bilateral } : {}
}

// Миграция 038 (workout_exercises.muscle_groups): тот же приём — шлём поле только если оно уже есть у существующей строки,
// иначе апдейт упадёт на базе без миграции. Пустой список → NULL («своей привязки нет», снова работает автоопределение).
export function exerciseMusclesField(muscles: readonly string[] | undefined, existing: Exercise | null): { muscle_groups?: string[] | null } {
  if (muscles === undefined || !existing || !('muscle_groups' in existing)) return {}
  return { muscle_groups: muscles.length ? [...muscles] : null }
}

// Порт очистки подходов перед сохранением (см. okBtn.onclick в openEntryModal): выкидывает
// пустые строки, приводит числовые поля к number|null.
export function cleanSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets
    .filter((s) => s.reps !== null && s.reps !== undefined && (s.reps as unknown as string) !== '')
    .map((s) => ({
      reps: typeof s.reps === 'string' ? parseFloat(s.reps) || 0 : (s.reps as number),
      weight: s.weight === null || (s.weight as unknown as string) === '' ? null : typeof s.weight === 'string' ? parseFloat(s.weight) || 0 : s.weight,
      time: s.time || null,
      duration:
        s.duration === null || (s.duration as unknown as string) === ''
          ? null
          : typeof s.duration === 'string'
            ? parseFloat(s.duration) || 0
            : s.duration,
      side: s.side || null,
    }))
}
