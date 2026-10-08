import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Магазин в режиме «огоньки стриков» (BACKLOG 46.3, миграция 057): цены и баланс в огоньках, старые вещи в монетах — в архиве, покупка защищена БД.
// Без миграции (функции sync_streak_sparks нет) Магазин работает в монетах, как раньше.
const h = vi.hoisted(() => ({
  rpcError: false,
  balanceRow: { earned: 12, spent: 2, balance: 10 } as Record<string, unknown>,
  items: [] as Record<string, unknown>[],
  updates: [] as { values: Record<string, unknown>; id: unknown }[],
  inserts: [] as Record<string, unknown>[],
  updateError: null as null | { message: string },
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
            return Promise.resolve({ error: h.updateError })
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('shop_idea_seen', '1')
  document.body.innerHTML = ''
  sparksMode.value = false
  h.rpcError = false
  h.balanceRow = { earned: 12, spent: 2, balance: 10 }
  h.updates = []
  h.inserts = []
  h.updateError = null
  h.items = [
    item({ id: 'a', name: 'Кофе', cost: 0, cost_sparks: 8 }),
    item({ id: 'b', name: 'Наушники', cost: 0, cost_sparks: 50 }),
    item({ id: 'c', name: 'Старая покупка', cost: 120, cost_sparks: null, redeemed: true, redeemed_date: '2026-09-01' }),
    item({ id: 'd', name: 'Старое желание', cost: 200, cost_sparks: null, archived: true }),
  ]
})

describe('Магазин: режим огоньков', () => {
  it('баланс и цены в огоньках, иконка — огонёк, заголовок «за огоньки»', async () => {
    const w = await mountApp()
    expect(sparksMode.value).toBe(true)
    expect(w.find('h1').text()).toContain('Магазин за огоньки')
    expect(w.find('[data-testid="balance-value"]').text()).toContain('10')
    expect(w.find('[data-testid="balance-value"] [data-test="spark-icon"]').exists()).toBe(true)
    expect(w.text()).toContain('Кофе')
    expect(w.text()).toContain('Наушники')
    w.unmount()
  })

  it('старое невыкупленное за монеты — в архиве, а не в магазине; купленное раньше не теряется', async () => {
    const w = await mountApp()
    expect(w.find('[data-testid="grid-view"]').text()).not.toContain('Старое желание')
    expect(w.find('[data-testid="archive-section"]').exists()).toBe(true)
    await w.find('[data-testid="archive-toggle"]').trigger('click')
    expect(w.find('[data-testid="archive-section"]').text()).toContain('Старое желание')
    w.unmount()
  })

  it('перенос из архива: цена в огоньках (подсказка 1/8 от монет), cost = 0, архив снят', async () => {
    const w = await mountApp()
    await w.find('[data-testid="archive-toggle"]').trigger('click')
    const price = w.find('[data-testid="archived-price"]')
    expect((price.element as HTMLInputElement).value).toBe('25') // 200 / 8
    await w.find('[data-testid="archived-transfer"]').trigger('click')
    await flushPromises()
    expect(h.updates.at(-1)).toEqual({ values: { cost: 0, cost_sparks: 25, archived: false }, id: 'd' })
    w.unmount()
  })

  it('покупка: БД отклонила («insufficient_sparks») — человек видит понятный текст, а не код', async () => {
    h.updateError = { message: 'insufficient_sparks' }
    const w = await mountApp()
    const buy = w.findAll('[data-testid="grid-view"] button').find((b) => b.text().includes('Купить'))
    expect(buy).toBeTruthy()
    await buy!.trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="action-error"]').text()).toContain('Не хватает огоньков')
    w.unmount()
  })

  it('новая вещь: калькулятор из рублей (250 ₽ ÷ 10 = 25) и запись cost_sparks, cost = 0', async () => {
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="calc-row"]').exists()).toBe(true)
    await w.find('[data-testid="rub-input"]').setValue(250)
    expect((w.find('[data-testid="cost-input"]').element as HTMLInputElement).value).toBe('25')
    const name = w.find('.modal input[type="text"]')
    await name.setValue('Книга')
    const save = w.findAll('.modal button').find((b) => /Сохранить|Добавить/i.test(b.text()))
    await save!.trigger('click')
    await flushPromises()
    expect(h.inserts.at(-1)).toMatchObject({ name: 'Книга', cost: 0, cost_sparks: 25, redeemed: false })
    w.unmount()
  })
})

describe('Магазин без миграции 057: монеты, как раньше', () => {
  it('функции нет — режим монет, архива и калькулятора нет, цены как были', async () => {
    h.rpcError = true
    h.items = [item({ id: 'a', name: 'Кино', cost: 150 })]
    const w = await mountApp()
    expect(sparksMode.value).toBe(false)
    expect(w.find('h1').text()).toContain('Магазин за баллы')
    expect(w.find('[data-testid="archive-section"]').exists()).toBe(false)
    expect(w.find('[data-test="spark-icon"]').exists()).toBe(false)
    expect(w.text()).toContain('150')
    w.unmount()
  })
})
