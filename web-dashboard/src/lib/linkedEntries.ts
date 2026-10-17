import { sb } from './supabase'
import { appendEntrySet, newEntrySet } from './linkedSets'
import type { DayEdit, DayEntry } from './linkedSets'

// Запись подхода в «Тренировки» за день (общий шаг быстрого ввода для метрик «подходы» и «число», BACKLOG 44.5а / 62.1):
// дописываем подход в последнюю запись упражнения за дату, нет записи — создаём. Возвращает ВСЕ записи дня уже с новым подходом,
// из них вызывающий пересчитывает значение метрики. Ошибка на любом шаге — { error }, ничего не «досчитываем».
export async function appendRepsToDay(
  userId: string,
  date: string,
  exerciseId: string,
  reps: number,
): Promise<{ error: unknown; rows: { sets: unknown }[] }> {
  const { data: today, error: rErr } = await sb
    .from('workout_entries')
    .select('id, sets')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (rErr) return { error: rErr, rows: [] }
  const set = newEntrySet(reps)
  const rows = (today || []) as { id: string; sets: unknown }[]
  const target = rows[rows.length - 1]
  const w = target
    ? await sb.from('workout_entries').update({ sets: appendEntrySet(target.sets, set) }).eq('id', target.id)
    : await sb.from('workout_entries').insert({ user_id: userId, exercise_id: exerciseId, date, notes: null, sets: [set] })
  if (w.error) return { error: w.error, rows: [] }
  const all = rows.map((r) => (r === target ? { sets: appendEntrySet(r.sets, set) } : { sets: r.sets })).concat(target ? [] : [{ sets: [set] }])
  return { error: null, rows: all }
}

// Записи упражнения за день (id и подходы) — основа правки «столбиком» (BACKLOG 63.2)
export async function loadDayEntries(userId: string, date: string, exerciseId: string): Promise<{ error: unknown; entries: DayEntry[] }> {
  const { data, error } = await sb
    .from('workout_entries')
    .select('id, sets')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) return { error, entries: [] }
  return { error: null, entries: (data || []) as DayEntry[] }
}

// Записать план правки в «Тренировки»; первая ошибка обрывает остальное
export async function applyDayEdit(userId: string, date: string, exerciseId: string, edit: DayEdit): Promise<{ error: unknown }> {
  for (const u of edit.update) {
    const r = await sb.from('workout_entries').update({ sets: u.sets }).eq('id', u.id)
    if (r.error) return { error: r.error }
  }
  for (const id of edit.remove) {
    const r = await sb.from('workout_entries').delete().eq('id', id)
    if (r.error) return { error: r.error }
  }
  if (edit.insert) {
    const r = await sb.from('workout_entries').insert({ user_id: userId, exercise_id: exerciseId, date, notes: null, sets: edit.insert })
    if (r.error) return { error: r.error }
  }
  return { error: null }
}
