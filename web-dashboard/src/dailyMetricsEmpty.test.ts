import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 38 (апд37): настройки метрик — шестерёнка справа от заголовка «Ежедневные метрики» вместо отдельной кнопки «Метрики дня».
const h = vi.hoisted(() => ({ state: null as any, mgr: null as any }))
vi.mock('./lib/useDailyMetrics', () => ({ useDailyMetrics: () => h.state }))
vi.mock('./lib/useMetricsManager', () => ({ useMetricsManager: (onChanged: () => void) => ((h.mgr = { onChanged }), { metrics: ref([]), categories: ref([]), error: ref(null), load: vi.fn(async () => {}), addMetric: vi.fn(), editMetric: vi.fn(), deleteMetric: vi.fn() }) }))

import DailyMetricsSection from './components/DailyMetricsSection.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.state = {
    booleans: ref([]), numbers: ref([]), multiselects: ref([]), pending: ref({}), items: ref([]), score: ref({ points: 0, total: 0 }),
    error: ref(null), loaded: ref(true), saving: ref(false), flashed: ref({}), notes: ref({}),
    load: vi.fn(), setBoolean: vi.fn(), setNumber: vi.fn(), addToNumber: vi.fn(), fixTotal: vi.fn(), toggleOpt: vi.fn(), addItem: vi.fn(), removeItem: vi.fn(), saveDay: vi.fn(),
  }
})

const mountSection = (slots?: Record<string, string>) =>
  mount(DailyMetricsSection, { props: { userId: 'u1' }, slots, global: { stubs: { SetsSection: true, PlannedSection: true } } })

describe('пустое состояние «Ежедневных метрик»', () => {
  it('без метрик — карточка с подсказкой и кнопкой «Метрики дня», открывающей менеджер', async () => {
    const w = mountSection()
    const empty = w.find('[data-test="daily-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('Пока нет метрик дня')
    const btn = empty.find('button')
    expect(btn.text()).toContain('Метрики дня')
    await btn.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML + w.html()).toContain('modal')
    w.unmount()
  })

  it('с метриками карточки нет', () => {
    h.state.booleans.value = [{ id: 'b1', name: 'Зарядка', type: 'boolean' }]
    const w = mountSection()
    expect(w.find('[data-test="daily-empty"]').exists()).toBe(false)
    w.unmount()
  })
})

