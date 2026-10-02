import { describe, expect, it } from 'vitest'
import { buildLogInsert, defaultDrankAt, fmtDeltaMl, isMissingTable, localRows, rowFromDb, sortNewestFirst, timeToMs } from './waterLog'

describe('rowFromDb', () => {
  it('разбирает строку БД: время в мс, дельта, вид, сумма', () => {
    expect(rowFromDb({ id: 'a1', drank_at: '2026-10-02T08:05:00.000Z', delta_ml: 250, total_after_ml: 750, kind: 'add' })).toEqual({
      id: 'a1', at: Date.parse('2026-10-02T08:05:00.000Z'), delta: 250, kind: 'add', total: 750,
    })
    expect(rowFromDb({ id: 'b', drank_at: '2026-10-02T09:00:00Z', delta_ml: -100, total_after_ml: null, kind: 'edit' })).toMatchObject({ delta: -100, kind: 'edit', total: null })
  })
  it('мусор отбрасывается: нет id, кривая дата, нулевая дельта; неизвестный вид → add', () => {
    expect(rowFromDb({ id: '', drank_at: '2026-10-02T08:05:00Z', delta_ml: 250, total_after_ml: 1, kind: 'add' })).toBeNull()
    expect(rowFromDb({ id: 'x', drank_at: 'вчера', delta_ml: 250, total_after_ml: 1, kind: 'add' })).toBeNull()
    expect(rowFromDb({ id: 'x', drank_at: '2026-10-02T08:05:00Z', delta_ml: 0, total_after_ml: 1, kind: 'add' })).toBeNull()
    expect(rowFromDb({ id: 'x', drank_at: '2026-10-02T08:05:00Z', delta_ml: 5, total_after_ml: 1, kind: 'weird' })?.kind).toBe('add')
  })
})

describe('sortNewestFirst / localRows', () => {
  it('сортирует от новых к старым, исходный массив не меняет', () => {
    const rows = [
      { id: '1', at: 1, delta: 1, kind: 'add' as const, total: null },
      { id: '2', at: 3, delta: 1, kind: 'add' as const, total: null },
      { id: '3', at: 2, delta: 1, kind: 'add' as const, total: null },
    ]
    expect(sortNewestFirst(rows).map((r) => r.id)).toEqual(['2', '3', '1'])
    expect(rows.map((r) => r.id)).toEqual(['1', '2', '3'])
  })
  it('локальные записи → строки журнала: только со временем, дельта = next − prev, id помечен local', () => {
    const rows = localRows([{ prev: 0, next: 200 }, { prev: 200, next: 450, at: 2000 }, { prev: 450, next: 300, at: 3000 }])
    expect(rows.map((r) => [r.id, r.delta, r.total])).toEqual([['local:3000', -150, 300], ['local:2000', 250, 450]])
    expect(localRows(undefined)).toEqual([])
  })
})

describe('buildLogInsert', () => {
  it('собирает строку вставки: ISO-время, округлённые числа, вид', () => {
    const at = Date.parse('2026-10-02T08:05:00.000Z')
    expect(buildLogInsert('u1', '2026-10-02', 250.4, 750.6, 'add', at)).toEqual({
      user_id: 'u1', date: '2026-10-02', drank_at: '2026-10-02T08:05:00.000Z', delta_ml: 250, total_after_ml: 751, kind: 'add',
    })
  })
})

describe('timeToMs / defaultDrankAt', () => {
  it('«ЧЧ:ММ» + дата → мс по местному времени; невалидное → null (в т.ч. несуществующие даты)', () => {
    expect(timeToMs('2026-10-02', '08:30')).toBe(new Date(2026, 9, 2, 8, 30).getTime())
    expect(timeToMs('2026-10-02', '24:00')).toBeNull()
    expect(timeToMs('2026-10-02', '8:30')).toBeNull()
    expect(timeToMs('2026-02-31', '08:30')).toBeNull()
    expect(timeToMs('вчера', '08:30')).toBeNull()
    expect(timeToMs('2026-10-02', '')).toBeNull()
  })
  it('по умолчанию: сегодня — сейчас; прошлый день — 12:00', () => {
    const now = new Date(2026, 9, 2, 15, 42).getTime()
    expect(defaultDrankAt('2026-10-02', '2026-10-02', now)).toBe(now)
    expect(defaultDrankAt('2026-09-30', '2026-10-02', now)).toBe(new Date(2026, 8, 30, 12, 0).getTime())
  })
})

describe('isMissingTable', () => {
  it('узнаёт отсутствие таблицы по коду Postgres/PostgREST и по тексту', () => {
    expect(isMissingTable({ code: '42P01', message: 'x' })).toBe(true)
    expect(isMissingTable({ code: 'PGRST205', message: 'x' })).toBe(true)
    expect(isMissingTable({ message: "Could not find the table 'public.water_log' in the schema cache" })).toBe(true)
    expect(isMissingTable({ message: 'relation "water_log" does not exist' })).toBe(true)
  })
  it('другие ошибки — не «нет таблицы»', () => {
    expect(isMissingTable(null)).toBe(false)
    expect(isMissingTable(undefined)).toBe(false)
    expect(isMissingTable({ code: '42501', message: 'permission denied for table water_log' })).toBe(false)
    expect(isMissingTable({ message: 'relation "other" does not exist' })).toBe(false)
  })
})

describe('fmtDeltaMl', () => {
  it('знак у дельты: плюс, настоящий минус', () => {
    expect(fmtDeltaMl(250)).toBe('+250')
    expect(fmtDeltaMl(-100)).toBe('\u2212100')
  })
})
