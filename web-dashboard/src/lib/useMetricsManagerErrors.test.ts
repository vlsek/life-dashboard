import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG раздел 35 🐞: «при удалении метрики плашка вскакивает с … и адресом супабейс». Удаление метрики не удалось (сеть / внешний ключ / права) —
// пользователь видит понятный текст, а не сырое сообщение с адресом проекта и именами таблиц.
const h = vi.hoisted(() => ({ deleteError: null as unknown, loadError: null as unknown }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: table === 'metrics' ? h.loadError : null }).then(res),
        delete: () => ({ eq: () => Promise.resolve({ error: h.deleteError }) }),
      }
      return chain
    },
  },
}))

// Подтверждение удаления — окно сайта (confirmDialog), а не системное confirm() (BACKLOG 573)
vi.mock('./confirmDialog', () => ({ confirmDialog: vi.fn(async () => true) }))

import { useMetricsManager } from './useMetricsManager'
import type { Metric } from './types'

const metric = { id: 'm1', user_id: 'u1', name: 'Отжимания', icon: null, type: 'number', unit: null, goal_value: 10, goal_direction: 'at_least', schedule: null, category_id: null, position: 0 } as Metric
const LEAKY = /supabase|https?:|daily_values|metrics|constraint|fetch|row-level|TypeError|fkey/i

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.deleteError = null
  h.loadError = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('удаление метрики: ошибки без технических подробностей', () => {
  it('нет сети — «нет связи», без адреса Supabase', async () => {
    h.deleteError = { message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/metrics?id=eq.m1)' }
    const api = useMetricsManager()
    expect(await api.deleteMetric(metric)).toBe(false)
    expect(api.error.value).toContain('связи')
    expect(api.error.value).not.toMatch(LEAKY)
  })

  it('метрика связана с данными (внешний ключ) — объяснение причины, без имён таблиц и ограничений', async () => {
    h.deleteError = { code: '23503', message: 'update or delete on table "metrics" violates foreign key constraint "daily_values_metric_id_fkey" on table "daily_values"' }
    const api = useMetricsManager()
    expect(await api.deleteMetric(metric)).toBe(false)
    expect(api.error.value).toContain('используется')
    expect(api.error.value).not.toMatch(LEAKY)
  })

  it('прочий сбой — «не получилось удалить» (не «сохранить»), без сырого текста', async () => {
    h.deleteError = { message: 'weird failure in table "metrics" at https://abcd1234.supabase.co' }
    const api = useMetricsManager()
    expect(await api.deleteMetric(metric)).toBe(false)
    expect(api.error.value).toContain('удалить')
    expect(api.error.value).not.toMatch(LEAKY)
  })

  it('после успешного удаления текст ошибки сбрасывается', async () => {
    h.deleteError = { message: 'Failed to fetch' }
    const api = useMetricsManager()
    await api.deleteMetric(metric)
    expect(api.error.value).toBeTruthy()
    h.deleteError = null
    expect(await api.deleteMetric(metric)).toBe(true)
    expect(api.error.value).toBeNull()
  })

  it('ошибка загрузки списка — тоже понятный текст', async () => {
    h.loadError = { message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/metrics)' }
    const api = useMetricsManager()
    await api.load('u1')
    expect(api.error.value).toBeTruthy()
    expect(api.error.value).not.toMatch(LEAKY)
  })

  it('подробности всё же уходят в консоль разработчика', async () => {
    h.deleteError = { message: 'Failed to fetch' }
    await useMetricsManager().deleteMetric(metric)
    expect(console.error).toHaveBeenCalled()
  })
})
