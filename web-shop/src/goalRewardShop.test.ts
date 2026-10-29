import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 68.2 (срезы 1–3): награда за выполнение цели в Магазине — форма «За огоньки / За цель», карточка с прогрессом цели,
// «Получить награду», понятные ошибки. Весь App на подменённом Supabase (миграции 057 и 111 «применены»).
const h = vi.hoisted(() => ({
  items: [] as Record<string, unknown>[],
  goals: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  updates: [] as { values: Record<string, unknown>; id: unknown }[],
  claims: [] as Record<string, unknown>[],
  claimError: null as null | { code: string; message: string },
  writeError: null as null | { code: string; message: string },
  noGoalColumn: false, // миграция 111 не применена: select('goal_id') по shop_items даёт ошибку
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    rpc: (fn: string, args?: Record<string, unknown>) => {
      if (fn === 'sync_streak_sparks') return Promise.resolve({ data: [{ earned: 50, spent: 0, balance: 50 }], error: null })
      if (fn === 'claim_goal_reward') {
        h.claims.push(args ?? {})
        return Promise.resolve({ data: null, error: h.claimError })
      }
      return Promise.resolve({ data: null, error: { message: 'function does not exist' } })
    },
    from: (table: string) => {
      let op: 'select' | 'update' = 'select'
      let cols = ''
      let values: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {
        select: (c?: string) => {
          cols = c ?? ''
          return chain
        },
        limit: () => chain,
        eq: (_c: string, v: unknown) => {
          if (op === 'update') {
            h.updates.push({ values, id: v })
            return Promise.resolve({ error: h.writeError })
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
          return Promise.resolve({ error: h.writeError })
        },
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(h.noGoalColumn && table === 'shop_items' && cols === 'goal_id' ? { data: null, error: { code: '42703', message: 'column shop_items.goal_id does not exist' } } : { data: table === 'shop_items' ? h.items : table === 'goals' ? h.goals : [], error: null }).then(res, rej),
      }
      return chain
    },
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  },
}))

import App from './App.vue'
import { sparksMode } from './lib/sparks'

const item = (over: Record<string, unknown>) => ({ id: 'x', user_id: 'u1', name: 'Вещь', link: null, cost: 0, cost_sparks: null, archived: false, image_url: null, redeemed: false, redeemed_date: null, goal_id: null, reward_goal_name: null, ...over })

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const card = (w: ReturnType<typeof mount>, name: string) => w.findAll('[data-testid="shop-card"]').find((c) => c.text().includes(name))!

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('shop_view', 'grid')
  localStorage.setItem('shop_idea_seen', '1')
  document.body.innerHTML = ''
  sparksMode.value = false
  h.items = [
    item({ id: 'coffee', name: 'Кофе', cost_sparks: 5 }),
    item({ id: 'shoes', name: 'Кроссовки', goal_id: 'g1' }),
    item({ id: 'book', name: 'Книга', goal_id: 'g2' }),
    item({ id: 'watch', name: 'Часы', redeemed: true, redeemed_date: '2026-10-20', reward_goal_name: 'Старая цель' }),
    item({ id: 'orphan', name: 'Сирота' }), // цель удалена: привязки и цены нет → в архив «задать цену»
  ]
  h.goals = [
    { id: 'g1', name: 'Марафон', stages: 5, current_stage: 3, done: false },
    { id: 'g2', name: 'Прочитать роман', stages: 1, current_stage: 0, done: true },
    { id: 'g3', name: 'Выучить гитару', stages: 2, current_stage: 0, done: false },
  ]
  h.inserts = []
  h.updates = []
  h.claims = []
  h.claimError = null
  h.writeError = null
  h.noGoalColumn = false
})

