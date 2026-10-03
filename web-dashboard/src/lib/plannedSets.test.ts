import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MetricFormModal from '../components/MetricFormModal.vue'
import MetricsManagerModal from '../components/MetricsManagerModal.vue'
import { currentPlannedSets, isMetricDone, plannedSetsFor, plannedSetsLog, setsCount } from './metrics'
import { buildInsertRow, buildUpdateRow, emptyForm, fieldsEnabledForForm, formFromMetric, parsePlannedSets, plannedSetsFields } from './metricsManager'
import { pointsPerDaySeries } from './points-series'
import { pointsDelta } from './pointsFloat'
import { dayScore, isRemaining } from './daily'
import { remainingMetricsToday } from './evening'
import type { Metric, PlannedSetsEntry } from './types'

// BACKLOG 4.2 «Не меньше X подходов» + раздел 13: параметр метрики «сколько подходов планируется в день» (миграция 041).
// Ключевое решение владельца 2026-10-03: прошлые дни НЕ пересчитываем — правило действует с даты из журнала planned_sets_log.

function sets(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Pushups', icon: null, type: 'sets', unit: null, goal_value: 0,
    goal_direction: 'at_least', schedule: null, category_id: null, position: 0, ...o }
}
const rep = (n: number) => ({ reps: n })
const three = [rep(10), rep(10), rep(10)]
const log = (...e: [string, number | null][]): PlannedSetsEntry[] => e.map(([from, n]) => ({ from, n }))

describe('setsCount', () => {
  it('counts sets with reps or time, not empty placeholders', () => {
    expect(setsCount([rep(5), rep(0), {}, { time: '01:00' }, { reps: 3, weight: 20 }])).toBe(3)
    expect(setsCount(null)).toBe(0)
    expect(setsCount(7 as any)).toBe(0)
  })
})

describe('plannedSetsFor / plannedSetsLog', () => {
  const m = sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4], ['2026-10-20', null]) })
  it('picks the entry in force on the given day, null before the first entry and after the parameter was removed', () => {
    expect(plannedSetsFor(m, '2026-09-30')).toBeNull()
    expect(plannedSetsFor(m, '2026-10-01')).toBe(3)
    expect(plannedSetsFor(m, '2026-10-09')).toBe(3)
    expect(plannedSetsFor(m, '2026-10-10')).toBe(4)
    expect(plannedSetsFor(m, '2026-10-19')).toBe(4)
    expect(plannedSetsFor(m, '2026-10-20')).toBeNull()
  })
  it('without a date it is the value in force now (last entry)', () => {
    expect(plannedSetsFor(sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4]) }))).toBe(4)
    expect(currentPlannedSets(sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4]) }))).toBe(4)
    expect(currentPlannedSets(m)).toBeNull()
  })
  it('does not apply to other types or to the "at most" direction', () => {
    const l = log(['2026-10-01', 3])
    expect(plannedSetsFor(sets({ type: 'number', planned_sets_log: l }), '2026-10-05')).toBeNull()
    expect(plannedSetsFor(sets({ goal_direction: 'at_most', planned_sets_log: l }), '2026-10-05')).toBeNull()
  })
  it('survives dirty data and unsorted entries', () => {
    const dirty = sets({ planned_sets_log: [{ from: '2026-10-10', n: 4 }, { from: 'bad', n: 9 }, null as any, { from: '2026-10-01', n: 3 }] })
    expect(plannedSetsLog(dirty)).toEqual(log(['2026-10-01', 3], ['2026-10-10', 4]))
    expect(plannedSetsFor(sets({ planned_sets_log: 'oops' as any }), '2026-10-05')).toBeNull()
    expect(plannedSetsFor(sets({ planned_sets_log: log(['2026-10-01', 0]) }), '2026-10-05')).toBeNull()
  })
})

