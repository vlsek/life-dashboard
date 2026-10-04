import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const db = vi.hoisted(() => ({ session: { user: { id: 'u1', email: 'anna@example.com' } } as null | { user: { id: string; email: string } }, rows: {} as Record<string, unknown[]> }))
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
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: db.rows[table] || [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: db.session } }) }, from: chain } }
})

import App from './App.vue'
import { setSidebarProgress } from './lib/prefs'
import { profileLabel } from './lib/sidebarProfile'
import { todayStr } from './lib/date'

const today = todayStr()
const habit = { id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, active: true, position: 1, user_id: 'u1' }

function setup(profile: Record<string, unknown> | null, anchor = true) {
  db.rows = { metrics: [habit], daily_values: [{ date: today, metric_id: 'h', value: true }], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: profile ? [profile] : [] }
  document.body.innerHTML = anchor ? '<nav><div id="sidebar-top"></div></nav>' : '<nav></nav>'
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  history.replaceState(null, '', '/goals/')
  db.session = { user: { id: 'u1', email: 'anna@example.com' } }
  setSidebarProgress(false)
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('profileLabel', () => {
  it('имя → иначе часть почты до «@»; буква заглавная; пусто → «?»', () => {
    expect(profileLabel('Анна', 'a@b.c')).toEqual({ name: 'Анна', initial: 'А' })
    expect(profileLabel(null, 'anna@example.com')).toEqual({ name: 'anna', initial: 'A' })
    expect(profileLabel(null, null)).toEqual({ name: '', initial: '?' })
  })
})

describe('верх левого бокового меню (BACKLOG 6.2)', () => {
  it('в #sidebar-top рисуется профиль: имя, почта, ссылка на Аккаунт; без аватара — буква на цвете темы', async () => {
    setup({ display_name: 'Анна', avatar_url: null })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    const side = document.querySelector('#sidebar-top [data-test="sidebar-top"]')!
    expect(side).toBeTruthy()
    expect(side.querySelector('[data-test="sidebar-name"]')!.textContent).toBe('Анна')
    expect(side.textContent).toContain('anna@example.com')
    expect(side.querySelector('[data-test="sidebar-user"]')!.getAttribute('href')).toBe('/account/')
    expect(side.querySelector('[data-test="sidebar-initial"]')!.textContent).toBe('А')
    expect(side.querySelector('[data-test="sidebar-avatar"]')).toBeNull()
    w.unmount()
  })

  it('есть аватар — показывается картинка; нет имени — вместо него часть почты', async () => {
    setup({ display_name: null, avatar_url: 'https://cdn.example/a.png' })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    const img = document.querySelector('#sidebar-top [data-test="sidebar-avatar"]') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://cdn.example/a.png')
    expect(document.querySelector('#sidebar-top [data-test="sidebar-name"]')!.textContent).toBe('anna')
    w.unmount()
  })

  it('нет якоря #sidebar-top на странице — ничего не рисуем и не падаем', async () => {
    setup({ display_name: 'Анна' }, false)
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-test="sidebar-top"]')).toBeNull()
    expect(document.querySelector('[data-test="header-widgets"]')).toBeTruthy()
    w.unmount()
  })

  it('работает и на Дашборде (panelOnly): блок профиля есть', async () => {
    setup({ display_name: 'Анна' })
    history.replaceState(null, '', '/dashboard/')
    const w = mount(App, { attachTo: document.body, props: { panelOnly: true } })
    await flushPromises()
    expect(document.querySelector('#sidebar-top [data-test="sidebar-name"]')).toBeTruthy()
    w.unmount()
  })
})

describe('слой «+N / −N» шапки (BACKLOG 469)', () => {
  it('на обычной странице слой есть, на Дашборде (panelOnly) нет — там свой слой, иначе анимация задвоится', async () => {
    setup({ display_name: 'Анна' })
    const w1 = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelectorAll('[data-test="points-float-layer"]').length).toBe(1)
    w1.unmount()
    setup({ display_name: 'Анна' })
    history.replaceState(null, '', '/dashboard/')
    const w2 = mount(App, { attachTo: document.body, props: { panelOnly: true } })
    await flushPromises()
    expect(document.querySelectorAll('[data-test="points-float-layer"]').length).toBe(0)
    w2.unmount()
  })
})

describe('прогресс дня и недели в меню — опция (BACKLOG 2.3)', () => {
  it('по умолчанию выключен', async () => {
    setup({ display_name: 'Анна' })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#sidebar-top [data-test="sidebar-progress"]')).toBeNull()
    w.unmount()
  })

  it('включён: кольца дня и недели с подписями; клик по кольцу открывает сводку', async () => {
    setup({ display_name: 'Анна' })
    setSidebarProgress(true)
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    const box = document.querySelector('#sidebar-top [data-test="sidebar-progress"]')!
    expect(box).toBeTruthy()
    expect(box.querySelectorAll('.gh-badge')).toHaveLength(2)
    ;(box.querySelector('[data-kind="day"]') as HTMLElement).click()
    await flushPromises()
    expect(document.querySelector('[data-test="summary-modal"]')).toBeTruthy()
    w.unmount()
  })

  it('галочка в «Глобальных настройках» включает и выключает блок и пишет sidebar_progress', async () => {
    setup({ display_name: 'Анна' })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="panel-open"]').trigger('click')
    await w.find('[data-test="panel-settings"]').trigger('click')
    await flushPromises()
    const cb = w.find('[data-test="sidebar-progress-toggle"]')
    await cb.setValue(true)
    await flushPromises()
    expect(localStorage.getItem('sidebar_progress')).toBe('1')
    expect(document.querySelector('#sidebar-top [data-test="sidebar-progress"]')).toBeTruthy()
    await cb.setValue(false)
    await flushPromises()
    expect(localStorage.getItem('sidebar_progress')).toBeNull()
    expect(document.querySelector('#sidebar-top [data-test="sidebar-progress"]')).toBeNull()
    w.unmount()
  })
})
