import { describe, expect, it } from 'vitest'
import { dayLogEntries, fmtDelta, fmtEntryTime, parseStack, pushEntry, type UndoEntry } from './waterUndo'

// «Время приема воды» (BACKLOG 2.2, срез без БД): к записям стека «Отменить» добавлено время `at` — журнал дня.
describe('pushEntry со временем', () => {
  it('записывает время, если его передали; без времени запись прежнего вида (старые тесты и данные совместимы)', () => {
    expect(pushEntry([], 0, 250, 1000)).toEqual([{ prev: 0, next: 250, at: 1000 }])
    expect(pushEntry([], 0, 250)).toEqual([{ prev: 0, next: 250 }])
  })
  it('мусорное время (NaN/Infinity) не записывается; «ничего не изменилось» по-прежнему не пишется', () => {
    expect(pushEntry([], 0, 250, Number.NaN)).toEqual([{ prev: 0, next: 250 }])
    expect(pushEntry([], 0, 250, Infinity)).toEqual([{ prev: 0, next: 250 }])
    expect(pushEntry([], 300, 300, 1000)).toEqual([])
  })
})

describe('parseStack сохраняет время', () => {
  it('время из хранилища читается; невалидное/нулевое отбрасывается, сама запись остаётся', () => {
    const raw = JSON.stringify([
      { prev: 0, next: 200, at: 1700000000000 },
      { prev: 200, next: 500, at: 'вчера' },
      { prev: 500, next: 600, at: -5 },
      { prev: 600, next: 700 },
    ])
    expect(parseStack(raw)).toEqual([
      { prev: 0, next: 200, at: 1700000000000 },
      { prev: 200, next: 500 },
      { prev: 500, next: 600 },
      { prev: 600, next: 700 },
    ])
  })
})

describe('fmtEntryTime', () => {
  it('«ЧЧ:ММ» с ведущими нулями по местному времени', () => {
    expect(fmtEntryTime(new Date(2026, 9, 2, 8, 5).getTime())).toBe('08:05')
    expect(fmtEntryTime(new Date(2026, 9, 2, 23, 59).getTime())).toBe('23:59')
    expect(fmtEntryTime(new Date(2026, 9, 2, 0, 0).getTime())).toBe('00:00')
  })
})

describe('fmtDelta', () => {
  it('плюс, настоящий минус (U+2212) и ноль', () => {
    expect(fmtDelta(500, 750)).toBe('+250')
    expect(fmtDelta(750, 500)).toBe('\u2212250')
    expect(fmtDelta(500, 500)).toBe('0')
  })
})

describe('dayLogEntries', () => {
  const stack: UndoEntry[] = [
    { prev: 0, next: 200 }, // старая запись без времени — в журнал не попадает
    { prev: 200, next: 450, at: 2000 },
    { prev: 450, next: 700, at: 3000 },
  ]
  it('только записи со временем, от новых к старым; исходный стек не меняется', () => {
    const copy = JSON.parse(JSON.stringify(stack))
    expect(dayLogEntries(stack).map((e) => e.at)).toEqual([3000, 2000])
    expect(stack).toEqual(copy)
  })
  it('пусто или нет стека — пустой журнал', () => {
    expect(dayLogEntries([])).toEqual([])
    expect(dayLogEntries(undefined)).toEqual([])
  })
})
