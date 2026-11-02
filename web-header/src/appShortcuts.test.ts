import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Отслеживать воду» (BACKLOG 932): выключатель в настройках шапки и поведение шапки, когда учёт выключен.
// Фейковый Supabase — как в App.test.ts: from(table) отдаёт rows[table], upsert пишется в writes.
const db = vi.hoisted(() => ({
  rows: {} as Record<string, unknown[]>,
  writes: [] as { table: string; op: string; payload: unknown }[],
  upsertError: null as null | { message: string; code?: string },
}))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      gte: () => c,
      order: () => c,
      limit: () => c,
      range: () => c,
      maybeSingle: () => Promise.resolve({ data: (db.rows[table] || [])[0] ?? null, error: null }),
      upsert: (payload: unknown) => {
        db.writes.push({ table, op: 'upsert', payload })
        return Promise.resolve({ error: db.upsertError })
      },
      update: (payload: unknown) => {
        db.writes.push({ table, op: 'update', payload })
        return { eq: () => Promise.resolve({ error: null }) }
      },
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: db.rows[table] || [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) }, from: chain } }
})

import App from './App.vue'
import { _resetTrackWaterForTests } from './lib/waterTracking'
import { todayStr } from './lib/date'

const today = todayStr()
const waterMetric = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, active: true, position: 1, user_id: 'u1' }
const habit = { id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, active: true, position: 2, user_id: 'u1' }
const values = [{ date: today, metric_id: 'h', value: true }, { date: today, metric_id: 'w', value: 500 }]

function setup(rows: Record<string, unknown[]>) {
  db.rows = { metrics: [waterMetric, habit], daily_values: values, daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [], ...rows }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.writes = []
  db.upsertError = null
  _resetTrackWaterForTests()
})

describe('ярлыки приложения: ?quick=water и бейдж (79.5)', () => {
  const setUrl = (s: string) => window.history.replaceState({}, '', '/dashboard/' + s)
  afterEach(() => {
    setUrl('')
    delete (navigator as unknown as Record<string, unknown>).setAppBadge
    delete (navigator as unknown as Record<string, unknown>).clearAppBadge
  })

  it('?quick=water открывает окно воды и убирает параметр из адреса', async () => {
    setUrl('?quick=water')
    setup({})
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="water-modal"]').exists()).toBe(true)
    expect(location.search).toBe('')
    w.unmount()
  })
  it('без параметра окно воды само не открывается', async () => {
    setup({})
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="water-modal"]').exists()).toBe(false)
    w.unmount()
  })
  it('нет метрики воды — окно не открывается, параметр всё равно убирается', async () => {
    setUrl('?quick=water')
    setup({ metrics: [habit] })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="water-modal"]').exists()).toBe(false)
    expect(location.search).toBe('')
    w.unmount()
  })
  it('бейдж приложения = всего − сделано по дневному кольцу', async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined)
    const clearAppBadge = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { setAppBadge, clearAppBadge })
    setup({ daily_values: [] }) // ничего не выполнено
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    const m = /\((\d+)\/(\d+)/.exec(w.find('[data-kind="day"]').attributes('title') || '')
    expect(m).not.toBeNull()
    const left = Number(m![2]) - Number(m![1])
    expect(left).toBeGreaterThan(0)
    expect(setAppBadge).toHaveBeenLastCalledWith(left)
    w.unmount()
  })
})
