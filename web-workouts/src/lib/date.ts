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

// Порт fmtRu() из config.js: "2026-09-27" → "27.09.2026".
export function fmtRu(isoDateStr: string): string {
  if (!isoDateStr) return ''
  const parts = isoDateStr.split('-')
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

// Порт nowHHMM() из config.js — текущее время "HH:MM" (для автоподстановки времени подхода).
export function nowHHMM(): string {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
