import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SavedTick from './components/SavedTick.vue'
import tickSource from './components/SavedTick.vue?raw'
import rawSection from './components/DailyMetricsSection.vue?raw'

// BACKLOG 23:25 / 815: небольшая ненавязчивая анимация «значение сохранено». Срез 1 — ежедневные метрики Дашборда.
const m = (o: Record<string, unknown>) => ({ user_id: 'u', icon: null, unit: null, goal_value: null, goal_direction: null, schedule: null, position: 0, active: true, ...o })
const h = vi.hoisted(() => ({ state: null as any }))
vi.mock('./lib/useDailyMetrics', () => ({ useDailyMetrics: () => h.state }))
import DailyMetricsSection from './components/DailyMetricsSection.vue'

const numbers = [m({ id: 'n1', name: 'Steps', type: 'number' }), m({ id: 'n2', name: 'Water', type: 'number' })]
const booleans = [m({ id: 'b1', name: 'Read', type: 'boolean' })]
const multiselects = [m({ id: 'x1', name: 'Mood', type: 'multiselect', options: [{ key: 'a', label: 'A' }] })]

function setup(flashed: Record<string, boolean> = {}) {
  h.state = {
    booleans: ref(booleans), numbers: ref(numbers), multiselects: ref(multiselects), pending: ref({}), items: ref([]), score: ref({ points: 0, total: 0 }),
    error: ref(null), loaded: ref(true), saving: ref(false), flashed: ref(flashed), notes: ref({}),
    load: vi.fn(), setBoolean: vi.fn(), setNumber: vi.fn(), addToNumber: vi.fn(), fixTotal: vi.fn(), toggleOpt: vi.fn(), addItem: vi.fn(), removeItem: vi.fn(), saveDay: vi.fn(async () => true),
  }
  return mount(DailyMetricsSection, { props: { userId: 'u1' }, global: { stubs: { SetsSection: true, PlannedSection: true } } })
}

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('SavedTick', () => {
  it('показывается только при show=true, с вежливой подписью «Сохранено» для скринридеров', () => {
    expect(mount(SavedTick, { props: { show: false } }).find('[data-test="saved-tick"]').exists()).toBe(false)
    const w = mount(SavedTick, { props: { show: true } })
    const tick = w.find('[data-test="saved-tick"]')
    expect(tick.exists()).toBe(true)
    expect(tick.attributes('role')).toBe('status')
    expect(tick.attributes('aria-live')).toBe('polite')
    expect(tick.text()).toBe('Сохранено')
    expect(tick.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('на английском подпись «Saved»', () => {
    localStorage.setItem('site_lang', 'en')
    expect(mount(SavedTick, { props: { show: true } }).text()).toBe('Saved')
  })

  it('движение выключается: reduced-motion и общий выключатель анимаций', () => {
    expect(tickSource).toContain('prefers-reduced-motion: reduce')
    expect(tickSource).toContain("html[data-motion='off']")
    expect(tickSource).toContain('animation: none')
  })

  it('галочка не перехватывает клики и стоит в углу плашки', () => {
    expect(tickSource).toContain('pointer-events: none')
    expect(tickSource).toContain('position: absolute')
  })
})

describe('DailyMetricsSection: «сохранено» на плашках', () => {
  const plate = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-metric-id="${id}"]`).element.closest('[data-test="metric-plate"]') as HTMLElement

  it('пока ничего не сохраняли — ни галочек, ни подсветки', () => {
    const w = setup()
    expect(w.findAll('[data-test="saved-tick"]')).toHaveLength(0)
    expect(w.findAll('.metric-plate-saved')).toHaveLength(0)
    w.unmount()
  })

  it('сохранилось число — галочка и подсветка только у его плашки, у соседних нет', () => {
    const w = setup({ n1: true })
    expect(plate(w, 'n1').querySelector('[data-test="saved-tick"]')).not.toBeNull()
    expect(plate(w, 'n1').classList.contains('metric-plate-saved')).toBe(true)
    for (const id of ['n2', 'b1', 'x1']) {
      expect(plate(w, id).querySelector('[data-test="saved-tick"]'), id).toBeNull()
      expect(plate(w, id).classList.contains('metric-plate-saved'), id).toBe(false)
    }
    w.unmount()
  })

  it('то же для флажка и для мультивыбора (раньше у них сигнала не было)', () => {
    const w = setup({ b1: true, x1: true })
    expect(plate(w, 'b1').querySelector('[data-test="saved-tick"]')).not.toBeNull()
    expect(plate(w, 'x1').querySelector('[data-test="saved-tick"]')).not.toBeNull()
    expect(w.findAll('[data-test="saved-tick"]')).toHaveLength(2)
    w.unmount()
  })

  it('сигнал приходит от подтверждённой записи (flashed), а не от самого ввода: без записи подсветки нет', async () => {
    const w = setup()
    await w.find('[data-metric-id="n1"] input').setValue('5')
    expect(w.findAll('[data-test="saved-tick"]')).toHaveLength(0)
    h.state.flashed.value = { n1: true }
    await w.vm.$nextTick()
    expect(w.findAll('[data-test="saved-tick"]')).toHaveLength(1)
    h.state.flashed.value = {}
    await w.vm.$nextTick()
    expect(w.findAll('[data-test="saved-tick"]')).toHaveLength(0)
    w.unmount()
  })

  it('стили плашки: вспышка рамки, отключается reduced-motion и data-motion=off; плашка position: relative', () => {
    const css = rawSection.slice(rawSection.indexOf('<style'))
    expect(css).toMatch(/\.metric-plate \{[^}]*position: relative/)
    expect(css).toContain('@keyframes metric-plate-saved')
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.metric-plate-saved \{ animation: none/)
    expect(css).toContain("html[data-motion='off']) .metric-plate-saved")
  })

  it('логика записи не тронута: в useDailyMetrics flash вызывается только после успешной записи', async () => {
    const src: string = (await import('./lib/useDailyMetrics.ts?raw')).default
    const body = src.slice(src.indexOf('async function autoSave'), src.indexOf('const setBoolean'))
    expect(body.indexOf('if (err)')).toBeLessThan(body.indexOf('flash(m.id)'))
    expect(body.slice(body.indexOf('if (err)'), body.indexOf('error.value = null'))).toContain('return false')
  })
})
