import { describe, expect, it } from 'vitest'
import { appendCopiedSet, removeLastSet, setCount } from './quickSet'
import type { WorkoutSet } from './types'

// BACKLOG 590: «+ подход» из таблицы копирует предыдущий подход (для Л/П — пару)
const s = (reps: number, weight: number | null = null, side: 'L' | 'R' | null = null, time: string | null = '10:00', duration: number | null = null): WorkoutSet => ({ reps, weight, time, duration, side })

describe('appendCopiedSet', () => {
  it('копирует последний подход: повторы, вес, длительность; время — текущее', () => {
    const out = appendCopiedSet([s(10, 20, null, '10:00', 30)], '10:15')!
    expect(out.count).toBe(2)
    expect(out.sets).toEqual([s(10, 20, null, '10:00', 30), s(10, 20, null, '10:15', 30)])
  })
  it('копирует именно ПОСЛЕДНИЙ из нескольких подходов', () => {
    const out = appendCopiedSet([s(12, 20), s(10, 22.5), s(8, 25)], '11:00')!
    expect(out.count).toBe(4)
    expect(out.sets[3]).toEqual(s(8, 25, null, '11:00'))
    expect(out.sets.slice(0, 3)).toEqual([s(12, 20), s(10, 22.5), s(8, 25)])
  })
  it('без веса остаётся без веса (null не превращается в 0)', () => {
    expect(appendCopiedSet([s(15)], '09:00')!.sets[1].weight).toBeNull()
  })
  it('упражнение с левой/правой стороной: копируется пара Л+П целиком, а подходов-«строк» становится на один больше', () => {
    const sets = [s(10, 5, 'L'), s(9, 5, 'R')]
    const out = appendCopiedSet(sets, '12:00')!
    expect(out.count).toBe(2)
    expect(out.sets).toEqual([s(10, 5, 'L'), s(9, 5, 'R'), s(10, 5, 'L', '12:00'), s(9, 5, 'R', '12:00')])
  })
  it('пара в порядке П, Л копируется так же', () => {
    const out = appendCopiedSet([s(9, null, 'R'), s(10, null, 'L')], '12:00')!
    expect(out.sets).toHaveLength(4)
    expect(out.sets.slice(2).map((x) => x.side).sort()).toEqual(['L', 'R'])
  })
  it('нет подходов — null (первый подход вносят окном записи)', () => {
    expect(appendCopiedSet([], '10:00')).toBeNull()
  })
  it('не меняет исходный массив и копирует значения, а не ссылки', () => {
    const src = [s(10, 20)]
    const out = appendCopiedSet(src, '10:30')!
    expect(src).toHaveLength(1)
    out.sets[1].reps = 99
    expect(out.sets[0].reps).toBe(10)
  })
})

describe('removeLastSet', () => {
  it('убирает последний подход', () => {
    const out = removeLastSet([s(12), s(10), s(8)])!
    expect(out.sets.map((x) => x.reps)).toEqual([12, 10])
    expect(out.count).toBe(2)
  })
  it('для Л/П убирает пару целиком', () => {
    const out = removeLastSet([s(10, null, 'L'), s(9, null, 'R'), s(8, null, 'L'), s(7, null, 'R')])!
    expect(out.sets).toHaveLength(2)
    expect(out.count).toBe(1)
  })
  it('единственный подход не убирается — null', () => {
    expect(removeLastSet([s(10)])).toBeNull()
    expect(removeLastSet([s(10, null, 'L'), s(9, null, 'R')])).toBeNull()
    expect(removeLastSet([])).toBeNull()
  })
  it('«+ подход» и «− подход» взаимно обратимы по числу строк', () => {
    const base = [s(10, 20), s(9, 20)]
    const added = appendCopiedSet(base, '10:00')!
    expect(removeLastSet(added.sets)!.sets.map((x) => x.reps)).toEqual([10, 9])
  })
})

describe('setCount', () => {
  it('считает строки: пара Л+П — один подход', () => {
    expect(setCount([])).toBe(0)
    expect(setCount([s(1), s(2), s(3)])).toBe(3)
    expect(setCount([s(1, null, 'L'), s(1, null, 'R'), s(2, null, 'L'), s(2, null, 'R')])).toBe(2)
  })
})
