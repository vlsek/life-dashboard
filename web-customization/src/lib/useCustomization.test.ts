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
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: h.session } }) }, from: chain, rpc: (name: string) => Promise.resolve(h.rpc[name] ?? { data: null, error: { message: 'no rpc' } }) } }
})

import { useCustomization } from './useCustomization'

function setup(over: { total?: number; spent?: number; owned?: any[]; selected?: any; achievements?: string[] } = {}) {
  h.rows = {
    profiles: [{ onboarded: true, customization: over.selected ?? {} }],
    user_customizations: over.owned ?? [],
    user_achievements: (over.achievements ?? []).map((key) => ({ key })),
    shop_items: over.spent ? [{ cost: over.spent }] : [],
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

describe('загрузка', () => {
  it('баланс = мои баллы из лидерборда минус потраченное в магазине', async () => {
    setup({ total: 250, spent: 70 })
    const c = useCustomization()
    await c.init()
    expect(c.balance.value).toBe(180)
    expect(c.apiMissing.value).toBe(false)
  })
  it('нет get_leaderboard_period (046) — запасной get_leaderboard', async () => {
    setup({ total: 120 })
    h.rpc = { get_leaderboard: { data: [{ user_id: 'u1', total_points: 120 }], error: null } }
    const c = useCustomization()
    await c.init()
    expect(c.balance.value).toBe(120)
  })
  it('баланс не посчитать — null, покупка отключена', async () => {
    setup()
    h.rpc = {}
    const c = useCustomization()
    await c.init()
    expect(c.balance.value).toBeNull()
    expect(await c.buy('frame_neon')).toBe(false)
  })
  it('нет таблицы (048 не применена) — витрина без покупок, apiMissing', async () => {
    setup()
    h.fail.add('select:user_customizations')
    const c = useCustomization()
    await c.init()
    expect(c.apiMissing.value).toBe(true)
    expect(await c.buy('frame_neon')).toBe(false)
    expect(await c.choose('avatar_frame', 'frame_neon')).toBe(false)
  })
  it('нет сессии — редирект на вход', async () => {
    setup()
    h.session = null
    const c = useCustomization()
    await c.init()
    expect(c.auth.value.status).toBe('redirecting')
  })
})

describe('награда за достижение', () => {
  it('полученное достижение открывает предмет само и записывает его как «achievement»', async () => {
    setup({ achievements: ['streak_30', '_baseline'] })
    const c = useCustomization()
    await c.init()
    expect(c.statusOf('frame_gold')).toBe('owned')
    const up = h.calls.find((x) => x.op === 'upsert' && x.table === 'user_customizations')
    expect(up?.payload).toEqual([{ user_id: 'u1', item_key: 'frame_gold', source: 'achievement' }])
  })
  it('без достижения предмет закрыт', async () => {
    setup({ achievements: ['streak_5'] })
    const c = useCustomization()
    await c.init()
    expect(c.statusOf('frame_gold')).toBe('locked')
    expect(h.calls.some((x) => x.op === 'upsert')).toBe(false)
  })
})

describe('покупка и выбор', () => {
  it('покупка: открывает предмет, списывает цену строкой в shop_items (выкуплено), уменьшает баланс', async () => {
    setup({ total: 250 })
    const c = useCustomization()
    await c.init()
    expect(c.statusOf('frame_neon')).toBe('buyable')
    expect(await c.buy('frame_neon')).toBe(true)
    expect(c.statusOf('frame_neon')).toBe('owned')
    expect(c.balance.value).toBe(150)
    const spend = h.calls.find((x) => x.table === 'shop_items')!
    expect(spend.payload).toMatchObject({ user_id: 'u1', cost: 100, redeemed: true })
    expect(spend.payload.name).toContain('Неоновая рамка')
    expect(spend.payload.redeemed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('не хватает баллов — покупка не происходит', async () => {
    setup({ total: 50 })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_neon')).toBe(false)
    expect(h.calls.some((x) => x.op === 'insert')).toBe(false)
  })
  it('списание не удалось — открытие откатывается, баланс прежний, показана ошибка', async () => {
    setup({ total: 250 })
    const c = useCustomization()
    await c.init()
    h.fail.add('insert:shop_items')
    expect(await c.buy('frame_neon')).toBe(false)
    expect(h.calls.some((x) => x.op === 'delete' && x.table === 'user_customizations')).toBe(true)
    expect(c.statusOf('frame_neon')).toBe('buyable')
    expect(c.balance.value).toBe(250)
    expect(c.actionError.value).toContain('Не удалось совершить покупку')
  })
  it('предмет за достижение купить нельзя', async () => {
    setup({ total: 99999 })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_gold')).toBe(false)
  })
  it('надеть открытое и снять; запись в profiles.customization', async () => {
    setup({ owned: [{ item_key: 'frame_neon', source: 'points', unlocked_at: null }] })
    const c = useCustomization()
    await c.init()
    expect(await c.choose('avatar_frame', 'frame_neon')).toBe(true)
    expect(c.statusOf('frame_neon')).toBe('selected')
    expect(h.calls.at(-1)?.payload).toEqual({ customization: { avatar_frame: 'frame_neon' } })
    expect(await c.choose('avatar_frame', null)).toBe(true)
    expect(c.statusOf('frame_neon')).toBe('owned')
    expect(h.calls.at(-1)?.payload).toEqual({ customization: {} })
  })
  it('закрытое надеть нельзя; сбой записи выбора — выбор не меняется и есть ошибка', async () => {
    setup({ owned: [{ item_key: 'frame_neon', source: 'points', unlocked_at: null }] })
    const c = useCustomization()
    await c.init()
    expect(await c.choose('avatar_frame', 'frame_aurora')).toBe(false)
    h.fail.add('update:profiles')
    expect(await c.choose('avatar_frame', 'frame_neon')).toBe(false)
    expect(c.statusOf('frame_neon')).toBe('owned')
    expect(c.actionError.value).toContain('Не удалось сохранить выбор')
  })
  it('сохранённый выбор подхватывается при загрузке; неизвестные ключи в базе игнорируются', async () => {
    setup({ owned: [{ item_key: 'frame_neon', source: 'points', unlocked_at: null }, { item_key: 'old_item', source: 'points', unlocked_at: null }], selected: { avatar_frame: 'frame_neon' } })
    const c = useCustomization()
    await c.init()
    expect(c.statusOf('frame_neon')).toBe('selected')
    expect(Object.keys(c.unlocked.value)).toEqual(['frame_neon'])
  })
})
