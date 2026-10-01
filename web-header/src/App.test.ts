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
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: db.session } }) }, from: chain } }
})

import App from './App.vue'
import { DATA_CHANGED } from './lib/events'
import { todayStr } from './lib/date'

const today = todayStr()
const waterMetric = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, active: true, position: 1, user_id: 'u1' }
const habit = { id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, active: true, position: 2, user_id: 'u1' }

function setup(rows: Record<string, unknown[]>) {
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [], ...rows }
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

describe('правая панель (BACKLOG 6.2)', () => {
  const water = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, active: true, position: 1, user_id: 'u1' }

  it('кнопка в шапке открывает панель со спидометрами дня/недели и стаканом; ✕ закрывает', async () => {
    setup({ metrics: [water, habit], daily_values: [{ date: today, metric_id: 'w', value: 500 }, { date: today, metric_id: 'h', value: true }] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="right-panel"]').classes()).not.toContain('gh-panel-open')
    await w.find('[data-test="panel-open"]').trigger('click')
    expect(w.find('[data-test="right-panel"]').classes()).toContain('gh-panel-open')
    expect(w.findAll('.gh-gauge')).toHaveLength(2)
    expect(w.find('[data-test="panel-water"]').text()).toContain('500 / 2000')
    await w.find('[data-test="panel-close"]').trigger('click')
    expect(w.find('[data-test="right-panel"]').classes()).not.toContain('gh-panel-open')
    w.unmount()
  })

  it('быстрое «+ 200 мл» из панели пишет воду за сегодня и запускает анимацию «записалось»', async () => {
    setup({ metrics: [water], daily_values: [] })
    const w = mount(App, { global: { stubs: { transition: false } } })
    await flushPromises()
    await w.find('[data-test="panel-open"]').trigger('click')
    await w.find('[data-test="panel-add-200"]').trigger('click')
    await flushPromises()
    expect(db.writes.find((x) => x.table === 'daily_values')!.payload).toMatchObject({ metric_id: 'w', date: today, value: 200 })
    w.unmount()
  })

  it('клик по спидометру закрывает панель и открывает сводку', async () => {
    setup({ metrics: [habit], daily_values: [{ date: today, metric_id: 'h', value: true }] })
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="panel-open"]').trigger('click')
    await w.find('.gh-gauge[data-kind="day"]').trigger('click')
    expect(w.find('[data-test="right-panel"]').classes()).not.toContain('gh-panel-open')
    expect(w.find('[data-test="summary-modal"]').exists()).toBe(true)
    w.unmount()
  })

  it('панель без данных прогресса показывает пояснение, без метрики воды — без блока воды', async () => {
    setup({ metrics: [], daily_values: [] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="panel-empty"]').exists()).toBe(true)
    expect(w.find('[data-test="panel-water"]').exists()).toBe(false)
    w.unmount()
  })

  it('режим panelOnly (Дашборд): нет стакана и колец в шапке, но панель и кнопка есть', async () => {
    setup({ metrics: [water, habit], daily_values: [{ date: today, metric_id: 'h', value: true }] })
    const w = mount(App, { props: { panelOnly: true } })
    await flushPromises()
    expect(w.find('[data-kind="day"].gh-badge').exists()).toBe(false)
    expect(w.find('.gh-badge[data-test="water-badge"]').exists()).toBe(false)
    expect(w.find('[data-test="panel-open"]').exists()).toBe(true)
    await w.find('[data-test="panel-open"]').trigger('click')
    expect(w.findAll('.gh-gauge')).toHaveLength(2)
    w.unmount()
  })

  it('свайп от правого края открывает панель, свайп вправо и Esc закрывают', async () => {
    setup({ metrics: [habit], daily_values: [] })
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    const touch = (type: string, x: number, y: number) => {
      const e = new Event(type, { bubbles: true }) as any
      e.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }]
      e.changedTouches = [{ clientX: x, clientY: y }]
      document.dispatchEvent(e)
    }
    touch('touchstart', 395, 300)
    touch('touchend', 250, 305)
    await flushPromises()
    expect(w.find('[data-test="right-panel"]').classes()).toContain('gh-panel-open')
    touch('touchstart', 200, 300)
    touch('touchend', 320, 305)
    await flushPromises()
    expect(w.find('[data-test="right-panel"]').classes()).not.toContain('gh-panel-open')
    await w.find('[data-test="panel-open"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(w.find('[data-test="right-panel"]').classes()).not.toContain('gh-panel-open')
    w.unmount()
  })
})

