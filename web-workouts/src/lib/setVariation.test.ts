import { describe, expect, it } from 'vitest'
import { cleanSets, formatSets } from './workouts'
import { fromRows, toRows } from './sides'
import { setRowVariation } from './entrySets'
import { appendCopiedSet } from './quickSet'
import type { Exercise, WorkoutSet } from './types'

// BACKLOG 63.2: «особенность» подхода (необязательное поле jsonb) не теряется при правках и очистке подходов
const s = (reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({ reps, weight: null, time: '10:00', duration: null, side: null, ...extra })
const ex = { id: 'e', name: 'отжимания', tracks_weight: false } as unknown as Exercise

describe('особенность подхода', () => {
  it('cleanSets сохраняет непустую и не добавляет поле, если её нет', () => {
    const out = cleanSets([s(10, { variation: ' узкий хват ' }), s(8)])
    expect(out[0].variation).toBe('узкий хват')
    expect('variation' in out[1]).toBe(false)
  })
  it('строки туда-обратно: особенность не теряется, у пары Л+П — в обоих подходах', () => {
    const sets = [s(5, { side: 'L', variation: 'медленно' }), s(5, { side: 'R' })]
    const rows = toRows(sets)
    expect(rows).toHaveLength(1)
    expect(rows[0].variation).toBe('медленно')
    expect(fromRows(rows).map((x) => x.variation)).toEqual(['медленно', 'медленно'])
  })
  it('правка строки: задать, поменять, очистить', () => {
    const a = setRowVariation([s(10), s(12)], 1, 'с паузой')!
    expect(a[1].variation).toBe('с паузой')
    expect('variation' in a[0]).toBe(false)
    const b = setRowVariation(a, 1, '  ')!
    expect('variation' in b[1]).toBe(false)
    expect(setRowVariation(a, 9, 'x')).toBeNull()
  })
  it('«+ подход» копирует особенность предыдущего', () => {
    const r = appendCopiedSet([s(10, { variation: 'узкий хват' })], '10:30')!
    expect(r.sets.map((x) => x.variation)).toEqual(['узкий хват', 'узкий хват'])
  })
  it('в тексте записи особенность идёт в «ёлочках»', () => {
    expect(formatSets([s(10, { variation: 'узкий хват' })], ex, 'в час', 'мин')).toContain('«узкий хват»')
  })
})
