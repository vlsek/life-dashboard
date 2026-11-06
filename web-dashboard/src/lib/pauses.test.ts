import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsert = vi.fn(async () => ({ error: null }))
vi.mock('./supabase', () => ({ sb: { from: () => ({ upsert, select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }))

import { computeStreakItemsPure } from './streaks'
import { activePause, addPause, canAddPause, endPauseToday, isPausedOn, normalizePauses, pauses, removePause, PAUSES_KEY } from './pauses'
import type { Metric } from './types'

const m = (id: string, over: Partial<Metric> = {}): Metric =>
  ({ id, name: id, icon: null, type: 'boolean', goal_value: null, goal_direction: 'at_least', unit: '', options: [], position: 0, active: true, schedule: null, ...over }) as Metric
const today = new Date(2026, 10, 10)
const ymd = (back: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - back)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('normalizePauses / isPausedOn', () => {
  it('drops junk, keeps valid, sorts, defaults kind', () => {
    const r = normalizePauses([
      { from: '2026-11-10', to: '2026-11-12', kind: 'sick' },
      { from: '2026-11-01', to: null },
      { from: '2026-13-01', to: null },
      { from: '2026-11-05', to: '2026-11-04' },
      'x',
      null,
    ])
    expect(r).toEqual([
      { from: '2026-11-01', to: null, kind: 'vacation' },
      { from: '2026-11-10', to: '2026-11-12', kind: 'sick' },
    ])
    expect(normalizePauses('nope')).toEqual([])
  })
  it('range is inclusive, null end is open', () => {
    const p = normalizePauses([{ from: '2026-11-10', to: '2026-11-12' }, { from: '2026-11-20', to: null }])
    expect(isPausedOn(p, '2026-11-09')).toBe(false)
    expect(isPausedOn(p, '2026-11-10')).toBe(true)
    expect(isPausedOn(p, '2026-11-12')).toBe(true)
    expect(isPausedOn(p, '2026-11-13')).toBe(false)
    expect(isPausedOn(p, '2027-05-01')).toBe(true)
    expect(activePause(p, '2026-11-11')?.to).toBe('2026-11-12')
  })
  it('canAddPause: at most a week back, end not before start', () => {
    expect(canAddPause({ from: '2026-11-03', to: null, kind: 'sick' }, '2026-11-10')).toBe(true)
    expect(canAddPause({ from: '2026-11-02', to: null, kind: 'sick' }, '2026-11-10')).toBe(false)
    expect(canAddPause({ from: '2026-11-10', to: '2026-11-09', kind: 'sick' }, '2026-11-10')).toBe(false)
  })
})

describe('streaks with pauses', () => {
  const metrics = [m('a')]
  // сделано 5 и 4 дня назад, затем 3 дня болел (3,2,1 назад), сегодня не сделано
  const byDay = { [ymd(5)]: { a: true }, [ymd(4)]: { a: true } }
  const paused = (from: number, to: number) => (d: string) => d <= ymd(to) && d >= ymd(from)

  it('without pause the gap breaks the streak', () => {
    const items = computeStreakItemsPure(metrics, byDay, new Set(), today)
    expect(items.find((i) => i.kind === 'metric')).toBeUndefined()
  })
  it('paused days keep the streak and are not counted', () => {
    const items = computeStreakItemsPure(metrics, byDay, new Set(), today, paused(3, 0))
    const one = items.find((i) => i.kind === 'metric')!
    expect(one.streak).toBe(2)
    expect(one.todayCounted).toBe(true)
  })
  it('done day inside a pause still counts', () => {
    const d = { ...byDay, [ymd(2)]: { a: true } }
    const one = computeStreakItemsPure(metrics, d, new Set(), today, paused(3, 0)).find((i) => i.kind === 'metric')!
    expect(one.streak).toBe(3)
  })
  it('pause covers perfect-days and note streaks too', () => {
    const notes = new Set([ymd(5), ymd(4)])
    const items = computeStreakItemsPure(metrics, byDay, notes, today, paused(3, 0))
    expect(items.find((i) => i.kind === 'perfect_days')!.streak).toBe(2)
    expect(items.find((i) => i.kind === 'note_filled')!.streak).toBe(2)
    const no = computeStreakItemsPure(metrics, byDay, notes, today)
    expect(no.find((i) => i.kind === 'note_filled')).toBeUndefined()
  })
  it('a gap before the pause still breaks the streak', () => {
    const d = { [ymd(6)]: { a: true } } // пробел 5,4 до паузы
    const items = computeStreakItemsPure(metrics, d, new Set(), today, paused(3, 0))
    expect(items.find((i) => i.kind === 'metric')).toBeUndefined()
  })
})

describe('pause state', () => {
  beforeEach(() => {
    pauses.value = []
    localStorage.clear()
    upsert.mockClear()
  })
  it('add / end today / remove persist locally', () => {
    expect(addPause({ from: '2026-11-10', to: null, kind: 'sick' }, '2026-11-10')).toBe(true)
    expect(JSON.parse(localStorage.getItem(PAUSES_KEY)!)).toHaveLength(1)
    endPauseToday('2026-11-12')
    expect(pauses.value[0].to).toBe('2026-11-12')
    removePause(0)
    expect(pauses.value).toEqual([])
  })
  it('rejects invalid range', () => {
    expect(addPause({ from: '2026-11-10', to: '2026-11-01', kind: 'sick' }, '2026-11-10')).toBe(false)
    expect(pauses.value).toEqual([])
  })
})
