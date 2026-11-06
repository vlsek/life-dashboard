import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 72.5 срез 1 (проверка магазина как продукта): покупка — двойное нажатие, «уже куплено», сеть, нехватка огоньков.
// (Мок взят из sparksShop.test.ts; сервер здесь помечает вещь купленной, а ответ можно придержать.)
// Магазин в режиме «огоньки стриков» (BACKLOG 46.3, миграция 057): цены и баланс в огоньках, старые вещи в монетах — в архиве, покупка защищена БД.
// Без миграции (функции sync_streak_sparks нет) Магазин работает в монетах, как раньше.
const h = vi.hoisted(() => ({
  rpcError: false,
  balanceRow: { earned: 12, spent: 2, balance: 10 } as Record<string, unknown>,
  items: [] as Record<string, unknown>[],
  updates: [] as { values: Record<string, unknown>; id: unknown }[],
  inserts: [] as Record<string, unknown>[],
  updateError: null as null | { message: string },
  gate: null as null | Promise<void>,
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    rpc: (fn: string) => Promise.resolve(fn === 'sync_streak_sparks' && !h.rpcError ? { data: [h.balanceRow], error: null } : { data: null, error: { message: 'function does not exist' } }),
    from: (table: string) => {
      let op: 'select' | 'update' = 'select'
      let values: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (_c: string, v: unknown) => {
          if (op === 'update') {
            h.updates.push({ values, id: v })
            const done = () => {
              if (!h.updateError && values.redeemed === true) { const it = h.items.find((x) => x.id === v); if (it) it.redeemed = true }
              return { error: h.updateError }
            }
            return h.gate ? h.gate.then(done) : Promise.resolve(done())
          }
          return chain
        },
        order: () => chain,
        range: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : table === 'sparks_config' ? { num: 10 } : null, error: null }),
        update: (v: Record<string, unknown>) => {
          op = 'update'
          values = v
          return chain
        },
        insert: (row: Record<string, unknown>) => {
          h.inserts.push(row)
          return Promise.resolve({ error: null })
        },
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve({ data: table === 'shop_items' ? h.items : [], error: null }).then(res, rej),
      }
      return chain
    },
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}))

import App from './App.vue'
import { sparksMode } from './lib/sparks'
import { useShop } from './lib/useShop'

const item = (over: Record<string, unknown>) => ({ id: 'x', user_id: 'u1', name: 'Вещь', link: null, cost: 0, cost_sparks: null, archived: false, image_url: null, redeemed: false, redeemed_date: null, ...over })
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const buyButtons = (w: ReturnType<typeof mount>) => w.findAll('[data-testid="grid-view"] button').filter((b) => b.text().includes('Купить'))
const bought = () => h.updates.filter((u) => u.values.redeemed === true)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('shop_view', 'grid')
  localStorage.setItem('shop_idea_seen', '1')
  document.body.innerHTML = ''
  sparksMode.value = false
  h.rpcError = false
  h.balanceRow = { earned: 12, spent: 2, balance: 10 }
  h.updates = []
  h.inserts = []
  h.updateError = null
  h.gate = null
  h.items = [
    item({ id: 'a', name: 'Кофе', cost: 0, cost_sparks: 8 }),
    item({ id: 'b', name: 'Наушники', cost: 0, cost_sparks: 50 }),
    item({ id: 'c', name: 'Старая покупка', cost: 120, cost_sparks: null, redeemed: true, redeemed_date: '2026-09-01' }),
    item({ id: 'd', name: 'Старое желание', cost: 200, cost_sparks: null, archived: true }),
  ]
})

describe('покупка: повторное нажатие', () => {
  it('двойное нажатие «Купить», пока идёт первая покупка, отправляет её один раз', async () => {
    let release!: () => void
    h.gate = new Promise<void>((r) => { release = r })
    const w = await mountApp()
    const btn = buyButtons(w)[0]
    await btn.trigger('click')
    await btn.trigger('click')
    release()
    await flushPromises(); await flushPromises()
    expect(bought()).toHaveLength(1)
    expect(w.find('[data-testid="action-error"]').exists()).toBe(false)
    w.unmount()
  })

  it('уже купленная вещь (список устарел): запрос не отправляется, человек видит «уже куплена»', async () => {
    const w = await mountApp()
    const shop = useShop()
    await shop.init()
    await expect(shop.buyItem('c')).rejects.toThrow('уже куплена')
    expect(bought()).toHaveLength(0)
    w.unmount()
  })

  it('после ошибки кнопку можно нажать снова: вторая попытка проходит', async () => {
    h.updateError = { message: 'TypeError: Failed to fetch' }
    const w = await mountApp()
    await buyButtons(w)[0].trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="action-error"]').exists()).toBe(true)
    h.updateError = null
    await buyButtons(w)[0].trigger('click')
    await flushPromises(); await flushPromises()
    expect(bought()).toHaveLength(2)
    expect(w.find('[data-testid="action-error"]').exists()).toBe(false)
    expect(w.text()).toContain('Куплено')
    w.unmount()
  })
})

describe('ошибка сети в магазине: понятный текст, а не сырой', () => {
  const raw = 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/shop_items)'
  it('при покупке', async () => {
    h.updateError = { message: raw }
    const w = await mountApp()
    await buyButtons(w)[0].trigger('click')
    await flushPromises()
    const text = w.find('[data-testid="action-error"]').text()
    expect(text).toContain('Нет связи с сервером')
    expect(text).not.toMatch(/fetch|supabase|shop_items|TypeError/i)
    w.unmount()
  })
  it('при переносе из архива', async () => {
    const w = await mountApp()
    await w.find('[data-testid="archive-toggle"]').trigger('click')
    h.updateError = { message: raw }
    await w.find('[data-testid="archived-transfer"]').trigger('click')
    await flushPromises()
    const text = w.find('[data-testid="action-error"]').text()
    expect(text).toContain('Нет связи с сервером')
    expect(text).not.toMatch(/fetch|supabase|shop_items|TypeError/i)
    w.unmount()
  })
  it('защита БД «не хватает огоньков» по-прежнему даёт свой текст, а не общий сетевой', async () => {
    h.updateError = { message: 'insufficient_sparks' }
    const w = await mountApp()
    await buyButtons(w)[0].trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="action-error"]').text()).toContain('Не хватает огоньков')
    w.unmount()
  })
})

describe('недостаточно огоньков', () => {
  it('дорогая вещь: кнопки «Купить» нет, видно сколько не хватает; доступная покупается', async () => {
    const w = await mountApp()
    const cards = w.findAll('[data-testid="shop-card"]')
    const dear = cards.find((c) => c.text().includes('Наушники'))!
    expect(dear.find('[data-testid="buy-btn"]').exists()).toBe(false)
    expect(dear.text()).toContain('Не хватает 40')
    expect(buyButtons(w)).toHaveLength(1)
    w.unmount()
  })
})
