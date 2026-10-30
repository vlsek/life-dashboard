import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 74.3 срез 1: ошибка загрузки — не молчаливый серый текст, а сообщение с «Повторить» (role="alert").
// Компонент LoadError.vue одинаков во всех пилотах (страж: web-dashboard/src/loadErrorSites.test.ts), поэтому его поведение проверяем тут один раз.
const h = vi.hoisted(() => ({ fail: true, selects: 0 }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    rpc: (fn: string) => (fn === 'sync_streak_sparks' ? Promise.resolve({ data: [{ earned: 50, spent: 0, balance: 50 }], error: null }) : Promise.resolve({ data: null, error: { message: 'no function' } })),
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : table === 'sparks_config' ? { num: 10 } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === 'shop_items') h.selects++
          const bad = table === 'shop_items' && h.fail
          const rows = table === 'shop_items' && !h.fail ? [{ id: 'a', user_id: 'u1', name: 'Кофе', link: null, cost: 0, cost_sparks: 5, archived: false, image_url: null, redeemed: false, redeemed_date: null }] : []
          return Promise.resolve(bad ? { data: null, error: { message: 'TypeError: Failed to fetch https://xyz.supabase.co/rest/v1/shop_items' } } : { data: rows, error: null }).then(res, rej)
        },
      }
      return chain
    },
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}))

import App from './App.vue'
import LoadError from './components/LoadError.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('shop_view', 'grid')
  localStorage.setItem('shop_idea_seen', '1')
  document.body.innerHTML = ''
  h.fail = true
  h.selects = 0
})

describe('LoadError — компонент', () => {
  it('сообщение, role=alert, «Повторить» вызывает retry; слот добавляется после текста', async () => {
    const retry = vi.fn()
    const w = mount(LoadError, { props: { message: 'нет связи', retry }, slots: { default: ' — попробуй позже' } })
    expect(w.attributes('role')).toBe('alert')
    expect(w.text().replace(/\s+/g, ' ')).toContain('Не удалось загрузить: нет связи — попробуй позже')
    await w.find('[data-testid="load-retry"]').trigger('click')
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('пока идёт повтор — кнопка занята и второй клик ничего не делает', async () => {
    let done!: () => void
    const retry = vi.fn(() => new Promise<void>((r) => (done = r)))
    const w = mount(LoadError, { props: { message: 'x', retry } })
    const btn = w.find('[data-testid="load-retry"]')
    await btn.trigger('click')
    expect(btn.attributes('disabled')).toBeDefined()
    await btn.trigger('click')
    expect(retry).toHaveBeenCalledTimes(1)
    done()
    await flushPromises()
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('даже если retry упал, кнопка снова доступна', async () => {
    const retry = vi.fn(() => Promise.reject(new Error('boom')))
    const w = mount(LoadError, { props: { message: 'x', retry } })
    await w.find('[data-testid="load-retry"]').trigger('click').catch(() => {})
    await flushPromises().catch(() => {})
    expect(w.find('[data-testid="load-retry"]').attributes('disabled')).toBeUndefined()
  })

  it('без сети — отдельная подсказка; с сетью её нет; английский текст на месте', async () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get')
    spy.mockReturnValue(false)
    expect(mount(LoadError, { props: { message: 'x', retry: () => 0 } }).find('[data-testid="load-error-offline"]').text()).toContain('Нет сети')
    spy.mockReturnValue(true)
    const w = mount(LoadError, { props: { message: 'x', retry: () => 0 } })
    expect(w.find('[data-testid="load-error-offline"]').exists()).toBe(false)
    localStorage.setItem('site_lang', 'en')
    expect(mount(LoadError, { props: { message: 'x', retry: () => 0 } }).find('[data-testid="load-retry"]').text()).toBe('Try again')
    spy.mockRestore()
  })
})

describe('Магазин: ошибка загрузки → «Повторить» → данные', () => {
  it('сначала понятная ошибка с кнопкой (без адреса Supabase), после повтора — вещи на месте и ошибки нет', async () => {
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    const err = w.find('[data-testid="load-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).not.toContain('supabase')
    expect(err.text()).not.toContain('TypeError')
    expect(w.findAll('[data-testid="shop-card"]')).toHaveLength(0)
    const before = h.selects
    h.fail = false
    await w.find('[data-testid="load-retry"]').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(h.selects).toBeGreaterThan(before) // запрос действительно ушёл заново
    expect(w.find('[data-testid="load-error"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="shop-card"]').some((c) => c.text().includes('Кофе'))).toBe(true)
  })

  it('повтор снова не удался — ошибка и кнопка остаются, ничего не ломается', async () => {
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    await w.find('[data-testid="load-retry"]').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="load-retry"]').attributes('disabled')).toBeUndefined()
  })
})
