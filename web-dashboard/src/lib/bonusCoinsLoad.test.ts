import { beforeEach, describe, expect, it, vi } from 'vitest'

// Загрузка баланса и журнала с бонусными монетами (миграция 051): бонус читается из achievement_bonuses; нет таблицы — бонус 0, остальное не ломается.
const h = vi.hoisted(() => ({ bonus: [] as { key?: string; coins: number | string; granted_at?: string }[], bonusError: false, goals: [{ points: 5 }] }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      const res = () => {
        if (table === 'achievement_bonuses') return Promise.resolve(h.bonusError ? { data: null, error: { message: 'relation "achievement_bonuses" does not exist', code: '42P01' } } : { data: h.bonus, error: null })
        if (table === 'goals') return Promise.resolve({ data: h.goals, error: null })
        return Promise.resolve({ data: [], error: null })
      }
      for (const m of ['select', 'eq', 'gte', 'lte', 'order']) chain[m] = () => chain
      chain.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => res().then(ok, bad)
      return chain
    },
  },
}))
vi.mock('./fetchAll', () => ({ fetchAllRows: vi.fn(async () => ({ rows: [], error: null })) }))
vi.mock('./waterGoal', () => ({ withWaterGoal: vi.fn(async (_u: string, m: unknown[]) => m) }))

import { loadBalance } from './loadBalance'
import { usePointsLog } from './usePointsLog'
import { fmtDate } from './date'

beforeEach(() => {
  h.bonus = []
  h.bonusError = false
  h.goals = [{ points: 5 }]
})

describe('loadBalance с бонусом', () => {
  it('баланс = накоплено (цель 5) + бонусы (20 и «50» строкой из numeric)', async () => {
    h.bonus = [{ coins: 20 }, { coins: '50.0' }]
    expect(await loadBalance('u1')).toEqual({ ok: true, balance: 75 })
  })
  it('таблицы бонусов ещё нет (миграция не применена) — баланс как раньше, без ошибки', async () => {
    h.bonusError = true
    expect(await loadBalance('u1')).toEqual({ ok: true, balance: 5 })
  })
  it('без бонусов — как раньше', async () => {
    expect(await loadBalance('u1')).toEqual({ ok: true, balance: 5 })
  })
})

describe('usePointsLog с бонусом', () => {
  it('награда за сегодня показывается строкой и входит в «заработано сегодня»', async () => {
    h.bonus = [{ key: 'words_10', coins: 20, granted_at: new Date().toISOString() }]
    const api = usePointsLog('u1')
    await api.load()
    expect(api.error.value).toBeNull()
    const today = api.log.value!.days[0]
    expect(today.date).toBe(fmtDate(new Date()))
    expect(today.entries.filter((e) => e.kind === 'bonus').map((e) => e.points)).toEqual([20])
    expect(api.log.value!.earnedToday).toBeGreaterThanOrEqual(20)
  })
  it('нет таблицы бонусов — журнал строится без наград и без ошибки', async () => {
    h.bonusError = true
    const api = usePointsLog('u1')
    await api.load()
    expect(api.error.value).toBeNull()
    expect(api.log.value!.days.flatMap((d) => d.entries).filter((e) => e.kind === 'bonus')).toEqual([])
  })
})
