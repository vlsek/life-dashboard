import { describe, expect, it } from 'vitest'
import { dropIndex, moveTo, rowShift } from './dragReorder'

// три карточки по 50 px с зазором 8: середины 25, 83, 141
const MIDS = [25, 83, 141]

describe('dropIndex', () => {
  it('центр остался у своей карточки — позиция не меняется', () => {
    expect(dropIndex(MIDS, 1, 83)).toBe(1)
    expect(dropIndex(MIDS, 1, 100)).toBe(1)
    expect(dropIndex(MIDS, 1, 60)).toBe(1)
  })
  it('вниз: проход середины следующей карточки меняет позицию, дальше — ещё', () => {
    expect(dropIndex(MIDS, 0, 84)).toBe(1)
    expect(dropIndex(MIDS, 0, 150)).toBe(2)
    expect(dropIndex(MIDS, 0, 83)).toBe(0) // ровно на середине — ещё не прошла
  })
  it('вверх: симметрично', () => {
    expect(dropIndex(MIDS, 2, 82)).toBe(1)
    expect(dropIndex(MIDS, 2, 0)).toBe(0)
  })
  it('за границами списка не выходит', () => {
    expect(dropIndex(MIDS, 2, 9999)).toBe(2)
    expect(dropIndex(MIDS, 0, -9999)).toBe(0)
  })
})

describe('rowShift', () => {
  it('вниз 0→2: карточки 1 и 2 сдвигаются вверх на шаг, остальные на месте', () => {
    expect([0, 1, 2].map((j) => rowShift(j, 0, 2, 58))).toEqual([0, -58, -58])
  })
  it('вверх 2→0: карточки 0 и 1 сдвигаются вниз', () => {
    expect([0, 1, 2].map((j) => rowShift(j, 2, 0, 58))).toEqual([58, 58, 0])
  })
  it('без перемещения никто не сдвигается', () => {
    expect([0, 1, 2].map((j) => rowShift(j, 1, 1, 58))).toEqual([0, 0, 0])
  })
})

describe('moveTo', () => {
  it('переносит элемент и не мутирует исходный массив', () => {
    const src = ['a', 'b', 'c']
    expect(moveTo(src, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveTo(src, 2, 0)).toEqual(['c', 'a', 'b'])
    expect(src).toEqual(['a', 'b', 'c'])
  })
  it('невозможный перенос — копия без изменений', () => {
    expect(moveTo(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
    expect(moveTo(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(moveTo(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
  })
})
