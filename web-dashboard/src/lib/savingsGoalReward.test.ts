import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 68.2 срез 4: «награда за цель» (shop_items.goal_id, миграция 111) не предлагается в виджете «Коплю на товар»: цены у неё нет,
// она открывается выполнением цели. Пока миграции нет и колонки goal_id нет — запрос с ней падает, и виджет тихо повторяет его без колонки.
const db = vi.hoisted(() => ({ calls: [] as string[], withGoal: { data: [] as unknown[], error: null as unknown }, withoutGoal: { data: [] as unknown[], error: null as unknown }, single: { data: null as unknown, error: null as unknown } }))
vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      let cols = ''
      const chain: Record<string, unknown> = {
        select: (c: string) => ((cols = c), chain),
        eq: () => chain,
        order: () => (db.calls.push(cols), Promise.resolve(cols.includes('goal_id') ? db.withGoal : db.withoutGoal)),
        maybeSingle: () => (db.calls.push(cols), Promise.resolve(cols.includes('goal_id') ? db.single : { data: db.single.data ? { ...(db.single.data as object), goal_id: undefined } : null, error: null })),
      }
      return chain
    },
  },
}))
vi.mock('./loadBalance', () => ({ loadBalance: vi.fn(() => Promise.resolve({ ok: true, balance: 50 })) }))
import { loadOpenShopItems, useSavingsWidget } from './savingsWidget'

const row = (over: Record<string, unknown> = {}) => ({ id: 'i1', name: 'Наушники', cost: 100, link: null, redeemed: false, goal_id: null, ...over })

beforeEach(() => {
  db.calls = []
  db.withGoal = { data: [], error: null }
  db.withoutGoal = { data: [], error: null }
  db.single = { data: row(), error: null }
})

describe('loadOpenShopItems: награды за цель не предлагаются', () => {
  it('вещь с goal_id пропускается, обычные остаются', async () => {
    db.withGoal = { data: [row(), row({ id: 'g1', name: 'Кроссовки', cost: 0, goal_id: 'goal-1' }), row({ id: 'i2', name: 'Книга' })], error: null }
    expect((await loadOpenShopItems('u1')).map((o) => o.id)).toEqual(['i1', 'i2'])
    expect(db.calls).toHaveLength(1)
    expect(db.calls[0]).toContain('goal_id')
  })

  it('колонки goal_id нет (миграция 111 не применена) → повтор без неё, список как раньше', async () => {
    db.withGoal = { data: [], error: { code: '42703', message: 'column shop_items.goal_id does not exist' } }
    db.withoutGoal = { data: [row(), row({ id: 'i2', name: 'Книга' })], error: null }
    expect((await loadOpenShopItems('u1')).map((o) => o.id)).toEqual(['i1', 'i2'])
    expect(db.calls).toHaveLength(2)
    expect(db.calls[1]).not.toContain('goal_id')
  })

  it('обе попытки упали → пустой список, окно не ломается', async () => {
    db.withGoal = { data: [], error: { message: 'boom' } }
    db.withoutGoal = { data: [], error: { message: 'boom' } }
    expect(await loadOpenShopItems('u1')).toEqual([])
  })
})

describe('useSavingsWidget: выбранная вещь стала наградой за цель', () => {
  it('награда за цель → состояние empty (копить не на что); обычная вещь → ready', async () => {
    const w = useSavingsWidget()
    db.single = { data: row({ id: 'g1', cost: 0, goal_id: 'goal-1' }), error: null }
    await w.load('u1', 'g1')
    expect(w.state.value).toBe('empty')
    expect(w.item.value).toBeNull()
    db.single = { data: row(), error: null }
    await w.load('u1', 'i1')
    expect(w.state.value).toBe('ready')
    expect(w.item.value?.name).toBe('Наушники')
  })
})
