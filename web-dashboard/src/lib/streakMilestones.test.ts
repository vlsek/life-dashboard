import { describe, expect, it } from 'vitest'
import { findPending, messageIndex, reachedThresholds, reconcileShown, streakKey, unitKey } from './streakMilestones'
import type { StreakItem } from './streaks'
import type { Metric } from './types'

const metric = (id: string, name = 'Run'): Metric =>
  ({ id, user_id: 'u', name, icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 }) as Metric
const perfect = (streak: number): StreakItem => ({ kind: 'perfect_days', streak, todayCounted: true })
const note = (streak: number): StreakItem => ({ kind: 'note_filled', streak, todayCounted: true })
const metricItem = (id: string, streak: number, unit?: 'w'): StreakItem => ({ kind: 'metric', metric: metric(id), streak, todayCounted: true, unit })

describe('thresholds', () => {
  it('lists reached day thresholds and week thresholds separately', () => {
    expect(reachedThresholds(perfect(4))).toEqual([])
    expect(reachedThresholds(perfect(5))).toEqual([5])
    expect(reachedThresholds(perfect(31))).toEqual([5, 10, 30])
    expect(reachedThresholds(metricItem('a', 12, 'w'))).toEqual([4, 12])
    expect(reachedThresholds(metricItem('a', 12))).toEqual([5, 10]) // те же 12 дней — другие пороги
  })
  it('builds a stable key per streak', () => {
    expect(streakKey(perfect(1))).toBe('perfect_days')
    expect(streakKey(note(1))).toBe('note_filled')
    expect(streakKey(metricItem('abc', 1))).toBe('metric:abc')
  })
})

describe('findPending', () => {
  it('first run: celebrates only the best one and silently marks every reached threshold', () => {
    const items = [perfect(11), metricItem('a', 40), note(6)]
    const r = findPending(null, items)
    expect(r.milestone).toMatchObject({ key: 'metric:a', threshold: 30, unit: 'd', kind: 'metric', metricName: 'Run' })
    expect(r.nextShown).toEqual({ perfect_days: [5, 10], 'metric:a': [5, 10, 30], note_filled: [5] })
    // следующий запуск уже ничего не показывает
    expect(findPending(r.nextShown, items).milestone).toBeNull()
  })
  it('shows nothing when no threshold is reached', () => {
    const r = findPending({}, [perfect(3), metricItem('a', 4)])
    expect(r.milestone).toBeNull()
  })
  it('celebrates a newly reached threshold exactly once', () => {
    const shown = { perfect_days: [5] }
    const first = findPending(shown, [perfect(10)])
    expect(first.milestone).toMatchObject({ key: 'perfect_days', threshold: 10 })
    const again = findPending(first.nextShown, [perfect(10)])
    expect(again.milestone).toBeNull()
    expect(findPending(first.nextShown, [perfect(12)]).milestone).toBeNull()
  })
  it('jumps straight to the highest unseen threshold instead of replaying the lower ones', () => {
    const r = findPending({ perfect_days: [5] }, [perfect(35)])
    expect(r.milestone?.threshold).toBe(30)
    expect(r.nextShown.perfect_days).toEqual([5, 10, 30])
  })
  it('regular run: shows one popup at a time; the others wait for their turn', () => {
    const items = [perfect(10), metricItem('a', 5)]
    const state = { perfect_days: [5], 'metric:a': [] as number[] }
    const r1 = findPending(state, items)
    expect(r1.milestone).toMatchObject({ key: 'perfect_days', threshold: 10 }) // выше порог
    const r2 = findPending(r1.nextShown, items)
    expect(r2.milestone).toMatchObject({ key: 'metric:a', threshold: 5 })
    expect(findPending(r2.nextShown, items).milestone).toBeNull()
  })
  it('ties are broken: perfect days, then metrics, then the daily note', () => {
    const r = findPending({}, [note(5), metricItem('a', 5), perfect(5)].map((i) => i))
    // первый запуск показывает лучшую одну
    expect(r.milestone?.kind).toBe('perfect_days')
    const r2 = findPending({ perfect_days: [] }, [note(5), metricItem('a', 5)])
    expect(r2.milestone?.kind).toBe('metric')
  })
  it('a broken and restarted streak can be celebrated again', () => {
    const shown = { perfect_days: [5, 10] }
    const restarted = findPending(shown, [perfect(2)])
    expect(restarted.nextShown.perfect_days).toEqual([])
    const later = findPending(restarted.nextShown, [perfect(5)])
    expect(later.milestone).toMatchObject({ key: 'perfect_days', threshold: 5 })
  })
  it('does not forget anything when the list of streaks is empty (a load glitch)', () => {
    const shown = { perfect_days: [5, 10] }
    expect(reconcileShown(shown, [])).toEqual(shown)
    expect(findPending(shown, []).nextShown).toEqual(shown)
  })
  it('weekly streaks use week thresholds', () => {
    const r = findPending({}, [metricItem('w', 4, 'w')])
    expect(r.milestone).toMatchObject({ threshold: 4, unit: 'w' })
  })
  it('silent mode (celebrations off): shows nothing but marks reached thresholds as seen', () => {
    const r = findPending({}, [perfect(31)], { silent: true })
    expect(r.milestone).toBeNull()
    expect(r.nextShown.perfect_days).toEqual([5, 10, 30])
  })
})

describe('texts', () => {
  it('picks the right week word form', () => {
    expect(unitKey(5, 'd')).toBe('dash_celebrate_unit_days')
    expect(unitKey(4, 'w')).toBe('dash_celebrate_unit_weeks_few')
    expect(unitKey(12, 'w')).toBe('dash_celebrate_unit_weeks_many')
    expect(unitKey(26, 'w')).toBe('dash_celebrate_unit_weeks_many')
    expect(unitKey(52, 'w')).toBe('dash_celebrate_unit_weeks_few')
  })
  it('message variant is stable and within range, and varies between thresholds', () => {
    const seen = new Set<number>()
    for (const th of [5, 10, 30, 50, 100, 200, 365]) {
      const i = messageIndex('perfect_days', th)
      expect(i).toBeGreaterThanOrEqual(1)
      expect(i).toBeLessThanOrEqual(4)
      expect(messageIndex('perfect_days', th)).toBe(i)
      seen.add(i)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
