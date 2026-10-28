import { describe, expect, it, vi, afterEach } from 'vitest'
import { createOutbox, isRetryable, memoryStorage, type SbLike, type SbResult } from './offlineOutbox'

type Call = { table: string; op: string; arg: unknown }
function fake(script: (c: Call) => SbResult | Promise<SbResult>) {
  const calls: Call[] = []
  const run = async (c: Call) => { calls.push(c); return script(c) }
  const client: SbLike = {
    from: (table) => ({
      insert: (arg) => run({ table, op: 'insert', arg }),
      upsert: (arg) => run({ table, op: 'upsert', arg }),
      update: (arg) => ({ match: (m) => run({ table, op: 'update', arg: { arg, m } }) }),
      delete: () => ({ match: (m) => run({ table, op: 'delete', arg: m }) }),
    }),
  }
  return { client, calls }
}
const ok: SbResult = { error: null }
const netErr: SbResult = { error: { message: 'Failed to fetch', status: 0 } }

function mk(script: (c: Call) => SbResult | Promise<SbResult> = () => ok, o = { online: true, t: 0 }) {
  const f = fake(script)
  const ob = createOutbox({ client: f.client, storage: memoryStorage(), now: () => o.t, isOnline: () => o.online })
  ob.setUser('u1')
  return { ...f, ob, o }
}

