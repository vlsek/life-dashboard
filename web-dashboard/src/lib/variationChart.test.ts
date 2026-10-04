import { describe, expect, it } from 'vitest'
import {
  NONE_COLOR, OTHER_COLOR, VARIATION_PALETTE, buildLegend, colorFor, dayShares, describeShares, escapeXml, hasNamedVariations, normalizeVariation, pieSlices, variationOrder,
} from './variationChart'

const set = (reps: number | null, variation: string | null) => ({ reps, variation, time: null })

describe('dayShares', () => {
  it('sums reps by variation (the owner example: 50 / 30 / 20)', () => {
    const value = [set(30, 'классические'), set(30, 'алмазные'), set(20, 'классические'), set(20, 'на бицепс')]
    const shares = dayShares(value, ['классические', 'алмазные', 'на бицепс'])
    expect(shares).toEqual([
      { label: 'классические', reps: 50 },
      { label: 'алмазные', reps: 30 },
      { label: 'на бицепс', reps: 20 },
    ])
  })
  it('orders by the stable variation order, "no variation" last, unknown before it', () => {
    const shares = dayShares([set(5, null), set(5, 'b'), set(5, 'zzz'), set(5, 'a')], ['a', 'b'])
    expect(shares.map((s) => s.label)).toEqual(['a', 'b', 'zzz', null])
  })
  it('treats blank and whitespace variations as "no variation" and trims names', () => {
    const shares = dayShares([set(5, '  '), set(5, ''), set(5, ' wide '), set(5, 'wide')], ['wide'])
    expect(shares).toEqual([{ label: 'wide', reps: 10 }, { label: null, reps: 10 }])
  })
  it('ignores sets without reps and tolerates garbage', () => {
    expect(dayShares([set(0, 'a'), set(null, 'a')], ['a'])).toEqual([])
    expect(dayShares(null)).toEqual([])
    expect(dayShares('oops')).toEqual([])
  })
})

describe('variationOrder / colorFor', () => {
  const days = [
    { date: '2026-09-03', value: [set(10, 'diamond')] },
    { date: '2026-09-01', value: [set(10, 'classic'), set(5, null)] },
    { date: '2026-09-03', value: [set(10, 'archer')] },
  ]
  it('orders by the date of first appearance over the whole history, then alphabetically', () => {
    expect(variationOrder(days)).toEqual(['classic', 'archer', 'diamond'])
  })
  it('a newly appearing variation gets the next colour and the old colours do not change', () => {
    const before = variationOrder(days)
    const after = variationOrder([...days, { date: '2026-10-01', value: [set(5, 'new one')] }])
    expect(after.slice(0, before.length)).toEqual(before)
    expect(colorFor('classic', after)).toBe(colorFor('classic', before))
    expect(colorFor('new one', after)).toBe(VARIATION_PALETTE[3])
  })
  it('first is blue and second red; none is grey; unknown or overflowing ones are "other"', () => {
    const order = ['a', 'b']
    expect(colorFor('a', order)).toBe('#3b82f6')
    expect(colorFor('b', order)).toBe('#ef4444')
    expect(colorFor(null, order)).toBe(NONE_COLOR)
    expect(colorFor('missing', order)).toBe(OTHER_COLOR)
    const many = Array.from({ length: 10 }, (_, i) => 'v' + i)
    expect(colorFor('v7', many)).toBe(VARIATION_PALETTE[7])
    expect(colorFor('v8', many)).toBe(OTHER_COLOR)
  })
  it('ignores sets without reps when building the order', () => {
    expect(variationOrder([{ date: '2026-09-01', value: [set(0, 'ghost')] }])).toEqual([])
  })
})

