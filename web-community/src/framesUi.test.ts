import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Рамки чужих аватаров в Сообществе (BACKLOG 491, миграция 049): RPC get_public_frames → тень на аватарах подиума и списка.
const h = vi.hoisted(() => ({ framesError: false }))
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
  const row = (id: string, name: string, pts: number) => ({ user_id: id, display_name: name, avatar_url: null, total_points: pts, perfect_streak: 0, leaderboard_visible: true })
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
    from: (table: string) => chain(table),
    async rpc(fn: string) {
      switch (fn) {
        case 'get_leaderboard_period':
          return { data: [row('u1', 'Anna', 90), row('u2', 'Boris', 80), row('u3', 'Clara', 70), row('u4', 'Dmitry', 60), row('me', 'Me', 10)], error: null }
        case 'get_public_frames':
          return h.framesError ? { data: null, error: { message: 'Could not find the function' } } : { data: [{ user_id: 'u2', frame: 'frame_neon' }, { user_id: 'u4', frame: 'frame_gold' }, { user_id: 'u3', frame: 'bogus_frame' }], error: null }
        default:
          return { data: [], error: null }
      }
    },
  }
  return { sb, logout: vi.fn() }
})

import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.framesError = false
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('рамки чужих аватаров', () => {
  it('известная рамка рисуется у человека на подиуме и в списке; неизвестный ключ — без рамки', async () => {
    const w = mount(App)
    await flushPromises()
    const podium = w.find('[data-testid="podium"]').html()
    expect(podium).toContain('#ff4fa3') // Boris на подиуме — неоновая
    expect(w.html()).toContain('#e0b23c') // Dmitry в списке — золотая
    expect((w.html().match(/#ff4fa3/g) || []).length).toBeGreaterThan(0)
    // у Clara ключ неизвестный: рамок на странице ровно две (neon у Boris, gold у Dmitry)
    expect((w.html().match(/rgba\(255, 79, 163/g) || []).length).toBe(1)
    expect((w.html().match(/rgba\(224, 178, 60/g) || []).length).toBe(1)
    w.unmount()
  })

  it('нет функции get_public_frames (049 не применена) — страница работает без рамок', async () => {
    h.framesError = true
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="podium"]').exists()).toBe(true)
    expect(w.html()).not.toContain('#ff4fa3')
    expect(w.html()).not.toContain('#e0b23c')
    w.unmount()
  })
})
