import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG раздел 37: бонусные монеты за достижения (миграция 051) в балансе Магазина. На карточке «заработано − потрачено = баланс» должно сходиться,
// поэтому в Магазине «заработано всего» включает награды; в «накоплено баллов» для значков и в лидерборд бонус не входит (там другой расчёт).
const h = vi.hoisted(() => ({ bonus: [] as { coins: number | string | null }[], bonusError: false, goals: [{ points: 5 }], spent: [] as { cost: number }[] }))
vi.mock('./supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      const res = () => {
        if (table === 'achievement_bonuses') return Promise.resolve(h.bonusError ? { data: null, error: { message: 'relation "achievement_bonuses" does not exist', code: '42P01' } } : { data: h.bonus, error: null })
        if (table === 'goals') return Promise.resolve({ data: h.goals, error: null })
        if (table === 'shop_items') return Promise.resolve({ data: h.spent, error: null })
        return Promise.resolve({ data: [], error: null })
      }
      for (const m of ['select', 'eq', 'order']) chain[m] = () => chain
      chain.maybeSingle = () => Promise.resolve({ data: { onboarded: true }, error: null })
      chain.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => res().then(ok, bad)
      return chain
    },
  },
}))
vi.mock('./fetchAll', () => ({ fetchAllRows: vi.fn(async () => ({ rows: [], error: null })) }))
vi.mock('./waterGoal', () => ({ withWaterGoal: vi.fn(async (_u: string, m: unknown[]) => m) }))

import { calcBalanceFromTotals } from './points'
import { useShop } from './useShop'

beforeEach(() => {
  h.bonus = []
  h.bonusError = false
  h.goals = [{ points: 5 }]
  h.spent = []
})

describe('calcBalanceFromTotals с бонусом', () => {
  it('«заработано всего» включает награды, и «заработано − потрачено = баланс» сходится', () => {
    const r = calcBalanceFromTotals(10, [40], [20, 50])
    expect(r).toEqual({ total: 80, spent: 40, bonus: 70, balance: 40 })
    expect(r.total - r.spent).toBe(r.balance)
  })
  it('десятые доли точны: 0,1 + 0,2 + 0,3 — ровно 0,6', () => {
    expect(calcBalanceFromTotals(0, [], [0.1, 0.2, 0.3])).toEqual({ total: 0.6, spent: 0, bonus: 0.6, balance: 0.6 })
  })
  it('без бонуса — как раньше; null-значения — нули', () => {
    expect(calcBalanceFromTotals(6.8, [2])).toEqual({ total: 6.8, spent: 2, bonus: 0, balance: 4.8 })
    expect(calcBalanceFromTotals(5, [], [null, 0]).balance).toBe(5)
  })
})

describe('useShop: баланс с бонусом', () => {
  it('читает бонусы из achievement_bonuses (в т. ч. numeric строкой) и добавляет к балансу', async () => {
    h.bonus = [{ coins: 20 }, { coins: '50.0' }]
    h.spent = [{ cost: 30 }]
    const api = useShop()
    await api.init()
    expect(api.balance.value).toEqual({ total: 75, spent: 30, bonus: 70, balance: 45 }) // цель 5 + бонус 70 − покупка 30
  })
  it('таблицы бонусов ещё нет (миграция не применена) — баланс как раньше, без ошибки', async () => {
    h.bonusError = true
    const api = useShop()
    await api.init()
    expect(api.error.value).toBeNull()
    expect(api.balance.value).toEqual({ total: 5, spent: 0, bonus: 0, balance: 5 })
  })
  it('без бонусов — как раньше', async () => {
    const api = useShop()
    await api.init()
    expect(api.balance.value).toEqual({ total: 5, spent: 0, bonus: 0, balance: 5 })
  })
})
