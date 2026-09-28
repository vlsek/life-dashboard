import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricFormModal from '../components/MetricFormModal.vue'
import MetricsManagerModal from '../components/MetricsManagerModal.vue'
import IconPicker from '../components/IconPicker.vue'
import type { Metric } from './types'

function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Run', icon: '🏃', type: 'number', unit: 'km', goal_value: 5,
    goal_direction: 'at_least', schedule: null, category_id: null, position: 0, ...o }
}

describe('MetricFormModal', () => {
  it('does not emit save with an empty name', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    await w.findAll('button').at(-1)!.trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    w.unmount()
  })
  it('emits save with the typed name and default type', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    await w.find('input[type="text"]').setValue('Reading')
    await w.findAll('button').at(-1)!.trigger('click')
    const form = w.emitted('save')![0][0] as { name: string; type: string }
    expect(form.name).toBe('Reading')
    expect(form.type).toBe('number')
    w.unmount()
  })
  it('prefills from an existing metric and disables goal fields for boolean', async () => {
    const w = mount(MetricFormModal, { props: { existing: metric(), categories: [] } })
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Run')
    await w.find('select').setValue('boolean')
    const numberInputs = w.findAll('input[type="number"]')
    expect((numberInputs[0].element as HTMLInputElement).disabled).toBe(true)
    w.unmount()
  })
  it('shows weekday buttons only for the "days" schedule', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    const before = w.findAll('button').length
    const selects = w.findAll('select')
    const scheduleSelect = selects.find((s) => s.findAll('option').some((o) => (o.element as HTMLOptionElement).value === 'days'))!
    await scheduleSelect.setValue('days')
    expect(w.findAll('button').length).toBeGreaterThan(before)
    w.unmount()
  })
})

describe('MetricsManagerModal', () => {
  it('lists metrics and emits remove', async () => {
    const w = mount(MetricsManagerModal, { props: { metrics: [metric()], categories: [], error: null } })
    expect(w.text()).toContain('Run')
    await w.find('button.danger').trigger('click')
    expect(w.emitted('remove')![0][0]).toMatchObject({ id: 'm1' })
    w.unmount()
  })
  it('shows the empty message with no metrics', () => {
    const w = mount(MetricsManagerModal, { props: { metrics: [], categories: [], error: null } })
    expect(w.find('table').exists()).toBe(false)
    w.unmount()
  })
})

describe('IconPicker', () => {
  it('emits svg: value on picking an icon, and the typed emoji as-is', async () => {
    const w = mount(IconPicker, { props: { modelValue: 'svg:pin' } })
    await w.find('button').trigger('click')
    expect((w.emitted('update:modelValue')![0][0] as string).startsWith('svg:')).toBe(true)
    const inputs = w.findAll('input')
    await inputs[1].setValue('🔥')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toBe('🔥')
    w.unmount()
  })
})
