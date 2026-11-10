import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Современное оформление «Сообщества»: пустой рейтинг — карточка с подсказкой (текст зависит от области), переключатели — компактные пилюли с aria-pressed.
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    let single = false
    const p: unknown = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: table === 'profiles' ? (single ? { onboarded: true, display_name: 'Me', leaderboard_visible: true, customization: {} } : []) : [], error: null })
        if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
        return () => p
      },
    })
    return p
  }
  const sb = { auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) }, from: (t: string) => chain(t), rpc: async () => ({ data: [], error: null }) }
  return { sb, logout: vi.fn() }
})
import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('Сообщество: пустой рейтинг', () => {
  it('карточка «Пока пусто» с подсказкой; для «Только друзья» подсказка другая', async () => {
    const w = mount(App)
    await flushPromises()
    const box = w.find('[data-test="rating-empty"]')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('Пока пусто.')
    expect(box.text()).toContain('период подлиннее')
    const friends = w.findAll('[data-test="scope-switch"] button')[1]
    await friends.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="rating-empty"]').text()).toContain('Добавь друзей')
    w.unmount()
  })
  it('переключатели области — пилюли с aria-pressed, выбранная отмечена', async () => {
    const w = mount(App)
    await flushPromises()
    const [all, fr] = w.findAll('[data-test="scope-switch"] button')
    expect(all.attributes('aria-pressed')).toBe('true')
    expect(fr.attributes('aria-pressed')).toBe('false')
    await fr.trigger('click')
    expect(fr.attributes('aria-pressed')).toBe('true')
    expect(all.attributes('aria-pressed')).toBe('false')
    w.unmount()
  })
})
