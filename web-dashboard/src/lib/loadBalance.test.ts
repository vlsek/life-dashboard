import { beforeEach, describe, expect, it, vi } from 'vitest'

// Общий запрос баланса для блока «Профиль» и виджета «Коплю на товар»: параллельные вызовы делят один запрос
const calls = vi.hoisted(() => ({ rows: 0, fail: false }))
vi.mock('./supabase', () => {
  const chain: Record<string, unknown> = {}
  const res = () => Promise.resolve({ data: [], error: calls.fail ? { message: 'boom' } : null })
  chain.select = () => chain
  chain.eq = () => chain
  chain.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => res().then(ok, bad)
  return { sb: { from: () => chain } }
})
vi.mock('./fetchAll', () => ({
  fetchAllRows: vi.fn(async () => {
    calls.rows++
    return { rows: [], error: null }
  }),
}))
vi.mock('./waterGoal', () => ({ withWaterGoal: vi.fn(async (_u: string, m: unknown[]) => m) }))

import { loadBalance } from './loadBalance'

beforeEach(() => {
  calls.rows = 0
  calls.fail = false
})

describe('loadBalance', () => {
  it('два одновременных вызова для одного пользователя — один запрос истории', async () => {
    const [a, b] = await Promise.all([loadBalance('u1'), loadBalance('u1')])
    expect(calls.rows).toBe(1)
    expect(a).toEqual({ ok: true, balance: 0 })
    expect(b).toEqual(a)
  })

  it('результат не кэшируется: следующий вызов читает заново; другой пользователь — свой запрос', async () => {
    await loadBalance('u1')
    await loadBalance('u1')
    expect(calls.rows).toBe(2)
    await Promise.all([loadBalance('u1'), loadBalance('u2')])
    expect(calls.rows).toBe(4)
  })

  it('ошибка источника — { ok: false, error }, а не исключение', async () => {
    calls.fail = true
    const res = await loadBalance('u1')
    expect(res.ok).toBe(false)
    expect((res as { error: string }).error).toContain('boom')
  })
})
