import { describe, expect, it } from 'vitest'
import { dropIndex, moveTo, rowShift } from './dragReorder'

// копия логики из web-dashboard (там полный набор тестов жеста); здесь — контрольные примеры, чтобы копия не разъехалась
describe('dragReorder (копия)', () => {
  const MIDS = [25, 83, 141]
  it('dropIndex: вниз/вверх/на месте', () => {
    expect(dropIndex(MIDS, 0, 84)).toBe(1)
    expect(dropIndex(MIDS, 0, 150)).toBe(2)
    expect(dropIndex(MIDS, 2, 0)).toBe(0)
    expect(dropIndex(MIDS, 1, 83)).toBe(1)
  })
  it('rowShift и moveTo', () => {
    expect([0, 1, 2].map((j) => rowShift(j, 0, 2, 58))).toEqual([0, -58, -58])
    expect(moveTo(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
})
