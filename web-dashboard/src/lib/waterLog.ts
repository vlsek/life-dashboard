import { dayLogEntries, fmtDelta, fmtEntryTime, type UndoEntry } from './waterUndo'

// Журнал воды (BACKLOG 2.2 «Время приема воды»; таблица `water_log`, migrations/036_water_log.sql). Сумма дня по-прежнему лежит в
// daily_values и остаётся источником правды (баллы, серии, кольца) — журнал только описывает, из чего она сложилась. Поэтому запись в
// журнал — best-effort: её сбой не должен ломать основную запись, а при отсутствии таблицы (миграция не применена) окно воды показывает
// запасной журнал из записей этого устройства (`localRows`). Файл общий для web-dashboard и web-header: менять в ОБОИХ местах.

export type WaterLogKind = 'add' | 'edit'

export interface WaterLogRow {
  id: string // id строки в БД, либо `local:<время>` у записи только с этого устройства
  at: number // когда выпито (мс от эпохи)
  delta: number // на сколько изменилась сумма дня (+250 / −100); 0 не бывает
  kind: WaterLogKind
  total: number | null // сумма за день после записи, если известна
}

export interface DayLogView {
  rows: WaterLogRow[] // от новых к старым
  source: 'server' | 'local' // откуда журнал: аккаунт (виден на всех устройствах) или только это устройство
}

export const LOG_VIEW_LIMIT = 20 // сколько записей дня показываем и запрашиваем

// Строка, как её отдаёт PostgREST.
export interface DbLogRow {
  id: string
  drank_at: string
  delta_ml: number
  total_after_ml: number | null
  kind: string
}

export function rowFromDb(r: DbLogRow): WaterLogRow | null {
  const at = Date.parse(r.drank_at)
  if (!r.id || !Number.isFinite(at) || !Number.isFinite(r.delta_ml) || r.delta_ml === 0) return null
  const total = r.total_after_ml
  return {
    id: String(r.id),
    at,
    delta: Math.round(r.delta_ml),
    kind: r.kind === 'edit' ? 'edit' : 'add',
    total: typeof total === 'number' && Number.isFinite(total) ? Math.round(total) : null,
  }
}

export function sortNewestFirst(rows: WaterLogRow[]): WaterLogRow[] {
  return [...rows].sort((a, b) => b.at - a.at)
}

export function buildLogInsert(userId: string, dateStr: string, delta: number, total: number, kind: WaterLogKind, atMs: number) {
  return { user_id: userId, date: dateStr, drank_at: new Date(atMs).toISOString(), delta_ml: Math.round(delta), total_after_ml: Math.round(total), kind }
}

// «Время по умолчанию»: для сегодняшнего дня — сейчас; для прошлого (вода задним числом) — 12:00 по часам устройства.
export function defaultDrankAt(dateStr: string, today: string, nowMs: number): number {
  if (dateStr === today) return nowMs
  return timeToMs(dateStr, '12:00') ?? nowMs
}

// «ГГГГ-ММ-ДД» + «ЧЧ:ММ» (из поля <input type="time">) → мс по местному времени; невалидное → null.
export function timeToMs(dateStr: string, hhmm: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
  if (!d || !t) return null
  const y = Number(d[1])
  const mo = Number(d[2])
  const da = Number(d[3])
  const date = new Date(y, mo - 1, da, Number(t[1]), Number(t[2]))
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== da) return null // 2026-02-31 и т.п.
  return date.getTime()
}

// Таблицы нет (миграция 036 ещё не применена): Postgres 42P01 или PostgREST PGRST205 / «Could not find the table».
export function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === '42P01' || err.code === 'PGRST205') return true
  const m = (err.message ?? '').toLowerCase()
  return m.includes('water_log') && (m.includes('does not exist') || m.includes('could not find the table') || m.includes('schema cache'))
}

// Запасной журнал из записей этого устройства (стек «Отменить»), от новых к старым; записи без времени не попадают.
export function localRows(stack: UndoEntry[] | undefined): WaterLogRow[] {
  return dayLogEntries(stack).map((e) => ({ id: `local:${e.at}`, at: e.at, delta: e.next - e.prev, kind: 'add' as const, total: e.next }))
}

export const fmtLogTime = fmtEntryTime
export const fmtDeltaMl = (delta: number): string => fmtDelta(0, delta)
