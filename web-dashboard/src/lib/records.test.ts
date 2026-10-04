import { beforeEach, describe, expect, it } from 'vitest'
import { RECORDS_EVENT, RECORDS_KEY, bestRecord, formatRecordDate, formatRecordValue, mergeRecord, recordsEnabled, setRecordsEnabled } from './records'

beforeEach(() => localStorage.clear())

describe('bestRecord', () => {
  it('наибольшее значение и его дата; нули, пропуски и мусор не считаются', () => {
    expect(bestRecord([{ date: '2026-01-01', y: 3 }, { date: '2026-01-02', y: 9 }, { date: '2026-01-03', y: 5 }])).toEqual({ y: 9, date: '2026-01-02' })
    expect(bestRecord([{ date: '2026-01-01', y: 0 }, { date: '2026-01-02', y: null }, { date: '2026-01-03', y: -4 }, { date: '2026-01-04', y: NaN }])).toBeNull()
    expect(bestRecord([])).toBeNull()
  })
  it('при равных значениях берёт самую раннюю дату, в каком бы порядке ни пришли точки', () => {
    expect(bestRecord([{ date: '2026-03-01', y: 7 }, { date: '2026-02-01', y: 7 }, { date: '2026-04-01', y: 7 }])).toEqual({ y: 7, date: '2026-02-01' })
  })
  it('дробные значения сохраняются как есть', () => {
    expect(bestRecord([{ date: '2026-01-01', y: 2.5 }, { date: '2026-01-02', y: 2.25 }])).toEqual({ y: 2.5, date: '2026-01-01' })
  })
})

describe('mergeRecord', () => {
  const cur = { y: 10, date: '2026-01-01' }
  it('новое значение строго больше — рекорд обновляется; равное или меньшее — прежний объект', () => {
    expect(mergeRecord(cur, 12, '2026-02-01')).toEqual({ y: 12, date: '2026-02-01' })
    expect(mergeRecord(cur, 10, '2026-02-01')).toBe(cur)
    expect(mergeRecord(cur, 3, '2026-02-01')).toBe(cur)
  })
  it('первого рекорда нет — первое положительное значение им становится; ноль, null и пустая дата — нет', () => {
    expect(mergeRecord(null, 4, '2026-02-01')).toEqual({ y: 4, date: '2026-02-01' })
    expect(mergeRecord(undefined, 0, '2026-02-01')).toBeNull()
    expect(mergeRecord(undefined, null, '2026-02-01')).toBeNull()
    expect(mergeRecord(undefined, 5, undefined)).toBeNull()
  })
})

describe('выключатель', () => {
  it('по умолчанию включено; «выключить» хранится в localStorage; включить — снова убирает ключ', () => {
    expect(recordsEnabled()).toBe(true)
    setRecordsEnabled(false)
    expect(localStorage.getItem(RECORDS_KEY)).toBe('off')
    expect(recordsEnabled()).toBe(false)
    setRecordsEnabled(true)
    expect(localStorage.getItem(RECORDS_KEY)).toBeNull()
    expect(recordsEnabled()).toBe(true)
  })
  it('смена выбора будит слушателей события (бейджи скрываются сразу, без перезагрузки)', () => {
    const seen: boolean[] = []
    const on = ((e: CustomEvent) => seen.push(e.detail)) as unknown as EventListener
    window.addEventListener(RECORDS_EVENT, on)
    setRecordsEnabled(false)
    setRecordsEnabled(true)
    window.removeEventListener(RECORDS_EVENT, on)
    expect(seen).toEqual([false, true])
  })
})

describe('форматирование', () => {
  it('число — с разделителем разрядов по языку и не больше двух знаков после запятой', () => {
    expect(formatRecordValue(5200, 'en')).toBe('5,200')
    expect(formatRecordValue(2.456, 'en')).toBe('2.46')
    expect(formatRecordValue(5200, 'ru').replace(/\s/g, ' ')).toBe('5 200')
  })
  it('дата — коротко с годом; мусор остаётся как есть', () => {
    expect(formatRecordDate('2026-09-12', 'en')).toMatch(/12 Sep\w* 2026/)
    expect(formatRecordDate('2026-09-12', 'ru')).toMatch(/12\s+сент\.?\s+2026/)
    expect(formatRecordDate('oops', 'en')).toBe('oops')
  })
})