describe('offlineOutbox', () => {
  it('онлайн: пишет сразу и ничего не ставит в очередь', async () => {
    const { ob, calls } = mk()
    expect(await ob.write({ key: 'k', table: 't', op: 'upsert', payload: { a: 1 } })).toEqual({ status: 'sent' })
    expect(calls).toHaveLength(1)
    expect((await ob.list()).length).toBe(0)
  })
  it('офлайн: в очередь, статус offline, потом уходит по flush', async () => {
    const { ob, calls, o } = mk(() => ok, { online: false, t: 0 })
    expect((await ob.write({ key: 'k', table: 't', op: 'insert', payload: { id: 'x' } })).status).toBe('queued')
    expect(ob.status()).toEqual({ state: 'offline', pending: 1, failed: 0 })
    expect(calls).toHaveLength(0)
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(1)
    expect(ob.status().pending).toBe(0)
  })
  it('обрыв сети посреди записи: операция попадает в очередь', async () => {
    const { ob } = mk(() => netErr)
    expect((await ob.write({ key: 'k', table: 't', op: 'upsert', payload: {} })).status).toBe('queued')
    expect(ob.status().pending).toBe(1)
  })
  it('исключение fetch тоже считается сетевой ошибкой', async () => {
    const { ob } = mk(() => { throw new TypeError('Failed to fetch') })
    expect((await ob.write({ key: 'k', table: 't', op: 'update', payload: {}, match: { id: 1 } })).status).toBe('queued')
  })
  it('порядок внутри ключа: новая запись не обгоняет ждущую', async () => {
    const { ob, calls, o } = mk(() => ok, { online: false, t: 0 })
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: { n: 1 } })
    await ob.write({ key: 'k', table: 't', op: 'delete', match: { n: 1 } })
    o.online = true
    // онлайн, но по ключу уже есть очередь → встаёт следом
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: { n: 2 } })
    expect(calls).toHaveLength(0)
    await ob.flush()
    expect(calls.map((c) => c.op)).toEqual(['insert', 'delete', 'insert'])
  })
  it('склейка: два upsert одного ключа → уходит последний', async () => {
    const { ob, calls, o } = mk(() => ok, { online: false, t: 0 })
    await ob.write({ key: 'k', table: 't', op: 'upsert', payload: { v: 1 } })
    await ob.write({ key: 'k', table: 't', op: 'upsert', payload: { v: 2 } })
    expect((await ob.list()).length).toBe(1)
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(1)
    expect(calls[0].arg).toEqual({ v: 2 })
  })
  it('23505 при вставке = уже применено', async () => {
    const { ob, o } = mk(() => ({ error: { code: '23505', message: 'dup' } }), { online: false, t: 0 })
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: { id: 'x' } })
    o.online = true
    await ob.flush()
    expect(ob.status()).toEqual({ state: 'idle', pending: 0, failed: 0 })
  })
  it('постоянный отказ (RLS) → failed, не повторяется и блокирует ключ; retry возвращает', async () => {
    let deny = true
    const { ob, calls, o } = mk(() => (deny ? { error: { code: '42501', message: 'rls' } } : ok), { online: false, t: 0 })
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: {} })
    await ob.write({ key: 'k', table: 't', op: 'delete', match: {} })
    o.online = true
    await ob.flush()
    expect(ob.status()).toEqual({ state: 'error', pending: 1, failed: 1 })
    expect(calls).toHaveLength(1)
    await ob.flush()
    expect(calls).toHaveLength(1)
    deny = false
    const [first] = await ob.list()
    await ob.retry(first.id)
    await ob.flush()
    expect(ob.status().pending).toBe(0)
  })
  it('временная ошибка: backoff, повтор не раньше срока', async () => {
    let fail = true
    const { ob, calls, o } = mk(() => (fail ? netErr : ok), { online: false, t: 0 })
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: {} })
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(1)
    fail = false
    await ob.flush()
    expect(calls).toHaveLength(1) // ещё рано
    o.t = 10000
    await ob.flush()
    expect(calls).toHaveLength(2)
    expect(ob.status().pending).toBe(0)
  })
  it('разные ключи не блокируют друг друга', async () => {
    const { ob, calls, o } = mk((c) => ((c.arg as { id?: string }).id === 'bad' ? { error: { code: '42501' } } : ok), { online: false, t: 0 })
    await ob.write({ key: 'a', table: 't', op: 'insert', payload: { id: 'bad' } })
    await ob.write({ key: 'b', table: 't', op: 'insert', payload: { id: 'good' } })
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(2)
    expect(ob.status()).toEqual({ state: 'error', pending: 0, failed: 1 })
  })
  it('очередь одного пользователя не видна другому', async () => {
    const { ob, o } = mk(() => ok, { online: false, t: 0 })
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: {} })
    ob.setUser('u2')
    expect((await ob.list()).length).toBe(0)
    expect(ob.status().pending).toBe(0)
    void o
  })
  it('без пользователя запись отклоняется', async () => {
    const { ob } = mk()
    ob.setUser(null)
    expect((await ob.write({ key: 'k', table: 't', op: 'insert' })).status).toBe('rejected')
  })
  it('подписчик получает статусы', async () => {
    const { ob } = mk(() => netErr)
    const seen: string[] = []
    ob.subscribe((s) => seen.push(s.state))
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: {} })
    expect(seen).toContain('pending')
  })
  it('isRetryable: сеть и 5xx да, коды Postgres и 4xx нет', () => {
    expect(isRetryable({ message: 'Failed to fetch' })).toBe(true)
    expect(isRetryable({ status: 503 })).toBe(true)
    expect(isRetryable({ status: 400 })).toBe(false)
    expect(isRetryable({ code: '23503', message: 'fk' })).toBe(false)
    expect(isRetryable(null)).toBe(false)
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('offlineOutbox: нагрузка и граничные случаи (BACKLOG 66.7)', () => {
  it('очередь на 100 записей разных ключей уходит вся, по порядку, ничего не теряется', async () => {
    const { ob, calls, o } = mk(() => ok, { online: false, t: 0 })
    for (let i = 0; i < 100; i++) await ob.write({ key: 'k' + i, table: 't', op: 'insert', payload: { i } })
    expect((await ob.list()).length).toBe(100)
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(100)
    expect(calls.map((c) => (c.arg as { i: number }).i)).toEqual(Array.from({ length: 100 }, (_, i) => i))
    expect(ob.status().pending).toBe(0)
  })
  it('100 upsert одного ключа склеиваются: на сервер уходит одна, последняя', async () => {
    const { ob, calls, o } = mk(() => ok, { online: false, t: 0 })
    for (let i = 0; i < 100; i++) await ob.write({ key: 'same', table: 't', op: 'upsert', payload: { v: i } })
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(1)
    expect((calls[0].arg as { v: number }).v).toBe(99)
  })
  it('две вкладки с общим хранилищем: Web Lock пускает одну, записи не дублируются', async () => {
    let held = false
    vi.stubGlobal('navigator', { locks: { request: async (_n: string, _o: unknown, cb: (l: unknown) => Promise<void>) => { if (held) return cb(null); held = true; try { await cb({}) } finally { held = false } } } })
    const storage = memoryStorage()
    const calls: Call[] = []
    const mkTab = () => {
      const f = fake(async (c) => { calls.push(c); await new Promise((r) => setTimeout(r, 5)); return ok })
      const ob = createOutbox({ client: f.client, storage, now: () => 0, isOnline: () => false })
      ob.setUser('u1')
      return ob
    }
    const a = mkTab()
    for (let i = 0; i < 10; i++) await a.write({ key: 'k' + i, table: 't', op: 'insert', payload: { i } })
    const online = { v: true }
    const mkOn = () => {
      const f = fake(async (c) => { calls.push(c); await new Promise((r) => setTimeout(r, 5)); return ok })
      const ob = createOutbox({ client: f.client, storage, now: () => 0, isOnline: () => online.v })
      ob.setUser('u1')
      return ob
    }
    const t1 = mkOn(), t2 = mkOn()
    await Promise.all([t1.flush(), t2.flush()])
    expect(calls).toHaveLength(10)
    expect((await t1.list()).length).toBe(0)
  })
  it('часы откатили назад: ожидающая повтора запись не зависает на месяцы', async () => {
    let fail = true
    const { ob, calls, o } = mk(() => (fail ? netErr : ok), { online: false, t: 1_900_000_000_000 })
    await ob.write({ key: 'k', table: 't', op: 'insert', payload: {} })
    o.online = true
    await ob.flush()
    expect(calls).toHaveLength(1)
    fail = false
    o.t = 1_000_000 // часы телефона сбросили в прошлое
    await ob.flush()
    expect(calls).toHaveLength(2)
    expect(ob.status().pending).toBe(0)
  })
  it('503 приходит в результате (status), а не в error: запись остаётся в очереди и повторяется, а не «отклонена»', async () => {
    const { ob, o } = mk(() => ({ error: { message: 'unavailable' }, status: 503 }))
    expect((await ob.write({ key: 'k', table: 't', op: 'insert', payload: { id: 'x' } })).status).toBe('queued')
    expect(ob.status().failed).toBe(0)
    expect(ob.status().pending).toBe(1)
    o.t = 120000
    await ob.flush()
    const st = ob.status()
    expect(st.failed).toBe(0)
    expect(st.pending).toBe(1)
  })
  it('400 в результате (status) — по-прежнему отказ сервера, запись «failed»', async () => {
    const { ob } = mk(() => ({ error: { message: 'bad' }, status: 400 }))
    expect((await ob.write({ key: 'k', table: 't', op: 'insert', payload: { id: 'x' } })).status).toBe('rejected')
  })
})
