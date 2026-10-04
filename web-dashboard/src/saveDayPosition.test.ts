import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import sectionSource from './components/DailyMetricsSection.vue?raw'

// BACKLOG раздел 34 (апд33): «плашку сохранить день давай в самый низ, после самой нижней метрики, а то сейчас она в середине — это не очевидно».
// Кнопка была внутри карточки метрик, но выше блока «Подходы» — получалась посередине. Теперь — под «Подходами».
const m = (o: Record<string, unknown>) => ({ user_id: 'u', icon: null, unit: null, goal_value: null, goal_direction: null, schedule: null, position: 0, active: true, ...o })
const h = vi.hoisted(() => ({ state: null as any }))
vi.mock('./lib/useDailyMetrics', () => ({ useDailyMetrics: () => h.state }))

import DailyMetricsSection from './components/DailyMetricsSection.vue'

function setup(loaded = true) {
  h.state = {
    booleans: ref([m({ id: 'b1', name: 'Read', type: 'boolean' })]),
    numbers: ref([m({ id: 'n1', name: 'Steps', type: 'number', unit: 'k' })]),
    multiselects: ref([m({ id: 'x1', name: 'Mood', type: 'multiselect', options: [{ key: 'a', label: 'A' }] })]),
    pending: ref({}),
    items: ref([]),
    score: ref({ points: 3, total: 5 }),
    error: ref(null),
    loaded: ref(loaded),
    saving: ref(false),
    flashed: ref({}),
    load: vi.fn(), setBoolean: vi.fn(), setNumber: vi.fn(), addToNumber: vi.fn(), fixTotal: vi.fn(), toggleOpt: vi.fn(), addItem: vi.fn(), removeItem: vi.fn(),
    saveDay: vi.fn(async () => true),
  }
}
const mountSection = () => mount(DailyMetricsSection, { props: { userId: 'u1' }, global: { stubs: { SetsSection: true, PlannedSection: true } } })
const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) // b идёт после a

describe('«Сохранить день» — в самом низу блока метрик', () => {
  it('стоит ПОСЛЕ числовых, галочек, мультивыбора и блока «Подходы»', () => {
    setup()
    const w = mountSection()
    const bar = w.find('[data-test="save-day-bar"]').element
    const sets = w.find('sets-section-stub').element
    expect(follows(sets, bar)).toBe(true)
    for (const p of w.findAll('[data-test="metric-plate"]')) expect(follows(p.element, bar)).toBe(true)
    w.unmount()
  })

  it('внутри карточки с метриками кнопки больше нет', () => {
    setup()
    const w = mountSection()
    expect(w.find('.card [data-test="save-day"]').exists()).toBe(false)
    expect(w.findAll('[data-test="save-day"]')).toHaveLength(1)
    w.unmount()
  })

  it('рядом с кнопкой итог дня «Баллы», и он тоже под «Подходами»', () => {
    setup()
    const w = mountSection()
    const bar = w.find('[data-test="save-day-bar"]')
    expect(bar.text()).toContain('3 / 5')
    expect(follows(w.find('sets-section-stub').element, bar.element)).toBe(true)
    w.unmount()
  })

  it('нажатие по-прежнему сохраняет день (saveDay вызывается)', async () => {
    setup()
    const w = mountSection()
    await w.find('[data-test="save-day"]').trigger('click')
    expect(h.state.saveDay).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('пока данные грузятся, кнопки и итога нет', () => {
    setup(false)
    const w = mountSection()
    expect(w.find('[data-test="save-day-bar"]').exists()).toBe(false)
    w.unmount()
  })

  it('в шаблоне панель сохранения стоит перед списком «Что полезного сделал за день» и после «Подходов»', () => {
    const tpl = sectionSource.slice(sectionSource.indexOf('<template>'))
    const iSets = tpl.indexOf('<SetsSection')
    const iBar = tpl.indexOf('data-test="save-day-bar"')
    const iUseful = tpl.indexOf('<UsefulTodayList')
    expect(iSets).toBeGreaterThan(-1)
    expect(iSets).toBeLessThan(iBar)
    expect(iBar).toBeLessThan(iUseful)
  })
})
