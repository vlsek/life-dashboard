import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 47.6 срез 2 (миграция 060): покупка и выдача наград — через серверные функции; прямая запись клиентом не используется.
const h = vi.hoisted(() => ({
  rows: {} as Record<string, any[]>,
  rpc: {} as Record<string, { data?: any; error?: { code?: string; message: string } | null }>,
  rpcCalls: [] as { name: string; args?: any }[],
  writes: [] as { op: string; table: string }[],
}))
vi.mock('./supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      maybeSingle: () => Promise.resolve({ data: (h.rows[table] || [])[0] ?? null, error: null }),
      insert: () => { h.writes.push({ op: 'insert', table }); return Promise.resolve({ error: null }) },
      upsert: () => { h.writes.push({ op: 'upsert', table }); return Promise.resolve({ error: null }) },
      update: () => { h.writes.push({ op: 'update', table }); return { eq: () => Promise.resolve({ error: null }) } },
      delete: () => { h.writes.push({ op: 'delete', table }); return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) } },
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: h.rows[table] || [], error: null }).then(res),
    }
    return c
  }
  return {
    sb: {
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
      from: chain,
      rpc: (name: string, args?: any) => { h.rpcCalls.push({ name, args }); return Promise.resolve(h.rpc[name] ?? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + name } }) },
    },
  }
})
import { isFunctionMissing, useCustomization } from './useCustomization'

function setup(over: { total?: number; achievements?: string[]; owned?: any[] } = {}, rpc: typeof h.rpc = {}) {
  h.rows = {
    profiles: [{ onboarded: true, customization: {} }],
    user_customizations: over.owned ?? [],
    user_achievements: (over.achievements ?? []).map((key) => ({ key })),
    shop_items: [],
  }
  h.rpc = { get_leaderboard_period: { data: [{ user_id: 'u1', total_points: over.total ?? 250 }], error: null }, ...rpc }
  h.rpcCalls = []
  h.writes = []
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('isFunctionMissing', () => {
  it('распознаёт «функции нет» (PostgREST, Postgres, текст) и не путает с обычными ошибками', () => {
    expect(isFunctionMissing({ code: 'PGRST202', message: 'x' })).toBe(true)
    expect(isFunctionMissing({ code: '42883', message: 'x' })).toBe(true)
    expect(isFunctionMissing({ message: 'Could not find the function public.buy_customization' })).toBe(true)
    expect(isFunctionMissing({ code: 'CU004', message: 'Не хватает баллов' })).toBe(false)
    expect(isFunctionMissing({ code: '23505', message: 'dup' })).toBe(false)
    expect(isFunctionMissing(null)).toBe(false)
  })
})

describe('покупка через сервер', () => {
  it('вызывает buy_customization с ключом и подписью; цену не передаёт; прямых записей нет; баланс — серверный', async () => {
    setup({ total: 250 }, { buy_customization: { data: [{ item: 'frame_neon', spent: 100, new_balance: 148.5 }], error: null } })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_neon')).toBe(true)
    const call = h.rpcCalls.find((x) => x.name === 'buy_customization')!
    expect(call.args.p_item_key).toBe('frame_neon')
    expect(call.args.p_label).toContain('Неоновая рамка')
    expect(Object.keys(call.args).sort()).toEqual(['p_item_key', 'p_label']) // цены в запросе нет — её знает только сервер
    expect(h.writes).toEqual([]) // ни insert в user_customizations, ни insert в shop_items с клиента
    expect(c.statusOf('frame_neon')).toBe('owned')
    expect(c.balance.value).toBe(148.5) // не «250 − 100», а то, что посчитал сервер
  })

  it('отказ сервера («не хватает баллов») — предмет не открывается, баланс прежний, показана ошибка, прежний путь НЕ запускается', async () => {
    setup({ total: 250 }, { buy_customization: { data: null, error: { code: 'CU004', message: 'Не хватает баллов' } } })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_neon')).toBe(false)
    expect(c.statusOf('frame_neon')).toBe('buyable')
    expect(c.balance.value).toBe(250)
    expect(c.actionError.value).toBeTruthy()
    expect(h.writes).toEqual([]) // при отказе сервера клиент не пытается записать сам
  })

  it('«уже куплено» (другая вкладка) — список перечитывается, предмет показан как полученный', async () => {
    setup({ total: 250 }, { buy_customization: { data: null, error: { code: '23505', message: 'Предмет уже куплен' } } })
    const c = useCustomization()
    await c.init()
    h.rows.user_customizations = [{ item_key: 'frame_neon', source: 'points', unlocked_at: '2026-10-09' }]
    expect(await c.buy('frame_neon')).toBe(false)
    expect(c.statusOf('frame_neon')).toBe('owned')
  })

  it('сервер без функции (миграция 060 не применена) — работает прежний путь, как раньше', async () => {
    setup({ total: 250 })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_neon')).toBe(true)
    expect(h.writes.map((w) => w.table + ':' + w.op)).toEqual(['user_customizations:insert', 'shop_items:insert'])
    expect(c.balance.value).toBe(150)
  })

  it('награду-предмет купить нельзя и без обращения к серверу', async () => {
    setup({ total: 9999 })
    const c = useCustomization()
    await c.init()
    expect(await c.buy('frame_gold')).toBe(false)
    expect(h.rpcCalls.some((x) => x.name === 'buy_customization')).toBe(false)
  })
})

describe('награды за достижения через сервер', () => {
  it('claim_achievement_items открывает предмет; прямой upsert не вызывается', async () => {
    setup({ achievements: ['streak_30'] }, { claim_achievement_items: { data: ['frame_gold'], error: null } })
    const c = useCustomization()
    await c.init()
    expect(c.statusOf('frame_gold')).toBe('owned')
    expect(h.rpcCalls.some((x) => x.name === 'claim_achievement_items')).toBe(true)
    expect(h.writes).toEqual([])
  })
  it('сервер вернул лишнее, чего у клиента нет в списке наград, — не открываем то, чего не просили', async () => {
    setup({ achievements: ['streak_30'] }, { claim_achievement_items: { data: ['frame_gold', 'frame_inferno'], error: null } })
    const c = useCustomization()
    await c.init()
    expect(c.statusOf('frame_gold')).toBe('owned')
    expect(c.statusOf('frame_inferno')).not.toBe('owned')
  })
  it('сервер без функции — прежний upsert; другая ошибка сервера — ничего не пишем и пробуем позже', async () => {
    setup({ achievements: ['streak_30'] })
    let c = useCustomization()
    await c.init()
    expect(h.writes).toEqual([{ op: 'upsert', table: 'user_customizations' }])
    setup({ achievements: ['streak_30'] }, { claim_achievement_items: { data: null, error: { code: '28000', message: 'Нужно войти' } } })
    c = useCustomization()
    await c.init()
    expect(h.writes).toEqual([])
    expect(c.statusOf('frame_gold')).toBe('locked')
  })
})
