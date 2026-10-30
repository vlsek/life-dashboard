import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 74.3/73.5 срез 3: «Пока ничего нет» нельзя показывать, пока вещи ещё грузятся (ложная пустота): сначала «Загрузка…», пустота — только после ответа.
const h = vi.hoisted(() => ({ gate: null as null | Promise<void>, release: null as null | (() => void), rows: [] as Record<string, unknown>[], fail: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    rpc: (fn: string) => (fn === 'sync_streak_sparks' ? Promise.resolve({ data: [{ earned: 50, spent: 0, balance: 50 }], error: null }) : Promise.resolve({ data: null, error: { message: 'x' } })),
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain, eq: () => chain, order: () => chain, range: () => chain, limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : table === 'sparks_config' ? { num: 10 } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const wait = table === 'shop_items' && h.gate ? h.gate : Promise.resolve()
          return wait.then(() => (table === 'shop_items' && h.fail ? { data: null, error: { message: 'Failed to fetch' } } : { data: table === 'shop_items' ? h.rows : [], error: null })).then(res, rej)
        },
      }
      return chain
    },
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}))
import App from './App.vue'

const row = { id: 'a', user_id: 'u1', name: 'Кофе', link: null, cost: 0, cost_sparks: 5, archived: false, image_url: null, redeemed: false, redeemed_date: null }
const settle = async () => { for (let i = 0; i < 8; i++) await flushPromises() }

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('shop_view', 'grid')
  localStorage.setItem('shop_idea_seen', '1')
  document.body.innerHTML = ''
  h.rows = []
  h.fail = false
  h.gate = new Promise<void>((r) => (h.release = r))
})

describe('Магазин: загрузка и пустота', () => {
  it('пока вещи грузятся — «Загрузка…», а не «Пока ничего нет»', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    expect(w.find('[data-testid="shop-loading"]').text()).toBe('Загрузка…')
    expect(w.find('[data-testid="shop-loading"]').attributes('role')).toBe('status')
    expect(w.find('[data-testid="shop-empty"]').exists()).toBe(false)
  })

  it('вещи пришли — карточки на месте, «Загрузка…» ушла', async () => {
    h.rows = [row]
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    expect(w.find('[data-testid="shop-loading"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="shop-card"]')).toHaveLength(1)
    expect(w.find('[data-testid="shop-empty"]').exists()).toBe(false)
  })

  it('вещей правда нет — пустота показывается, но только после ответа', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    expect(w.find('[data-testid="shop-empty"]').exists()).toBe(false)
    h.release!()
    await settle()
    expect(w.find('[data-testid="shop-loading"]').exists()).toBe(false)
    expect(w.find('[data-testid="shop-empty"]').exists()).toBe(true)
  })

  it('ошибка загрузки — ни «Загрузка…», ни «пустота», только ошибка с «Повторить»; во время повтора снова «Загрузка…»', async () => {
    h.fail = true
    const w = mount(App, { attachTo: document.body })
    await settle()
    h.release!()
    await settle()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="shop-loading"]').exists()).toBe(false)
    expect(w.find('[data-testid="shop-empty"]').exists()).toBe(false)
    h.fail = false
    h.rows = [row]
    h.gate = new Promise<void>((r) => (h.release = r)) // повтор тоже «медленный»
    await w.find('[data-testid="load-retry"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="shop-loading"]').exists()).toBe(true)
    expect(w.find('[data-testid="shop-empty"]').exists()).toBe(false)
    h.release!()
    await settle()
    expect(w.findAll('[data-testid="shop-card"]')).toHaveLength(1)
  })
})
