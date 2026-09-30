import { describe, it, expect } from 'vitest'
import {
  nowHHMM, normalizeSets, newSet, totalReps, parseReps, parseTime, parseVariation, removeSet, updateSet,
  variationLabels, matchVariations, rememberVariationOptions, forgetVariationOptions, setsSummary, floatingPanelStyle,
} from './setsBlock'
import type { SetRow } from './setsBlock'

const row = (o: Partial<SetRow> = {}): SetRow => ({ reps: null, variation: null, time: null, ...o })

describe('nowHHMM / newSet', () => {
  it('pads hours and minutes', () => {
    expect(nowHHMM(new Date(2026, 8, 28, 7, 5))).toBe('07:05')
    expect(nowHHMM(new Date(2026, 8, 28, 21, 40))).toBe('21:40')
  })
  it('creates an empty set stamped with the current time', () => {
    expect(newSet(new Date(2026, 8, 28, 9, 3))).toEqual({ reps: null, variation: null, time: '09:03' })
  })
})

describe('normalizeSets', () => {
  it('returns [] for non-arrays', () => {
    expect(normalizeSets(null)).toEqual([])
    expect(normalizeSets(undefined)).toEqual([])
    expect(normalizeSets(5)).toEqual([])
  })
  it('fills missing fields with null and keeps existing ones', () => {
    expect(normalizeSets([{ reps: 10 }, { reps: 5, variation: 'wide', time: '10:00' }])).toEqual([
      { reps: 10, variation: null, time: null },
      { reps: 5, variation: 'wide', time: '10:00' },
    ])
  })
})

describe('totalReps / setsSummary', () => {
  it('sums reps, treating null as 0', () => {
    expect(totalReps([row({ reps: 10 }), row({ reps: null }), row({ reps: 5.5 })])).toBe(15.5)
  })
  it('summary is null when empty, else count and total', () => {
    expect(setsSummary([])).toBeNull()
    expect(setsSummary([row({ reps: 10 }), row({ reps: 8 })])).toEqual({ count: 2, reps: 18 })
  })
})

describe('input parsing', () => {
  it('parseReps: empty → null, garbage → 0, numbers (incl. decimals) parsed', () => {
    expect(parseReps('')).toBeNull()
    expect(parseReps('abc')).toBe(0)
    expect(parseReps('12')).toBe(12)
    expect(parseReps('7.5')).toBe(7.5)
  })
  it('parseTime and parseVariation: blank → null, variation trimmed', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('08:15')).toBe('08:15')
    expect(parseVariation('   ')).toBeNull()
    expect(parseVariation('  wide grip ')).toBe('wide grip')
  })
})

describe('removeSet / updateSet (immutable)', () => {
  const sets = [row({ reps: 1 }), row({ reps: 2 }), row({ reps: 3 })]
  it('removes by index without mutating', () => {
    expect(removeSet(sets, 1).map((s) => s.reps)).toEqual([1, 3])
    expect(sets).toHaveLength(3)
  })
  it('patches only the target set without mutating', () => {
    const next = updateSet(sets, 2, { reps: 30 })
    expect(next.map((s) => s.reps)).toEqual([1, 2, 30])
    expect(sets[2].reps).toBe(3)
  })
})

describe('variations', () => {
  const m = { options: [{ key: 'wide', label: 'Wide grip' }, { key: 'narrow', label: '' }] }
  it('uses label, falling back to key', () => {
    expect(variationLabels(m)).toEqual(['Wide grip', 'narrow'])
    expect(variationLabels({ options: null })).toEqual([])
  })
  it('matchVariations filters case-insensitively; showAll returns everything', () => {
    const labels = ['Wide grip', 'Narrow', 'Diamond']
    expect(matchVariations(labels, 'ROW', false)).toEqual(['Narrow'])
    expect(matchVariations(labels, 'zzz', false)).toEqual([])
    expect(matchVariations(labels, 'zzz', true)).toEqual(labels)
    expect(matchVariations(labels, '  ', false)).toEqual(labels)
  })
  it('rememberVariationOptions: null for empty/duplicate (any case), else appends', () => {
    expect(rememberVariationOptions(m, '')).toBeNull()
    expect(rememberVariationOptions(m, 'wide GRIP')).toBeNull()
    expect(rememberVariationOptions(m, 'Diamond')).toEqual([...m.options, { key: 'Diamond', label: 'Diamond' }])
    expect(rememberVariationOptions({ options: null }, 'x')).toEqual([{ key: 'x', label: 'x' }])
  })
  it('forgetVariationOptions removes by label or key', () => {
    expect(forgetVariationOptions(m, 'Wide grip')).toEqual([{ key: 'narrow', label: '' }])
    expect(forgetVariationOptions(m, 'narrow')).toEqual([{ key: 'wide', label: 'Wide grip' }])
    expect(forgetVariationOptions({ options: null }, 'x')).toEqual([])
  })
})

describe('floatingPanelStyle', () => {
  const vp = { top: 0, bottom: 800, width: 390 }
  it('opens below the field when there is room', () => {
    const st = floatingPanelStyle({ left: 20, top: 100, bottom: 130, width: 200 }, vp)
    expect(st).toEqual({ left: '20px', width: '200px', top: '134px', bottom: 'auto', maxHeight: '280px' })
  })
  it('caps the height by the free space below', () => {
    const st = floatingPanelStyle({ left: 20, top: 500, bottom: 530, width: 200 }, vp)
    expect(st.top).toBe('534px')
    expect(st.maxHeight).toBe('262px')
  })
  it('opens above the field when the keyboard leaves little room below', () => {
    const small = { top: 0, bottom: 350, width: 390 }
    const st = floatingPanelStyle({ left: 20, top: 250, bottom: 280, width: 200 }, small)
    expect(st.top).toBe('auto')
    expect(st.maxHeight).toBe('242px')
    expect(parseInt(st.bottom)).toBe(window.innerHeight - 250 + 4)
  })
  it('keeps the panel inside the screen horizontally', () => {
    const st = floatingPanelStyle({ left: -30, top: 100, bottom: 130, width: 900 }, vp)
    expect(st.left).toBe('8px')
    expect(st.width).toBe('374px')
  })
})
