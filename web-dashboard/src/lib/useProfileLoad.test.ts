import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// BACKLOG 6 «Оптимизация блоков»: блок «Профиль» не ждёт баланс (он читает всю историю daily_values).
const h = vi.hoisted(() => ({
  releaseBalance: null as null | (() => void),
  failBalance: false,
  rows: {} as Record<string, unknown[]>,
}))
// вызов через функцию, чтобы TypeScript не сужал поле до null после присваивания в тесте
const release = () => h.releaseBalance?.()
const waiting = () => h.releaseBalance !== null

vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const respond = () => {
        const data = h.rows[table] ?? []
        if (table === 'daily_values') {
          if (h.failBalance) return Promise.resolve({ data: null, error: { message: 'boom' } })
          // «тяжёлый» запрос баланса: висит, пока тест его не отпустит
          return new Promise((res) => (h.releaseBalance = () => res({ data, error: null })))
        }
        return Promise.resolve({ data, error: null })
      }
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, range: () => chain, gte: () => chain, lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: h.rows.profiles?.[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => respond().then(res, rej),
      }
      return chain
    },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  },
}))

import { useProfile } from './useProfile'

describe('useProfile.init', () => {
  it('shows the block as soon as the light data is ready, before the balance is calculated', async () => {
    h.releaseBalance = null
    h.failBalance = false
    h.rows = {
      profiles: [{ avatar_url: null, birthdate: '1990-01-01', goal_type: null }],
      body_parameters: [{ id: 'p1', name: 'Weight', icon: null, unit: 'kg', position: 0 }],
      body_parameter_values: [{ parameter_id: 'p1', date: '2026-09-01', value: 80 }],
      metrics: [{ id: 'm1', name: 'Steps', icon: null, type: 'boolean', goal_value: null, goal_direction: null, position: 0 }],
      daily_values: [{ date: '2026-09-01', metric_id: 'm1', value: true }],
      goals: [], skills: [], books: [], shop_items: [],
    }
    const p = useProfile()
    let done = false
    const initP = p.init('u1').then(() => (done = true))
    await flushPromises()
    // баланс ещё висит, а блок уже можно показывать
    expect(waiting()).toBe(true)
    expect(p.loaded.value).toBe(true)
    expect(p.profile.value?.birthdate).toBe('1990-01-01')
    expect(p.params.value).toHaveLength(1)
    expect(p.balance.value).toBeNull()
    expect(done).toBe(false) // промис init, как и раньше, ждёт всё
    release()
    await initP
    expect(done).toBe(true)
    expect(p.balance.value).not.toBeNull()
  })
  it('a failed balance query does not hide the block and is reported as an error', async () => {
    h.releaseBalance = null
    h.failBalance = true
    h.rows = {
      profiles: [{ avatar_url: null, birthdate: null, goal_type: null }],
      body_parameters: [{ id: 'p1', name: 'Weight', icon: null, unit: 'kg', position: 0 }],
      body_parameter_values: [], metrics: [], goals: [], skills: [], books: [], shop_items: [],
    }
    const p = useProfile()
    await p.init('u2')
    expect(p.loaded.value).toBe(true) // блок показан
    expect(p.params.value).toHaveLength(1)
    expect(p.balance.value).toBeNull() // монета не рисуется без баланса
    expect(p.error.value).toBeTruthy() // понятный текст вместо сырого «boom»
    expect(p.error.value).not.toBe('boom')
  })
})
