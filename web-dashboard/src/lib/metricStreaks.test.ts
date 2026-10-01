import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { metricStreakMap } from './metricStreaks'
import { computeStreakItemsPure, type StreakItem } from './streaks'
import MetricStreakBadge from '../components/MetricStreakBadge.vue'
import BooleanMetricRow from '../components/BooleanMetricRow.vue'
import NumberMetricField from '../components/NumberMetricField.vue'
import MultiselectMetric from '../components/MultiselectMetric.vue'
import type { Metric } from './types'

const metric = (over: Partial<Metric> = {}): Metric =>
  ({ id: 'm1', name: 'Зарядка', icon: '🔥', type: 'boolean', goal_value: null, goal_direction: 'at_least', unit: '', options: [], position: 0, active: true, schedule: null, ...over }) as Metric

const item = (m: Metric, over: Partial<StreakItem> = {}): StreakItem => ({ kind: 'metric', metric: m, streak: 5, todayCounted: true, ...over })

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('metricStreakMap (BACKLOG 18.5)', () => {
  it('maps only per-metric items by metric id', () => {
    const a = metric({ id: 'a' })
    const map = metricStreakMap([{ kind: 'perfect_days', streak: 9, todayCounted: true }, item(a, { streak: 4 }), { kind: 'note_filled', streak: 2, todayCounted: false }])
    expect(map).toEqual({ a: { streak: 4, unit: undefined, todayCounted: true } })
  })
  it('keeps the weekly unit and the "not counted today" flag', () => {
    const map = metricStreakMap([item(metric({ id: 'w' }), { streak: 3, unit: 'w', todayCounted: false })])
    expect(map.w).toEqual({ streak: 3, unit: 'w', todayCounted: false })
  })
  it('skips zero streaks and items without a metric', () => {
    expect(metricStreakMap([item(metric({ id: 'z' }), { streak: 0 }), { kind: 'metric', streak: 3, todayCounted: true }])).toEqual({})
  })
  it('a metric with "count streak" switched off never gets a flame (it is not in the computed streaks at all)', () => {
    const on = metric({ id: 'on', count_streak: true })
    const off = metric({ id: 'off', count_streak: false })
    const today = new Date(2026, 9, 1)
    const byDay = { '2026-10-01': { on: true, off: true }, '2026-09-30': { on: true, off: true }, '2026-09-29': { on: true, off: true } }
    const map = metricStreakMap(computeStreakItemsPure([on, off], byDay, new Set(), today))
    expect(map.on?.streak).toBe(3)
    expect(map.off).toBeUndefined()
  })
})

describe('MetricStreakBadge', () => {
  it('shows the flame and the number of days', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 12, todayCounted: true } } })
    expect(w.text()).toBe('12')
    expect(w.find('svg').exists()).toBe(true)
    expect(w.classes()).not.toContain('unlit')
    expect(w.attributes('title')).toBe('')
  })
  it('is dimmed with a hint when today is not counted yet', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 7, todayCounted: false } } })
    expect(w.classes()).toContain('unlit')
    expect(w.attributes('title')).toBe('сегодня не сделано')
  })
  it('weekly streaks carry the unit', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 4, unit: 'w', todayCounted: true } } })
    expect(w.text()).toBe('4 нед.')
  })
})

describe('the badge sits next to the metric name in every row type', () => {
  const info = { streak: 6, todayCounted: true }
  it('boolean', () => {
    const w = mount(BooleanMetricRow, { props: { metric: metric(), checked: false, streak: info } })
    expect(w.find('[data-test="metric-streak"]').text()).toBe('6')
    expect(w.text()).toContain('Зарядка')
  })
  it('number', () => {
    const w = mount(NumberMetricField, { props: { metric: metric({ type: 'number', name: 'Шаги' }), value: 10, streak: info } })
    expect(w.find('[data-test="metric-streak"]').text()).toBe('6')
  })
  it('multiselect', () => {
    const w = mount(MultiselectMetric, { props: { metric: metric({ type: 'multiselect', options: [{ key: 'a', label: 'A' }] }), selected: [], streak: info } })
    expect(w.find('[data-test="metric-streak"]').text()).toBe('6')
  })
  it('no badge without a streak', () => {
    expect(mount(BooleanMetricRow, { props: { metric: metric(), checked: false } }).find('[data-test="metric-streak"]').exists()).toBe(false)
    expect(mount(BooleanMetricRow, { props: { metric: metric(), checked: false, streak: null } }).find('[data-test="metric-streak"]').exists()).toBe(false)
  })
})