describe('pieSlices', () => {
  const order = ['a', 'b', 'c']
  it('one variation is a solid circle of its colour', () => {
    const s = pieSlices([{ label: 'a', reps: 100 }], order, 10, 10, 6)
    expect(s).toEqual([{ color: '#3b82f6', label: 'a', reps: 100, full: true, path: '' }])
  })
  it('several variations are sectors proportional to reps and start from the top', () => {
    const s = pieSlices([{ label: 'a', reps: 50 }, { label: 'b', reps: 30 }, { label: 'c', reps: 20 }], order, 0, 0, 10)
    expect(s).toHaveLength(3)
    expect(s.every((x) => !x.full)).toBe(true)
    expect(s[0].path.startsWith('M0 0 L0 -10 A10 10 0 0 1')).toBe(true) // старт сверху
    expect(s[0].path).toContain('0 0 1 ') // 50 % — ровно полукруг: large-arc = 0
    expect(s.map((x) => x.color)).toEqual(['#3b82f6', '#ef4444', '#f59e0b'])
  })
  it('a sector over half of the circle uses the large-arc flag', () => {
    const s = pieSlices([{ label: 'a', reps: 70 }, { label: 'b', reps: 30 }], order, 0, 0, 10)
    expect(s[0].path).toContain('A10 10 0 1 1')
    expect(s[1].path).toContain('A10 10 0 0 1')
  })
  it('ends exactly where it started (full circle) and has no empty slices', () => {
    const s = pieSlices([{ label: 'a', reps: 1 }, { label: 'b', reps: 0 }, { label: 'c', reps: 1 }], order, 0, 0, 10)
    expect(s).toHaveLength(2)
    expect(s[1].path).toContain('L0 10 A10 10') // начало второго сектора — снизу (половина круга)
    expect(s[1].path.endsWith('0 -10 Z')).toBe(true) // конец — там же, где старт
  })
  it('returns nothing for an empty day', () => {
    expect(pieSlices([], order, 0, 0, 5)).toEqual([])
    expect(pieSlices([{ label: 'a', reps: 0 }], order, 0, 0, 5)).toEqual([])
  })
})

describe('legend and tooltip', () => {
  const order = ['classic', 'diamond']
  const points = [
    { shares: [{ label: 'classic', reps: 50 }, { label: 'diamond', reps: 30 }] },
    { shares: [{ label: 'classic', reps: 10 }, { label: null, reps: 5 }] },
    {},
  ]
  it('sums reps per variation over the visible points, stable order, "no variation" last', () => {
    expect(buildLegend(points, order)).toEqual([
      { label: 'classic', color: '#3b82f6', reps: 60, today: 0 },
      { label: 'diamond', color: '#ef4444', reps: 30, today: 0 },
      { label: null, color: NONE_COLOR, reps: 5, today: 0 },
    ])
  })
  it('adds today\'s reps per variation (BACKLOG 22:02): only the point of today counts, other days do not', () => {
    const dated = [
      { date: '2026-10-02', shares: [{ label: 'classic', reps: 50 }, { label: 'diamond', reps: 30 }] },
      { date: '2026-10-03', shares: [{ label: 'classic', reps: 10 }, { label: null, reps: 5 }] },
      { date: '2026-10-04', shares: [{ label: 'classic', reps: 20 }, { label: 'diamond', reps: 8 }] },
      { date: '2026-10-05' },
    ]
    expect(buildLegend(dated, order, '2026-10-04').map((l) => [l.label, l.reps, l.today])).toEqual([
      ['classic', 80, 20],
      ['diamond', 38, 8],
      [null, 5, 0],
    ])
  })
  it('without a today date, or when today is outside the period, every today value is 0', () => {
    const dated = [{ date: '2026-10-02', shares: [{ label: 'classic', reps: 50 }] }]
    expect(buildLegend(dated, order).map((l) => l.today)).toEqual([0])
    expect(buildLegend(dated, order, '2026-10-09').map((l) => l.today)).toEqual([0])
  })
  it('the colourful mode is on only when some variation has a name', () => {
    expect(hasNamedVariations(points)).toBe(true)
    expect(hasNamedVariations([{ shares: [{ label: null, reps: 10 }] }, {}])).toBe(false)
    expect(hasNamedVariations([])).toBe(false)
  })
  it('describes the day as "50 classic · 30 diamond"', () => {
    expect(describeShares([{ label: 'classic', reps: 50 }, { label: null, reps: 5 }, { label: 'x', reps: 0 }], 'none')).toBe('50 classic · 5 none')
  })
  it('normalizes variation names', () => {
    expect(normalizeVariation('  x ')).toBe('x')
    expect(normalizeVariation('')).toBeNull()
    expect(normalizeVariation(undefined)).toBeNull()
  })
  it('escapes user text for SVG', () => {
    expect(escapeXml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;')
  })
})
