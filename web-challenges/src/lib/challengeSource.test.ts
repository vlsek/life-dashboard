import { describe, expect, it } from 'vitest'
import {
  buildInsertCustom,
  buildUpdateFromForm,
  computeDailyStats,
  formFromChallenge,
  isMetricEntry,
  mergeMetricValues,
  metricValueToNumber,
} from './challenges'
import type { Challenge, ChallengeEntry, CustomChallengeFormInput } from './types'

const form = (over: Partial<CustomChallengeFormInput> = {}): CustomChallengeFormInput => ({
  title: '100 отжиманий', icon: '💪', type: 'daily_fixed', duration: 30, dailyTarget: 100, startValue: 0, increment: 1, unit: 'раз', targetCount: 10, itemLabel: '', ...over,
})
const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'T', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 30, daily_target: 100, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})
const entry = (date: string, value: number): ChallengeEntry => ({ id: 'e-' + date, user_id: 'u', challenge_id: 'c1', date, value, note: null, created_at: '' })

describe('metricValueToNumber', () => {
  it('numbers pass through, booleans become 1/0, sets are summed by reps', () => {
    expect(metricValueToNumber('number', 42)).toBe(42)
    expect(metricValueToNumber('boolean', true)).toBe(1)
    expect(metricValueToNumber('boolean', false)).toBe(0)
    expect(metricValueToNumber('sets', [{ reps: 10 }, { reps: 15 }, {}])).toBe(25)
    expect(metricValueToNumber('sets', 30)).toBe(30) // старый формат: обычное число до конвертации в подходы
  })
  it('anything unusable is null', () => {
    expect(metricValueToNumber('number', null)).toBeNull()
    expect(metricValueToNumber('number', 'x')).toBeNull()
    expect(metricValueToNumber('multiselect', ['a'])).toBeNull()
    expect(metricValueToNumber('number', Number.NaN)).toBeNull()
  })
})

describe('mergeMetricValues', () => {
  it('fills days without a manual entry from the metric; the manual entry always wins', () => {
    const merged = mergeMetricValues(ch(), [entry('2026-09-02', 7)], { '2026-09-01': 100, '2026-09-02': 100, '2026-09-03': 30 })
    const byDate = Object.fromEntries(merged.map((e) => [e.date, e.value]))
    expect(byDate).toEqual({ '2026-09-01': 100, '2026-09-02': 7, '2026-09-03': 30 })
    expect(merged.filter(isMetricEntry).map((e) => e.date)).toEqual(['2026-09-01', '2026-09-03'])
    expect(isMetricEntry(entry('2026-09-02', 7))).toBe(false)
  })
  it('feeds the existing stats: metric days count toward the target', () => {
    const merged = mergeMetricValues(ch(), [], { '2026-09-01': 100, '2026-09-02': 99 })
    const stats = computeDailyStats(ch(), merged, '2026-09-03')
    expect(stats.completedCount).toBe(1)
    expect(stats.doneDays[1].value).toBe(99)
  })
  it('daily_boolean: any positive metric value means done', () => {
    const b = ch({ type: 'daily_boolean', daily_target: null })
    const merged = mergeMetricValues(b, [], { '2026-09-01': 3, '2026-09-02': 0 })
    expect(Object.fromEntries(merged.map((e) => [e.date, e.value]))).toEqual({ '2026-09-01': 1, '2026-09-02': 0 })
  })
  it('does nothing for cumulative challenges or without metric values', () => {
    const entries = [entry('2026-09-01', 1)]
    expect(mergeMetricValues(ch({ type: 'cumulative_count' }), entries, { '2026-09-01': 5 })).toBe(entries)
    expect(mergeMetricValues(ch(), entries, {})).toBe(entries)
  })
})

describe('builders and the missing source_metric_id column', () => {
  it('insert has no source_metric_id unless a source is chosen (so it works before migration 032)', () => {
    expect('source_metric_id' in buildInsertCustom(form())).toBe(false)
    expect('source_metric_id' in buildInsertCustom(form({ sourceMetricId: '' }))).toBe(false)
    expect(buildInsertCustom(form({ sourceMetricId: 'm1' })).source_metric_id).toBe('m1')
  })
  it('a cumulative challenge never gets a source', () => {
    expect('source_metric_id' in buildInsertCustom(form({ type: 'cumulative_count', sourceMetricId: 'm1' }))).toBe(false)
  })
  it('update: sets the source; clearing it sends null only when the column exists on the row', () => {
    expect(buildUpdateFromForm(form({ sourceMetricId: 'm2' }), 'daily_fixed', ch({ source_metric_id: 'm1' })).source_metric_id).toBe('m2')
    expect(buildUpdateFromForm(form({ sourceMetricId: '' }), 'daily_fixed', ch({ source_metric_id: 'm1' })).source_metric_id).toBeNull()
    expect(buildUpdateFromForm(form({ sourceMetricId: '' }), 'daily_fixed', ch({ source_metric_id: null })).source_metric_id).toBeNull()
    // колонки у записи нет (миграция не применена) — поле не отправляем вовсе
    expect('source_metric_id' in buildUpdateFromForm(form({ sourceMetricId: '' }), 'daily_fixed', ch())).toBe(false)
  })
  it('formFromChallenge carries the source into the edit form', () => {
    expect(formFromChallenge(ch({ source_metric_id: 'm1' })).sourceMetricId).toBe('m1')
    expect(formFromChallenge(ch()).sourceMetricId).toBe('')
  })
})
