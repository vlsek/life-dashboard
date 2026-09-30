// Портировано из config.js — те же сигнатуры и поведение, чтобы проценты дня/недели
// на этой странице совпадали с остальным сайтом.

export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return fmtDate(new Date())
}

export function parseIso(iso: string): Date {
  return new Date(iso + 'T00:00:00')
}

// Сдвиг даты на n календарных дней (setDate), а НЕ на n×86400000 мс: в сутки перехода на
// летнее/зимнее время день длится 23/25 часов, и сдвиг в миллисекундах даёт соседнюю дату.
export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function addDaysIso(iso: string, n: number): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}

export function weekdayOf(dateStr: string): number {
  return parseIso(dateStr).getDay()
}

export function mondayOf(iso: string): string {
  const d = parseIso(iso)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return fmtDate(d)
}

// DD.MM.YYYY — для отображения дат в интерфейсе (см. fmtRu в config.js)
export function fmtRu(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