describe('Магазин: карточка награды за цель', () => {
  it('цель в процессе: «🎯 за цель», название цели, «3 из 5», ожидающая кнопка, без цены и без кнопки «Купить»', async () => {
    const w = await mountApp()
    const c = card(w, 'Кроссовки')
    expect(c.find('[data-testid="reward-info"]').exists()).toBe(true)
    expect(c.find('[data-testid="reward-goal"]').text()).toBe('Марафон')
    expect(c.find('[data-testid="reward-progress"]').text()).toBe('3 из 5')
    expect(c.find('[data-testid="claim-wait"]').attributes('disabled')).toBeDefined()
    expect(c.find('[data-testid="claim-btn"]').exists()).toBe(false)
    expect(c.find('[data-testid="buy-btn"]').exists()).toBe(false)
  })

  it('цель выполнена: «✓ Цель выполнена» и кнопка «Получить награду»', async () => {
    const w = await mountApp()
    const c = card(w, 'Книга')
    expect(c.find('[data-testid="reward-progress"]').text()).toContain('Цель выполнена')
    expect(c.find('[data-testid="claim-btn"]').text()).toContain('Получить награду')
  })

  it('полученная награда: «Награда получена» с датой, не в архиве и без иконки монеты истории', async () => {
    const w = await mountApp()
    const c = card(w, 'Часы')
    expect(c.text()).toContain('Награда получена')
    expect(c.text()).toContain('20.10.2026')
    expect(c.find('[data-testid="reward-info"]').exists()).toBe(true)
  })

  it('вещь без привязки и цены (цель удалили) уходит в архив «задать цену», а не теряется', async () => {
    const w = await mountApp()
    expect(w.findAll('[data-testid="shop-card"]').some((c) => c.text().includes('Сирота'))).toBe(false)
    await w.find('[data-testid="archive-toggle"]').trigger('click')
    expect(w.find('[data-testid="archive-section"]').text()).toContain('Сирота')
  })
})

describe('Магазин: награды за цель в виде «Список с копилкой»', () => {
  it('готовая награда — в «можно получить» с кнопкой, ожидающая — в «копится» без кнопки; клик получает награду', async () => {
    localStorage.setItem('shop_view', 'list')
    const w = await mountApp()
    const ready = w.find('[data-testid="section-affordable"]').findAll('[data-testid="shop-row"]').find((r) => r.text().includes('Книга'))!
    expect(ready.find('[data-testid="claim-btn"]').exists()).toBe(true)
    const waiting = w.find('[data-testid="section-saving"]').findAll('[data-testid="shop-row"]').find((r) => r.text().includes('Кроссовки'))!
    expect(waiting.find('[data-testid="claim-btn"]').exists()).toBe(false)
    expect(waiting.find('[data-testid="claim-wait"]').text()).toContain('Выполни цель')
    expect(waiting.text()).toContain('Марафон')
    expect(waiting.text()).toContain('3 из 5')
    expect(waiting.find('[data-testid="row-left"]').exists()).toBe(false) // «осталось N» про цену тут не показываем
    await ready.find('[data-testid="claim-btn"]').trigger('click')
    await flushPromises()
    expect(h.claims[0].p_item_id).toBe('book')
  })
})

