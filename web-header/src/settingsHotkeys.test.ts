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
import { hotkeysEnabled } from './lib/hotkeys'

async function openSettings(w: ReturnType<typeof mount>) {
  await w.find('[data-test="panel-open"]').trigger('click')
  await w.find('[data-test="panel-settings"]').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.className = ''
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [] }
})
afterEach(() => vi.unstubAllGlobals())

describe('Глобальные настройки: горячие клавиши (79.8)', () => {
  it('галочка есть, включена по умолчанию; снятие пишет hotkeys_off, возврат — стирает', async () => {
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await openSettings(w)
    const box = w.find('[data-test="hotkeys-setting"]')
    expect(box.exists()).toBe(true)
    expect((box.element as HTMLInputElement).checked).toBe(true)
    await box.setValue(false)
    expect(localStorage.getItem('hotkeys_off')).toBe('1')
    expect(hotkeysEnabled()).toBe(false)
    await box.setValue(true)
    expect(localStorage.getItem('hotkeys_off')).toBeNull()
    w.unmount()
  })
})
