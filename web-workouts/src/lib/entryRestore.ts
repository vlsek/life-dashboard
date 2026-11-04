import type { WorkoutEntry } from './types'

// «Отменить» удаление записей (BACKLOG 69.11, срез 9): строка для повторной вставки с ТЕМ ЖЕ id.
// Колонки миграции 113 (session_id, position, superset_group) добавляются только если запись их принесла — без миграции в базе их нет.
type Loaded = WorkoutEntry & { position?: number | null; superset_group?: number | null }
export function restoreRow(e: Loaded): Record<string, unknown> {
  const base: Record<string, unknown> = { id: e.id, user_id: e.user_id, exercise_id: e.exercise_id, date: e.date, sets: e.sets, notes: e.notes }
  if (!('session_id' in e)) return base
  return { ...base, session_id: e.session_id ?? null, position: e.position ?? null, superset_group: e.superset_group ?? null }
}
