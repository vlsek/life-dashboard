import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { notifyDataChanged } from './events'

// Подмена Supabase: таблица → строки. Проверяем поведение composable (что грузит, когда
// показывает, как переживает закрытие и DATA_CHANGED), а не сам запрос.
const db = vi.hoisted(() => ({
  metrics: [] as unknown[],
  values: [] as unknown[],
}))
vi.mock('./supabase', () => {
  const chain = (rows: () => unknown[]) => {
    const q: any = { select: () => q, eq: () => q, order: () => q, then: (res: (v: unknown) => unknown) => res({ data: rows(), error: null }) }
    return q
  }
  return { sb: { from: (table: string) => chain(() => (table === 'metrics' ? db.metrics : db.values)) } }
})

import { EVENING_DISMISS_KEY, useEveningReminder } from './useEveningReminder'

const metric = (id: string, name: string) => ({
  id, user_id: 'u', name, icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0,
})

function setup() {
  let api!: ReturnType<typeof useEveningReminder>
  const w = mount(defineComponent({ setup() { api = useEveningReminder(); return () => h('div') } }))
  return { api, w }
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  db.metrics = [metric('read', 'Reading'), metric('walk', 'Walk')]
  db.values = [{ metric_id: 'walk', value: true }]
})
afterEach(() => vi.useRealTimers())

describe('useEveningReminder', () => {
  it('after 21:00 shows only the metrics that are still not done', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 21, 5))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toBe(true)
    expect(api.items.value.map((i) => i.metric.id)).toEqual(['read'])
    w.unmount()
  })

  it('is hidden in the afternoon and appears by itself when the clock reaches 21:00 (minute timer)', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 20, 59, 30))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toBe(false)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.visible.value).toBe(true)
    w.unmount()
  })

  it('disappears when everything gets done (DATA_CHANGED triggers a reload)', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 22, 0))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toBe(true)
    db.values = [{ metric_id: 'walk', value: true }, { metric_id: 'read', value: true }]
    notifyDataChanged({ source: 'day', date: '2026-09-29' })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.items.value).toEqual([])
    expect(api.visible.value).toBe(false)
    w.unmount()
  })

  it('dismiss hides it for today and is remembered in localStorage', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 21, 30))
    const first = setup()
    await first.api.load('u')
    first.api.dismiss()
    expect(first.api.visible.value).toBe(false)
    expect(localStorage.getItem(EVENING_DISMISS_KEY)).toBe('2026-09-29')
    first.w.unmount()

    const second = setup() // «перезагрузка страницы»
    await second.api.load('u')
    expect(second.api.visible.value).toBe(false)
    second.w.unmount()
  })

  it("yesterday's dismissal does not hide today's reminder", async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 21, 30))
    localStorage.setItem(EVENING_DISMISS_KEY, '2026-09-28')
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toBe(true)
    w.unmount()
  })
})
