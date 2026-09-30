import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ calls: [] as { table: string; patch: unknown; userId: string }[], error: null as null | { message: string }, throws: false }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => ({
      update: (patch: unknown) => ({
        eq: async (_col: string, userId: string) => {
          if (h.throws) throw new Error('network')
          h.calls.push({ table, patch, userId })
          return { error: h.error }
        },
      }),
    }),
  },
}))

import { browserTimeZone, syncUserTimezone } from './timezone'

const realResolved = Intl.DateTimeFormat.prototype.resolvedOptions
function fakeZone(tz: string | undefined) {
  Intl.DateTimeFormat.prototype.resolvedOptions = function () {
    return { ...realResolved.call(this), timeZone: tz as string }
  }
}

describe('syncUserTimezone', () => {
  beforeEach(() => {
    h.calls.length = 0
    h.error = null
    h.throws = false
    localStorage.clear()
    fakeZone('Europe/Moscow')
  })
  afterEach(() => {
    Intl.DateTimeFormat.prototype.resolvedOptions = realResolved
  })

  it('writes the browser IANA zone into profiles.timezone once per user+zone', async () => {
    await syncUserTimezone('u1')
    expect(h.calls).toEqual([{ table: 'profiles', patch: { timezone: 'Europe/Moscow' }, userId: 'u1' }])
    await syncUserTimezone('u1')
    expect(h.calls).toHaveLength(1)
  })

  it('writes again when the zone changes (travel) or another user signs in', async () => {
    await syncUserTimezone('u1')
    fakeZone('Europe/Vilnius')
    await syncUserTimezone('u1')
    await syncUserTimezone('u2')
    expect(h.calls.map((c) => [c.userId, (c.patch as { timezone: string }).timezone])).toEqual([
      ['u1', 'Europe/Moscow'],
      ['u1', 'Europe/Vilnius'],
      ['u2', 'Europe/Vilnius'],
    ])
  })

  it('stays silent and backs off for 6 hours when the write fails (migration 030 not applied yet)', async () => {
    h.error = { message: "Could not find the 'timezone' column of 'profiles'" }
    await expect(syncUserTimezone('u1', 1_000)).resolves.toBeUndefined()
    expect(h.calls).toHaveLength(1)
    await syncUserTimezone('u1', 1_000 + 60_000) // рано — не повторяем
    expect(h.calls).toHaveLength(1)
    h.error = null
    await syncUserTimezone('u1', 1_000 + 6 * 60 * 60 * 1000 + 1) // после паузы — повторяем и успеваем
    expect(h.calls).toHaveLength(2)
    await syncUserTimezone('u1', 1_000 + 7 * 60 * 60 * 1000)
    expect(h.calls).toHaveLength(2)
  })

  it('never throws when the request itself blows up', async () => {
    h.throws = true
    await expect(syncUserTimezone('u1')).resolves.toBeUndefined()
  })

  it('does nothing when the browser does not report a zone', async () => {
    fakeZone(undefined)
    expect(browserTimeZone()).toBeNull()
    await syncUserTimezone('u1')
    expect(h.calls).toHaveLength(0)
  })
})
