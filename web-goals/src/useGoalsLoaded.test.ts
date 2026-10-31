import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 74.3/73.5 срез 3b: флаг loaded настоящего useGoals — false до ответа, true после успеха И после ошибки (иначе вечная «Загрузка…»).
// Тот же try/finally-обёртка (scripts/apply_loading_state.py) стоит в useChallenges / useMilestones / useSkills / useBooks.
const h = vi.hoisted(() => ({ gate: null as null | Promise<void>, release: null as null | (() => void), fail: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, range: () => chain, not: () => chain, neq: () => chain, is: () => chain, in: () => chain, gte: () => chain, lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          (table === 'goals' && h.gate ? h.gate : Promise.resolve()).then(() => (table === 'goals' && h.fail ? { data: null, error: { message: 'Failed to fetch' } } : { data: [], error: null })).then(res, rej),
      }
      return chain
    },
  },
}))
import { useGoals } from './lib/useGoals'

beforeEach(() => {
  h.fail = false
  h.gate = new Promise<void>((r) => (h.release = r))
})

describe('useGoals: флаг loaded', () => {
  it('false, пока цели грузятся; true после ответа', async () => {
    const g = useGoals()
    const p = g.init()
    for (let i = 0; i < 6; i++) await Promise.resolve()
    expect(g.loaded.value).toBe(false)
    h.release!()
    await p
    expect(g.loaded.value).toBe(true)
    expect(g.error.value).toBeNull()
  })

  it('после ошибки загрузки тоже true (ошибку показывает LoadError, а не вечная «Загрузка…»)', async () => {
    h.fail = true
    const g = useGoals()
    const p = g.init()
    h.release!()
    await p
    expect(g.loaded.value).toBe(true)
    expect(g.error.value).toBeTruthy()
  })
})
