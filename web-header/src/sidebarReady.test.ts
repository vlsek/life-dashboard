import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Блок профиля в левой шторке (аватар, имя) должен быть на КАЖДОЙ странице, даже если один из запросов шапки упал или завис
// (разбор агента 7, гипотеза 1: раньше всё рисовалось только после `ready`, а `ready` — после Promise.all всех загрузок).
const db = vi.hoisted(() => ({
  failTable: null as string | null, // таблица, запрос к которой бросает исключение
  hangTable: null as string | null, // таблица, запрос к которой не завершается
  rows: {} as Record<string, unknown[]>,
}))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const boom = () => {
      if (db.failTable === table) throw new Error('сеть упала: ' + table)
    }
    const c: any = {
      select: () => (boom(), c),
      eq: () => c,
      gte: () => c,
      order: () => c,
      limit: () => c,
      range: () => c,
      maybeSingle: () => (db.hangTable === table ? new Promise(() => {}) : Promise.resolve({ data: table === 'profiles' ? { display_name: 'Анна', avatar_url: 'https://cdn.example/a.png' } : null, error: null })),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      then: (res: (v: unknown) => unknown) => (db.hangTable === table ? new Promise(() => {}) : Promise.resolve({ data: db.rows[table] || [], error: null }).then(res)),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'anna@example.com' } } } }) }, from: chain } }
})

import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  history.replaceState(null, '', '/goals/')
  db.failTable = null
  db.hangTable = null
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [] }
  document.body.innerHTML = '<nav><div id="sidebar-top"></div></nav>'
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('блок профиля в шторке не зависит от остальных загрузок шапки', () => {
  it('упал запрос метрик (вода и прогресс): аватар и имя всё равно нарисованы', async () => {
    db.failTable = 'metrics'
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    const side = document.querySelector('#sidebar-top [data-test="sidebar-top"]')
    expect(side).toBeTruthy()
    expect(side!.querySelector('[data-test="sidebar-avatar"]')!.getAttribute('src')).toBe('https://cdn.example/a.png')
    expect(side!.querySelector('[data-test="sidebar-name"]')!.textContent).toBe('Анна')
    w.unmount()
  })

  it('запрос зависает (никогда не завершается): аватар и имя нарисованы, ждать нечего', async () => {
    db.hangTable = 'metrics'
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('#sidebar-top [data-test="sidebar-avatar"]')).toBeTruthy()
    expect(document.querySelector('#sidebar-top [data-test="sidebar-name"]')!.textContent).toBe('Анна')
    w.unmount()
  })

  it('сбой одной загрузки не прячет остальной хедер: после падения воды шапка (избранное, кнопка панели) всё равно появляется', async () => {
    db.failTable = 'metrics'
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('[data-test="panel-open"]')).toBeTruthy()
    w.unmount()
  })
})
