import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NAME_MAX, cleanProfileName, needsName } from './lib/profileName'

// Плашка «Укажите имя» и обязательное имя в окне профиля (BACKLOG 841).
const h = vi.hoisted(() => ({ name: null as string | null, upserts: [] as unknown[] }))
vi.mock('./lib/supabase', () => {
  function chain(table: string) {
    let single = false
    const p: unknown = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => {
            if (table === 'profiles') return resolve({ data: single ? { onboarded: true, display_name: h.name, leaderboard_visible: true, customization: {} } : [], error: null })
            return resolve({ data: [], error: null })
          }
        }
        if (prop === 'upsert') return (payload: unknown) => { h.upserts.push(payload); return Promise.resolve({ error: null }) }
        if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
        return () => p
      },
    })
    return p
  }
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
    from: (table: string) => chain(table),
    rpc: async () => ({ data: [], error: null }),
  }
  return { sb, logout: vi.fn() }
})

import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.name = null
  h.upserts = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('cleanProfileName / needsName', () => {
  it('чистит пробелы и режет до NAME_MAX по символам', () => {
    expect(cleanProfileName('  Аня   Иванова ')).toBe('Аня Иванова')
    expect(cleanProfileName('   ')).toBe('')
    expect(cleanProfileName(null)).toBe('')
    expect(Array.from(cleanProfileName('я'.repeat(NAME_MAX + 7))).length).toBe(NAME_MAX)
    expect(cleanProfileName('😀'.repeat(NAME_MAX + 3))).toBe('😀'.repeat(NAME_MAX))
  })
  it('needsName: нет профиля — нет плашки; пусто/пробелы/null — нужна; есть имя — нет', () => {
    expect(needsName(null)).toBe(false)
    expect(needsName({ display_name: null })).toBe(true)
    expect(needsName({ display_name: '   ' })).toBe(true)
    expect(needsName({ display_name: 'Аня' })).toBe(false)
  })
})

describe('плашка «Укажите имя»', () => {
  it('нет имени — плашка есть; есть имя — нет', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="name-nudge"]').exists()).toBe(true)
    w.unmount()
    h.name = 'Аня'
    const w2 = mount(App)
    await flushPromises()
    expect(w2.find('[data-testid="name-nudge"]').exists()).toBe(false)
    w2.unmount()
  })

  it('пустое имя не сохраняется и показывает подсказку', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="name-nudge-input"]').setValue('   ')
    await w.find('[data-testid="name-nudge-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="name-nudge-error"]').exists()).toBe(true)
    expect(h.upserts).toEqual([])
    w.unmount()
  })

  it('имя сохраняется в profiles (с очисткой пробелов, сохраняя видимость в лидерборде)', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="name-nudge-input"]').setValue('  Аня   Иванова ')
    await w.find('[data-testid="name-nudge-save"]').trigger('click')
    await flushPromises()
    expect(h.upserts).toEqual([{ user_id: 'me', display_name: 'Аня Иванова', leaderboard_visible: true }])
    w.unmount()
  })
})

describe('окно «Публичный профиль»: имя обязательно', () => {
  it('пустое имя не сохраняется; с именем сохраняется очищенное', async () => {
    h.name = 'Аня'
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="profile-header"] button').trigger('click')
    await flushPromises()
    await w.find('[data-testid="profile-name-input"]').setValue('   ')
    await w.find('[data-testid="profile-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="profile-name-error"]').exists()).toBe(true)
    expect(h.upserts).toEqual([])
    await w.find('[data-testid="profile-name-input"]').setValue('  Борис ')
    await w.find('[data-testid="profile-save"]').trigger('click')
    await flushPromises()
    expect(h.upserts).toEqual([{ user_id: 'me', display_name: 'Борис', leaderboard_visible: true }])
    w.unmount()
  })
})