describe('isMetricDone with a planned number of sets', () => {
  const m = sets({ goal_value: 0, planned_sets_log: log(['2026-10-05', 3]) })
  it('needs N sets from the date the parameter was set', () => {
    expect(isMetricDone(m, [rep(10), rep(10)], '2026-10-05')).toBe(false)
    expect(isMetricDone(m, three, '2026-10-05')).toBe(true)
    expect(isMetricDone(m, three, '2026-10-06')).toBe(true)
  })
  it('PAST days keep the old rule: one big set is still done before the parameter existed', () => {
    const oneBig = [rep(30)]
    expect(isMetricDone(sets({ goal_value: 30, planned_sets_log: log(['2026-10-05', 3]) }), oneBig, '2026-10-04')).toBe(true)
    expect(isMetricDone(sets({ goal_value: 30, planned_sets_log: log(['2026-10-05', 3]) }), oneBig, '2026-10-05')).toBe(false)
  })
  it('both conditions apply when a total volume is set too', () => {
    const both = sets({ goal_value: 50, planned_sets_log: log(['2026-10-01', 3]) })
    expect(isMetricDone(both, three, '2026-10-02')).toBe(false) // 3 подхода, но 30 < 50
    expect(isMetricDone(both, [rep(20), rep(20), rep(20)], '2026-10-02')).toBe(true)
    expect(isMetricDone(both, [rep(60)], '2026-10-02')).toBe(false) // 60 >= 50, но подход один
  })
  it('changing N later does not rewrite earlier days', () => {
    const changed = sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4]) })
    expect(isMetricDone(changed, three, '2026-10-09')).toBe(true) // тогда нужно было 3
    expect(isMetricDone(changed, three, '2026-10-10')).toBe(false) // теперь нужно 4
  })
  it('without a parameter nothing changes (including when no date is passed)', () => {
    expect(isMetricDone(sets({ goal_value: 20 }), [rep(25)], '2026-10-05')).toBe(true)
    expect(isMetricDone(sets({ goal_value: 20 }), [rep(25)])).toBe(true)
    expect(isMetricDone(sets({ goal_value: 20 }), [rep(5)])).toBe(false)
  })
  it('a sets metric of the "at most" direction ignores the plan', () => {
    const am = sets({ goal_direction: 'at_most', goal_value: 40, planned_sets_log: log(['2026-10-01', 5]) })
    expect(isMetricDone(am, [rep(10)], '2026-10-05')).toBe(true)
  })
})

describe('dates are passed through to everything that counts past days', () => {
  const m = sets({ goal_value: 0, planned_sets_log: log(['2026-10-05', 3]) })
  const one = [rep(10)]
  it('pointsPerDaySeries (chart): old day counts, new day does not', () => {
    const s = pointsPerDaySeries([m], [
      { date: '2026-10-04', metric_id: 'm1', value: one as any },
      { date: '2026-10-06', metric_id: 'm1', value: one as any },
    ])
    expect(s.map((p) => p.y)).toEqual([1, 0])
  })
  it('dayScore / isRemaining / remainingMetricsToday use the day', () => {
    expect(dayScore([m], { m1: one as any }, '2026-10-04').points).toBe(1)
    expect(dayScore([m], { m1: one as any }, '2026-10-06').points).toBe(0)
    expect(isRemaining(m, '2026-10-04', one as any)).toBe(false)
    expect(isRemaining(m, '2026-10-06', one as any)).toBe(true)
    expect(remainingMetricsToday([m], { m1: one as any }, '2026-10-06')).toHaveLength(1)
  })
  it('pointsDelta: the third set earns the point only under the plan', () => {
    expect(pointsDelta(m, [rep(10), rep(10)] as any, three as any, '2026-10-06')).toBe(1)
    expect(pointsDelta(m, [rep(10), rep(10)] as any, three as any, '2026-10-04')).toBe(0)
  })
})

