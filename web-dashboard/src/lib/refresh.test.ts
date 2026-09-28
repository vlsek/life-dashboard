import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { DATA_CHANGED, notifyDataChanged } from './events'
import { upsertPoint } from './chartSeries'

// Мок Supabase: любая цепочка select/eq/order/... — «thenable» с пустыми данными; чтение
// daily_values (range) считаем и при необходимости удерживаем, чтобы проверить схлопывание событий.
const h = vi.hoisted(() => ({ valuesReads: 0, gate: null as null | Promise<void> }))
vi.mock('./supabase', () => {
  const builder = (table: string): any =>
    new Proxy(
      {},
      {
        get: (_t, key) => {
          if (key === 'then') return (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res)
          if (key === 'maybeSingle') return () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null })
          if (key === 'range' && table === 'daily_values') {
            return () => {
              h.valuesReads++
              return (h.gate ?? Promise.resolve()).then(() => ({ data: [], error: null }))
            }
          }
          if (key === 'range') return () => Promise.resolve({ data: [], error: null })
          return () => builder(table)
        },
      },
    )
  return {
    sb: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
      from: (table: string) => builder(table),
    },
  }
})

import { useDashboard } from './useDashboard'
import { useCharts } from './useCharts'

function setup() {
  let api!: ReturnType<typeof useDashboard>
  const wrapper = mount(defineComponent({ setup: () => ((api = useDashboard()), () => null) }))
  return { api, wrapper }
}

describe('useDashboard: пересчёт стриков и колец по событию dashboard:data-changed', () => {
  beforeEach(() => {
    h.valuesReads = 0
    h.gate = null
  })
  afterEach(() => vi.restoreAllMocks())

  it('событие вызывает повторную загрузку данных', async () => {
    const { api, wrapper } = setup()
    await api.init()
    expect(h.valuesReads).toBe(1)
    notifyDataChanged({ source: 'water' })
    await flushPromises()
    expect(h.valuesReads).toBe(2)
    wrapper.unmount()
  })

  it('серия быстрых событий: один проход в полёте + ровно один дополнительный (а не по проходу на каждое)', async () => {
    const { api, wrapper } = setup()
    await api.init()
    let release!: () => void
    h.gate = new Promise<void>((r) => (release = r))
    notifyDataChanged({ source: 'water' }) // запускает проход, он ждёт gate
    notifyDataChanged({ source: 'water' })
    notifyDataChanged({ source: 'sets' })
    notifyDataChanged({ source: 'charts' })
    await flushPromises()
    expect(h.valuesReads).toBe(2) // init + один проход в полёте; остальные — в очереди
    h.gate = null
    release()
    await flushPromises()
    expect(h.valuesReads).toBe(3) // один добавочный проход на все накопившиеся события
    wrapper.unmount()
  })

  it('после размонтирования слушатель снят', async () => {
    const { api, wrapper } = setup()
    await api.init()
    wrapper.unmount()
    window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { source: 'x' } }))
    await flushPromises()
    expect(h.valuesReads).toBe(1)
  })

  it('событие до init (нет userId) ничего не грузит', async () => {
    const { wrapper } = setup()
    notifyDataChanged({ source: 'water' })
    await flushPromises()
    expect(h.valuesReads).toBe(0)
    wrapper.unmount()
  })
})

describe('точка графика по событию: upsertPoint', () => {
  it('значение воды за сегодня заменяет точку за ту же дату и не трогает другие', () => {
    const pts = [{ date: '2026-09-27', y: 1500 }, { date: '2026-09-28', y: 250 }]
    expect(upsertPoint(pts, '2026-09-28', 500)).toEqual([{ date: '2026-09-27', y: 1500 }, { date: '2026-09-28', y: 500 }])
  })
})

describe('useCharts: обновление точки метрики по событию из других блоков', () => {
  function chartsSetup() {
    let api!: ReturnType<typeof useCharts>
    const wrapper = mount(defineComponent({ setup: () => ((api = useCharts()), () => null) }))
    api.series.value = {
      'metric:water': { label: 'Вода', unit: ' мл', color: 'c', points: [{ date: '2026-09-27', y: 1500 }, { date: '2026-09-28', y: 250 }] },
      points: { label: 'Баллы', unit: '', color: 'c', points: [{ date: '2026-09-28', y: 2 }] },
    }
    return { api, wrapper }
  }

  it('вода/подходы: точка за дату заменяется, новая дата добавляется по порядку', () => {
    const { api, wrapper } = chartsSetup()
    notifyDataChanged({ source: 'water', metricId: 'water', date: '2026-09-28', value: 500 })
    expect(api.series.value['metric:water'].points).toEqual([{ date: '2026-09-27', y: 1500 }, { date: '2026-09-28', y: 500 }])
    notifyDataChanged({ source: 'water', metricId: 'water', date: '2026-09-29', value: 250 })
    expect(api.series.value['metric:water'].points.map((p) => p.date)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29'])
    wrapper.unmount()
  })
  it('своё событие (source: charts), чужая метрика без графика и пустое значение игнорируются', () => {
    const { api, wrapper } = chartsSetup()
    const before = JSON.stringify(api.series.value)
    notifyDataChanged({ source: 'charts', metricId: 'water', date: '2026-09-28', value: 999 })
    notifyDataChanged({ source: 'sets', metricId: 'no-such-metric', date: '2026-09-28', value: 5 })
    notifyDataChanged({ source: 'water', metricId: 'water', date: '2026-09-28', value: null })
    notifyDataChanged({ source: 'water' })
    expect(JSON.stringify(api.series.value)).toBe(before)
    wrapper.unmount()
  })
  it('серия «баллы» по событию не пересчитывается (осознанно — см. комментарий в useCharts)', () => {
    const { api, wrapper } = chartsSetup()
    notifyDataChanged({ source: 'water', metricId: 'water', date: '2026-09-28', value: 2000 })
    expect(api.series.value['points'].points).toEqual([{ date: '2026-09-28', y: 2 }])
    wrapper.unmount()
  })
})
