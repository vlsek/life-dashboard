import { cleanSets } from './workouts'
import type { EntryFormInput, Exercise, WorkoutEntry, WorkoutSet } from './types'

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

// ---- Срез 3 (BACKLOG 44.5ж): «+ подход» в той же строке. Повторное «Добавить» в тот же день — это ещё один подход в СЕГОДНЯШНЕЙ записи
// упражнения, а не вторая запись за дату (так таблица записей остаётся чистой, а «+ подход» из таблицы продолжает работать с той же записью).
type EntryLite = Pick<WorkoutEntry, 'id' | 'exercise_id' | 'date' | 'sets' | 'notes'>

// Запись упражнения за дату, если она есть (если вдруг несколько — последняя в списке: именно к ней дописываем)
export function entryForDate<T extends Pick<WorkoutEntry, 'exercise_id' | 'date'>>(entries: T[], exerciseId: string, date: string): T | null {
  let found: T | null = null
  for (const e of entries) if (e.exercise_id === exerciseId && e.date === date) found = e
  return found
}

export function todaySetCount(entries: Pick<WorkoutEntry, 'exercise_id' | 'date' | 'sets'>[], exerciseId: string, today: string): number {
  const e = entryForDate(entries, exerciseId, today)
  return e ? e.sets.length : 0
}

export type InlinePlan = { kind: 'new'; input: EntryFormInput } | { kind: 'append'; entryId: string; input: EntryFormInput; count: number }

// Что сделать с готовой записью: создать новую или дописать подход в существующую за эту дату (заметка и дата записи сохраняются)
export function planInlineSave(entries: EntryLite[], exerciseId: string, res: EntryFormInput): InlinePlan {
  const e = entryForDate(entries, exerciseId, res.date)
  if (!e || e.sets.length === 0) return { kind: 'new', input: res }
  const sets = cleanSets([...e.sets, ...res.sets])
  return { kind: 'append', entryId: e.id, input: { date: e.date, sets, notes: e.notes }, count: sets.length }
}