describe('form: parsePlannedSets / fieldsEnabledForForm / plannedSetsFields', () => {
  const f = { ...emptyForm(), name: 'X', type: 'sets' as const, plannedSets: '3' }
  it('parses a whole number 1..50, anything else is "not set"', () => {
    expect(parsePlannedSets('3')).toBe(3)
    expect(parsePlannedSets('2.9')).toBe(2)
    expect(parsePlannedSets('999')).toBe(50)
    for (const bad of ['', '  ', '0', '-2', 'abc', null, undefined]) expect(parsePlannedSets(bad as any)).toBeNull()
  })
  it('the field is available only for sets and not for the "at most" direction', () => {
    expect(fieldsEnabledForForm({ type: 'sets', trackOnly: false }).plannedSets).toBe(true)
    expect(fieldsEnabledForForm({ type: 'sets', trackOnly: false, goalDirection: 'at_most' }).plannedSets).toBe(false)
    expect(fieldsEnabledForForm({ type: 'number', trackOnly: false }).plannedSets).toBe(false)
  })
  it('a new metric gets a one-entry log starting today; unset writes nothing', () => {
    expect(plannedSetsFields(f, null, '2026-10-03')).toEqual({ planned_sets_log: log(['2026-10-03', 3]) })
    expect(plannedSetsFields({ ...f, plannedSets: '' }, null, '2026-10-03')).toEqual({})
  })
  it('existing metric: unchanged value writes nothing, changed value appends an entry and keeps history', () => {
    const existing = sets({ planned_sets_log: log(['2026-10-01', 3]) })
    expect(plannedSetsFields(f, existing, '2026-10-10')).toEqual({})
    expect(plannedSetsFields({ ...f, plannedSets: '4' }, existing, '2026-10-10')).toEqual({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4]) })
    // снятие параметра — запись с null (прошлое остаётся)
    expect(plannedSetsFields({ ...f, plannedSets: '' }, existing, '2026-10-10')).toEqual({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', null]) })
  })
  it('a second edit on the same day replaces that day\'s entry instead of piling up', () => {
    const existing = sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4]) })
    expect(plannedSetsFields({ ...f, plannedSets: '5' }, existing, '2026-10-10')).toEqual({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 5]) })
  })
  it('without the column (migration 041 not applied) nothing is ever written', () => {
    expect(plannedSetsFields(f, sets())).toEqual({})
    expect('planned_sets_log' in buildUpdateRow(f, sets(), null)).toBe(false)
  })
  it('switching the type away from sets clears the parameter; the form shows the current value', () => {
    const existing = sets({ planned_sets_log: log(['2026-10-01', 3]) })
    expect(plannedSetsFields({ ...f, type: 'number' }, existing, '2026-10-10')).toEqual({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', null]) })
    expect(formFromMetric(existing).plannedSets).toBe('3')
    expect(formFromMetric(sets()).plannedSets).toBe('')
  })
  it('insert/update rows carry the log', () => {
    expect(buildInsertRow(f, 'u1', 0, null).planned_sets_log).toEqual(log([expect.any(String) as any, 3]))
    expect(buildUpdateRow({ ...f, plannedSets: '4' }, sets({ planned_sets_log: null }), null).planned_sets_log).toHaveLength(1)
  })
})

describe('MetricFormModal: planned sets field', () => {
  const field = '[data-test="planned-sets"]'
  it('hidden for a non-sets type and when the column is not available', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [], plannedSetsAvailable: true } })
    expect(w.find(field).exists()).toBe(false) // тип по умолчанию — число
    await w.findAll('select')[0].setValue('sets')
    await nextTick()
    expect(w.find(field).exists()).toBe(true)
    w.unmount()
    const noCol = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    await noCol.findAll('select')[0].setValue('sets')
    await nextTick()
    expect(noCol.find(field).exists()).toBe(false)
    noCol.unmount()
  })
  it('for an existing metric depends on the column being present on it; opens with the current value and emits the typed one', async () => {
    const w = mount(MetricFormModal, { props: { existing: sets({ planned_sets_log: log(['2026-10-01', 3]) }), categories: [] } })
    const input = w.find(field)
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('3')
    await input.setValue('5')
    const buttons = w.findAll('button')
    const saveBtn = buttons.find((b) => /save|сохран/i.test(b.text()))!
    await saveBtn.trigger('click')
    const saved = w.emitted('save')![0][0] as { plannedSets: string }
    expect(saved.plannedSets).toBe('5')
    w.unmount()
    const without = mount(MetricFormModal, { props: { existing: sets(), categories: [] } })
    expect(without.find(field).exists()).toBe(false)
    without.unmount()
  })
  it('the manager passes "column exists" to the form when any metric already has it', async () => {
    const w = mount(MetricsManagerModal, { props: { metrics: [sets({ planned_sets_log: null })], categories: [], error: null } })
    const addBtn = w.findAll('button').find((b) => /add|добав|\+/i.test(b.text()))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')
    await w.findAll('select')[0].setValue('sets')
    await nextTick()
    expect(w.find(field).exists()).toBe(true)
    w.unmount()
  })
})
