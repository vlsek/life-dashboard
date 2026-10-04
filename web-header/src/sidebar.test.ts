import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const db = vi.hoisted(() => ({ session: { user: { id: 'u1', email: 'anna@example.com' } } as null | { user: { id: string; email: string; user_metadata?: Record<string, unknown> } }, rows: {} as Record<string, unknown[]>, upserts: [] as unknown[] }))
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
      upsert: (p: unknown) => { db.upserts.push(p); return Promise.resolve({ error: null }) },
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
  db.upserts = []
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

describe('имя и аватарка из Google для уже зарегистрированных (BACKLOG 766 + 841)', () => {
  const google = { full_name: 'Аня Иванова', picture: 'https://lh3.googleusercontent.com/a/x' }
  const nameUpserts = () => db.upserts.filter((u) => u && typeof u === 'object' && 'display_name' in (u as object))

  it('пустое имя + вход через Google: имя и аватарка записываются и сразу видны в меню', async () => {
    setup({ display_name: null, avatar_url: null })
    db.session = { user: { id: 'u1', email: 'anna@example.com', user_metadata: google } }
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(nameUpserts()).toEqual([{ user_id: 'u1', display_name: 'Аня Иванова', avatar_url: 'https://lh3.googleusercontent.com/a/x' }])
    expect(document.querySelector('[data-test="sidebar-name"]')?.textContent).toBe('Аня Иванова')
    expect(document.querySelector('[data-test="sidebar-avatar"]')?.getAttribute('src')).toBe('https://lh3.googleusercontent.com/a/x')
    w.unmount()
  })

  it('своё имя не перезаписывается, даже если вход через Google', async () => {
    setup({ display_name: 'Анна', avatar_url: null })
    db.session = { user: { id: 'u1', email: 'anna@example.com', user_metadata: google } }
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(nameUpserts()).toEqual([])
    expect(document.querySelector('[data-test="sidebar-name"]')?.textContent).toBe('Анна')
    w.unmount()
  })

  it('пустое имя, но своя аватарка есть: имя подставляется, аватарка остаётся своя', async () => {
    setup({ display_name: null, avatar_url: 'https://cdn.example/mine.png' })
    db.session = { user: { id: 'u1', email: 'anna@example.com', user_metadata: google } }
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(nameUpserts()).toEqual([{ user_id: 'u1', display_name: 'Аня Иванова' }])
    w.unmount()
  })

  it('вход по почте (нет данных Google): ничего не пишем', async () => {
    setup({ display_name: null, avatar_url: null })
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(nameUpserts()).toEqual([])
    w.unmount()
  })
})

describe('рамка аватарки в левом меню (BACKLOG 491)', () => {
  it('выбранная рамка рисуется тенью на кружке аватара; без рамки — без тени', async () => {
    const { frameShadow } = await import('./lib/customFrame')
    expect(frameShadow('frame_neon')).toContain('#ff4fa3')
    expect(frameShadow('nope')).toBe('')
    const { mount: m } = await import('@vue/test-utils')
    const SidebarTop = (await import('./components/SidebarTop.vue')).default
    const common = { displayName: 'Анна', email: 'a@b.c', avatarUrl: null, showProgress: false, day: null, week: null }
    const w1 = m(SidebarTop, { props: { ...common, avatarFrame: 'frame_gold' } })
    expect((w1.find('[data-test="sidebar-initial"]').element as HTMLElement).style.boxShadow).toContain('#e0b23c')
    const w2 = m(SidebarTop, { props: { ...common, avatarFrame: null } })
    expect((w2.find('[data-test="sidebar-initial"]').element as HTMLElement).style.boxShadow).toBe('')
    w1.unmount(); w2.unmount()
  })

  it('анимированная рамка вешает CSS-класс анимации на аватар меню; статичная — нет', async () => {
    const { mount: m } = await import('@vue/test-utils')
    const SidebarTop = (await import('./components/SidebarTop.vue')).default
    const common = { displayName: 'Анна', email: 'a@b.c', avatarUrl: null, showProgress: false, day: null, week: null }
    const w1 = m(SidebarTop, { props: { ...common, avatarFrame: 'frame_flame' } })
    expect(w1.find('[data-test="sidebar-initial"]').classes()).toContain('cust-frame-flame')
    const w2 = m(SidebarTop, { props: { ...common, avatarFrame: 'frame_neon' } })
    expect(w2.find('[data-test="sidebar-initial"]').classes().some((c) => c.startsWith('cust-frame'))).toBe(false)
    w1.unmount(); w2.unmount()
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
