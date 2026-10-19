import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOutbox, memoryStorage, type SbLike } from './offlineOutbox'

const h = vi.hoisted(() => ({ calls: [] as unknown[], err: null as null | { message?: string; code?: string; status?: number } }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => ({
      upsert: async (payload: unknown, opts: unknown) => { h.calls.push({ table, op: 'upsert', payload, opts }); return { error: h.err } },
      update: (payload: unknown) => ({ match: async (m: unknown) => { h.calls.push({ table, op: 'update', payload, m }); return { error: h.err } } }),
    }),
  },
}))
import { sb } from './supabase'
import { dailyValueKey, qUpdate, qUpsert, setOutboxForTests } from './outboxClient'

let online = true
beforeEach(() => {
  h.calls = []
  h.err = null
  online = true
  const ob = createOutbox({ client: sb as unknown as SbLike, storage: memoryStorage(), isOnline: () => online })
  setOutboxForTests(ob)
})

describe('outboxClient', () => {
  it('онлайн: пишет сразу, queued=false', async () => {
    const r = await qUpsert('u1', 'daily_values', dailyValueKey('2026-10-19', 'm'), { a: 1 }, 'user_id,date,metric_id')
    expect(r).toEqual({ error: null, queued: false })
    expect(h.calls).toHaveLength(1)
  })
  it('офлайн: queued=true без ошибки, на сервер не идёт', async () => {
    online = false
    const r = await qUpdate('u1', 'metrics', 'metrics:1:options', { options: [] }, { id: '1' })
    expect(r).toEqual({ error: null, queued: true })
    expect(h.calls).toHaveLength(0)
  })
  it('отказ сервера возвращается как error с кодом (для friendlyError)', async () => {
    h.err = { code: '42501', message: 'rls' }
    const r = await qUpsert('u1', 'daily_notes', 'k', { a: 1 }, 'user_id,date')
    expect(r.error?.code).toBe('42501')
    expect(r.queued).toBe(false)
  })
})
