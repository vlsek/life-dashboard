import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const db = vi.hoisted(() => ({
  metrics: [] as unknown[],
  values: [] as unknown[],
  metricsError: null as null | { message: string },
  valuesError: null as null | { message: string },
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const c: any = {
        select: () => c,
        eq: () => c,
        in: () => c,
        order: () => c,
        range: () => Promise.resolve({ data: db.values, error: db.valuesError }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'metrics' ? db.metrics : [], error: db.metricsError }).then(res),
      }
      return c
    },
  },
}))

import { useMetricRecords } from './useMetricRecords'
import { notifyDataChanged } from './events'

const water = { id: 'w', name: 'Вода', type: 'number', unit: 'мл', icon: null, active: true }
const pushups = { id: 's', name: 'Отжимания', type: 'sets', icon: null, active: true }

function setup() {
  let api!: ReturnType<typeof useMetricRecords>
  const w = mount(defineComponent({ setup() { api = useMetricRecords(); return () => h('div') } }))
  return { api, w }
}

beforeEach(() => {
  db.metrics = [water, pushups]
  db.values = []
  db.metricsError = null
  db.valuesError = null
})

describe('useMetricRecords', () => {
  it('рекорд числовой метрики — максимум за день; подходов — максимум суммы повторений за день', async () => {
    db.values = [
      { date: '2026-01-01', metric_id: 'w', value: 1800 },
      { date: '2026-01-02', metric_id: 'w', value: 2600 },
      { date: '2026-01-03', metric_id: 'w', value: 2000 },
      { date: '2026-01-01', metric_id: 's', value: [{ reps: 10 }, { reps: 8 }] },
      { date: '2026-01-02', metric_id: 's', value: [{ reps: 15 }, { reps: 12 }, { reps: 5 }] },
    ]
    const { api, w } = setup()
    await api.init('u1')
    expect(api.records.value).toEqual({ w: { y: 2600, date: '2026-01-02' }, s: { y: 32, date: '2026-01-02' } })
    w.unmount()
  })

  it('метрика без положительных значений рекорда не получает', async () => {
    db.values = [{ date: '2026-01-01', metric_id: 'w', value: 0 }]
    const { api, w } = setup()
    await api.init('u1')
    expect(api.records.value).toEqual({})
    w.unmount()
  })

  it('новое значение из любого блока страницы (событие данных) обновляет рекорд сразу; меньшее — нет; чужая метрика — нет', async () => {
    db.values = [{ date: '2026-01-01', metric_id: 'w', value: 2000 }]
    const { api, w } = setup()
    await api.init('u1')
    notifyDataChanged({ source: 'water', metricId: 'w', date: '2026-02-01', value: 3000 })
    expect(api.records.value.w).toEqual({ y: 3000, date: '2026-02-01' })
    notifyDataChanged({ source: 'water', metricId: 'w', date: '2026-02-02', value: 100 })
    expect(api.records.value.w).toEqual({ y: 3000, date: '2026-02-01' })
    notifyDataChanged({ source: 'x', metricId: 'other', date: '2026-02-03', value: 99999 })
    expect(api.records.value.other).toBeUndefined()
    w.unmount()
  })

  it('после размонтирования события больше не слушаются', async () => {
    db.values = [{ date: '2026-01-01', metric_id: 'w', value: 2000 }]
    const { api, w } = setup()
    await api.init('u1')
    w.unmount()
    notifyDataChanged({ source: 'water', metricId: 'w', date: '2026-02-01', value: 9000 })
    expect(api.records.value.w).toEqual({ y: 2000, date: '2026-01-01' })
  })

  it('ошибка запроса — рекордов просто нет, без исключения', async () => {
    db.valuesError = { message: 'boom' }
    const { api, w } = setup()
    await api.init('u1')
    expect(api.records.value).toEqual({})
    db.metricsError = { message: 'boom' }
    await api.init('u1')
    expect(api.records.value).toEqual({})
    await flushPromises()
    w.unmount()
  })
})
