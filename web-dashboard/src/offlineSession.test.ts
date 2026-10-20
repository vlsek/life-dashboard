import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore — нет типов node (как в accountsLogoutAllPilots.test.ts).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { AUTH_KEY } from '../../shared/accounts/accounts'
import { isNetworkAuthError, patchOfflineSession } from '../../shared/offline-session/offlineSession'

const stored = { access_token: 'old', refresh_token: 'r', expires_at: 1, user: { id: 'u1' } }
const mk = (res: unknown) => ({ auth: { getSession: vi.fn(async () => res) } }) as any
const online = (v: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(v)

describe('patchOfflineSession', () => {
  beforeEach(() => localStorage.setItem(AUTH_KEY, JSON.stringify(stored)))
  afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })

  it('сессия живая — отдаётся как есть', async () => {
    const c = patchOfflineSession(mk({ data: { session: { user: { id: 'x' } } }, error: null }))
    expect((await c.auth.getSession()).data.session.user.id).toBe('x')
  })
  it('нет сети и токен не обновить — отдаёт сохранённую сессию', async () => {
    online(false)
    const c = patchOfflineSession(mk({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } }))
    const r = await c.auth.getSession()
    expect(r.error).toBeNull()
    expect(r.data.session.user.id).toBe('u1')
  })
  it('сетевая ошибка при navigator.onLine=true (плохая связь) — тоже', async () => {
    online(true)
    const c = patchOfflineSession(mk({ data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'x', status: 0 } }))
    expect((await c.auth.getSession()).data.session.user.id).toBe('u1')
  })
  it('сервер отказал по существу (отозван токен) — ошибка не подменяется', async () => {
    online(true)
    const err = { name: 'AuthApiError', message: 'Invalid Refresh Token', status: 400 }
    const c = patchOfflineSession(mk({ data: { session: null }, error: err }))
    expect((await c.auth.getSession()).error).toEqual(err)
  })
  it('вышел (в хранилище пусто) — остаётся «сессии нет»', async () => {
    localStorage.clear()
    online(false)
    const c = patchOfflineSession(mk({ data: { session: null }, error: null }))
    expect((await c.auth.getSession()).data.session).toBeNull()
  })
  it('isNetworkAuthError распознаёт сеть', () => {
    expect(isNetworkAuthError({ message: 'Failed to fetch' })).toBe(true)
    expect(isNetworkAuthError({ status: 400, message: 'bad' })).toBe(false)
    expect(isNetworkAuthError(null)).toBe(false)
  })
})

describe('подключено во всех пилотах', () => {
  const pilots: string[] = (readdirSync('..') as string[]).filter((d: string) => d.startsWith('web-') && existsSync(`../${d}/src/lib/supabase.ts`))
  it.each(pilots)('%s/src/lib/supabase.ts оборачивает клиент', (p: string) => {
    const src = readFileSync(`../${p}/src/lib/supabase.ts`, 'utf-8')
    expect(src).toContain("from '../../../shared/offline-session/offlineSession'")
    expect(src).toMatch(/export const sb = patchOfflineSession\(createClient\(/)
  })
})
