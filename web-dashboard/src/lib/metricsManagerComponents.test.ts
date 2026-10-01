import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MetricFormModal from '../components/MetricFormModal.vue'
import MetricsManagerModal from '../components/MetricsManagerModal.vue'
import IconPicker from '../components/IconPicker.vue'
import type { Metric } from './types'

function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Run', icon: '🏃', type: 'number', unit: 'km', goal_value: 5,
    goal_direction: 'at_least', schedule: null, category_id: null, position: 0, ...o }
}

describe('MetricFormModal', () => {
  it('"just record a value" disables goal, schedule, streak and import but keeps the unit', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    const dis = (sel: string) => (w.find(sel).element as HTMLInputElement).disabled
    expect(dis('[data-test="count-streak"]')).toBe(false)
    await w.find('[data-test="track-only"]').setValue(true)
    expect(dis('[data-test="count-streak"]')).toBe(true)
    expect(dis('[data-test="streak-import"]')).toBe(true)
    // порядок select: тип, направление цели, режим ввода, расписание, категория
    const selects = w.findAll('select').map((e) => (e.element as HTMLSelectElement).disabled)
    expect(selects[0]).toBe(false) // тип остаётся
    expect(selects[1]).toBe(true) // направление цели отключено
    expect(selects[2]).toBe(false) // режим ввода числа остаётся
    expect(selects[3]).toBe(true) // расписание отключено
    expect((w.find('input[type="number"]').element as HTMLInputElement).disabled).toBe(true) // значение цели
    // единица измерения остаётся активной (вес — «кг»): название и единица — первые два текстовых поля
    const texts = w.findAll('input[type="text"]').map((e) => (e.element as HTMLInputElement).disabled)
    expect(texts.slice(0, 2)).toEqual([false, false])
    // галочка серии показывается выключенной
    expect((w.find('[data-test="count-streak"]').element as HTMLInputElement).checked).toBe(false)
    w.unmount()
  })
  it('the track-only switch is offered only for a number metric', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    expect(w.find('[data-test="track-only-block"]').exists()).toBe(true)
    await w.find('select').setValue('boolean')
    await nextTick()
    expect(w.find('[data-test="track-only-block"]').exists()).toBe(false)
    w.unmount()
  })
  it('emits the track-only form on save and opens an existing track-only metric with the switch on', async () => {
    const w = mount(MetricFormModal, { props: { existing: null, categories: [] } })
    await w.find('input[type="text"]').setValue('Weight')
    await w.find('[data-test="track-only"]').setValue(true)
    await w.findAll('button').at(-1)!.trigger('click')
    expect((w.emitted('save')![0][0] as { trackOnly: boolean }).trackOnly).toBe(true)
    w.unmount()
    const e = mount(MetricFormModal, { props: { existing: metric({ unit: 'kg', goal_value: 0, count_streak: false }), categories: [] } })
    expect((e.find('[data-test="track-only"]').element as HTMLInputElement).checked).toBe(true)
    e.unmount()
  })
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
