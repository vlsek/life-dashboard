import type { DailyNote } from './types'

// Оценка и заметка дня для окна дня (BACKLOG 75.3): только целая оценка 1–5 и непустая заметка; нет ни того ни другого — блока нет.
export function reflectionOf(n: Pick<DailyNote, 'mood' | 'notes'> | undefined | null): { mood: 1 | 2 | 3 | 4 | 5 | null; note: string | null } | null {
  if (!n) return null
  const m = n.mood
  const mood = typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 5 ? (m as 1 | 2 | 3 | 4 | 5) : null
  const note = (n.notes ?? '').trim() || null
  return mood || note ? { mood, note } : null
}
