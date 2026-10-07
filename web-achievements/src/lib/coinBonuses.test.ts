import { describe, expect, it } from 'vitest'
import { coinBonusesDue, grantCoinBonuses } from './coinBonuses'
import { COINS_STEP_1, COINS_STEP_2, LADDERS, REWARDS, REWARD_STATUS } from './rewards'

// Заглушка клиента: что уже выдано, ошибки, и запись всех вызовов.
function fakeClient(opts: { have?: string[]; selectError?: string; upsertError?: string; boom?: boolean } = {}) {
  const calls = { selects: [] as unknown[], upserts: [] as { rows: any[]; opts: any }[] }
  const client = {
    from(table: string) {
      return {
        select(cols: string) {
          return {
            eq(col: string, val: string) {
              calls.selects.push({ table, cols, col, val })
              if (opts.boom) throw new Error('сеть упала')
              return Promise.resolve({ data: (opts.have || []).map((key) => ({ key })), error: opts.selectError ? { message: opts.selectError } : null })
            },
          }
        },
        upsert(rows: unknown, o: { onConflict: string; ignoreDuplicates: boolean }) {
          calls.upserts.push({ rows: rows as any[], opts: { table, ...o } })
          return Promise.resolve({ error: opts.upsertError ? { message: opts.upsertError } : null })
        },
      }
    },
  }
  return { client, calls }
}

const stepKeys = (i: number) => Object.values(LADDERS).map((l) => l.steps[i])

describe('что причитается (coinBonusesDue)', () => {
  it('монетки есть только у ступеней 1 и 2 каждой лесенки: 20 и 50', () => {
    const all = coinBonusesDue(Object.keys(REWARDS))
    expect(all).toHaveLength(Object.keys(LADDERS).length * 2)
    for (const k of stepKeys(0)) expect(all.find((b) => b.key === k)?.coins, k).toBe(COINS_STEP_1)
    for (const k of stepKeys(1)) expect(all.find((b) => b.key === k)?.coins, k).toBe(COINS_STEP_2)
  })

  it('за ступени 3 и 4 (рамка, тема), неизвестные ключи и служебный _baseline монет нет', () => {
    expect(coinBonusesDue([...stepKeys(2), ...stepKeys(3), 'нет_такого', '_baseline', 'streak_5'])).toEqual([])
  })

  it('дубли ключей не удваивают награду; порядок и сумма сохраняются', () => {
    const k = stepKeys(0)[0]
    expect(coinBonusesDue([k, k, k])).toEqual([{ key: k, coins: 20 }])
    expect(coinBonusesDue([])).toEqual([])
  })

  it('монетки в реестре включены (REWARD_STATUS.coins = active)', () => {
    expect(REWARD_STATUS.coins).toBe('active')
  })
})

describe('выдача (grantCoinBonuses)', () => {
  it('выдаёт недостающее ОДНИМ upsert: onConflict user_id,key + ignoreDuplicates, user_id и суммы из реестра', async () => {
    const [a, b] = [stepKeys(0)[0], stepKeys(1)[1]]
    const { client, calls } = fakeClient()
    const r = await grantCoinBonuses(client, 'u1', [a, b, stepKeys(2)[0]])
    expect(r.error).toBeNull()
    expect(r.granted).toEqual([
      { key: a, coins: 20 },
      { key: b, coins: 50 },
    ])
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].opts).toEqual({ table: 'achievement_bonuses', onConflict: 'user_id,key', ignoreDuplicates: true })
    expect(calls.upserts[0].rows).toEqual([
      { user_id: 'u1', key: a, coins: 20 },
      { user_id: 'u1', key: b, coins: 50 },
    ])
    expect(calls.selects[0]).toEqual({ table: 'achievement_bonuses', cols: 'key', col: 'user_id', val: 'u1' })
  })

  it('«задним числом»: за все уже открытые значки с монетками сразу', async () => {
    const { client, calls } = fakeClient()
    const all = [...stepKeys(0), ...stepKeys(1)]
    const r = await grantCoinBonuses(client, 'u1', all)
    expect(r.granted).toHaveLength(all.length)
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].rows.reduce((s, x) => s + x.coins, 0)).toBe(Object.keys(LADDERS).length * (COINS_STEP_1 + COINS_STEP_2))
  })

  it('уже выданное не шлёт повторно; если выдано всё — ни одной записи', async () => {
    const [a, b] = [stepKeys(0)[0], stepKeys(0)[1]]
    const one = fakeClient({ have: [a] })
    const r1 = await grantCoinBonuses(one.client, 'u1', [a, b])
    expect(r1.granted).toEqual([{ key: b, coins: 20 }])
    expect(one.calls.upserts[0].rows).toEqual([{ user_id: 'u1', key: b, coins: 20 }])
    const all = fakeClient({ have: [a, b] })
    const r2 = await grantCoinBonuses(all.client, 'u1', [a, b])
    expect(r2).toEqual({ granted: [], error: null })
    expect(all.calls.upserts).toHaveLength(0)
  })

  it('нечего выдавать (нет значков с монетками) — база вообще не трогается', async () => {
    const { client, calls } = fakeClient()
    expect(await grantCoinBonuses(client, 'u1', [])).toEqual({ granted: [], error: null })
    expect(await grantCoinBonuses(client, 'u1', stepKeys(3))).toEqual({ granted: [], error: null })
    expect(calls.selects).toHaveLength(0)
    expect(calls.upserts).toHaveLength(0)
  })

  it('нет таблицы (миграция 051 не применена) или ошибка чтения: ничего не пишем, не падаем, причина в error', async () => {
    const f = fakeClient({ selectError: 'relation "achievement_bonuses" does not exist' })
    const r = await grantCoinBonuses(f.client, 'u1', stepKeys(0))
    expect(r.granted).toEqual([])
    expect(r.error).toContain('achievement_bonuses')
    expect(f.calls.upserts).toHaveLength(0)
  })

  it('ошибка записи: выдано = пусто (не врём пользователю), исключения нет', async () => {
    const f = fakeClient({ upsertError: 'permission denied' })
    const r = await grantCoinBonuses(f.client, 'u1', stepKeys(0))
    expect(r).toEqual({ granted: [], error: 'permission denied' })
  })

  it('падение сети (исключение): тоже не падаем', async () => {
    const f = fakeClient({ boom: true })
    const r = await grantCoinBonuses(f.client, 'u1', stepKeys(0))
    expect(r.granted).toEqual([])
    expect(r.error).toContain('сеть')
  })
})
