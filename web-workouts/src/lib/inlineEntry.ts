import { cleanSets } from './workouts'
import type { EntryFormInput, Exercise, WorkoutSet } from './types'

// BACKLOG 44.5ж: «Добавить запись» не окном, а встроенной строкой в карточке упражнения (как быстрый ввод на главной Дашборда).
// Чистые функции: без Vue, сети и localStorage. Формат записи — тот же, что у окна (EntryFormInput), миграций нет.

// Встроенная строка — для обычных упражнений. С левой/правой стороной (две ячейки в строке) остаётся окно: там нужна пара Л+П.
export function canInlineAdd(exercise: Pick<Exercise, 'bilateral'>): boolean {
  return !exercise.bilateral
}

export interface InlineForm {
  reps: number | string | null
  weight: number | string | null
  duration: number | string | null
}

export const blankInlineForm = (): InlineForm => ({ reps: null, weight: null, duration: null })

// Что показывать в строке: у упражнений с весом — вес, с длительностью — длительность; «утяжеление» (доп. вес) — только в окне «Подробно».
export function inlineFields(exercise: Pick<Exercise, 'tracks_weight' | 'tracks_duration'>): { weight: boolean; duration: boolean } {
  return { weight: !!exercise.tracks_weight, duration: !!exercise.tracks_duration }
}

// Форма → запись на сегодня с одним подходом. null — вносить нечего (повторы не заданы): кнопка «Добавить» не срабатывает вхолостую.
// Поля, которых у упражнения нет, не сохраняем (скрытое значение не должно попасть в запись).
export function buildInlineEntry(exercise: Pick<Exercise, 'tracks_weight' | 'tracks_duration'>, form: InlineForm, today: string, now: string | null): EntryFormInput | null {
  const f = inlineFields(exercise)
  const set: WorkoutSet = {
    reps: form.reps as number | null,
    weight: f.weight ? (form.weight as number | null) : null,
    duration: f.duration ? (form.duration as number | null) : null,
    time: now,
    side: null,
  }
  const sets = cleanSets([set])
  if (sets.length === 0) return null
  return { date: today, sets, notes: null }
}
