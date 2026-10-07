import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// Выдача монеток встроена в загрузку «Достижений» (v3.64): открыт значок первой цели (ступень 1 лесенки целей → 20 монеток) —
// ровно один upsert в achievement_bonuses; повторная загрузка ничего не шлёт; сбой выдачи страницу не ломает.
const h = vi.hoisted(() => ({
  have: [] as string[],
  selectError: false,
  upserts: [] as { table: string; rows: any[]; opts: any }[],
}))

vi.mock('./supabase', () => {
  function from(table: string) {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      range: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null }),
      upsert: (rows: any, opts: any) => {
        h.upserts.push({ table, rows, opts })
        return Promise.resolve({ error: null })
      },
      insert: () => Promise.resolve({ error: null }),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        if (table === 'achievement_bonuses') {
          const r = h.selectError ? { data: null, error: { message: 'relation "achievement_bonuses" does not exist' } } : { data: h.have.map((key) => ({ key })), error: null }
          return Promise.resolve(r).then(res, rej)
        }
        if (table === 'goals') {
          return Promise.resolve({ data: [{ points: 5, name: 'Цель', stages: [], done: true, current_stage: 0 }], error: null }).then(res, rej)
        }
        return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
      },
    }
    return chain
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from }, logout: vi.fn() }
})

import { useAchievements } from './useAchievements'

beforeEach(() => {
  localStorage.clear()
  h.have = []
  h.selectError = false
  h.upserts = []
})

describe('выдача монеток при загрузке «Достижений»', () => {
  it('открыт значок первой цели → один upsert в achievement_bonuses на 20 монеток; выданное видно в grantedCoins', async () => {
    const a = useAchievements()
    await a.init()
    await flushPromises()
    expect(a.error.value).toBeNull()
    const bonuses = h.upserts.filter((u) => u.table === 'achievement_bonuses')
    expect(bonuses).toHaveLength(1)
    expect(bonuses[0].opts).toEqual({ onConflict: 'user_id,key', ignoreDuplicates: true })
    expect(bonuses[0].rows).toContainEqual({ user_id: 'u1', key: 'first_goal', coins: 20 })
    expect(a.grantedCoins.value).toContainEqual({ key: 'first_goal', coins: 20 })
  })

  it('уже выданное повторно не шлётся (повторный заход на страницу)', async () => {
    h.have = ['first_goal']
    const a = useAchievements()
    await a.init()
    await flushPromises()
    expect(h.upserts.filter((u) => u.table === 'achievement_bonuses')).toHaveLength(0)
    expect(a.grantedCoins.value).toEqual([])
  })

  it('нет таблицы бонусов (миграция не применена): страница работает, значки открыты, монет не выдано', async () => {
    h.selectError = true
    const a = useAchievements()
    await a.init()
    await flushPromises()
    expect(a.error.value).toBeNull()
    expect(Object.keys(a.unlocked.value)).toContain('first_goal')
    expect(a.grantedCoins.value).toEqual([])
    expect(h.upserts.filter((u) => u.table === 'achievement_bonuses')).toHaveLength(0)
  })
})
