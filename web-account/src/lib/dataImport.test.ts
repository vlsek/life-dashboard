import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, compareKeys, noteKey, parseBackup, previewImport, summarizeBackup, valueKey } from './dataImport'
import { buildJson, type ExportResult, type SbReader } from './dataExport'

// BACKLOG 79.3, срез 1: проверка файла выгрузки (только чтение)
const exportOf = (tables: ExportResult['tables'], over: Partial<ExportResult> = {}): ExportResult => ({ exportedAt: '2026-10-30T10:00:00.000Z', userId: 'u1', tables, skipped: {}, ...over })
const fileOf = (tables: ExportResult['tables'], over: Partial<ExportResult> = {}) => buildJson(exportOf(tables, over))

describe('parseBackup', () => {
  it('файл, собранный buildJson (79.2), читается обратно', () => {
    const r = parseBackup(fileOf({ metrics: [{ id: 'm1' }], daily_values: [{ metric_id: 'm1', date: '2026-10-01', value: 1 }] }, { skipped: { vocabulary: 'нет таблицы' } }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.backup.userId).toBe('u1')
      expect(r.backup.exportedAt).toBe('2026-10-30T10:00:00.000Z')
      expect(r.backup.tables.daily_values).toHaveLength(1)
      expect(r.backup.skipped).toEqual({ vocabulary: 'нет таблицы' })
    }
  })
  it('BOM в начале файла не мешает', () => {
    expect(parseBackup('\uFEFF' + fileOf({})).ok).toBe(true)
  })
  it('отказы: пусто, не JSON, чужой формат, битая структура', () => {
    expect(parseBackup('  ')).toEqual({ ok: false, error: 'empty' })
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'json' })
    expect(parseBackup('[1,2]')).toEqual({ ok: false, error: 'format' })
    expect(parseBackup(JSON.stringify({ format: 'other', tables: {} }))).toEqual({ ok: false, error: 'format' })
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, tables: [] }))).toEqual({ ok: false, error: 'shape' })
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, tables: { metrics: 'нет' } }))).toEqual({ ok: false, error: 'shape' })
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, tables: { metrics: [1, 2] } }))).toEqual({ ok: false, error: 'shape' })
  })
})

describe('summarizeBackup', () => {
  const parsed = (tables: ExportResult['tables'], over: Partial<ExportResult> = {}) => {
    const r = parseBackup(fileOf(tables, over))
    if (!r.ok) throw new Error('parse')
    return r.backup
  }
  it('известные таблицы в порядке выгрузки с названиями, пустые не показываются, неизвестные — в конце', () => {
    const s = summarizeBackup(parsed({ goals: [{ id: 1 }, { id: 2 }], metrics: [{ id: 'm' }], empty: [], future_table: [{ a: 1 }] }), 'u1')
    expect(s.lines.map((l) => l.name)).toEqual(['metrics', 'goals', 'future_table'])
    expect(s.lines[0].ru).toBe('Метрики')
    expect(s.lines[2].known).toBe(false)
    expect(s.totalRows).toBe(4)
  })
  it('тот ли аккаунт: да / нет / в файле не указано', () => {
    expect(summarizeBackup(parsed({}), 'u1').sameAccount).toBe(true)
    expect(summarizeBackup(parsed({}), 'u2').sameAccount).toBe(false)
    const noOwner = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, tables: {} }))
    expect(noOwner.ok && summarizeBackup(noOwner.backup, 'u1').sameAccount).toBeNull()
  })
  it('не выгруженные тогда таблицы перечисляются', () => {
    expect(summarizeBackup(parsed({}, { skipped: { vocabulary: 'x', books: 'y' } }), 'u1').skipped).toEqual(['vocabulary', 'books'])
  })
})

describe('ключи и сравнение', () => {
  it('ключ значения — метрика|дата; без метрики или с кривой датой — нечитаемый', () => {
    expect(valueKey({ metric_id: 'm1', date: '2026-10-01' })).toBe('m1|2026-10-01')
    expect(valueKey({ metric_id: '', date: '2026-10-01' })).toBeNull()
    expect(valueKey({ metric_id: 'm1', date: '01.10.2026' })).toBeNull()
    expect(noteKey({ date: '2026-10-01' })).toBe('2026-10-01')
    expect(noteKey({ date: 5 })).toBeNull()
  })
  it('новые / уже есть / повторы внутри файла / нечитаемые считаются отдельно', () => {
    const rows = [
      { metric_id: 'm1', date: '2026-10-01' },
      { metric_id: 'm1', date: '2026-10-01' }, // повтор в файле
      { metric_id: 'm1', date: '2026-10-02' }, // уже есть
      { metric_id: 'm2', date: '2026-10-02' },
      { metric_id: 'm2', date: 'вчера' }, // нечитаемая
    ]
    expect(compareKeys(rows, valueKey, new Set(['m1|2026-10-02']))).toEqual({ total: 5, invalid: 1, duplicatesInFile: 1, fresh: 2, existing: 1 })
  })
})

describe('previewImport (читает только свои строки)', () => {
  const sbOf = (db: Record<string, Record<string, unknown>[]>, calls: { table: string; col: string; v: string }[] = []): SbReader => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, v: string) => {
          calls.push({ table, col, v })
          const res = () => Promise.resolve({ data: db[table] ?? [], error: null })
          return { order: () => ({ range: res }), range: res }
        },
      }),
    }),
  })
  const backupOf = (tables: ExportResult['tables']) => {
    const r = parseBackup(fileOf(tables))
    if (!r.ok) throw new Error('parse')
    return r.backup
  }
  it('считает новые и уже имеющиеся значения и заметки; значения без метрики — «сироты»', async () => {
    const calls: { table: string; col: string; v: string }[] = []
    const db = { daily_values: [{ metric_id: 'm1', date: '2026-10-01', value: 1 }], daily_notes: [{ date: '2026-10-01' }], metrics: [{ id: 'm1' }] }
    const b = backupOf({
      metrics: [{ id: 'm2' }],
      daily_values: [{ metric_id: 'm1', date: '2026-10-01' }, { metric_id: 'm1', date: '2026-10-02' }, { metric_id: 'm2', date: '2026-10-02' }, { metric_id: 'gone', date: '2026-10-03' }],
      daily_notes: [{ date: '2026-10-01' }, { date: '2026-10-05' }],
    })
    const p = await previewImport(sbOf(db, calls), b, 'u1')
    expect(p.values).toEqual({ total: 4, invalid: 0, duplicatesInFile: 0, fresh: 3, existing: 1 })
    expect(p.notes).toEqual({ total: 2, invalid: 0, duplicatesInFile: 0, fresh: 1, existing: 1 })
    expect(p.orphanValues).toBe(1)
    expect(calls.length).toBe(3)
    expect(calls.every((c) => c.col === 'user_id' && c.v === 'u1')).toBe(true) // читаются только свои строки
  })
  it('в файле нет значений и заметок — нули', async () => {
    const p = await previewImport(sbOf({}), backupOf({}), 'u1')
    expect(p.values.total).toBe(0)
    expect(p.notes.total).toBe(0)
    expect(p.orphanValues).toBe(0)
  })
})
