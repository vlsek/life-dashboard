import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import ChartsConfigModal from '../components/ChartsConfigModal.vue'
import ChartPeriodModal from '../components/ChartPeriodModal.vue'
import ChartEditValues from '../components/ChartEditValues.vue'
import type { ChartSeries } from './chartSeries'

const series: Record<string, ChartSeries> = {
  'body:w': { label: 'Вес', unit: ' кг', color: 'var(--accent)', points: [] },
  points: { label: 'Баллы', unit: '', color: 'var(--danger)', points: [] },
  'metric:water': { label: 'Вода', unit: ' мл', color: 'var(--accent)', points: [], defaultGoal: 2000 },
}
const PERIOD = { range: 'days10' as const, from: null, to: null }

describe('ChartsConfigModal', () => {
  it('порядок, цель и удаление отражаются в эмитимом результате', async () => {
    const w = mount(ChartsConfigModal, { props: { series, entries: [{ key: 'body:w', goal: null }, { key: 'points', goal: null }], period: PERIOD } })
    await w.findAll('[data-test="down"]')[0].trigger('click') // вес вниз → баллы, вес
    await w.findAll('input[type="number"]')[0].setValue('75') // цель у первого (теперь «Баллы»)
    await w.find('[data-test="save"]').trigger('click')
    const [entries, period] = w.emitted('save')![0] as any
    expect(entries).toEqual([{ key: 'points', goal: 75 }, { key: 'body:w', goal: null }])
    expect(period).toEqual(PERIOD)
  })
  it('удаление убирает график, а его ключ появляется в списке «добавить»', async () => {
    const w = mount(ChartsConfigModal, { props: { series, entries: [{ key: 'body:w', goal: null }, { key: 'points', goal: null }], period: PERIOD } })
    expect(w.findAll('[data-test="add-select"] option').map((o) => o.text())).toEqual(['Вода'])
    await w.findAll('[data-test="remove"]')[0].trigger('click')
    expect(w.findAll('[data-test="entry"]')).toHaveLength(1)
    expect(w.findAll('[data-test="add-select"] option').map((o) => o.text())).toEqual(['Вес', 'Вода'])
  })
  it('добавление выбранной серии; плейсхолдер цели берётся из цели метрики', async () => {
    const w = mount(ChartsConfigModal, { props: { series, entries: [{ key: 'points', goal: null }], period: PERIOD } })
    await w.find('[data-test="add-select"]').setValue('metric:water')
    await w.find('[data-test="add"]').trigger('click')
    const entries = w.findAll('[data-test="entry"]')
    expect(entries).toHaveLength(2)
    expect(entries[1].find('input').attributes('placeholder')).toBe('2000')
    await w.find('[data-test="save"]').trigger('click')
    expect((w.emitted('save')![0] as any)[0].map((e: any) => e.key)).toEqual(['points', 'metric:water'])
  })
  it('пустая цель после ввода снова null', async () => {
    const w = mount(ChartsConfigModal, { props: { series, entries: [{ key: 'points', goal: 5 }], period: PERIOD } })
    await w.find('input[type="number"]').setValue('')
    await w.find('[data-test="save"]').trigger('click')
    expect((w.emitted('save')![0] as any)[0]).toEqual([{ key: 'points', goal: null }])
  })
})

describe('ChartPeriodModal', () => {
  beforeEach(() => localStorage.clear())
  it('сохраняет свой период в localStorage по ключу серии', async () => {
    const w = mount(ChartPeriodModal, { props: { seriesKey: 'body:w', shared: PERIOD } })
    expect(w.find('[data-test="reset"]').exists()).toBe(false)
    await w.find('[data-test="save"]').trigger('click')
    expect(JSON.parse(localStorage.getItem('dash_period_chart:body:w')!)).toMatchObject({ range: 'days10' })
    expect(w.emitted('applied')).toHaveLength(1)
  })
  it('со своим периодом — есть сброс, он удаляет ключ', async () => {
    localStorage.setItem('dash_period_chart:body:w', JSON.stringify({ range: 'month', from: null, to: null }))
    const w = mount(ChartPeriodModal, { props: { seriesKey: 'body:w', shared: PERIOD } })
    await w.find('[data-test="reset"]').trigger('click')
    expect(localStorage.getItem('dash_period_chart:body:w')).toBeNull()
    expect(w.emitted('applied')).toHaveLength(1)
  })
})

describe('ChartEditValues', () => {
  const points = [{ date: '2026-01-01', y: 80 }, { date: '2026-01-02', y: 79 }]
  it('список скрыт до клика; свежие даты сверху; изменение вызывает save с датой и текстом', async () => {
    const save = vi.fn(async () => null)
    const w = mount(ChartEditValues, { props: { points, unit: ' кг', save } })
    expect(w.findAll('[data-test="value-input"]')).toHaveLength(0)
    await w.find('[data-test="toggle"]').trigger('click')
    const rows = w.findAll('tr')
    expect(rows[0].text()).toContain('02.01.2026')
    expect(rows[1].text()).toContain('01.01.2026')
    await w.findAll('[data-test="value-input"]')[0].setValue('78.5')
    await w.findAll('[data-test="value-input"]')[0].trigger('change')
    expect(save).toHaveBeenCalledWith('2026-01-02', '78.5')
  })
  it('показывает ошибку сохранения', async () => {
    const w = mount(ChartEditValues, { props: { points, unit: '', save: async () => 'не сохранилось' } })
    await w.find('[data-test="toggle"]').trigger('click')
    await w.findAll('[data-test="value-input"]')[0].trigger('change')
    await flushPromises()
    expect(w.text()).toContain('не сохранилось')
  })
})

