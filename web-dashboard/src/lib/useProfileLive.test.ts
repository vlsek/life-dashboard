import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// BACKLOG раздел 35 «Профиль: заработанные монеты должны показываться сразу, без обновления страницы».
const h = vi.hoisted(() => ({ balances: [] as number[], calls: 0, hang: null as null | ((v: number) => void) }))

vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, range: () => chain,
        maybeSingle: () => Promise.resolve({ data: { avatar_url: null, birthdate: null, goal_type: null }, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res, rej),
      }
      return chain
    },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) },
  },
}))
vi.mock('./loadBalance', () => ({
  loadBalance: vi.fn(() => {
    h.calls++
    if (h.hang) return new Promise((res) => (h.hang = ((v: number) => res({ ok: true, balance: v })) as never))
    return Promise.resolve({ ok: true, balance: h.balances.shift() ?? 0 })
  }),
}))

import { DATA_CHANGED, notifyDataChanged } from './events'
import { emitPointsFloat } from './pointsFloat'
import { useProfile } from './useProfile'

async function ready(start: number) {
  h.balances = [start]
  const p = useProfile()
  await p.init('u1')
  return p
}

describe('useProfile: баланс обновляется сразу', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    h.balances = []
    h.calls = 0
    h.hang = null
  })
  afterEach(() => vi.useRealTimers())

  it('событие «+N баллов» меняет число мгновенно, без запроса к базе', async () => {
    const p = await ready(10)
    expect(p.balance.value).toBe(10)
    emitPointsFloat(1)
    expect(p.balance.value).toBe(11)
    emitPointsFloat(-1)
    expect(p.balance.value).toBe(10)
    expect(h.calls).toBe(1) // только первоначальная загрузка
    p.stopListening()
  })

  it('дробные баллы считаются без хвоста плавающей точки', async () => {
    const p = await ready(0)
    emitPointsFloat(0.1)
    emitPointsFloat(0.2)
    expect(p.balance.value).toBe(0.3)
    p.stopListening()
  })

  it('пока баланс ещё не загружен, событие его не придумывает', async () => {
    h.hang = () => undefined
    const p = useProfile()
    const initP = p.init('u1')
    await flushPromises()
    emitPointsFloat(5)
    expect(p.balance.value).toBeNull()
    h.hang?.(7)
    await initP
    expect(p.balance.value).toBe(7)
    p.stopListening()
  })

  it('после изменения данных баланс сверяется с базой и заменяет «оценку»', async () => {
    const p = await ready(10)
    emitPointsFloat(1) // оценка 11
    h.balances = [12] // а по базе, например, 12
    notifyDataChanged({ source: 'day' })
    expect(h.calls).toBe(1) // ещё ждём тишины
    await vi.advanceTimersByTimeAsync(1300)
    expect(h.calls).toBe(2)
    expect(p.balance.value).toBe(12)
    p.stopListening()
  })

  it('серия быстрых изменений даёт ОДИН пересчёт', async () => {
    const p = await ready(0)
    h.balances = [3]
    for (let i = 0; i < 5; i++) {
      notifyDataChanged({ source: 'water' })
      await vi.advanceTimersByTimeAsync(300)
    }
    await vi.advanceTimersByTimeAsync(1300)
    expect(h.calls).toBe(2)
    expect(p.balance.value).toBe(3)
    p.stopListening()
  })

  it('устаревший ответ не затирает более новый', async () => {
    const p = await ready(0)
    let first: (v: number) => void = () => undefined
    let second: (v: number) => void = () => undefined
    const { loadBalance } = await import('./loadBalance')
    ;(loadBalance as unknown as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => new Promise((res) => (first = (v) => res({ ok: true, balance: v }))))
      .mockImplementationOnce(() => new Promise((res) => (second = (v) => res({ ok: true, balance: v }))))
    notifyDataChanged({ source: 'day' })
    await vi.advanceTimersByTimeAsync(1300) // запрос №1 в пути
    notifyDataChanged({ source: 'day' })
    await vi.advanceTimersByTimeAsync(1300) // запрос №2 в пути
    second(20)
    await flushPromises()
    first(5) // старый ответ пришёл позже
    await flushPromises()
    expect(p.balance.value).toBe(20)
    p.stopListening()
  })

  it('после stopListening события баланс не трогают', async () => {
    const p = await ready(10)
    p.stopListening()
    emitPointsFloat(5)
    notifyDataChanged({ source: 'day' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(p.balance.value).toBe(10)
    expect(h.calls).toBe(1)
  })

  it('повторный init не подписывает на события второй раз (двойного счёта нет)', async () => {
    h.balances = [10, 10]
    const p = useProfile()
    await p.init('u1')
    await p.init('u1')
    emitPointsFloat(1)
    expect(p.balance.value).toBe(11)
    p.stopListening()
    expect(typeof DATA_CHANGED).toBe('string')
  })
})
