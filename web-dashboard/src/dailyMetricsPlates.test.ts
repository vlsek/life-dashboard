import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import sectionSource from './components/DailyMetricsSection.vue?raw'

// BACKLOG 23 (13:25): «плашки дневных метрик — несколько параметров сливаются»: у каждого параметра своя мини-плашка.
const m = (o: Record<string, unknown>) => ({ user_id: 'u', icon: null, unit: null, goal_value: null, goal_direction: null, schedule: null, position: 0, active: true, ...o })
const h = vi.hoisted(() => ({ state: null as any }))

vi.mock('./lib/useDailyMetrics', () => ({ useDailyMetrics: () => h.state }))

import DailyMetricsSection from './components/DailyMetricsSection.vue'

function setup(opts: { numbers?: any[]; booleans?: any[]; multiselects?: any[]; pending?: Record<string, unknown> } = {}) {
  h.state = {
    booleans: ref(opts.booleans ?? []),
    numbers: ref(opts.numbers ?? []),
    multiselects: ref(opts.multiselects ?? []),
    pending: ref(opts.pending ?? {}),
    items: ref([]),
    score: ref({ points: 0, total: 0 }),
    error: ref(null),
    loaded: ref(true),
    saving: ref(false),
    flashed: ref({}), notes: ref({}),
    // у каждой функции свой мок: общий давал бы лишние вызовы (load вызывается при монтировании)
    load: vi.fn(), setBoolean: vi.fn(), setNumber: vi.fn(), addToNumber: vi.fn(), fixTotal: vi.fn(), toggleOpt: vi.fn(), addItem: vi.fn(), removeItem: vi.fn(), saveDay: vi.fn(async () => true),
  }
}
const mountSection = (streaks?: Record<string, { streak: number; todayCounted: boolean }>) =>
  mount(DailyMetricsSection, {
    props: { userId: 'u1', metricStreaks: streaks },
    global: { stubs: { SetsSection: true, PlannedSection: true } },
  })

const numbers = [m({ id: 'n1', name: 'Steps', type: 'number', unit: 'k' }), m({ id: 'n2', name: 'Water', type: 'number', unit: 'ml' })]
const booleans = [m({ id: 'b1', name: 'Read', type: 'boolean' }), m({ id: 'b2', name: 'Stretch', type: 'boolean' })]
const multiselects = [m({ id: 'x1', name: 'Mood', type: 'multiselect', options: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] })]

describe('DailyMetricsSection: mini plates', () => {
  it('every parameter (number, checkbox, multiselect) sits in its OWN plate', () => {
    setup({ numbers, booleans, multiselects })
    const w = mountSection()
    const plates = w.findAll('[data-test="metric-plate"]')
    expect(plates).toHaveLength(5)
    // в каждой плашке ровно один параметр, и это нужный
    const ids = plates.map((p) => {
      const found = p.findAll('[data-metric-id]')
      expect(found).toHaveLength(1)
      return found[0].attributes('data-metric-id')
    })
    expect(ids).toEqual(['n1', 'n2', 'b1', 'b2', 'x1'])
    w.unmount()
  })

  it('number plates live in the grid; checkbox and multiselect plates are stacked with a gap class', () => {
    setup({ numbers, booleans, multiselects })
    const w = mountSection()
    const grid = w.find('.field-grid')
    expect(grid.findAll('[data-test="metric-plate"]')).toHaveLength(2)
    const stacked = w.findAll('.metric-plate-stack')
    expect(stacked).toHaveLength(3)
    expect(stacked.every((p) => !grid.element.contains(p.element))).toBe(true)
    w.unmount()
  })

  it('draws no plates when there are no metrics', () => {
    setup()
    const w = mountSection()
    expect(w.findAll('[data-test="metric-plate"]')).toHaveLength(0)
    expect(w.find('.field-grid').exists()).toBe(false)
    w.unmount()
  })

  it('keeps the streak badge inside the plate of its metric (and only there)', () => {
    setup({ numbers, booleans })
    const w = mountSection({ b1: { streak: 7, todayCounted: false } })
    const plates = w.findAll('[data-test="metric-plate"]')
    const withBadge = plates.filter((p) => p.find('[data-test="metric-streak"]').exists())
    expect(withBadge).toHaveLength(1)
    expect(withBadge[0].find('[data-metric-id]').attributes('data-metric-id')).toBe('b1')
    expect(withBadge[0].text()).toContain('7')
    w.unmount()
  })

  it('keeps the "remaining today" marker of a metric (plate wrapper does not swallow it)', () => {
    setup({ booleans: [m({ id: 'b1', name: 'Read', type: 'boolean', schedule: { type: 'daily' } })] })
    const w = mountSection()
    const row = w.find('[data-metric-id="b1"]')
    // отмеченность/ремейнинг — класс на самом компоненте, а не на обёртке
    expect(row.element.parentElement?.getAttribute('data-test')).toBe('metric-plate')
    w.unmount()
  })

  it('checkbox clicks still reach the composable through the wrapper', async () => {
    setup({ booleans })
    const w = mountSection()
    await w.find('[data-metric-id="b2"] input[type="checkbox"]').setValue(true)
    expect(h.state.setBoolean).toHaveBeenCalledTimes(1)
    expect(h.state.setBoolean.mock.calls[0][0].id).toBe('b2')
    expect(h.state.setBoolean.mock.calls[0][1]).toBe(true)
    w.unmount()
  })

  it('styles: the plate has its own background, border and radius; the nested paddings of components are reset inside it', () => {
    const css = sectionSource.slice(sectionSource.indexOf('<style scoped>'))
    const rule = css.slice(css.indexOf('.metric-plate {'), css.indexOf('}', css.indexOf('.metric-plate {')))
    expect(rule).toContain('background:')
    expect(rule).toContain('border: 1px solid')
    expect(rule).toContain('border-radius')
    expect(css).toMatch(/\.metric-plate :deep\(\.row\),\s*\.metric-plate :deep\(\.wrap\)\s*\{\s*margin-bottom: 0/)
    // тема: цвета только через переменные темы (читается на всех четырёх темах)
    expect(rule).toContain('var(--text)')
    expect(rule).toContain('var(--bg-card)')
    expect(rule).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
})
