import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import { _resetTrackWaterForTests, saveTrackWater } from './lib/waterTracking'
import { todayStr } from './lib/date'
import { paletteOpen } from './lib/hotkeys'
import { PALETTE_ITEMS, availableItems } from './lib/palette'

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
  paletteOpen.value = false
  _resetTrackWaterForTests()
})

describe('палитра: действие «Вода» (79.1, срез 3)', () => {
  it('availableItems: пункт воды только при включённом учёте', () => {
    expect(availableItems(PALETTE_ITEMS, { water: true }).some((i) => i.id === 'action:water')).toBe(true)
    expect(availableItems(PALETTE_ITEMS, { water: false }).some((i) => i.id === 'action:water')).toBe(false)
    expect(availableItems(PALETTE_ITEMS, { water: false })).toHaveLength(PALETTE_ITEMS.length - 1)
  })
  it('с водой: пункт есть, выбор открывает окно воды и закрывает палитру', async () => {
    setup({})
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="palette-button"]').trigger('click')
    await w.find('[data-test="palette-input"]').setValue('вода')
    expect(w.findAll('[data-test="palette-item"]')).toHaveLength(1)
    await w.find('[data-test="palette-input"]').trigger('keydown', { key: 'Enter' })
    expect(w.find('[data-test="palette"]').exists()).toBe(false)
    expect(w.find('[data-test="water-modal"]').exists()).toBe(true)
    w.unmount()
  })
  it('без метрики воды пункта «Вода» в палитре нет', async () => {
    setup({ metrics: [habit] })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="palette-button"]').trigger('click')
    await w.find('[data-test="palette-input"]').setValue('вода')
    expect(w.findAll('[data-test="palette-item"]')).toHaveLength(0)
    w.unmount()
  })
  it('учёт воды выключен в профиле — пункта нет', async () => {
    setup({})
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await saveTrackWater('u1', false)
    await flushPromises()
    await w.find('[data-test="palette-button"]').trigger('click')
    await w.find('[data-test="palette-input"]').setValue('вода')
    expect(w.findAll('[data-test="palette-item"]')).toHaveLength(0)
    w.unmount()
  })
})
