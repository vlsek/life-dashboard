import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Фейковый Supabase: from(table) — цепочка, которая на await отдаёт rows[table]; upsert/update пишутся в writes.
const db = vi.hoisted(() => ({
  session: { user: { id: 'u1' } } as null | { user: { id: string } },
  rows: {} as Record<string, unknown[]>,
  writes: [] as { table: string; op: string; payload: unknown }[],
  upsertError: null as null | { message: string },
}))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
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
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: db.session } }) }, from: chain } }
})

import App from './App.vue'
import { DATA_CHANGED } from './lib/events'
import { todayStr } from './lib/date'

const today = todayStr()
const waterMetric = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, active: true, position: 1, user_id: 'u1' }
const habit = { id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, active: true, position: 2, user_id: 'u1' }

function setup(rows: Record<string, unknown[]>) {
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], ...rows }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.session = { user: { id: 'u1' } }
  db.writes = []
  db.upsertError = null
})

describe('глобальный хедер (App.vue)', () => {
  it('без сессии ничего не рисует и не ходит за данными', async () => {
    db.session = null
    setup({})
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="header-widgets"]').exists()).toBe(false)
    w.unmount()
  })

  it('есть метрика воды и данные: стакан + кольцо дня, кольцо недели', async () => {
    setup({ metrics: [waterMetric, habit], daily_values: [{ date: today, metric_id: 'h', value: true }, { date: today, metric_id: 'w', value: 500 }] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="water-badge"]').exists()).toBe(true)
    expect(w.find('[data-kind="day"]').exists()).toBe(true)
    expect(w.find('[data-kind="week"]').exists()).toBe(true)
    expect(w.find('[data-kind="day"]').attributes('title')).toContain('День сделан: 50% (1/2)')
    w.unmount()
  })

  it('нет метрики воды — стакана нет, кольца остаются', async () => {
    setup({ metrics: [habit], daily_values: [{ date: today, metric_id: 'h', value: true }] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="water-badge"]').exists()).toBe(false)
    expect(w.find('[data-kind="day"]').exists()).toBe(true)
    w.unmount()
  })

  it('настройка «Кружок дня/недели: выключить» скрывает соответствующее кольцо', async () => {
    localStorage.setItem('day_progress_settings', JSON.stringify({ dayPlace: 'off', weekPlace: 'header' }))
    setup({ metrics: [habit], daily_values: [{ date: today, metric_id: 'h', value: true }] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-kind="day"]').exists()).toBe(false)
    expect(w.find('[data-kind="week"]').exists()).toBe(true)
    w.unmount()
  })

  it('клик по кольцу дня открывает сводку; шестерёнка из сводки открывает настройки; «Сохранить» пишет их и закрывает окно', async () => {
    setup({ metrics: [habit], daily_values: [{ date: today, metric_id: 'h', value: true }] })
    const w = mount(App)
    await flushPromises()
    await w.find('[data-kind="day"]').trigger('click')
    expect(w.find('[data-test="summary-modal"]').exists()).toBe(true)
    expect(w.find('[data-test="done-item"]').text()).toContain('Зарядка')
    await w.find('[data-test="open-settings"]').trigger('click')
    expect(w.find('[data-test="summary-modal"]').exists()).toBe(false)
    expect(w.find('[data-test="settings-modal"]').exists()).toBe(true)
    await w.find('[data-test="settings-modal"] select').setValue('off')
    await w.find('[data-test="settings-modal"] .gh-btn-primary').trigger('click')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('day_progress_settings')!).dayPlace).toBe('off')
    expect(w.find('[data-test="settings-modal"]').exists()).toBe(false)
    expect(w.find('[data-kind="day"]').exists()).toBe(false)
    w.unmount()
  })

  it('клик по стакану открывает окно воды; +200 мл пишет в daily_values и после записи показывает анимацию', async () => {
    setup({ metrics: [waterMetric], daily_values: [] })
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="water-badge"]').trigger('click')
    expect(w.find('[data-test="water-modal"]').exists()).toBe(true)
    await w.find('[data-test="add-200"]').trigger('click')
    await flushPromises()
    const up = db.writes.find((x) => x.table === 'daily_values')!
    expect(up.payload).toMatchObject({ user_id: 'u1', metric_id: 'w', date: today, value: 200 })
    w.unmount()
  })

  it('ошибка записи воды показывается в окне (а стакан из шапки не пропадает)', async () => {
    db.upsertError = { message: 'нет связи' }
    setup({ metrics: [waterMetric], daily_values: [] })
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="water-badge"]').trigger('click')
    await w.find('[data-test="add-200"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="water-save-error"]').text()).toContain('нет связи')
    expect(w.find('[data-test="water-badge"]').exists()).toBe(true)
    w.unmount()
  })

  it('событие DATA_CHANGED пересчитывает кольца', async () => {
    setup({ metrics: [habit], daily_values: [] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-kind="day"] + .gh-badge-pct, [data-kind="day"] .gh-badge-pct').text()).toBe('0%')
    db.rows.daily_values = [{ date: today, metric_id: 'h', value: true }]
    window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { source: 'test' } }))
    await flushPromises()
    expect(w.find('[data-kind="day"] .gh-badge-pct').text()).toBe('100%')
    w.unmount()
  })
})
