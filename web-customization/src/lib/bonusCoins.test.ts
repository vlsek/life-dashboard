import { beforeEach, describe, expect, it, vi } from 'vitest'

// Поддельный Supabase: таблицы в памяти + журнал вызовов. h.fail — какие операции должны вернуть ошибку.
const h = vi.hoisted(() => ({
  session: { user: { id: 'u1', email: 'a@b.c' } } as { user: { id: string; email: string } } | null,
  rows: {} as Record<string, any[]>,
  rpc: {} as Record<string, { data?: any; error?: { message: string } | null }>,
  fail: new Set<string>(),
  calls: [] as { op: string; table: string; payload?: any }[],
}))
vi.mock('./supabase', () => {
  const chain = (table: string) => {
    let op = 'select'
    let payload: any
    const c: any = {
      select: () => c,
      eq: () => c,
      maybeSingle: () => Promise.resolve(h.fail.has('select:' + table) ? { data: null, error: { message: 'no table' } } : { data: (h.rows[table] || [])[0] ?? null, error: null }),
      insert: (p: any) => { op = 'insert'; payload = p; h.calls.push({ op, table, payload }); return Promise.resolve(h.fail.has('insert:' + table) ? { error: { message: 'insert failed' } } : { error: null }) },
      upsert: (p: any) => { op = 'upsert'; payload = p; h.calls.push({ op, table, payload }); return Promise.resolve(h.fail.has('upsert:' + table) ? { error: { message: 'upsert failed' } } : { error: null }) },
      update: (p: any) => { op = 'update'; payload = p; h.calls.push({ op, table, payload }); return { eq: () => Promise.resolve(h.fail.has('update:' + table) ? { error: { message: 'update failed' } } : { error: null }) } },
      delete: () => { op = 'delete'; h.calls.push({ op, table }); return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) } },
      then: (res: (v: unknown) => unknown) => Promise.resolve(h.fail.has('select:' + table) ? { data: null, error: { message: 'no table' } } : { data: h.rows[table] || [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: h.session } }) }, from: chain, rpc: (name: string) => Promise.resolve(h.rpc[name] ?? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + name } }) } }
})

import { useCustomization } from './useCustomization'
import { composeBalance, ITEMS, priceOf } from './customization'

// BACKLOG раздел 37: бонусные монеты за достижения (миграция 051) входят в баланс покупок «Кастомизации». В лидерборд они НЕ входят
// (get_leaderboard_period не менялась), поэтому добавляются здесь явно.
function setup(over: { total?: number; spent?: number; bonus?: unknown[] } = {}) {
  h.rows = {
    profiles: [{ onboarded: true, customization: {} }],
    user_customizations: [],
    user_achievements: [],
    shop_items: over.spent ? [{ cost: over.spent }] : [],
    achievement_bonuses: (over.bonus ?? []).map((coins) => ({ coins })),
  }
  h.rpc = { get_leaderboard_period: { data: [{ user_id: 'u1', total_points: over.total ?? 250 }, { user_id: 'other', total_points: 9999 }], error: null } }
  h.fail = new Set()
  h.calls = []
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.session = { user: { id: 'u1', email: 'a@b.c' } }
})

describe('composeBalance', () => {
  it('набрано + бонус − потрачено, в десятых долях без хвоста плавающей точки', () => {
    expect(composeBalance(250, 100, [20, '50.0'])).toBe(220)
    expect(composeBalance(0, 0, [0.1, 0.2, 0.3])).toBe(0.6)
    expect(composeBalance(12.3, 0.1)).toBe(12.2)
  })
  it('пустые, null и мусорные значения бонуса — нули; без бонуса — как раньше', () => {
    expect(composeBalance(10, 3, [null, 'x', Number.NaN])).toBe(7)
    expect(composeBalance(10, 3)).toBe(7)
  })
})

describe('баланс «Кастомизации» с бонусом', () => {
  it('баланс = лидерборд (без бонуса) + бонусные монеты − потраченное', async () => {
    setup({ total: 250, spent: 100, bonus: [20, '50.0'] })
    const c = useCustomization()
    await c.init()
    expect(c.balance.value).toBe(220)
  })
  it('таблицы бонусов ещё нет (миграция 051 не применена) — баланс как раньше, без ошибки', async () => {
    setup({ total: 250, spent: 70, bonus: [20] })
    h.fail.add('select:achievement_bonuses')
    const c = useCustomization()
    await c.init()
    expect(c.balance.value).toBe(180)
    expect(c.error.value).toBeNull()
  })
  it('бонус позволяет купить предмет, на который одних баллов не хватало, и списание идёт из общего баланса', async () => {
    const price = priceOf(ITEMS.find((i) => i.key === 'frame_neon')!) ?? 0
    expect(price).toBeGreaterThan(0)
    setup({ total: price - 5, bonus: [5] }) // баллов ровно на 5 меньше цены; бонус добирает
    const c = useCustomization()
    await c.init()
    expect(c.balance.value).toBe(price)
    expect(await c.buy('frame_neon')).toBe(true)
    expect(c.balance.value).toBe(0)
  })
  it('без бонуса те же баллы не покупают (контроль к предыдущему тесту)', async () => {
    const price = priceOf(ITEMS.find((i) => i.key === 'frame_neon')!) ?? 0
    setup({ total: price - 5 })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_neon')).toBe(false)
  })
})
