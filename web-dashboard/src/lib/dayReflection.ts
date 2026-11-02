// BACKLOG 75.3 «Заметка и оценка дня»: самочувствие 1–5 и короткая заметка к дню (daily_notes.mood / daily_notes.notes, миграция 114).
// Чистая логика без сети и Vue. Без миграции клиент блок не показывает (`isMissingColumn`).
export const MOODS = [1, 2, 3, 4, 5] as const
export type Mood = (typeof MOODS)[number]
export const NOTE_MAX = 500

export function isMood(v: unknown): v is Mood {
  return typeof v === 'number' && (MOODS as readonly number[]).includes(v)
}

// Заметка к записи: пробелы по краям убираются, длина ≤ 500, пусто → null.
export function cleanNote(v: string | null | undefined): string | null {
  const t = (v ?? '').trim().slice(0, NOTE_MAX).trim()
  return t === '' ? null : t
}

// Запись «день без оценки и заметки» не нужна: если пусто и раньше пусто — ничего не пишем (не плодим строки daily_notes).
export function shouldWrite(mood: Mood | null, note: string | null, hadSomething: boolean): boolean {
  return mood !== null || note !== null || hadSomething
}

// Ошибка «такой колонки нет» (миграция 114 не применена): PostgREST отдаёт 42703 / PGRST204 либо текст про колонку.
export function isMissingColumn(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42703' || err.code === 'PGRST204') return true
  return /column .*(mood|notes)|(mood|notes).* column/i.test(err.message ?? '')
}
