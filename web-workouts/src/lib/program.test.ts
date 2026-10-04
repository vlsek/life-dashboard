import { beforeEach, describe, expect, it } from 'vitest'
import { PROGRAM_EVENT, PROGRAM_KEY, daysBetween, normalizeProgram, programStatus, readProgram, startProgram, toggleWeekDone, writeProgram } from './program'

beforeEach(() => localStorage.clear())

describe('normalizeProgram', () => {
  it('корректный объект: недели без дублей, по возрастанию, только целые ≥ 0', () => {
    expect(normalizeProgram({ templateId: 'pushups_6w', startDate: '2026-10-03', doneWeeks: [2, 0, 2, 1.5, -1, '3', null] })).toEqual({
      templateId: 'pushups_6w',
      startDate: '2026-10-03',
      doneWeeks: [0, 2],
    })
  })
  it('недели за пределами программы отбрасываются, если число недель известно', () => {
    expect(normalizeProgram({ templateId: 'x', startDate: '2026-10-03', doneWeeks: [0, 5, 6, 9] }, 6)!.doneWeeks).toEqual([0, 5])
  })
  it('мусор → null: не объект, нет шаблона, плохая дата', () => {
    for (const bad of [null, undefined, 'x', 5, [], {}, { templateId: '', startDate: '2026-10-03' }, { templateId: 'a', startDate: '2026-13-45' }, { templateId: 'a', startDate: '03.10.2026' }, { templateId: 'a' }]) {
      expect(normalizeProgram(bad)).toBeNull()
    }
  })
  it('doneWeeks не массив → пустой список, программа остаётся', () => {
    expect(normalizeProgram({ templateId: 'a', startDate: '2026-10-03', doneWeeks: 'x' })).toEqual({ templateId: 'a', startDate: '2026-10-03', doneWeeks: [] })
  })
})

describe('daysBetween и programStatus', () => {
  it('считает календарные дни, в том числе через переход на зимнее время', () => {
    expect(daysBetween('2026-10-03', '2026-10-03')).toBe(0)
    expect(daysBetween('2026-10-03', '2026-10-10')).toBe(7)
    expect(daysBetween('2026-10-20', '2026-11-05')).toBe(16) // конец октября — смена времени в Европе
  })
  const p = startProgram('pushups_6w', '2026-10-03')
  it('дни 0–6 — неделя 1, 7–13 — неделя 2; дней до следующей недели считаются с сегодняшним', () => {
    expect(programStatus(p, 6, '2026-10-03')).toMatchObject({ state: 'active', weekIndex: 0, daysLeftInWeek: 7 })
    expect(programStatus(p, 6, '2026-10-09')).toMatchObject({ weekIndex: 0, daysLeftInWeek: 1 })
    expect(programStatus(p, 6, '2026-10-10')).toMatchObject({ weekIndex: 1, daysLeftInWeek: 7 })
    expect(programStatus(p, 6, '2026-11-06')).toMatchObject({ state: 'active', weekIndex: 4 }) // день 34 — ещё пятая неделя
    expect(programStatus(p, 6, '2026-11-07')).toMatchObject({ state: 'active', weekIndex: 5, daysLeftInWeek: 7 }) // день 35 — шестая, последняя
  })
  it('старт «в будущем» (часы другого устройства) — всё равно первая неделя', () => {
    expect(programStatus(p, 6, '2026-10-01')).toMatchObject({ state: 'active', weekIndex: 0 })
  })
  it('календарь вышел (42 дня) — завершена; все недели отмечены — тоже завершена раньше срока', () => {
    expect(programStatus(p, 6, '2026-11-14')).toMatchObject({ state: 'finished', weekIndex: 5 })
    const all = { ...p, doneWeeks: [0, 1, 2, 3, 4, 5] }
    expect(programStatus(all, 6, '2026-10-05')).toMatchObject({ state: 'finished', doneCount: 6 })
  })
  it('doneCount не считает недели за пределами программы', () => {
    expect(programStatus({ ...p, doneWeeks: [0, 9] }, 6, '2026-10-05').doneCount).toBe(1)
  })
})

describe('toggleWeekDone', () => {
  it('отмечает и снимает, не мутируя исходник, держит порядок', () => {
    const p = startProgram('a', '2026-10-03')
    const a = toggleWeekDone(toggleWeekDone(p, 2), 0)
    expect(a.doneWeeks).toEqual([0, 2])
    expect(p.doneWeeks).toEqual([])
    expect(toggleWeekDone(a, 2).doneWeeks).toEqual([0])
  })
})

describe('localStorage и событие', () => {
  it('writeProgram пишет нормализованную программу и будит слушателей; readProgram возвращает её', () => {
    const seen: unknown[] = []
    window.addEventListener(PROGRAM_EVENT, ((e: CustomEvent) => seen.push(e.detail)) as unknown as EventListener)
    writeProgram({ templateId: 'a', startDate: '2026-10-03', doneWeeks: [1, 0, 1] })
    expect(JSON.parse(localStorage.getItem(PROGRAM_KEY)!)).toEqual({ templateId: 'a', startDate: '2026-10-03', doneWeeks: [0, 1] })
    expect(readProgram()).toEqual({ templateId: 'a', startDate: '2026-10-03', doneWeeks: [0, 1] })
    expect(seen.at(-1)).toEqual({ templateId: 'a', startDate: '2026-10-03', doneWeeks: [0, 1] })
  })
  it('writeProgram(null) убирает ключ; битый JSON → null', () => {
    writeProgram(startProgram('a', '2026-10-03'))
    writeProgram(null)
    expect(localStorage.getItem(PROGRAM_KEY)).toBeNull()
    localStorage.setItem(PROGRAM_KEY, '{oops')
    expect(readProgram()).toBeNull()
  })
})
