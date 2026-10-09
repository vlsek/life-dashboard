import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// Выдача монеток встроена в загрузку «Достижений» (v3.64): открыт значок первой цели (ступень 1 лесенки целей → 20 монеток) —
// ровно один upsert в achievement_bonuses; повторная загрузка ничего не шлёт; сбой выдачи страницу не ломает.
const h = vi.hoisted(() => ({
  have: [] as string[],
  selectError: false,
  upserts: [] as { table: string; rows: any[]; opts: any }[],
  rpcCalls: [] as string[],
  // серверная функция claim_achievement_bonuses (миграция 062): null — функции нет (прежний путь), иначе ответ сервера
  rpcReply: null as null | { key: string; coins: number }[],
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
  function rpc(fn: string) {
    h.rpcCalls.push(fn)
    if (h.rpcReply === null) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.' + fn } })
    return Promise.resolve({ data: h.rpcReply, error: null })
  }
  return { sb: { rpc, auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from }, logout: vi.fn() }
})

import { useAchievements } from './useAchievements'

beforeEach(() => {
  localStorage.clear()
  h.have = []
  h.selectError = false
  h.upserts = []
  h.rpcCalls = []
  h.rpcReply = null
})

describe('выдача монеток при загрузке «Достижений» (прежний путь: функции 062 ещё нет)', () => {
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

describe('выдача монеток при загрузке «Достижений» (серверная функция, миграция 062)', () => {
  it('значок первой цели → вызов claim_achievement_bonuses, монеты из ответа сервера, прямой записи в таблицу нет', async () => {
    h.rpcReply = [{ key: 'first_goal', coins: 20 }]
    const a = useAchievements()
    await a.init()
    await flushPromises()
    expect(a.error.value).toBeNull()
    expect(h.rpcCalls).toEqual(['claim_achievement_bonuses'])
    expect(h.upserts.filter((u) => u.table === 'achievement_bonuses')).toHaveLength(0)
    expect(a.grantedCoins.value).toEqual([{ key: 'first_goal', coins: 20 }])
  })

  it('сервер ничего не выдал (уже получено): grantedCoins пуст, страница без ошибки', async () => {
    h.rpcReply = []
    const a = useAchievements()
    await a.init()
    await flushPromises()
    expect(a.error.value).toBeNull()
    expect(a.grantedCoins.value).toEqual([])
    expect(h.upserts.filter((u) => u.table === 'achievement_bonuses')).toHaveLength(0)
  })
})
