import { describe, expect, it } from 'vitest'
import { blankRow, fromRows, toRows } from './sides'
import { cleanSets } from './workouts'
import type { WorkoutSet } from './types'

const set = (reps: number, side: 'L' | 'R' | null, time: string | null = null, weight: number | null = null): WorkoutSet => ({
  reps,
  weight,
  time,
  duration: null,
  side,
})

describe('toRows / fromRows', () => {
  it('pairs consecutive L+R into one row and keeps the first time', () => {
    const rows = toRows([set(10, 'L', '10:00', 20), set(9, 'R', '10:01', 18)])
    expect(rows).toHaveLength(1)
    expect(rows[0].time).toBe('10:00')
    expect(rows[0].cells.L).toEqual({ reps: 10, weight: 20, duration: null })
    expect(rows[0].cells.R).toEqual({ reps: 9, weight: 18, duration: null })
  })
  it('pairs R followed by L too, and saves back in L,R order', () => {
    const back = fromRows(toRows([set(9, 'R'), set(10, 'L')]))
    expect(back.map((s) => [s.side, s.reps])).toEqual([['L', 10], ['R', 9]])
  })
  it('gives a lone side an empty opposite cell, which cleanSets drops on save', () => {
    const rows = toRows([set(8, 'L')])
    expect(rows[0].cells.R).toEqual({ reps: null, weight: null, duration: null })
    expect(cleanSets(fromRows(rows)).map((s) => s.side)).toEqual(['L'])
  })
  it('handles L,L,R,R without losing or reordering sets', () => {
    const back = cleanSets(fromRows(toRows([set(1, 'L'), set(2, 'L'), set(3, 'R'), set(4, 'R')])))
    expect(back.map((s) => `${s.side}${s.reps}`)).toEqual(['L1', 'L2', 'R3', 'R4'])
  })
  it('keeps sets without a side as plain rows', () => {
    const rows = toRows([set(15, null, '09:00')])
    expect(Object.keys(rows[0].cells)).toEqual(['P'])
    expect(fromRows(rows)[0].side).toBeNull()
  })
  it('blankRow builds L+R for bilateral exercises and a single cell otherwise', () => {
    expect(Object.keys(blankRow(true).cells)).toEqual(['L', 'R'])
    expect(Object.keys(blankRow(false).cells)).toEqual(['P'])
  })
})
