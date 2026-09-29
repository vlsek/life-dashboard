import { describe, it, expect } from 'vitest'
import {
  initialPending,
  parseNumberInput,
  applyDelta,
  parseFixedTotal,
  toggleOption,
  valueToSave,
  isRemaining,
  dayScore,
  shiftDate,
  dayLabel,
} from './daily'
import type { Metric } from './types'

function metric(o: Partial<Metric>): Metric {
  return {
    id: 'm1', user_id: 'u1', name: 'T', icon: null, type: 'boolean', unit: null, goal_value: null,
    goal_direction: null, schedule: null, category_id: null, position: 0, ...o,
  }
}

describe('initialPending', () => {
  it('uses the saved value when there is one, including a real 0 and false', () => {
    const ms = [metric({ id: 'a', type: 'number' }), metric({ id: 'b', type: 'boolean' })]
    expect(initialPending(ms, { a: 0, b: false })).toEqual({ a: 0, b: false })
  })
  it('empty defaults by type: multiselect/sets -> [], boolean -> false, number -> undefined', () => {
    const ms = [
      metric({ id: 'ms', type: 'multiselect' }),
      metric({ id: 'st', type: 'sets' }),
      metric({ id: 'bo', type: 'boolean' }),
      metric({ id: 'nu', type: 'number' }),
    ]
    const p = initialPending(ms, {})
    expect(p.ms).toEqual([])
    expect(p.st).toEqual([])
    expect(p.bo).toBe(false)
    expect(p.nu).toBeUndefined()
  })
  it('null from the DB is treated as "nothing saved"', () => {
    expect(initialPending([metric({ id: 'a', type: 'boolean' })], { a: null }).a).toBe(false)
  })
})

describe('parseNumberInput', () => {
  it('empty / whitespace -> undefined (not 0)', () => {
    expect(parseNumberInput('')).toBeUndefined()
    expect(parseNumberInput('   ')).toBeUndefined()
  })
  it('parses integers and decimals', () => {
    expect(parseNumberInput('42')).toBe(42)
    expect(parseNumberInput('7.5')).toBe(7.5)
    expect(parseNumberInput('0')).toBe(0)
  })
  it('garbage -> 0, like `parseFloat(x) || 0` in the original', () => {
    expect(parseNumberInput('abc')).toBe(0)
  })
})

describe('applyDelta (add mode)', () => {
  it('adds to the current total', () => {
    expect(applyDelta(10, '5')).toBe(15)
    expect(applyDelta(10, '-3')).toBe(7)
  })
  it('starts from 0 when nothing is saved yet', () => {
    expect(applyDelta(undefined, '4')).toBe(4)
  })
  it('empty, zero or garbage delta is not a change', () => {
    expect(applyDelta(10, '')).toBeNull()
    expect(applyDelta(10, '0')).toBeNull()
    expect(applyDelta(10, 'x')).toBeNull()
  })
})

describe('parseFixedTotal', () => {
  it('cancel (null) and non-numbers are ignored', () => {
    expect(parseFixedTotal(null)).toBeNull()
    expect(parseFixedTotal('abc')).toBeNull()
  })
  it('accepts a valid total, including 0', () => {
    expect(parseFixedTotal('12.5')).toBe(12.5)
    expect(parseFixedTotal('0')).toBe(0)
  })
})

describe('toggleOption', () => {
  it('removes an already-selected key and appends a new one', () => {
    expect(toggleOption(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleOption(['a'], 'b')).toEqual(['a', 'b'])
  })
  it('does not mutate the input array', () => {
    const src = ['a']
    toggleOption(src, 'b')
    expect(src).toEqual(['a'])
  })
})

describe('valueToSave', () => {
  it('an untouched number metric is saved as 0; a set 0 stays 0', () => {
    const m = metric({ id: 'n', type: 'number' })
    expect(valueToSave(m, { n: undefined })).toBe(0)
    expect(valueToSave(m, { n: 5 })).toBe(5)
  })
  it('other types are saved as they are', () => {
    expect(valueToSave(metric({ id: 'b', type: 'boolean' }), { b: false })).toBe(false)
    expect(valueToSave(metric({ id: 'x', type: 'multiselect' }), { x: ['a'] })).toEqual(['a'])
  })
})

describe('isRemaining', () => {
  it('expected today and not done -> remaining', () => {
    expect(isRemaining(metric({ type: 'boolean' }), '2026-09-28', false)).toBe(true)
  })
  it('done -> not remaining', () => {
    expect(isRemaining(metric({ type: 'boolean' }), '2026-09-28', true)).toBe(false)
  })
  it('not scheduled for this weekday -> not remaining even if not done', () => {
    const m = metric({ type: 'boolean', schedule: { type: 'days', days: [2] } }) // только вторник
    expect(isRemaining(m, '2026-09-28', false)).toBe(false) // понедельник
    expect(isRemaining(m, '2026-09-29', false)).toBe(true) // вторник
  })
  it('weekly schedules are never "remaining" on a specific day', () => {
    const m = metric({ type: 'boolean', schedule: { type: 'weekly', min: 3 } })
    expect(isRemaining(m, '2026-09-28', false)).toBe(false)
  })
})

describe('dayScore', () => {
  it('counts done metrics out of all metrics', () => {
    const ms = [
      metric({ id: 'a', type: 'boolean' }),
      metric({ id: 'b', type: 'boolean' }),
      metric({ id: 'c', type: 'number', goal_value: 5, goal_direction: 'at_least' }),
    ]
    expect(dayScore(ms, { a: true, b: false, c: 5 })).toEqual({ points: 2, total: 3 })
  })
  it('no metrics -> 0 / 0', () => {
    expect(dayScore([], {})).toEqual({ points: 0, total: 0 })
  })
})

describe('shiftDate / dayLabel', () => {
  it('shifts across month and year boundaries', () => {
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('label includes weekday, day and year in the requested language', () => {
    expect(dayLabel('2026-09-28', 'en')).toMatch(/Monday/)
    expect(dayLabel('2026-09-28', 'en')).toMatch(/2026/)
    expect(dayLabel('2026-09-28', 'ru').toLowerCase()).toMatch(/понедельник/)
  })
})
