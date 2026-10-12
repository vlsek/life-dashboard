import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Вишлист друга в окне профиля (BACKLOG 57.6, миграция 077): только просмотр.
const h = vi.hoisted(() => ({ wish: { data: null as unknown, error: null as unknown }, asked: [] as string[] }))
vi.mock('../lib/supabase', () => ({
  sb: {
    rpc: async (fn: string) => {
      h.asked.push(fn)
      return fn === 'get_friend_wishlist' ? h.wish : { data: { user_id: 'f1', display_name: 'Аня', hidden: false }, error: null }
    },
  },
}))

import PublicProfileModal from './PublicProfileModal.vue'

const base = { name: 'Аня', avatarUrl: null, keys: [], points: 10, streak: 1 }
const item = (o: Record<string, unknown> = {}) => ({ id: 'w1', name: 'Наушники', link: 'https://shop.example/x', image_url: null, cost: 300, cost_sparks: null, ...o })

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.asked = []
  h.wish = { data: { hidden: false, items: [item(), item({ id: 'w2', name: 'Книга', link: 'javascript:alert(1)', cost: 0, cost_sparks: 8 })] }, error: null }
})

describe('вишлист друга в окне профиля', () => {
  it('у друга: список с названиями, ссылкой и ценой; опасная ссылка не становится ссылкой; кнопок «подарить» нет', async () => {
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    const rows = w.findAll('[data-testid="wish-item"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('[data-testid="wish-link"]').attributes('href')).toBe('https://shop.example/x')
    expect(rows[0].find('[data-testid="wish-link"]').attributes('rel')).toContain('noopener')
    expect(rows[0].find('[data-testid="wish-price"]').text()).toContain('300')
    expect(rows[1].find('[data-testid="wish-link"]').exists()).toBe(false)
    expect(rows[1].find('[data-testid="wish-price"]').text()).toContain('8 огоньков')
    expect(w.find('[data-testid="friend-wishlist"]').text()).not.toMatch(/подарить|купить/i)
  })
  it('не друг: запрос не делается', async () => {
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'x1', isFriend: false } })
    await flushPromises()
    expect(h.asked).not.toContain('get_friend_wishlist')
    expect(w.find('[data-testid="friend-wishlist"]').exists()).toBe(false)
  })
  it('пусто, скрыто или нет миграции: раздела нет', async () => {
    for (const wish of [{ data: { hidden: false, items: [] }, error: null }, { data: { hidden: true, items: [] }, error: null }, { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }]) {
      h.wish = wish
      const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
      await flushPromises()
      expect(w.find('[data-testid="friend-wishlist"]').exists()).toBe(false)
    }
  })
})
