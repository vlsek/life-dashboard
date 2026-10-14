import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// 55.2 последний срез: мини-спарклайн за 7 дней в плашке числовой метрики; включается в «Кастомизации» (chart_sparks), по умолчанию выключен.
const db = vi.hoisted(() => ({ metrics: [] as unknown[], values: [] as unknown[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const c: any = {
        select: () => c, eq: () => c, in: () => c, order: () => c,
        range: () => Promise.resolve({ data: db.values, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'metrics' ? db.metrics : [], error: null }).then(res),
      }
      return c
    },
  },
}))

import { sparkShape, sparkWindow } from './lib/sparkline'
import { readChartSparks, writeChartSparks } from './lib/chartLine'
import { useMetricRecords } from './lib/useMetricRecords'
import { notifyDataChanged } from './lib/events'
import { addDaysIso, todayStr } from './lib/date'
import NumberMetricField from './components/NumberMetricField.vue'
import MetricSpark from './components/MetricSpark.vue'
import type { Metric } from './lib/types'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('sparkWindow / sparkShape', () => {
  it('окно в 7 дней кончается указанным днём; нет записи — null', () => {
    const m = new Map<string, number | null>([['2026-10-14', 5], ['2026-10-12', 3], ['2026-10-01', 9]])
    expect(sparkWindow(m, '2026-10-14')).toEqual([null, null, null, null, 3, null, 5])
  })
  it('меньше двух дней с данными — линии нет', () => {
    expect(sparkShape([null, 4, null])).toBeNull()
    expect(sparkShape([])).toBeNull()
  })
  it('рост рисуется снизу вверх, пропуск разрывает линию, последняя точка — у последнего значения', () => {
    const s = sparkShape([0, 10, null, 5, 10])!
    expect(s.d.match(/M/g)).toHaveLength(2)
    const [, y0] = /M2 ([\d.]+)/.exec(s.d)!
    expect(Number(y0)).toBeGreaterThan(10) // минимум внизу
    expect(s.last![0]).toBeCloseTo(62, 0)
    expect(s.last![1]).toBeLessThan(5) // максимум вверху
  })
  it('ровный ряд — по центру', () => {
    expect(sparkShape([3, 3, 3])!.last![1]).toBe(10)
  })
})

describe('настройка chart_sparks', () => {
  it('по умолчанию выключена; запоминается; мусор в хранилище = по умолчанию', () => {
    expect(readChartSparks()).toBe('off')
    expect(writeChartSparks('on')).toBe(true)
    expect(readChartSparks()).toBe('on')
    localStorage.setItem('chart_sparks', 'garbage')
    expect(readChartSparks()).toBe('off')
  })
})

describe('MetricSpark и плашка', () => {
  const metric = { id: 'w', name: 'Вода', type: 'number', unit: 'мл', icon: null, source_exercise_id: null, goal_value: null, options: null } as unknown as Metric
  const vals = [1, 2, null, 4, 3, 5, 6]
  it('есть подпись для скринридера: минимум, максимум, последнее', () => {
    const w = mount(MetricSpark, { props: { values: vals, unit: 'мл' } })
    const label = w.find('[data-test="metric-spark"]').attributes('aria-label')!
    expect(label).toContain('1 мл')
    expect(label).toContain('6 мл')
  })
  it('в плашке показывается только при включённой настройке', () => {
    expect(mount(NumberMetricField, { props: { metric, value: 6, spark: vals } }).find('[data-test="metric-spark"]').exists()).toBe(false)
    localStorage.setItem('chart_sparks', 'on')
    expect(mount(NumberMetricField, { props: { metric, value: 6, spark: vals } }).find('[data-test="metric-spark"]').exists()).toBe(true)
    expect(mount(NumberMetricField, { props: { metric, value: 6 } }).find('[data-test="metric-spark"]').exists()).toBe(false)
  })
})

describe('useMetricRecords.sparks', () => {
  function setup() {
    let api!: ReturnType<typeof useMetricRecords>
    mount(defineComponent({ setup() { api = useMetricRecords(); return () => h('div') } }))
    return api
  }
  it('ряд за 7 дней из того же запроса, что рекорды; новая запись из любого блока обновляет его сразу', async () => {
    const today = todayStr()
    db.metrics = [{ id: 'w', name: 'Вода', type: 'number', unit: 'мл', icon: null, active: true }]
    db.values = [
      { date: addDaysIso(today, -1), metric_id: 'w', value: 4 },
      { date: addDaysIso(today, -30), metric_id: 'w', value: 99 },
    ]
    const api = setup()
    await api.init('u1')
    await flushPromises()
    expect(api.sparks.value.w).toEqual([null, null, null, null, null, 4, null])
    notifyDataChanged({ metricId: 'w', date: today, value: 7 } as never)
    expect(api.sparks.value.w[6]).toBe(7)
  })
})

describe('SetsCard: мини-график метрики «подходы»', () => {
  const sets = { id: 's', name: 'Отжимания', type: 'sets', icon: null, source_exercise_id: null, goal_value: null, options: null } as unknown as Metric
  it('показывается только при включённой настройке и при наличии ряда', async () => {
    const { default: SetsCard } = await import('./components/SetsCard.vue')
    const mk = (spark?: (number | null)[]) => mount(SetsCard, { props: { metric: sets, sets: [], spark } })
    expect(mk([1, 2, 3]).find('[data-test="metric-spark"]').exists()).toBe(false)
    localStorage.setItem('chart_sparks', 'on')
    expect(mk([1, 2, 3]).find('[data-test="metric-spark"]').exists()).toBe(true)
    expect(mk().find('[data-test="metric-spark"]').exists()).toBe(false)
  })
})
