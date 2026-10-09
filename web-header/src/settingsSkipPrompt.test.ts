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
import { setSkipPromptEnabled, skipPromptEnabled } from './lib/prefs'

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

describe('prefs: skipPromptEnabled', () => {
  it('по умолчанию включено; выключение пишет skip_prompt_off = 1, включение убирает ключ', () => {
    expect(skipPromptEnabled()).toBe(true)
    setSkipPromptEnabled(false)
    expect(localStorage.getItem('skip_prompt_off')).toBe('1')
    expect(skipPromptEnabled()).toBe(false)
    setSkipPromptEnabled(true)
    expect(localStorage.getItem('skip_prompt_off')).toBeNull()
    expect(skipPromptEnabled()).toBe(true)
  })
})

describe('Глобальные настройки: «Утреннее окно про вчерашние невыполненные метрики»', () => {
  it('включено по умолчанию, с понятной подписью', async () => {
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    const cb = w.find('[data-test="skip-prompt"]')
    expect((cb.element as HTMLInputElement).checked).toBe(true)
    expect(w.text()).toContain('Утреннее окно про вчерашние невыполненные метрики')
    w.unmount()
  })

  it('снятие галочки выключает окно (ключ в localStorage), возврат — включает', async () => {
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    await w.find('[data-test="skip-prompt"]').setValue(false)
    expect(localStorage.getItem('skip_prompt_off')).toBe('1')
    await w.find('[data-test="skip-prompt"]').setValue(true)
    expect(localStorage.getItem('skip_prompt_off')).toBeNull()
    w.unmount()
  })

  it('выключено раньше — открывается без галочки', async () => {
    localStorage.setItem('skip_prompt_off', '1')
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    expect((w.find('[data-test="skip-prompt"]').element as HTMLInputElement).checked).toBe(false)
    w.unmount()
  })
})

describe('согласованность ключа с Дашбордом', () => {
  it('Дашборд читает тот же ключ localStorage (skip_prompt_off)', () => {
    const src: string = readFileSync('../web-dashboard/src/lib/skipYesterday.ts', 'utf-8')
    expect(src).toContain("SKIP_OFF_KEY = 'skip_prompt_off'")
  })
})
