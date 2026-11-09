// BACKLOG 77.8 «Книги: оценка и заметки» (миграция 123): чистые правила нормализации.
export const NOTES_MAX = 1000

// Оценка — целое 1..5, иначе null (нет оценки).
export function normalizeRating(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null
}

// Заметка: обрезка пробелов и длины; пустая — null.
export function normalizeNotes(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, NOTES_MAX)
  return s ? s : null
}

// Звёзды для показа: «★★★☆☆»; нет оценки — пустая строка.
export function stars(rating: unknown): string {
  const r = normalizeRating(rating)
  return r ? '★'.repeat(r) + '☆'.repeat(5 - r) : ''
}
