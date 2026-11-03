// Проверка своего файла выгрузки перед восстановлением (BACKLOG 79.3, срез 1): ТОЛЬКО ЧТЕНИЕ, в базу ничего не пишется.
// Файл — JSON из 79.2 (`format: life-dashboard-export-v1`). Показываем, что в нём лежит и сколько строк значений/заметок
// по дням новые, а сколько уже есть (ключи `(метрика, дата)` и `дата`). Загрузка в базу — следующий срез.
import { EXPORT_TABLES, fetchAllRows, type SbReader } from './dataExport'

export const BACKUP_FORMAT = 'life-dashboard-export-v1'
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024

type Row = Record<string, unknown>
export interface Backup { exportedAt: string | null; userId: string | null; tables: Record<string, Row[]>; skipped: Record<string, string> }
export type BackupError = 'empty' | 'json' | 'format' | 'shape'
export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: BackupError }

const isRow = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseBackup(text: string): ParseResult {
  if (!text.trim()) return { ok: false, error: 'empty' }
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return { ok: false, error: 'json' }
  }
  if (!isRow(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: 'format' }
  if (!isRow(raw.tables)) return { ok: false, error: 'shape' }
  const tables: Record<string, Row[]> = {}
  for (const [name, rows] of Object.entries(raw.tables)) {
    if (!Array.isArray(rows) || !rows.every(isRow)) return { ok: false, error: 'shape' }
    tables[name] = rows
  }
  const skipped: Record<string, string> = {}
  if (isRow(raw.skipped)) for (const [k, v] of Object.entries(raw.skipped)) skipped[k] = String(v)
  return { ok: true, backup: { exportedAt: typeof raw.exported_at === 'string' ? raw.exported_at : null, userId: typeof raw.user_id === 'string' ? raw.user_id : null, tables, skipped } }
}

export interface TableLine { name: string; ru: string; en: string; rows: number; known: boolean }
export interface BackupSummary { lines: TableLine[]; totalRows: number; sameAccount: boolean | null; exportedAt: string | null; skipped: string[] }

// Таблицы из выгрузки: известные — в порядке выгрузки и с названиями, неизвестные (новее приложения) — в конце
export function summarizeBackup(b: Backup, currentUserId: string): BackupSummary {
  const lines: TableLine[] = []
  for (const t of EXPORT_TABLES) {
    const rows = b.tables[t.name]?.length ?? 0
    if (rows) lines.push({ name: t.name, ru: t.ru, en: t.en, rows, known: true })
  }
  const known = new Set(EXPORT_TABLES.map((t) => t.name))
  for (const [name, rows] of Object.entries(b.tables)) if (!known.has(name) && rows.length) lines.push({ name, ru: name, en: name, rows: rows.length, known: false })
  return {
    lines,
    totalRows: lines.reduce((a, l) => a + l.rows, 0),
    sameAccount: b.userId === null ? null : b.userId === currentUserId,
    exportedAt: b.exportedAt,
    skipped: Object.keys(b.skipped),
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
export const valueKey = (r: Row): string | null => (str(r.metric_id) && ISO.test(str(r.date)) ? `${str(r.metric_id)}|${str(r.date)}` : null)
export const noteKey = (r: Row): string | null => (ISO.test(str(r.date)) ? str(r.date) : null)

export interface KeyStats { total: number; invalid: number; duplicatesInFile: number; fresh: number; existing: number }

// Ключи файла против ключей, уже лежащих в базе: «новые» будут добавлены, «уже есть» пропущены (без дублей)
export function compareKeys(fileRows: Row[], keyOf: (r: Row) => string | null, existing: Set<string>): KeyStats {
  const seen = new Set<string>()
  const s: KeyStats = { total: fileRows.length, invalid: 0, duplicatesInFile: 0, fresh: 0, existing: 0 }
  for (const r of fileRows) {
    const k = keyOf(r)
    if (k === null) { s.invalid++; continue }
    if (seen.has(k)) { s.duplicatesInFile++; continue }
    seen.add(k)
    if (existing.has(k)) s.existing++
    else s.fresh++
  }
  return s
}

export interface ImportPreview {
  values: KeyStats
  notes: KeyStats
  orphanValues: number // значения, чья метрика не найдена ни в файле, ни в базе: при загрузке пришлось бы пропустить
}

// Сравнение читает ТОЛЬКО свои строки и работает только для того же аккаунта: идентификаторы метрик чужого аккаунта в этой базе не совпадают
export async function previewImport(sb: SbReader, b: Backup, uid: string): Promise<ImportPreview> {
  const tbl = (name: string) => EXPORT_TABLES.find((t) => t.name === name)!
  const [exValues, exNotes, exMetrics] = await Promise.all([fetchAllRows(sb, tbl('daily_values'), uid), fetchAllRows(sb, tbl('daily_notes'), uid), fetchAllRows(sb, tbl('metrics'), uid)])
  const fileValues = b.tables.daily_values ?? []
  const metricIds = new Set<string>([...exMetrics.map((m) => str(m.id)), ...(b.tables.metrics ?? []).map((m) => str(m.id))].filter(Boolean))
  return {
    values: compareKeys(fileValues, valueKey, new Set(exValues.map(valueKey).filter((k): k is string => k !== null))),
    notes: compareKeys(b.tables.daily_notes ?? [], noteKey, new Set(exNotes.map(noteKey).filter((k): k is string => k !== null))),
    orphanValues: fileValues.filter((r) => str(r.metric_id) && !metricIds.has(str(r.metric_id))).length,
  }
}
