import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 38 (апд37): настройки метрик — шестерёнка справа от заголовка «Ежедневные метрики» вместо отдельной кнопки «Метрики дня».
const h = vi.hoisted(() => ({ state: null as any, mgr: null as any }))
vi.mock('./lib/useDailyMetrics', () => ({ useDailyMetrics: () => h.state }))
vi.mock('./lib/useMetricsManager', () => ({ useMetricsManager: (onChanged: () => void) => ((h.mgr = { onChanged }), { metrics: ref([]), categories: ref([]), error: ref(null), load: vi.fn(async () => {}), addMetric: vi.fn(), editMetric: vi.fn(), deleteMetric: vi.fn() }) }))

import DailyMetricsSection from './components/DailyMetricsSection.vue'
import MetricsManagerSection from './components/MetricsManagerSection.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.state = {
    booleans: ref([]), numbers: ref([]), multiselects: ref([]), pending: ref({}), items: ref([]), score: ref({ points: 0, total: 0 }),
    error: ref(null), loaded: ref(true), saving: ref(false), flashed: ref({}),
    load: vi.fn(), setBoolean: vi.fn(), setNumber: vi.fn(), addToNumber: vi.fn(), fixTotal: vi.fn(), toggleOpt: vi.fn(), addItem: vi.fn(), removeItem: vi.fn(), saveDay: vi.fn(),
  }
})

const mountSection = (slots?: Record<string, string>) =>
  mount(DailyMetricsSection, { props: { userId: 'u1' }, slots, global: { stubs: { SetsSection: true, PlannedSection: true } } })

describe('шестерёнка в заголовке «Ежедневные метрики»', () => {
  it('значок настроек стоит в строке заголовка, с подписью для чтения с экрана, без текстовой кнопки «Метрики дня»', () => {
    const w = mountSection()
    const head = w.find('[data-test="collapse-toggle"]')
    const gear = head.find('[data-test="metrics-manager-gear"]')
    expect(gear.exists()).toBe(true)
    expect(gear.find('svg').exists()).toBe(true)
    expect(gear.attributes('aria-label')).toBe('Метрики дня')
    expect(gear.attributes('title')).toBe('Метрики дня')
    expect(gear.text()).toBe('') // только значок, без надписи
    expect(w.text()).not.toContain('⚙')
    w.unmount()
  })

  it('клик по шестерёнке открывает менеджер метрик и НЕ сворачивает блок', async () => {
    const w = mountSection()
    expect(w.find('[data-test="collapse-toggle"]').attributes('aria-expanded')).toBe('true')
    await w.find('[data-test="metrics-manager-gear"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML + w.html()).toContain('modal') // менеджер открылся
    expect(w.find('[data-test="collapse-toggle"]').attributes('aria-expanded')).toBe('true')
    w.unmount()
  })

  it('слот actions родителя (ручка перетаскивания) стоит рядом с шестерёнкой, в одной группе справа', () => {
    const w = mountSection({ actions: '<span data-test="drag-stub">drag</span>' })
    const group = w.find('[data-test="metrics-manager-gear"]').element.parentElement!
    expect(group.querySelector('[data-test="drag-stub"]')).not.toBeNull()
    expect(w.find('[data-test="collapse-toggle"]').find('[data-test="drag-stub"]').exists()).toBe(true)
    w.unmount()
  })

  it('после правки метрик блок сообщает родителю (metricsChanged), чтобы Дашборд перечитал данные', () => {
    const w = mountSection()
    h.mgr.onChanged()
    expect(w.emitted('metricsChanged')).toHaveLength(1)
    w.unmount()
  })
})

describe('MetricsManagerSection: режимы', () => {
  it('без icon — прежняя кнопка с подписью; с icon — только шестерёнка', () => {
    const a = mount(MetricsManagerSection, { props: { userId: 'u1' } })
    expect(a.find('[data-test="metrics-manager-gear"]').exists()).toBe(false)
    expect(a.find('button').text()).toContain('Метрики дня')
    const b = mount(MetricsManagerSection, { props: { userId: 'u1', icon: true } })
    expect(b.find('[data-test="metrics-manager-gear"]').exists()).toBe(true)
    expect(b.findAll('button')).toHaveLength(1)
    a.unmount()
    b.unmount()
  })
})
