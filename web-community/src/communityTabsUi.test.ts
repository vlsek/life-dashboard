import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Вкладки «Сообщества» (BACKLOG 44.13, срез 1): рейтинг по умолчанию, переключение, запоминание, «Сравнение» монтируется лениво.
vi.mock('./lib/supabase', () => {
  function chain(table: string) {
    let single = false
    const p: unknown = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => {
            if (table === 'profiles') return resolve({ data: single ? { onboarded: true, display_name: 'Me', leaderboard_visible: true, customization: {} } : [], error: null })
            return resolve({ data: [], error: null })
          }
        }
        if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
        return () => p
      },
    })
    return p
  }
  const row = (id: string, name: string, pts: number) => ({ user_id: id, display_name: name, avatar_url: null, total_points: pts, perfect_streak: 1, leaderboard_visible: true })
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
    from: (table: string) => chain(table),
    async rpc(fn: string) {
      if (fn === 'get_leaderboard_period') return { data: [row('u1', 'Anna', 90), row('me', 'Me', 10)], error: null }
      if (fn === 'get_friend_requests') return { data: [{ id: 'r1', direction: 'incoming', other_user_id: 'u9', display_name: 'Ivan', avatar_url: null }, { id: 'r2', direction: 'incoming', other_user_id: 'u8', display_name: 'Olga', avatar_url: null }], error: null }
      return { data: [], error: null }
    },
  }
  return { sb, logout: vi.fn() }
})

import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

const tabBtn = (w: ReturnType<typeof mount>, k: string) => w.find(`[data-testid="comm-tab"][data-tab="${k}"]`)
const shown = (w: ReturnType<typeof mount>, id: string) => (w.find(`[data-testid="${id}"]`).element as HTMLElement).style.display !== 'none'

describe('вкладки «Сообщества»', () => {
  it('по умолчанию открыт «Рейтинг», остальные разделы скрыты, «Сравнение» не смонтировано', async () => {
    const w = mount(App)
    await flushPromises()
    expect(tabBtn(w, 'rating').attributes('aria-selected')).toBe('true')
    expect(shown(w, 'tab-rating')).toBe(true)
    expect(shown(w, 'tab-feed')).toBe(false)
    expect(shown(w, 'tab-friends')).toBe(false)
    expect(w.find('[data-testid="tab-compare"]').exists()).toBe(false)
    expect(w.find('[data-testid="period-switch"]').exists()).toBe(true)
    w.unmount()
  })

  it('клик переключает раздел; период виден только на «Рейтинге»; на «Друзьях» нет переключателя области', async () => {
    const w = mount(App)
    await flushPromises()
    await tabBtn(w, 'friends').trigger('click')
    expect(shown(w, 'tab-friends')).toBe(true)
    expect(shown(w, 'tab-rating')).toBe(false)
    expect(w.find('[data-testid="period-switch"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Только друзья')
    await tabBtn(w, 'feed').trigger('click')
    expect(shown(w, 'tab-feed')).toBe(true)
    expect(w.text()).toContain('Только друзья')
    await tabBtn(w, 'compare').trigger('click')
    expect(w.find('[data-testid="tab-compare"]').exists()).toBe(true)
    await tabBtn(w, 'rating').trigger('click')
    expect(w.find('[data-testid="tab-compare"]').exists()).toBe(false)
    w.unmount()
  })

  it('последняя вкладка запоминается и открывается при следующем заходе', async () => {
    const w = mount(App)
    await flushPromises()
    await tabBtn(w, 'feed').trigger('click')
    w.unmount()
    const w2 = mount(App)
    await flushPromises()
    expect(tabBtn(w2, 'feed').attributes('aria-selected')).toBe('true')
    expect(shown(w2, 'tab-feed')).toBe(true)
    w2.unmount()
  })

  it('на вкладке «Друзья» показано число входящих заявок', async () => {
    const w = mount(App)
    await flushPromises()
    const badge = w.find('[data-testid="comm-tab-requests"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2')
    w.unmount()
  })
})