describe('Магазин: «Получить награду»', () => {
  it('нажатие вызывает claim_goal_reward с id вещи и сегодняшней датой, показывает плашку', async () => {
    const w = await mountApp()
    await card(w, 'Книга').find('[data-testid="claim-btn"]').trigger('click')
    await flushPromises()
    expect(h.claims).toHaveLength(1)
    expect(h.claims[0].p_item_id).toBe('book')
    expect(String(h.claims[0].p_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(w.find('[data-testid="claimed-toast"]').text()).toContain('Книга')
    expect(w.find('[data-testid="action-error"]').exists()).toBe(false)
  })

  it('база отказала (цель не выполнена, GR003) — понятный текст, без кода и технических слов', async () => {
    h.claimError = { code: 'GR003', message: 'Сначала выполните цель' }
    const w = await mountApp()
    await card(w, 'Книга').find('[data-testid="claim-btn"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="action-error"]').text()).toBe('Сначала выполни цель — тогда награда твоя.')
    expect(w.find('[data-testid="claimed-toast"]').exists()).toBe(false)
  })

  it('чужая ошибка (сеть) — общий понятный текст, а не сырой', async () => {
    h.claimError = { code: '', message: 'TypeError: Failed to fetch https://xyz.supabase.co' }
    const w = await mountApp()
    await card(w, 'Книга').find('[data-testid="claim-btn"]').trigger('click')
    await flushPromises()
    const txt = w.find('[data-testid="action-error"]').text()
    expect(txt.length).toBeGreaterThan(5)
    expect(txt).not.toContain('supabase')
    expect(txt).not.toContain('TypeError')
  })
})

describe('Магазин: форма хотелки «За огоньки / За цель»', () => {
  it('есть невыполненные цели → переключатель виден; в списке только невыполненные', async () => {
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    expect(w.find('[data-testid="pay-mode"]').exists()).toBe(true)
    await w.find('[data-testid="pay-goal"]').trigger('click')
    const opts = w.findAll('[data-testid="goal-select"] option').map((o) => o.text())
    expect(opts).toContain('Марафон')
    expect(opts).toContain('Выучить гитару')
    expect(opts).not.toContain('Прочитать роман') // выполненную привязать нельзя
    expect(w.find('[data-testid="scale"]').exists()).toBe(false) // цена и масштаб при «За цель» скрыты
    expect(w.find('[data-testid="cost-input"]').exists()).toBe(false)
  })

  it('миграция 111 не применена → переключателя нет, магазин работает как раньше', async () => {
    h.noGoalColumn = true
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    expect(w.find('[data-testid="pay-mode"]').exists()).toBe(false)
    expect(w.find('[data-testid="cost-input"]').exists()).toBe(true)
    expect(card(w, 'Кофе')).toBeTruthy()
  })

  it('нет невыполненных целей → переключателя нет, форма как раньше', async () => {
    h.goals = [{ id: 'g2', name: 'Готовая', stages: 1, done: true }]
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    expect(w.find('[data-testid="pay-mode"]').exists()).toBe(false)
    expect(w.find('[data-testid="cost-input"]').exists()).toBe(true)
  })

  it('«За цель» без выбранной цели — сообщение и ничего не сохраняется', async () => {
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    await w.find('input[type="text"]').setValue('Гитара')
    await w.find('[data-testid="pay-goal"]').trigger('click')
    await w.findAll('.modal-actions button').at(-1)!.trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="form-error"]').text()).toBe('Сначала выбери цель.')
    expect(h.inserts).toHaveLength(0)
  })

  it('сохранение «За цель»: в базу уходит goal_id, cost = 0 и cost_sparks = null', async () => {
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    await w.find('input[type="text"]').setValue('Гитара')
    await w.find('[data-testid="pay-goal"]').trigger('click')
    await w.find('[data-testid="goal-select"]').setValue('g3')
    await w.findAll('.modal-actions button').at(-1)!.trigger('click')
    await flushPromises()
    expect(h.inserts).toHaveLength(1)
    expect(h.inserts[0]).toMatchObject({ name: 'Гитара', goal_id: 'g3', cost: 0, cost_sparks: null, redeemed: false })
  })

  it('отказ базы при сохранении (GR002) — текст в форме, форма не закрывается', async () => {
    h.writeError = { code: 'GR002', message: 'Эта цель уже выполнена' }
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    await w.find('input[type="text"]').setValue('Гитара')
    await w.find('[data-testid="pay-goal"]').trigger('click')
    await w.find('[data-testid="goal-select"]').setValue('g3')
    await w.findAll('.modal-actions button').at(-1)!.trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="form-error"]').text()).toContain('уже выполнена')
    expect(w.find('.modal').exists()).toBe(true)
  })

  it('правка вещи «за цель»: открывается в режиме цели с выбранной целью; возврат «За огоньки» снимает привязку и задаёт цену', async () => {
    const w = await mountApp()
    await card(w, 'Кроссовки').find('[data-testid="edit-btn"]').trigger('click')
    expect((w.find('[data-testid="goal-select"]').element as HTMLSelectElement).value).toBe('g1')
    await w.find('[data-testid="pay-cost"]').trigger('click')
    await w.find('[data-testid="cost-input"]').setValue('12')
    await w.findAll('.modal-actions button').at(-1)!.trigger('click')
    await flushPromises()
    expect(h.updates).toHaveLength(1)
    expect(h.updates[0].id).toBe('shoes')
    expect(h.updates[0].values).toMatchObject({ goal_id: null, cost: 0, cost_sparks: 12 })
  })

  it('обычная хотелка сохраняется как раньше (goal_id = null не уходит в insert)', async () => {
    const w = await mountApp()
    await w.find('[data-testid="add-item"]').trigger('click')
    await w.find('input[type="text"]').setValue('Чай')
    await w.find('[data-testid="cost-input"]').setValue('8')
    await w.findAll('.modal-actions button').at(-1)!.trigger('click')
    await flushPromises()
    expect(h.inserts[0]).toMatchObject({ name: 'Чай', cost: 0, cost_sparks: 8 })
    expect(h.inserts[0]).not.toHaveProperty('goal_id')
  })

  it('полученную награду способ получения менять нельзя: переключателя нет', async () => {
    const w = await mountApp()
    await card(w, 'Часы').find('[data-testid="edit-btn"]').trigger('click')
    expect(w.find('[data-testid="pay-mode"]').exists()).toBe(false)
  })
})
