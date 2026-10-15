import { beforeEach, describe, expect, it, vi } from 'vitest'

// Поддельный Supabase: таблицы в памяти + журнал вызовов. h.fail — какие операции должны вернуть ошибку.
const h = vi.hoisted(() => ({
  session: { user: { id: 'u1', email: 'a@b.c' } } as { user: { id: string; email: string } } | null,
  rows: {} as Record<string, any[]>,
  rpc: {} as Record<string, { data?: any; error?: { code?: string; message: string } | null }>,
  fail: new Set<string>(),
  calls: [] as { op: string; table: string; payload?: any }[],
  rpcCalls: [] as { name: string; args?: any }[],
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
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: h.session } }) }, from: chain, rpc: (name: string, args?: any) => { h.rpcCalls.push({ name, args }); return Promise.resolve(h.rpc[name] ?? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + name } }) } } }
})

import { useCustomization } from './useCustomization'

function setup(over: { total?: number; spent?: number; owned?: any[]; selected?: any; achievements?: string[]; debug?: boolean } = {}) {
  h.rows = {
    profiles: [{ onboarded: true, customization: over.selected ?? {}, debug_mode: over.debug }],
    user_customizations: over.owned ?? [],
    user_achievements: (over.achievements ?? []).map((key) => ({ key })),
    shop_items: over.spent ? [{ cost: over.spent }] : [],
  }
  h.rpc = { get_leaderboard_period: { data: [{ user_id: 'u1', total_points: over.total ?? 250 }, { user_id: 'other', total_points: 9999 }], error: null } }
  h.fail = new Set()
  h.calls = []
  h.rpcCalls = []
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

describe('надеть/снять рамку — без обновления страницы (BACKLOG 43, 9:41)', () => {
  it('после успешной записи сообщает новый выбор; при ошибке записи — молчит', async () => {
    const { onCustomizationChanged } = await import('./customizationEvents')
    const got: unknown[] = []
    const off = onCustomizationChanged((d) => got.push(d))
    setup({ total: 500, owned: [{ item_key: 'frame_neon' }] })
    const c = useCustomization()
    await c.init()
    expect(await c.choose('avatar_frame', 'frame_neon')).toBe(true)
    expect(got).toContainEqual({ avatar_frame: 'frame_neon' })
    expect(await c.choose('avatar_frame', null)).toBe(true)
    expect(got).toContainEqual({ avatar_frame: null })
    const n = got.length
    h.fail = new Set(['update:profiles', 'upsert:profiles'])
    await c.choose('avatar_frame', 'frame_neon')
    expect(got.length).toBe(n)
    off()
  })
})

// 47.6 срез 5b: «Примерить» в режиме отладки — ТОЛЬКО на клиенте (отчёт docs/SECURITY_AUDIT_47_6.md): ничего не пишется на сервер, баланс и покупки не трогаются.
describe('примерка (режим отладки)', () => {
  const serverWrites = () => h.calls.filter((c) => c.op !== 'select')

  it('режим отладки читается из profiles.debug_mode; нет значения (колонки нет, миграция 066) — false', async () => {
    setup({ debug: true })
    const on = useCustomization()
    await on.init()
    expect(on.debug.value).toBe(true)
    setup()
    const off = useCustomization()
    await off.init()
    expect(off.debug.value).toBe(false)
  })

  it('без режима отладки tryOn ничего не делает', async () => {
    setup({ total: 0 })
    const c = useCustomization()
    await c.init()
    expect(c.tryOn('day_gauge', 'day_glow')).toBe(false)
    expect(c.tried.value).toEqual({})
    expect(localStorage.getItem('site_day_gauge')).toBeNull()
  })

  it('примерка закрытого предмета: виден локально (кэш страниц), на сервер НЕ пишется, выбор и покупки не меняются', async () => {
    setup({ debug: true, total: 0 })
    const c = useCustomization()
    await c.init()
    h.calls = []
    h.rpcCalls = []
    expect(c.statusOf('day_glow')).not.toBe('owned')
    expect(c.tryOn('day_gauge', 'day_glow')).toBe(true)
    expect(c.tried.value).toEqual({ day_gauge: 'day_glow' })
    expect(localStorage.getItem('site_day_gauge')).not.toBeNull() // страницы применят вид по кэшу
    expect(serverWrites()).toEqual([]) // ни update profiles, ни insert/upsert user_customizations / shop_items
    expect(h.rpcCalls).toEqual([])
    expect(c.selected.value).toEqual({}) // серверный выбор не тронут
    expect(c.statusOf('day_glow')).not.toBe('selected')
  })

  it('чужая категория или несуществующий предмет — отказ', async () => {
    setup({ debug: true })
    const c = useCustomization()
    await c.init()
    expect(c.tryOn('avatar_frame', 'day_glow')).toBe(false)
    expect(c.tryOn('day_gauge', 'нет_такого')).toBe(false)
    expect(c.tried.value).toEqual({})
  })

  it('«Снять примерку» и «Сбросить» откатывают кэш к серверному выбору', async () => {
    setup({ debug: true, selected: { day_gauge: 'day_thick' }, owned: [{ item_key: 'day_thick', source: 'points', unlocked_at: null }] })
    const c = useCustomization()
    await c.init()
    const real = localStorage.getItem('site_day_gauge')
    c.tryOn('day_gauge', 'day_glow')
    expect(localStorage.getItem('site_day_gauge')).not.toBe(real)
    expect(c.untryOn('day_gauge')).toBe(true)
    expect(localStorage.getItem('site_day_gauge')).toBe(real)
    expect(c.untryOn('day_gauge')).toBe(false)
    c.tryOn('day_gauge', 'day_glow')
    c.resetTryOn()
    expect(c.tried.value).toEqual({})
    expect(localStorage.getItem('site_day_gauge')).toBe(real)
  })

  it('настоящий выбор в той же категории перекрывает примерку; примерки других категорий остаются', async () => {
    setup({ debug: true, owned: [{ item_key: 'day_thick', source: 'points', unlocked_at: null }] })
    const c = useCustomization()
    await c.init()
    c.tryOn('day_gauge', 'day_glow')
    c.tryOn('week_gauge', 'week_wave')
    expect(await c.choose('day_gauge', 'day_thick')).toBe(true)
    expect(c.tried.value).toEqual({ week_gauge: 'week_wave' })
    expect(c.selected.value).toEqual({ day_gauge: 'day_thick' })
    expect(h.calls.filter((x) => x.op === 'update').length).toBe(1) // записан только настоящий выбор
  })

  it('перезагрузка (load) сбрасывает примерку и возвращает кэш к серверному выбору', async () => {
    setup({ debug: true })
    const c = useCustomization()
    await c.init()
    c.tryOn('day_gauge', 'day_glow')
    expect(localStorage.getItem('site_day_gauge')).not.toBeNull()
    await c.init() // повторная загрузка данных на той же странице
    expect(c.tried.value).toEqual({})
    expect(localStorage.getItem('site_day_gauge')).toBeNull()
  })
})