// ChartsSection целиком, с подменённым композаблом
const state = {
  series: ref<Record<string, ChartSeries>>({}),
  entries: ref<{ key: string; goal: number | null }[]>([]),
  loaded: ref(true),
  error: ref<string | null>(null),
  init: vi.fn(),
  reload: vi.fn(),
  saveEntries: vi.fn(async (_o?: unknown): Promise<string | null> => null),
  saveValue: vi.fn(async (): Promise<string | null> => null),
}
vi.mock('./useCharts', async (orig) => ({ ...(await orig<typeof import('./useCharts')>()), useCharts: () => state }))

describe('ChartsSection', () => {
  beforeEach(() => {
    localStorage.clear()
    // даты в данных фиксированные, а период по умолчанию — «последние 10 дней» от сегодня, поэтому
    // для теста берём «всё время» (иначе точки отфильтровались бы, как и в оригинале)
    localStorage.setItem('dash_period_dashboard', JSON.stringify({ range: 'all', from: null, to: null }))
    state.init.mockClear()
    state.reload.mockClear()
    state.error.value = null
    state.series.value = {
      'body:w': { label: 'Вес', unit: ' кг', color: 'var(--accent)', points: [{ date: '2026-01-01', y: 80 }, { date: '2026-01-02', y: 79 }] },
      points: { label: 'Баллы', unit: '', color: 'var(--danger)', points: [{ date: '2026-01-01', y: 3 }] },
      'body:empty': { label: 'Пусто', unit: '', color: 'var(--accent)', points: [] },
    }
    state.entries.value = [{ key: 'body:w', goal: null }, { key: 'body:empty', goal: null }, { key: 'points', goal: null }]
  })

  it('рисует только графики с данными; правка значений есть у параметра тела, но не у «баллов»', async () => {
    const { default: ChartsSection } = await import('../components/ChartsSection.vue')
    const w = mount(ChartsSection, { props: { userId: 'u1' } })
    await flushPromises()
    expect(state.init).toHaveBeenCalledWith('u1')
    const charts = w.findAll('[data-test="chart"]')
    expect(charts).toHaveLength(2)
    expect(charts[0].find('[data-test="toggle"]').exists()).toBe(true)
    expect(charts[1].find('[data-test="toggle"]').exists()).toBe(false)
    w.unmount()
  })
  it('пустой выбор и «нет данных» — разные подсказки', async () => {
    const { default: ChartsSection } = await import('../components/ChartsSection.vue')
    state.entries.value = []
    const empty = mount(ChartsSection, { props: { userId: 'u1' } })
    const emptyText = empty.text()
    empty.unmount()
    state.entries.value = [{ key: 'body:empty', goal: null }]
    const noData = mount(ChartsSection, { props: { userId: 'u1' } })
    expect(noData.text()).not.toBe(emptyText)
    expect(noData.findAll('[data-test="chart"]')).toHaveLength(0)
    noData.unmount()
  })
  it('событие «параметры тела изменились» пересобирает серии; своё событие значений — нет', async () => {
    const { default: ChartsSection } = await import('../components/ChartsSection.vue')
    const w = mount(ChartsSection, { props: { userId: 'u1' } })
    await flushPromises()
    window.dispatchEvent(new CustomEvent('dashboard:body-params-changed'))
    expect(state.reload).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new CustomEvent('dashboard:body-values-changed', { detail: { source: 'charts' } }))
    expect(state.reload).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new CustomEvent('dashboard:body-values-changed', { detail: { source: 'profile' } }))
    expect(state.reload).toHaveBeenCalledTimes(2)
    w.unmount()
    window.dispatchEvent(new CustomEvent('dashboard:body-params-changed'))
    expect(state.reload).toHaveBeenCalledTimes(2) // слушатель снят
  })
  it('ошибка сохранения настроек остаётся в модалке, она не закрывается', async () => {
    state.saveEntries.mockResolvedValueOnce('ошибка')
    const { default: ChartsSection } = await import('../components/ChartsSection.vue')
    const w = mount(ChartsSection, { props: { userId: 'u1' }, attachTo: document.body })
    await w.find('[data-test="configure"]').trigger('click')
    await document.body.querySelector<HTMLButtonElement>('.modal [data-test="save"]')!.click()
    await flushPromises()
    expect(document.body.textContent).toContain('ошибка')
    expect(document.body.querySelector('.modal')).not.toBeNull()
    w.unmount()
  })
})
