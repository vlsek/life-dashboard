import { describe, it, expect } from 'vitest'
import { normalizePlanned, doneCount, mondayOffset, buildMonthGrid } from './calendar'

describe('normalizePlanned', () => {
  it('converts legacy string items to objects, leaves object items as-is', () => {
    expect(normalizePlanned(['Buy milk', { type: 'goal', text: 'Run 5k', done: true }])).toEqual([
      { type: 'custom', text: 'Buy milk', done: false },
      { type: 'goal', text: 'Run 5k', done: true },
    ])
  })

  it('handles null/undefined as empty', () => {
    expect(normalizePlanned(null)).toEqual([])
    expect(normalizePlanned(undefined)).toEqual([])
  })
})

describe('doneCount', () => {
  it('counts done vs total', () => {
    const planned = normalizePlanned(['a', { type: 'custom', text: 'b', done: true }, { type: 'goal', text: 'c', done: true }])
    expect(doneCount(planned)).toEqual({ done: 2, total: 3 })
  })
})

describe('mondayOffset', () => {
  it('Monday is offset 0, Sunday is offset 6', () => {
    expect(mondayOffset(new Date(2026, 5, 1))).toBe(0) // 1 июня 2026 — понедельник
    expect(mondayOffset(new Date(2026, 5, 7))).toBe(6) // 7 июня 2026 — воскресенье
  })
})

describe('buildMonthGrid', () => {
  it('pads leading empty cells to align the 1st with its weekday, marks today, attaches planned items', () => {
    // Февраль 2026 начинается в воскресенье → 6 пустых ячеек перед 1-м числом.
    const grid = buildMonthGrid(2026, 1, { '2026-02-05': [{ type: 'custom', text: 'x', done: false }] }, '2026-02-05')
    expect(grid.slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(grid.length).toBe(6 + 28) // 2026 — не високосный
    const day5 = grid.find((c) => c?.day === 5)
    expect(day5?.isToday).toBe(true)
    expect(day5?.planned).toHaveLength(1)
    const day1 = grid.find((c) => c?.day === 1)
    expect(day1?.isToday).toBe(false)
    expect(day1?.planned).toEqual([])
  })

  it('March 2026 starts on Sunday too but has 31 days', () => {
    const grid = buildMonthGrid(2026, 2, {}, '2026-03-01')
    expect(grid.length).toBe(6 + 31)
  })
})