describe('карта мышц в правой панели (BACKLOG 3.2)', () => {
  const squat = { id: 'ex1', name: 'Приседания' }

  it('при открытии панели грузит подходы; мышцы с тренировкой за 4 дня зелёные', async () => {
    setup({
      metrics: [habit],
      workout_exercises: [squat],
      workout_entries: [{ exercise_id: 'ex1', date: today, sets: [{ reps: 10 }] }],
    })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="panel-muscles"]').exists()).toBe(false) // до открытия панели данные не грузились
    await w.find('[data-test="panel-open"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="panel-muscles"]').exists()).toBe(true)
    expect(w.find('[data-muscle="quads"]').attributes('data-state')).toBe('done')
    expect(w.find('[data-muscle="chest"]').attributes('data-state')).toBe('idle')
    w.unmount()
  })

  it('нет упражнений — блока мышц в панели нет', async () => {
    setup({ metrics: [habit], workout_exercises: [], workout_entries: [] })
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="panel-open"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="panel-muscles"]').exists()).toBe(false)
    w.unmount()
  })
})

describe('глобальные настройки (BACKLOG 6.2)', () => {
  const water = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, active: true, position: 1, user_id: 'u1' }

  async function openSettings(w: ReturnType<typeof mount>) {
    await w.find('[data-test="panel-open"]').trigger('click')
    await w.find('[data-test="panel-settings"]').trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    document.documentElement.removeAttribute('data-motion')
    document.documentElement.className = ''
  })

  it('шестерёнка в панели закрывает панель и открывает окно «Глобальные настройки»', async () => {
    setup({ metrics: [habit] })
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    expect(w.find('[data-test="settings-global"]').exists()).toBe(true)
    expect(w.find('[data-test="right-panel"]').classes()).not.toContain('gh-panel-open')
    w.unmount()
  })

  it('тема применяется сразу: класс на <html> и site_theme', async () => {
    setup({ metrics: [habit] })
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    await w.find('[data-test="theme-select"]').setValue('light')
    expect(localStorage.getItem('site_theme')).toBe('light')
    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
    w.unmount()
  })

  it('«Выключить все анимации» и «Поздравления за серии» пишут те же ключи, что страницы Дашборда', async () => {
    setup({ metrics: [habit] })
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    await w.find('[data-test="motion-off"]').setValue(true)
    expect(localStorage.getItem('site_motion')).toBe('off')
    expect(document.documentElement.getAttribute('data-motion')).toBe('off')
    await w.find('[data-test="motion-off"]').setValue(false)
    expect(localStorage.getItem('site_motion')).toBeNull()
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false)
    await w.find('[data-test="celebrate"]').setValue(false)
    expect(localStorage.getItem('streak_celebrations_off')).toBe('1')
    await w.find('[data-test="celebrate"]').setValue(true)
    expect(localStorage.getItem('streak_celebrations_off')).toBeNull()
    w.unmount()
  })

  it('раскладка блоков Дашборда: читается из profiles.dashboard_layout, ↓ и скрыть сохраняются сразу', async () => {
    setup({ metrics: [habit], profiles: [{ dashboard_layout: [{ key: 'charts', visible: true }, { key: 'profile', visible: true }, { key: 'daily', visible: true }] }] })
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    const rows = () => w.findAll('[data-test="layout-row"]').map((r) => r.find('span').text())
    expect(rows()).toEqual(['Графики', 'Профиль', 'Дневные метрики и планы'].map((x) => expect.stringContaining(x.split(' ')[0])))
    await w.findAll('[data-test="layout-row"]')[0].find('[data-test="down"]').trigger('click')
    await flushPromises()
    const saved = db.writes.filter((x) => x.table === 'profiles')
    expect(saved.at(-1)!.payload).toMatchObject({ user_id: 'u1', dashboard_layout: [{ key: 'profile', visible: true }, { key: 'charts', visible: true }, { key: 'daily', visible: true }] })
    expect(w.find('[data-test="layout-saved"]').exists()).toBe(true)
    await w.findAll('[data-test="layout-row"]')[2].find('[data-test="toggle"]').trigger('click')
    await flushPromises()
    expect(db.writes.filter((x) => x.table === 'profiles').at(-1)!.payload).toMatchObject({ dashboard_layout: [{}, {}, { key: 'daily', visible: false }] })
    w.unmount()
  })

  it('ошибка сохранения раскладки показывается, порядок откатывается', async () => {
    db.upsertError = { message: 'нет доступа' }
    setup({ metrics: [habit], profiles: [{ dashboard_layout: null }] })
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    await w.findAll('[data-test="layout-row"]')[0].find('[data-test="down"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="layout-error"]').text()).toContain('нет доступа')
    expect(w.findAll('[data-test="layout-row"]')[0].text()).toContain('Профиль')
    w.unmount()
  })

  it('кнопки «Настроить…» (прогресс) и «Дневная норма…» (вода) открывают соответствующие окна, ссылка на Аккаунт ведёт на /account/', async () => {
    setup({ metrics: [water, habit] })
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    expect(w.find('[data-test="account-link"]').attributes('href')).toBe('/account/')
    await w.find('[data-test="open-progress"]').trigger('click')
    expect(w.find('[data-test="settings-modal"]').exists()).toBe(true)
    await w.find('[data-test="open-water"]').trigger('click')
    expect(w.find('[data-test="water-modal"]').exists()).toBe(true)
    w.unmount()
  })
})
