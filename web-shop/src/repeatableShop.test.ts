import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 78.9: повторяемая награда — покупка пишется строкой-копией, вещь остаётся в магазине, счётчик «Куплено N раз», переключатель только при миграции 124.
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
  hasRepeatCol: true,
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    rpc: (fn: string) => Promise.resolve(fn === 'sync_streak_sparks' && !h.rpcError ? { data: [h.balanceRow], error: null } : { data: null, error: { message: 'function does not exist' } }),
    from: (table: string) => {
      let op: 'select' | 'update' = 'select'
      let values: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {
        select: (cols?: string) => {
          if (cols === 'repeatable') return { limit: () => Promise.resolve({ data: [], error: h.hasRepeatCol ? null : { message: 'column does not exist' } }) }
          return chain
        },
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

const item = (over: Record<string, unknown>) => ({ id: 'x', user_id: 'u1', name: 'Вещь', link: null, cost: 0, cost_sparks: null, archived: false, image_url: null, redeemed: false, redeemed_date: null, ...over })
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const buyButtons = (w: ReturnType<typeof mount>) => w.findAll('[data-testid="grid-view"] button').filter((b) => b.text().includes('Купить'))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('shop_view', 'grid')
  localStorage.setItem('shop_idea_seen', '1')
  document.body.innerHTML = ''
  sparksMode.value = false
  h.rpcError = false
  h.balanceRow = { earned: 30, spent: 0, balance: 30 }
  h.updates = []
  h.inserts = []
  h.updateError = null
  h.gate = null
  h.hasRepeatCol = true
  h.items = [
    item({ id: 'a', name: 'Кофе', cost_sparks: 8, repeatable: true }),
    item({ id: 'a1', name: 'Кофе', cost_sparks: 8, redeemed: true, redeemed_date: '2026-11-01', repeat_of: 'a' }),
    item({ id: 'a2', name: 'Кофе', cost_sparks: 8, redeemed: true, redeemed_date: '2026-11-08', repeat_of: 'a' }),
    item({ id: 'b', name: 'Наушники', cost_sparks: 20 }),
  ]
})

describe('повторяемая награда (78.9)', () => {
  it('покупка повторяемой вещи вставляет строку-копию и не помечает оригинал купленным', async () => {
    const w = await mountApp()
    const btn = buyButtons(w)[0]
    await btn.trigger('click')
    await flushPromises(); await flushPromises()
    expect(h.updates.filter((u) => u.values.redeemed === true)).toHaveLength(0)
    expect(h.inserts).toHaveLength(1)
    expect(h.inserts[0]).toMatchObject({ user_id: 'u1', name: 'Кофе', cost: 0, cost_sparks: 8, redeemed: true, repeat_of: 'a', repeatable: false })
    w.unmount()
  })

  it('обычная вещь покупается как раньше: update redeemed, без вставки', async () => {
    const w = await mountApp()
    await buyButtons(w)[1].trigger('click')
    await flushPromises(); await flushPromises()
    expect(h.inserts).toHaveLength(0)
    expect(h.updates.filter((u) => u.values.redeemed === true)).toHaveLength(1)
    w.unmount()
  })

  it('на карточке повторяемой вещи видно «Куплено 2 раз», у обычной — нет', async () => {
    const w = await mountApp()
    const counts = w.findAll('[data-testid="repeat-count"]')
    expect(counts).toHaveLength(1)
    expect(counts[0].text()).toBe('Куплено 2 раз')
    w.unmount()
  })

  it('без миграции 124 (нет колонки) покупка идёт старым путём, а переключателя в форме нет', async () => {
    h.hasRepeatCol = false
    const w = await mountApp()
    await buyButtons(w)[0].trigger('click')
    await flushPromises(); await flushPromises()
    expect(h.inserts).toHaveLength(0)
    expect(h.updates.filter((u) => u.values.redeemed === true)).toHaveLength(1)
    await w.find('[data-testid="add-item"]').trigger("click")
    expect(document.body.querySelector('[data-testid="repeat-toggle"]')).toBeNull()
    w.unmount()
  })
})

describe('форма: переключатель «Можно снова»', () => {
  it('при миграции 124 в режиме огоньков переключатель есть и значение уходит в строку при добавлении', async () => {
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    await flushPromises()
    const tog = document.body.querySelector('[data-testid="repeat-toggle"]') as HTMLInputElement
    expect(tog).not.toBeNull()
    tog.click()
    ;(document.body.querySelector('#item-form-name') as HTMLInputElement).value = 'Массаж'
    ;(document.body.querySelector('#item-form-name') as HTMLInputElement).dispatchEvent(new Event('input'))
    await flushPromises()
    ;(document.body.querySelector('.modal button:not(.secondary)') as HTMLButtonElement | null)
    const save = Array.from(document.body.querySelectorAll('.modal button')).find((b) => b.textContent?.includes('Сохранить')) as HTMLButtonElement
    save.click()
    await flushPromises(); await flushPromises()
    expect(h.inserts.some((r) => r.name === 'Массаж' && r.repeatable === true)).toBe(true)
    w.unmount()
  })
})
