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

// Метка времени из БД (timestamptz, ISO в UTC) -> локальная календарная дата пользователя.
// НЕ ts.slice(0, 10): это дата по UTC, и вечером/ночью у пользователей вне UTC она уезжает на день.
export function localDateOfTimestamp(ts: string): string {
  return fmtDate(new Date(ts))
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
