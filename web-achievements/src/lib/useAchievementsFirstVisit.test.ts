import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 52.1: у нового аккаунта первый заход в «Достижения» поздравляет, у старого — молча (история без «ливня» окон).
const h = vi.hoisted(() => ({ createdAt: '', tables: {} as Record<string, unknown[]>, upserts: [] as unknown[] }))
vi.mock('./supabase', () => {
  const chainFor = (table: string) => {
    const result = () => ({ data: h.tables[table] ?? [], error: null, count: (h.tables[table] ?? []).length })
    const chain: any = {
      select: () => chain, eq: () => chain, order: () => chain, range: () => chain, in: () => chain,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, height: null } : null, error: null }),
      upsert: (rows: unknown) => { h.upserts.push(rows); return Promise.resolve({ error: null }) },
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej),
    }
    return chain
  }
  return {
    sb: {
      from: (t: string) => chainFor(t),
      rpc: () => Promise.resolve({ data: [], error: null }),
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c', created_at: h.createdAt } } } }) },
    },
  }
})
import { useAchievements } from './useAchievements'

async function run(createdAt: string) {
  h.createdAt = createdAt
  const a = useAchievements()
  await a.init()
  return a
}

describe('useAchievements: первый заход', () => {
  beforeEach(() => {
    localStorage.clear()
    h.upserts = []
    h.tables = { workout_entries: [{ date: '2026-10-09' }], user_achievements: [] }
  })
  it('новый аккаунт: достижение за действие ДО первого захода — в newlyUnlocked (будет окно с наградой)', async () => {
    const a = await run(new Date(Date.now() - 3600_000).toISOString())
    expect(a.newlyUnlocked.value).toContain('first_workout')
    expect(a.unlocked.value.first_workout).toBeTruthy() // настоящая дата, не null
  })
  it('старый аккаунт: то же достижение открывается молча (дата null), окна нет', async () => {
    const a = await run('2025-01-01T00:00:00.000Z')
    expect(a.newlyUnlocked.value).toEqual([])
    expect('first_workout' in a.unlocked.value).toBe(true)
    expect(a.unlocked.value.first_workout).toBeNull()
  })
})
