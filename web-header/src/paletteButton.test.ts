import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 47.3: выключатель утреннего окна «вчерашние невыполненные» живёт в «Глобальных настройках». Ключ `skip_prompt_off` читает Дашборд.
const db = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]> }))
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
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) }, from: chain } }
})

import App from './App.vue'
import { paletteOpen } from './lib/hotkeys'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.className = ''
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [] }
})
afterEach(() => vi.unstubAllGlobals())

describe('Кнопка-лупа быстрого поиска (79.1, срез 2)', () => {
  it('в шапке есть лупа; касание открывает палитру, выбор пункта закрывает её', async () => {
    paletteOpen.value = false
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="palette"]').exists()).toBe(false)
    await w.find('[data-test="palette-button"]').trigger('click')
    expect(w.find('[data-test="palette"]').exists()).toBe(true)
    await w.find('[data-test="palette-input"]').setValue('настр')
    await w.find('[data-test="palette-input"]').trigger('keydown', { key: 'Enter' })
    expect(w.find('[data-test="palette"]').exists()).toBe(false)
    expect(w.find('[data-test="settings-global"]').exists()).toBe(true) // действие «Глобальные настройки» открыло окно
    w.unmount()
  })
  it('лупа не зависит от выключателя горячих клавиш', async () => {
    paletteOpen.value = false
    localStorage.setItem('hotkeys_off', '1')
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="palette-button"]').trigger('click')
    expect(w.find('[data-test="palette"]').exists()).toBe(true)
    w.unmount()
  })
})
