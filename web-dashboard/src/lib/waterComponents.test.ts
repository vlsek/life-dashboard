import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterBadge from '../components/WaterBadge.vue'
import WaterModal from '../components/WaterModal.vue'
import type { Metric } from './types'

// Отдельный файл (не smoke.test.ts) — блок «Вода» переносится параллельно с другими блоками
// Дашборда (см. ROADMAP.md), так меньше риск столкнуться правками в одном файле тестов.

describe('WaterBadge', () => {
  it('renders the current/norm amount without throwing', () => {
    const wrapper = mount(WaterBadge, { props: { currentMl: 500, normMl: 2000 } })
    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('2000')
    wrapper.unmount()
  })

  it('emits click when pressed', async () => {
    const wrapper = mount(WaterBadge, { props: { currentMl: 500, normMl: 2000 } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    wrapper.unmount()
  })
})

function waterMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Water',
    icon: '💧',
    type: 'number',
    unit: 'мл',
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...overrides,
  }
}

describe('WaterModal', () => {
  it('mounts without throwing and shows the current/norm amount', () => {
    const wrapper = mount(WaterModal, {
      props: {
        metric: waterMetric(),
        currentMl: 500,
        normMl: 2000,
        autoNormMl: null,
        weightKg: null,
        getMlForDate: async () => 0,
      },
    })
    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('2000')
    wrapper.unmount()
  })

  it('emits add with the +200ml quick button', async () => {
    const wrapper = mount(WaterModal, {
      props: {
        metric: waterMetric(),
        currentMl: 500,
        normMl: 2000,
        autoNormMl: null,
        weightKg: null,
        getMlForDate: async () => 0,
      },
    })
    const btn = wrapper.findAll('button').find((b) => b.text().includes('200'))
    await btn?.trigger('click')
    expect(wrapper.emitted('add')?.[0]).toEqual([200, expect.any(String), undefined]) // третий аргумент — время; пока его не выбрали, undefined (решает useWater)
    wrapper.unmount()
  })

  it('emits saveGoal with the entered value', async () => {
    const wrapper = mount(WaterModal, {
      props: {
        metric: waterMetric(),
        currentMl: 500,
        normMl: 2000,
        autoNormMl: null,
        weightKg: null,
        getMlForDate: async () => 0,
      },
    })
    const input = wrapper.find('input[type="number"]')
    await input.setValue(2500)
    await wrapper.find('[data-test="change-goal"]').trigger('click')
    expect(wrapper.emitted('saveGoal')).toEqual([[2500]])
    wrapper.unmount()
  })
})
