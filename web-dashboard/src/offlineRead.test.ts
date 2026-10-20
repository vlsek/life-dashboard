import { describe, expect, it, vi } from 'vitest'
// @ts-ignore — нет типов node (как в accountsLogoutAllPilots.test.ts).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { CACHE_PREFIX, cacheApiStore, cacheKey, clearReadCacheOnSignOut, createCachingFetch, isCacheable, userOfAuth, type CachedResponse, type ReadStore } from '../../shared/offline-read/offlineRead'

const jwt = (sub: string) => 'Bearer h.' + btoa(JSON.stringify({ sub })).replace(/=/g, '') + '.s'
function memStore(): ReadStore & { map: Map<string, CachedResponse> } {
  const map = new Map<string, CachedResponse>()
  return { map, get: async (k) => map.get(k), put: async (k, v) => { map.set(k, v) }, clearUser: async (u) => { for (const k of [...map.keys()]) if (k.startsWith(u + '|')) map.delete(k) }, clearAll: async () => map.clear() }
}
const URL1 = 'https://x.supabase.co/rest/v1/metrics?select=*'
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

describe('offlineRead', () => {
  it('userOfAuth: sub из JWT, иначе anon', () => {
    expect(userOfAuth(jwt('u1'))).toBe('u1')
    expect(userOfAuth('Bearer sb_publishable_x')).toBe('anon')
    expect(userOfAuth(null)).toBe('anon')
  })
  it('isCacheable: только GET к таблицам /rest/v1/', () => {
    expect(isCacheable('GET', URL1)).toBe(true)
    expect(isCacheable('POST', URL1)).toBe(false)
    expect(isCacheable('GET', 'https://x.supabase.co/auth/v1/user')).toBe(false)
    expect(isCacheable('GET', 'https://x.supabase.co/rest/v1/rpc/buy')).toBe(false)
  })
  it('онлайн: ответ отдаётся как есть и запоминается', async () => {
    const st = memStore()
    const f = createCachingFetch(st, vi.fn(async () => json([{ id: 1 }])))
    const r = await f(URL1, { headers: { authorization: jwt('u1') } })
    expect(await r.json()).toEqual([{ id: 1 }])
    expect(st.map.size).toBe(1)
  })
  it('сеть оборвалась: отдаётся последний сохранённый ответ', async () => {
    const st = memStore()
    let up = true
    const base = vi.fn(async () => { if (!up) throw new TypeError('Failed to fetch'); return json([{ id: 7 }], 200, { 'content-range': '0-0/1' }) })
    const f = createCachingFetch(st, base as unknown as typeof fetch)
    const opts = { headers: { authorization: jwt('u1') } }
    await f(URL1, opts)
    up = false
    const r = await f(URL1, opts)
    expect(await r.json()).toEqual([{ id: 7 }])
    expect(r.headers.get('content-range')).toBe('0-0/1')
    expect(r.headers.get('x-ld-offline-cache')).toBe('1')
  })
  it('нет сети и нет кэша — ошибка сети пробрасывается', async () => {
    const f = createCachingFetch(memStore(), vi.fn(async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch)
    await expect(f(URL1, { headers: { authorization: jwt('u1') } })).rejects.toThrow('Failed to fetch')
  })
  it('ошибку сервера (401/500) кэш не подменяет', async () => {
    const st = memStore()
    let status = 200
    const f = createCachingFetch(st, vi.fn(async () => json({ message: 'x' }, status)) as unknown as typeof fetch)
    const opts = { headers: { authorization: jwt('u1') } }
    await f(URL1, opts)
    status = 401
    expect((await f(URL1, opts)).status).toBe(401)
  })
  it('кэш разных пользователей не смешивается', async () => {
    const st = memStore()
    let up = true
    const f = createCachingFetch(st, vi.fn(async (_u: unknown, i?: RequestInit) => { if (!up) throw new TypeError('Failed to fetch'); return json([{ owner: userOfAuth((i?.headers as Record<string, string>).authorization) }]) }) as unknown as typeof fetch)
    await f(URL1, { headers: { authorization: jwt('u1') } })
    up = false
    await expect(f(URL1, { headers: { authorization: jwt('u2') } })).rejects.toThrow()
    expect(await (await f(URL1, { headers: { authorization: jwt('u1') } })).json()).toEqual([{ owner: 'u1' }])
  })
  it('single() и обычный запрос — разные ключи', () => {
    expect(cacheKey('u', URL1, 'application/vnd.pgrst.object+json', '', '')).not.toBe(cacheKey('u', URL1, '', '', ''))
  })
  it('запись (POST) не трогает кэш и идёт мимо', async () => {
    const st = memStore()
    const base = vi.fn(async () => json({}))
    await createCachingFetch(st, base as unknown as typeof fetch)(URL1, { method: 'POST' })
    expect(base).toHaveBeenCalledTimes(1)
    expect(st.map.size).toBe(0)
  })
  it('выход (SIGNED_OUT) стирает кэш', async () => {
    const st = memStore()
    st.map.set('u1|k', { body: '[]', status: 200, contentType: 'application/json', contentRange: null })
    let cb: (e: string) => void = () => {}
    clearReadCacheOnSignOut({ auth: { onAuthStateChange: (c) => { cb = c } } }, st)
    cb('TOKEN_REFRESHED')
    expect(st.map.size).toBe(1)
    cb('SIGNED_OUT')
    await Promise.resolve()
    expect(st.map.size).toBe(0)
  })
  it('cacheApiStore: кладёт и достаёт через Cache API, clearAll чистит только свои кэши', async () => {
    const data = new Map<string, Map<string, Response>>()
    const cs = {
      open: async (n: string) => { if (!data.has(n)) data.set(n, new Map()); const m = data.get(n)!; return { put: async (r: Request, v: Response) => { m.set(r.url, v) }, match: async (r: Request) => m.get(r.url)?.clone() } },
      keys: async () => [...data.keys()],
      delete: async (n: string) => data.delete(n),
    } as unknown as CacheStorage
    data.set('other-cache', new Map())
    const s = cacheApiStore(cs)
    await s.put('u1|a', { body: '[1]', status: 200, contentType: 'application/json', contentRange: '0-0/1' })
    expect(await s.get('u1|a')).toEqual({ body: '[1]', status: 200, contentType: 'application/json', contentRange: '0-0/1' })
    expect(data.has(CACHE_PREFIX + 'u1')).toBe(true)
    await s.clearAll()
    expect(data.has(CACHE_PREFIX + 'u1')).toBe(false)
    expect(data.has('other-cache')).toBe(true)
  })
})

describe('подключено во всех пилотах', () => {
  const pilots: string[] = (readdirSync('..') as string[]).filter((d: string) => d.startsWith('web-') && existsSync(`../${d}/src/lib/supabase.ts`))
  it.each(pilots)('%s/src/lib/supabase.ts: кэширующий fetch и очистка при выходе', (p: string) => {
    const src = readFileSync(`../${p}/src/lib/supabase.ts`, 'utf-8')
    expect(src).toContain("from '../../../shared/offline-read/offlineRead'")
    expect(src).toContain('{ global: { fetch: cachingFetch } }')
    expect(src).toContain('clearReadCacheOnSignOut(sb, sharedReadStore)')
  })
})
