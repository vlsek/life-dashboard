import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SetsCard from '../components/SetsCard.vue'
import VariationCombo from '../components/VariationCombo.vue'
import type { Metric } from './types'
import type { SetRow } from './setsBlock'

const metric = (o: Partial<Metric> = {}): Metric => ({
  id: 'm1', user_id: 'u1', name: 'Push-ups', icon: '💪', type: 'sets', unit: 'reps', goal_value: 50,
  goal_direction: 'at_least', schedule: null, category_id: null, position: 0,
  options: [{ key: 'wide', label: 'Wide grip' }], ...o,
})
const row = (o: Partial<SetRow> = {}): SetRow => ({ reps: null, variation: null, time: null, ...o })

describe('SetsCard', () => {
  it('starts collapsed with an empty message when there are no sets', () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [] } })
    expect(w.text()).toContain('Push-ups')
    expect(w.find('table').exists()).toBe(false)
    w.unmount()
  })
  it('emits change with an extra time-stamped set on add', async () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [row({ reps: 10 })] } })
    await w.findAll('button').find((b) => b.classes().includes('secondary') && b.text().length > 2)!.trigger('click')
    const next = w.emitted('change')![0][0] as SetRow[]
    expect(next).toHaveLength(2)
    expect(next[1].reps).toBeNull()
    expect(next[1].time).toMatch(/^\d\d:\d\d$/)
    w.unmount()
  })
  it('emits change with parsed reps when a value is entered', async () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [row({ reps: 10 })] } })
    const input = w.find('input[type="number"]')
    await input.setValue('15')
    await input.trigger('change')
    expect((w.emitted('change')![0][0] as SetRow[])[0].reps).toBe(15)
    w.unmount()
  })
  it('emits change without the removed set', async () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [row({ reps: 1 }), row({ reps: 2 })] } })
    await w.find('button.danger').trigger('click')
    expect((w.emitted('change')![0][0] as SetRow[]).map((s) => s.reps)).toEqual([2])
    w.unmount()
  })
})

describe('SetsCard: огонёк серии и подложка у каждого подхода (BACKLOG 18.5 / 18.4)', () => {
  it('shows the flame and the number of days next to the metric name when a streak is passed', () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [], streak: { streak: 8, todayCounted: true } } })
    expect(w.find('[data-test="metric-streak"]').text()).toBe('8')
    expect(w.text()).toContain('Push-ups')
    w.unmount()
  })
  it('a dimmed flame when today is not counted yet', () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [], streak: { streak: 3, todayCounted: false } } })
    expect(w.find('[data-test="metric-streak"]').classes()).toContain('unlit')
    w.unmount()
  })
  it('no flame without a streak', () => {
    expect(mount(SetsCard, { props: { metric: metric(), sets: [] } }).find('[data-test="metric-streak"]').exists()).toBe(false)
    expect(mount(SetsCard, { props: { metric: metric(), sets: [], streak: null } }).find('[data-test="metric-streak"]').exists()).toBe(false)
  })
  it('every set is a separate plate row inside the .sets-table', () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets: [row({ reps: 10 }), row({ reps: 12 }), row({ reps: 8 })] } })
    const table = w.find('[data-test="sets-table"]')
    expect(table.classes()).toContain('sets-table')
    expect(table.findAll('[data-test="set-row"]')).toHaveLength(3)
    w.unmount()
  })
})

describe('VariationCombo', () => {
  it('emits commit with the trimmed text on change', async () => {
    const w = mount(VariationCombo, { props: { modelValue: null, labels: ['Wide grip'] } })
    const input = w.find('input')
    await input.setValue('  diamond ')
    await input.trigger('change')
    expect(w.emitted('commit')![0]).toEqual(['diamond'])
    w.unmount()
  })
  it('suggests matching saved variations on focus and emits forget for the ✕', async () => {
    const w = mount(VariationCombo, { props: { modelValue: null, labels: ['Wide grip', 'Narrow'] } })
    await w.find('input').trigger('focus')
    await nextTick()
    // список вынесен в <body> (Teleport), а не лежит внутри компонента
    expect(w.text()).not.toContain('Wide grip')
    expect(document.body.textContent).toContain('Wide grip')
    const remove = document.body.querySelectorAll('.variation-panel button.danger')[0] as HTMLElement
    remove.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    expect(w.emitted('forget')![0]).toEqual(['Wide grip'])
    w.unmount()
  })
  it('renders the dropdown as a fixed panel outside any overflow container', async () => {
    const w = mount(VariationCombo, { props: { modelValue: null, labels: ['Wide grip'] } })
    await w.find('input').trigger('focus')
    await nextTick()
    await nextTick()
    const panel = document.body.querySelector('.variation-panel') as HTMLElement
    expect(panel.style.position).toBe('fixed')
    expect(panel.parentElement).toBe(document.body)
    w.unmount()
    expect(document.body.querySelector('.variation-panel')).toBeNull()
  })
  it('picks a saved variation with a tap (mousedown) and closes the list', async () => {
    const w = mount(VariationCombo, { props: { modelValue: null, labels: ['Wide grip', 'Narrow'] } })
    await w.find('input').trigger('focus')
    await nextTick()
    const first = document.body.querySelector('.variation-panel span') as HTMLElement
    first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    await nextTick()
    expect(w.emitted('commit')![0]).toEqual(['Wide grip'])
    expect(document.body.querySelector('.variation-panel')).toBeNull()
    w.unmount()
  })
  it('closes the list on a tap outside', async () => {
    const w = mount(VariationCombo, { props: { modelValue: null, labels: ['Wide grip'] } })
    await w.find('input').trigger('focus')
    await nextTick()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('.variation-panel')).toBeNull()
    w.unmount()
  })
})
