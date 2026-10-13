import { describe, expect, it } from 'vitest'
import { parseNum, removeRowAt, setCellValue, setRowTime } from './entrySets'
import type { WorkoutSet } from './types'

const s = (reps: number, weight: number | null = null, side: 'L' | 'R' | null = null, time: string | null = '10:00'): WorkoutSet => ({ reps, weight, time, duration: null, side })

describe('parseNum', () => {
  it('число, запятая, пусто и мусор', () => {
    expect(parseNum('12')).toBe(12)
    expect(parseNum('22,5')).toBe(22.5)
    expect(parseNum('  ')).toBeNull()
    expect(parseNum('abc')).toBeNull()
  })
})

describe('setCellValue', () => {
  it('меняет повторы и вес нужной строки, остальное не трогает', () => {
    const out = setCellValue([s(10, 20), s(8, 20)], 1, 'P', 'reps', '9')!
    expect(out.map((x) => x.reps)).toEqual([10, 9])
    expect(setCellValue(out, 0, 'P', 'weight', '22,5')![0].weight).toBe(22.5)
  })
  it('очистить повторы или ввести отрицательное нельзя (null — ничего не менять)', () => {
    expect(setCellValue([s(10)], 0, 'P', 'reps', '')).toBeNull()
    expect(setCellValue([s(10)], 0, 'P', 'reps', '-3')).toBeNull()
  })
  it('вес можно очистить', () => {
    expect(setCellValue([s(10, 20)], 0, 'P', 'weight', '')![0].weight).toBeNull()
  })
  it('пара Л+П: правится одна сторона, вторая остаётся', () => {
    const out = setCellValue([s(10, null, 'L'), s(9, null, 'R')], 0, 'R', 'reps', '7')!
    expect(out.map((x) => [x.side, x.reps])).toEqual([['L', 10], ['R', 7]])
  })
  it('нет такой строки или ячейки — null', () => {
    expect(setCellValue([s(10)], 3, 'P', 'reps', '5')).toBeNull()
    expect(setCellValue([s(10)], 0, 'L', 'reps', '5')).toBeNull()
  })
})

describe('setRowTime / removeRowAt', () => {
  it('время строки меняется у обеих сторон пары', () => {
    const out = setRowTime([s(10, null, 'L'), s(9, null, 'R')], 0, '12:30')!
    expect(out.map((x) => x.time)).toEqual(['12:30', '12:30'])
  })
  it('убирает строку целиком (пару Л+П — обе стороны); единственную не убирает', () => {
    const sets = [s(10, null, 'L'), s(9, null, 'R'), s(8, null, 'L'), s(7, null, 'R')]
    expect(removeRowAt(sets, 0)!.map((x) => x.reps)).toEqual([8, 7])
    expect(removeRowAt([s(10)], 0)).toBeNull()
  })
})
